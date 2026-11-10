ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_unique ON public.customers(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT ''
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());

CREATE OR REPLACE FUNCTION public.on_customer_auth_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m jsonb; phone text; deps text[]; existing public.customers%ROWTYPE;
BEGIN
 m:=coalesce(NEW.raw_user_meta_data,'{}');
 IF TG_OP='INSERT' THEN
   INSERT INTO public.profiles(id,display_name) VALUES(NEW.id,left(coalesce(m->>'full_name',''),120)) ON CONFLICT(id) DO NOTHING;
 END IF;
 IF m->>'registration_kind' IS DISTINCT FROM 'customer' THEN RETURN NEW; END IF;
 phone:=regexp_replace(coalesce(m->>'whatsapp',''),'\D','','g');
 IF length(phone) NOT BETWEEN 10 AND 11 OR length(btrim(coalesce(m->>'full_name',''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Dados de cadastro inválidos'; END IF;
 IF coalesce(m->>'requested_cycle','') NOT IN ('Iniciar','P1','P2','Aresta') THEN RAISE EXCEPTION 'Ciclo inválido'; END IF;
 IF jsonb_typeof(coalesce(m->'dependents','[]')) <> 'array' THEN RAISE EXCEPTION 'Dependentes inválidos'; END IF;
 SELECT coalesce(array_agg(btrim(x)),'{}') INTO deps FROM jsonb_array_elements_text(coalesce(m->'dependents','[]')) x;
 IF cardinality(deps)>9 OR EXISTS(SELECT 1 FROM unnest(deps) d WHERE length(d) NOT BETWEEN 2 AND 120) THEN RAISE EXCEPTION 'Dependentes inválidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('customer:'||phone));
 SELECT * INTO existing FROM public.customers WHERE whatsapp=phone FOR UPDATE;
 IF FOUND THEN
   IF existing.auth_user_id=NEW.id THEN RETURN NEW; END IF;
   IF existing.auth_user_id IS NOT NULL OR lower(coalesce(existing.email,''))<>lower(coalesce(NEW.email,'')) THEN RAISE EXCEPTION 'Este celular já possui cadastro. Use o acesso existente ou procure a equipe'; END IF;
   IF NEW.email_confirmed_at IS NOT NULL THEN UPDATE public.customers SET auth_user_id=NEW.id WHERE id=existing.id AND auth_user_id IS NULL; END IF;
 ELSE
   INSERT INTO public.customers(full_name,whatsapp,email,dependents,requested_cycle,confirmed,auth_user_id)
   VALUES(btrim(m->>'full_name'),phone,NEW.email,deps,m->>'requested_cycle',false,NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_auth_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.on_customer_auth_lifecycle();
CREATE TRIGGER customer_auth_confirmation AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN(OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) EXECUTE FUNCTION public.on_customer_auth_lifecycle();

CREATE OR REPLACE FUNCTION public.my_customer_status()
RETURNS TABLE(status text,allowed text,party integer,full_name text,whatsapp text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.customers%ROWTYPE; verified_email text; matches integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login com e-mail e senha'; END IF;
 SELECT * INTO c FROM public.customers WHERE auth_user_id=auth.uid();
 IF NOT FOUND THEN
   SELECT email INTO verified_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
   SELECT count(*) INTO matches FROM public.customers x WHERE x.auth_user_id IS NULL AND lower(x.email)=lower(verified_email);
   IF matches=1 THEN
     UPDATE public.customers x SET auth_user_id=auth.uid() WHERE x.auth_user_id IS NULL AND lower(x.email)=lower(verified_email) RETURNING x.* INTO c;
   END IF;
 END IF;
 IF c.id IS NULL THEN RETURN QUERY SELECT 'nao_cadastrado'::text,NULL::text,NULL::integer,NULL::text,NULL::text; RETURN; END IF;
 RETURN QUERY SELECT CASE WHEN c.confirmed THEN 'aprovado' ELSE 'pendente' END,
 CASE WHEN c.cycle IN ('P1','P2','Aresta') THEN c.cycle ELSE 'Iniciar' END,
 1+cardinality(c.dependents),c.full_name,c.whatsapp;
END $$;
REVOKE ALL ON FUNCTION public.my_customer_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_customer_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.book_periods(_whatsapp text,_category text,_format text,_dates date[],_periods text[])
RETURNS TABLE(code text,booking_date date,cycle text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.customers%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login com e-mail e senha'; END IF;
 SELECT * INTO c FROM public.customers WHERE auth_user_id=auth.uid() AND whatsapp=regexp_replace(coalesce(_whatsapp,''),'\D','','g');
 IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado para esta conta'; END IF;
 IF NOT c.confirmed THEN RAISE EXCEPTION 'Aguarde a aprovação do seu cadastro'; END IF;
 RETURN QUERY SELECT * FROM public.book_periods_core(c.whatsapp,_category,_format,_dates,_periods);
END $$;
REVOKE ALL ON FUNCTION public.book_periods(text,text,text,date[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.book_periods(text,text,text,date[],text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_action(_code text,_whatsapp text,_action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; phone text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login com e-mail e senha'; END IF;
 SELECT c.whatsapp INTO phone FROM public.customers c WHERE c.auth_user_id=auth.uid() AND c.confirmed;
 IF phone IS NULL OR phone<>regexp_replace(coalesce(_whatsapp,''),'\D','','g') THEN RAISE EXCEPTION 'Cadastro não autorizado'; END IF;
 IF _action NOT IN ('chegou','cancelado','reagendou') THEN RAISE EXCEPTION 'Ação inválida'; END IF;
 UPDATE public.bookings b SET status=_action::public.booking_status WHERE b.code=upper(btrim(_code)) AND b.whatsapp=phone AND b.status::text IN ('agendado','chegou');
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RAISE EXCEPTION 'Reserva não encontrada ou já finalizada'; END IF;
 RETURN _action;
END $$;
REVOKE ALL ON FUNCTION public.customer_action(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_action(text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.register_customer(text,text,text,text[]), public.register_customer(text,text,text,text[],text),public.customer_status(text),public.lookup_profile(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') $$;
COMMENT ON FUNCTION public.claim_first_admin() IS 'Bootstrap retired now that customer authentication is open; checks existing admin role only.';