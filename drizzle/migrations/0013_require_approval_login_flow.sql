ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS requested_cycle text;

CREATE OR REPLACE FUNCTION public.register_customer(_name text, _whatsapp text, _email text, _dependents text[], _cycle text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare r text;
begin
  if _cycle is not null and _cycle not in ('Iniciar','P1','P2','Aresta') then raise exception 'Ciclo inválido'; end if;
  r := public.register_customer(_name, _whatsapp, _email, _dependents);
  if r = 'novo' then
    update public.customers set requested_cycle = _cycle where whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g');
  end if;
  return r;
end $$;
REVOKE ALL ON FUNCTION public.register_customer(text,text,text,text[],text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer(text,text,text,text[],text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.customer_status(_whatsapp text)
RETURNS TABLE(status text, allowed text, party integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select case when c.id is null then 'nao_cadastrado' when c.confirmed then 'aprovado' else 'pendente' end,
    case when c.confirmed then case when c.cycle in ('P1','P2','Aresta') then c.cycle else 'Iniciar' end end,
    case when c.confirmed then 1 + cardinality(c.dependents) end
  from (select 1) one left join public.customers c on c.whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g')
$$;

ALTER FUNCTION public.book_periods(text,text,text,date[],text[]) RENAME TO book_periods_core;
REVOKE ALL ON FUNCTION public.book_periods_core(text,text,text,date[],text[]) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.book_periods(_whatsapp text,_category text,_format text,_dates date[],_periods text[])
RETURNS TABLE(code text,booking_date date,cycle text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ok boolean;
BEGIN
  SELECT confirmed INTO ok FROM public.customers WHERE whatsapp=regexp_replace(coalesce(_whatsapp,''),'\D','','g');
  IF NOT FOUND THEN RAISE EXCEPTION 'Faça seu cadastro primeiro'; END IF;
  IF NOT ok THEN RAISE EXCEPTION 'Aguarde a aprovação do seu cadastro'; END IF;
  RETURN QUERY SELECT * FROM public.book_periods_core(_whatsapp,_category,_format,_dates,_periods);
END $$;
REVOKE ALL ON FUNCTION public.book_periods(text,text,text,date[],text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_periods(text,text,text,date[],text[]) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.book_approved(_whatsapp text, _category text, _format text, _dates date[])
RETURNS TABLE(code text, booking_date date, cycle text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin raise exception 'Use o agendamento por turnos'; end $$;