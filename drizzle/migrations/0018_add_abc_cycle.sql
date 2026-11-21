ALTER TABLE public.schedule_periods ADD COLUMN abc_capacity integer NOT NULL DEFAULT 0 CHECK (abc_capacity >= 0);

DROP FUNCTION public.get_schedule(date,date);
CREATE FUNCTION public.get_schedule(_from date,_to date)
RETURNS TABLE(day date,period text,start_time time,end_time time,iniciar_left integer,p1_left integer,p2_left integer,aresta_left integer,abc_left integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT s.day,s.period,s.start_time,s.end_time,
 s.iniciar_capacity - coalesce(u.i,0)::integer,
 s.p1_capacity - coalesce(u.p1,0)::integer,
 s.p2_capacity - coalesce(u.p2,0)::integer,
 s.aresta_capacity - coalesce(u.a,0)::integer,
 s.abc_capacity - coalesce(u.abc,0)::integer
FROM public.schedule_periods s LEFT JOIN LATERAL (
 SELECT sum(ps) FILTER (WHERE category='Iniciar') i, sum(ps) FILTER (WHERE category='P1') p1,
 sum(ps) FILTER (WHERE category='P2') p2, sum(ps) FILTER (WHERE category='Aresta') a,
 sum(ps) FILTER (WHERE category='ABC') abc
 FROM (SELECT coalesce(b.group_id,b.id) gid,b.category,max(b.party_size) ps FROM public.bookings b
 WHERE b.booking_date=s.day AND b.schedule_period=s.period AND b.status::text NOT IN ('cancelado','reagendou')
 GROUP BY coalesce(b.group_id,b.id),b.category) groups
) u ON true
WHERE s.day BETWEEN _from AND least(_to,_from+370) ORDER BY s.day,s.period
$$;
REVOKE ALL ON FUNCTION public.get_schedule(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schedule(date,date) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.book_periods_core(_whatsapp text,_category text,_format text,_dates date[],_periods text[])
RETURNS TABLE(code text,booking_date date,cycle text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.customers%rowtype; s public.schedule_periods%rowtype; avail record; n integer; idx integer; j integer;
 party integer; cap integer; grp uuid := gen_random_uuid(); new_code text; cycles text[]; chosen date;
BEGIN
 SELECT * INTO c FROM public.customers WHERE whatsapp=regexp_replace(coalesce(_whatsapp,''),'\D','','g');
 IF NOT FOUND THEN RAISE EXCEPTION 'Faça seu cadastro primeiro'; END IF;
 IF _category IS NULL OR _category NOT IN ('Iniciar','P1','P2','Aresta','ABC') THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
 n := coalesce(cardinality(_dates),0);
 IF n=0 OR cardinality(_periods) IS DISTINCT FROM n OR EXISTS (SELECT 1 FROM unnest(_dates) d WHERE d IS NULL) OR EXISTS (SELECT 1 FROM unnest(_periods) p WHERE p IS NULL OR p NOT IN ('integral','tarde')) THEN RAISE EXCEPTION 'Selecione datas e turnos válidos'; END IF;
 IF (SELECT count(DISTINCT d) FROM unnest(_dates) d) <> n THEN RAISE EXCEPTION 'Escolha datas diferentes para os ciclos'; END IF;
 IF _category='Iniciar' THEN
  IF _format='dia_inteiro' THEN
   IF n<>1 OR _periods[1]<>'integral' THEN RAISE EXCEPTION 'Dia inteiro exige uma data integral'; END IF;
  ELSIF _format='duas_tardes' THEN
   IF n<>2 OR _periods[1]<>'tarde' OR _periods[2]<>'tarde' THEN RAISE EXCEPTION 'Escolha duas datas à tarde'; END IF;
  ELSIF _format='tarde_integral' THEN
   IF n<>2 OR NOT ((_periods[1]='tarde' AND _periods[2]='integral') OR (_periods[1]='integral' AND _periods[2]='tarde')) THEN RAISE EXCEPTION 'Escolha uma tarde e um dia integral'; END IF;
  ELSE RAISE EXCEPTION 'Formato inválido'; END IF;
 ELSE
  IF n<>1 THEN RAISE EXCEPTION 'Selecione uma data e turno'; END IF;
 END IF;
 party:=1+cardinality(c.dependents);
 FOR chosen IN SELECT d FROM unnest(_dates) d ORDER BY d LOOP
  PERFORM pg_advisory_xact_lock(hashtext('booking:'||chosen::text));
 END LOOP;
 FOR idx IN 1..n LOOP
  SELECT * INTO s FROM public.schedule_periods WHERE day=_dates[idx] AND period=_periods[idx] FOR UPDATE;
  IF NOT FOUND OR _dates[idx] < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Data ou turno indisponível'; END IF;
  SELECT * INTO avail FROM public.get_schedule(_dates[idx],_dates[idx]) a WHERE a.period=_periods[idx];
  cap:=CASE _category WHEN 'Iniciar' THEN avail.iniciar_left WHEN 'P1' THEN avail.p1_left WHEN 'P2' THEN avail.p2_left WHEN 'ABC' THEN avail.abc_left ELSE avail.aresta_left END;
  IF cap < party THEN RAISE EXCEPTION 'Sem vagas suficientes de % neste turno (restam %)',_category,greatest(cap,0); END IF;
 END LOOP;
 FOR idx IN SELECT i FROM generate_subscripts(_dates,1) i ORDER BY _dates[i] LOOP
  SELECT * INTO s FROM public.schedule_periods WHERE day=_dates[idx] AND period=_periods[idx];
  IF _category='Iniciar' THEN
   IF n=1 THEN cycles:=ARRAY['i1','i2','i3'];
   ELSIF _dates[idx]=(SELECT min(d) FROM unnest(_dates) d) THEN cycles:=ARRAY['i1','i2'];
   ELSE cycles:=ARRAY['i3']; END IF;
  ELSE cycles:=ARRAY[_category]; END IF;
  FOR j IN 1..cardinality(cycles) LOOP
   LOOP new_code:=public.gen_booking_code(); EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.code=new_code); END LOOP;
   INSERT INTO public.bookings(code,full_name,whatsapp,email,booking_date,slot_time,visit_type,category,cycle,format,customer_id,group_id,party_size,schedule_period)
   VALUES(new_code,c.full_name,c.whatsapp,c.email,s.day,s.start_time,_category,_category,cycles[j],CASE WHEN _category='Iniciar' THEN _format ELSE NULL END,c.id,grp,party,s.period);
   code:=new_code; booking_date:=s.day; cycle:=cycles[j]; RETURN NEXT;
  END LOOP;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.book_periods_core(text,text,text,date[],text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_periods_core(text,text,text,date[],text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.register_customer(_name text, _whatsapp text, _email text, _dependents text[], _cycle text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare r text;
begin
  if _cycle is not null and _cycle not in ('Iniciar','P1','P2','Aresta','ABC') then raise exception 'Ciclo inválido'; end if;
  r := public.register_customer(_name, _whatsapp, _email, _dependents);
  if r = 'novo' then
    update public.customers set requested_cycle = _cycle where whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g');
  end if;
  return r;
end $$;
REVOKE ALL ON FUNCTION public.register_customer(text,text,text,text[],text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer(text,text,text,text[],text) TO anon, authenticated, service_role;

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
 CASE WHEN c.cycle IN ('P1','P2','Aresta','ABC') THEN c.cycle ELSE 'Iniciar' END,
 1+cardinality(c.dependents),c.full_name,c.whatsapp;
END $$;
REVOKE ALL ON FUNCTION public.my_customer_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_customer_status() TO authenticated;

ALTER TABLE public.bookings DROP CONSTRAINT attendance_next_cycle_valid;
ALTER TABLE public.bookings ADD CONSTRAINT attendance_next_cycle_valid CHECK (attendance_next_cycle IS NULL OR attendance_next_cycle IN ('i1','i2','i3','P1','P2','Aresta','ABC'));