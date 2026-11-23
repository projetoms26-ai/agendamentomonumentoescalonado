CREATE OR REPLACE FUNCTION public.on_customer_auth_lifecycle()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m jsonb; phone text; deps text[]; existing public.customers%ROWTYPE;
BEGIN
 m:=coalesce(NEW.raw_user_meta_data,'{}');
 IF TG_OP='INSERT' THEN
   INSERT INTO public.profiles(id,display_name) VALUES(NEW.id,left(coalesce(m->>'full_name',''),120)) ON CONFLICT(id) DO NOTHING;
 END IF;
 IF m->>'registration_kind' IS DISTINCT FROM 'customer' THEN RETURN NEW; END IF;
 phone:=regexp_replace(coalesce(m->>'whatsapp',''),'\D','','g');
 IF length(phone) NOT BETWEEN 10 AND 11 OR length(btrim(coalesce(m->>'full_name',''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Dados de cadastro inválidos'; END IF;
 IF coalesce(m->>'requested_cycle','') NOT IN ('Iniciar','P1','P2','Aresta','ABC') THEN RAISE EXCEPTION 'Ciclo inválido'; END IF;
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
END $function$;