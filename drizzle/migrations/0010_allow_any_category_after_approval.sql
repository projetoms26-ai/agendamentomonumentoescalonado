CREATE OR REPLACE FUNCTION public.book_approved(_whatsapp text, _category text, _format text, _dates date[])
RETURNS TABLE(code text, booking_date date, cycle text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare c customers%rowtype;
begin
  select * into c from customers where whatsapp = regexp_replace(coalesce(_whatsapp,''),'\D','','g');
  if not found then raise exception 'Faça seu cadastro primeiro'; end if;
  if not c.confirmed then raise exception 'Seu cadastro ainda está em análise pela equipe'; end if;
  if _category not in ('Iniciar','P1','P2','Aresta') then raise exception 'Categoria inválida'; end if;
  return query select * from public.book_cycles(c.full_name, c.whatsapp, coalesce(c.email,''), _category, _format, _dates, 1 + cardinality(c.dependents));
end $$;
REVOKE ALL ON FUNCTION public.book_approved(text,text,text,date[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_approved(text,text,text,date[]) TO anon, authenticated, service_role;