CREATE TABLE public.schedule_periods (
 day date NOT NULL,
 period text NOT NULL CHECK (period IN ('integral','tarde','manha')),
 start_time time NOT NULL,
 end_time time NOT NULL,
 iniciar_capacity integer NOT NULL DEFAULT 0 CHECK (iniciar_capacity >= 0),
 p1_capacity integer NOT NULL DEFAULT 0 CHECK (p1_capacity >= 0),
 p2_capacity integer NOT NULL DEFAULT 0 CHECK (p2_capacity >= 0),
 aresta_capacity integer NOT NULL DEFAULT 0 CHECK (aresta_capacity >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (day,period), CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_periods TO authenticated;
GRANT ALL ON public.schedule_periods TO service_role;
ALTER TABLE public.schedule_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage periods" ON public.schedule_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.schedule_periods(day,period,start_time,end_time,iniciar_capacity,p1_capacity,p2_capacity,aresta_capacity)
SELECT day,period,start_time,end_time,greatest(iniciar_capacity,0),greatest(p1_capacity,0),greatest(p2_capacity,0),greatest(aresta_capacity,0) FROM public.schedule_days WHERE end_time > start_time;
ALTER TABLE public.bookings ADD COLUMN schedule_period text;
UPDATE public.bookings b SET schedule_period = s.period FROM public.schedule_days s WHERE b.booking_date = s.day;
COMMENT ON TABLE public.schedule_days IS 'DEPRECATED: current publication uses schedule_periods with independent date/period capacity; retained for legacy compatibility.';
CREATE OR REPLACE FUNCTION public.get_schedule(_from date,_to date)
RETURNS TABLE(day date,period text,start_time time,end_time time,iniciar_left integer,p1_left integer,p2_left integer,aresta_left integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT s.day,s.period,s.start_time,s.end_time,
 s.iniciar_capacity - coalesce(u.i,0)::integer,
 s.p1_capacity - coalesce(u.p1,0)::integer,
 s.p2_capacity - coalesce(u.p2,0)::integer,
 s.aresta_capacity - coalesce(u.a,0)::integer
FROM public.schedule_periods s LEFT JOIN LATERAL (
 SELECT sum(ps) FILTER (WHERE category='Iniciar') i, sum(ps) FILTER (WHERE category='P1') p1,
 sum(ps) FILTER (WHERE category='P2') p2, sum(ps) FILTER (WHERE category='Aresta') a
 FROM (SELECT coalesce(b.group_id,b.id) gid,b.category,max(b.party_size) ps FROM public.bookings b
 WHERE b.booking_date=s.day AND b.schedule_period=s.period AND b.status::text NOT IN ('cancelado','reagendou')
 GROUP BY coalesce(b.group_id,b.id),b.category) groups
) u ON true
WHERE s.day BETWEEN _from AND least(_to,_from+370) ORDER BY s.day,s.period
$$;
REVOKE ALL ON FUNCTION public.get_schedule(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schedule(date,date) TO anon,authenticated,service_role;
CREATE FUNCTION public.book_periods(_whatsapp text,_category text,_format text,_dates date[],_periods text[])
RETURNS TABLE(code text,booking_date date,cycle text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.customers%rowtype; s public.schedule_periods%rowtype; avail record; n integer; idx integer; j integer;
 party integer; cap integer; grp uuid := gen_random_uuid(); new_code text; cycles text[]; chosen date;
BEGIN
 SELECT * INTO c FROM public.customers WHERE whatsapp=regexp_replace(coalesce(_whatsapp,''),'\D','','g');
 IF NOT FOUND THEN RAISE EXCEPTION 'Faça seu cadastro primeiro'; END IF;
 IF _category IS NULL OR _category NOT IN ('Iniciar','P1','P2','Aresta') THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
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
  cap:=CASE _category WHEN 'Iniciar' THEN avail.iniciar_left WHEN 'P1' THEN avail.p1_left WHEN 'P2' THEN avail.p2_left ELSE avail.aresta_left END;
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
REVOKE ALL ON FUNCTION public.book_periods(text,text,text,date[],text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_periods(text,text,text,date[],text[]) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.book_approved(_whatsapp text,_category text,_format text,_dates date[])
RETURNS TABLE(code text,booking_date date,cycle text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE periods text[];
BEGIN
 SELECT array_agg(s.period ORDER BY d.idx) INTO periods FROM unnest(_dates) WITH ORDINALITY d(day,idx) LEFT JOIN public.schedule_days s ON s.day=d.day;
 RETURN QUERY SELECT * FROM public.book_periods(_whatsapp,_category,_format,_dates,periods);
END $$;