CREATE OR REPLACE FUNCTION public.customer_status(_whatsapp text)
RETURNS TABLE(status text, allowed text, party integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select case when c.id is null then 'nao_cadastrado' else 'aprovado' end,
    case when c.id is not null then case when c.cycle in ('P1','P2','Aresta') then c.cycle else 'Iniciar' end end,
    case when c.id is not null then 1 + cardinality(c.dependents) end
  from (select 1) one left join public.customers c on c.whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g')
$$;
REVOKE ALL ON FUNCTION public.customer_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_status(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.book_approved(_whatsapp text, _category text, _format text, _dates date[])
RETURNS TABLE(code text, booking_date date, cycle text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare c public.customers%rowtype;
begin
  select * into c from public.customers where whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g');
  if not found then raise exception 'Faça seu cadastro primeiro'; end if;
  if _category not in ('Iniciar','P1','P2','Aresta') then raise exception 'Categoria inválida'; end if;
  return query select * from public.book_cycles(c.full_name, c.whatsapp, coalesce(c.email,''), _category, _format, _dates, 1 + cardinality(c.dependents));
end $$;
REVOKE ALL ON FUNCTION public.book_approved(text,text,text,date[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_approved(text,text,text,date[]) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.book_approved(text,text,text,date[]) IS 'Books for registered customers without requiring administrative confirmation; preserves category and capacity validation.';