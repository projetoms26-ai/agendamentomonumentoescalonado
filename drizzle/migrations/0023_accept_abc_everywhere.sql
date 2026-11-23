ALTER TABLE public.customers DROP CONSTRAINT customers_cycle_check, ADD CONSTRAINT customers_cycle_check CHECK (cycle = ANY (ARRAY['i1','i2','i3','P1','P2','Aresta','ABC']));
ALTER TABLE public.bookings DROP CONSTRAINT bookings_visit_type_allowed, ADD CONSTRAINT bookings_visit_type_allowed CHECK (visit_type = ANY (ARRAY['Ciclo Interno','Arestas','Janela das Possibilidades','Iniciar','P1','P2','Aresta','ABC']));
CREATE OR REPLACE FUNCTION public.on_booking_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if new.customer_id is not null and new.status is distinct from old.status then
    update customers set last_activity_date = greatest(coalesce(last_activity_date, new.booking_date), new.booking_date) where id = new.customer_id;
    if new.status::text = 'passou' then
      update customers set cycle = case coalesce(cycle, new.cycle)
        when 'i1' then 'i2' when 'i2' then 'i3' when 'i3' then 'P1' when 'P1' then 'P2' when 'P2' then 'Aresta' when 'ABC' then 'ABC' else 'Aresta' end
      where id = new.customer_id;
    end if;
  end if;
  return new;
end $function$;