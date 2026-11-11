ALTER TABLE public.bookings ADD COLUMN attendance_duration_seconds integer;
ALTER TABLE public.bookings ADD COLUMN attendance_next_cycle text;
ALTER TABLE public.bookings ADD CONSTRAINT attendance_duration_valid CHECK (attendance_duration_seconds IS NULL OR attendance_duration_seconds BETWEEN 0 AND 86400);
ALTER TABLE public.bookings ADD CONSTRAINT attendance_next_cycle_valid CHECK (attendance_next_cycle IS NULL OR attendance_next_cycle IN ('i1','i2','i3','P1','P2','Aresta'));
CREATE TABLE public.attendance_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL, customer_id uuid, owner_user_id uuid,
 attendance_date date NOT NULL, cycle text, result public.booking_status NOT NULL, next_cycle text,
 duration_seconds integer, recorded_at timestamptz NOT NULL DEFAULT now(), recorded_by uuid,
 source text NOT NULL DEFAULT 'admin'
);
GRANT SELECT ON public.attendance_history TO authenticated;
GRANT ALL ON public.attendance_history TO service_role;
ALTER TABLE public.attendance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read attendance history" ON public.attendance_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner read attendance history" ON public.attendance_history FOR SELECT TO authenticated USING (owner_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.customers c WHERE c.id=customer_id AND c.auth_user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.record_attendance_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; next_value text;
BEGIN
 IF NEW.status::text NOT IN ('concluiu','faltou','repetir','passou','atendido','nao_compareceu') THEN RETURN NEW; END IF;
 IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.cycle IS NOT DISTINCT FROM OLD.cycle AND NEW.attendance_duration_seconds IS NOT DISTINCT FROM OLD.attendance_duration_seconds AND NEW.attendance_next_cycle IS NOT DISTINCT FROM OLD.attendance_next_cycle THEN RETURN NEW; END IF;
 SELECT c.auth_user_id,c.cycle INTO owner_id,next_value FROM public.customers c WHERE c.id=NEW.customer_id;
 INSERT INTO public.attendance_history(booking_id,customer_id,owner_user_id,attendance_date,cycle,result,next_cycle,duration_seconds,recorded_by)
 VALUES(NEW.id,NEW.customer_id,owner_id,NEW.booking_date,NEW.cycle,NEW.status,coalesce(NEW.attendance_next_cycle,next_value),NEW.attendance_duration_seconds,auth.uid());
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_attendance_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER z_record_attendance_history AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.record_attendance_history();
CREATE OR REPLACE FUNCTION public.my_attendance_history() RETURNS SETOF public.attendance_history LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT h.* FROM public.attendance_history h WHERE auth.uid() IS NOT NULL AND (h.owner_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.customers c WHERE c.id=h.customer_id AND c.auth_user_id=auth.uid())) ORDER BY h.attendance_date DESC,h.recorded_at DESC,h.id;
$$;
REVOKE ALL ON FUNCTION public.my_attendance_history() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_attendance_history() TO authenticated;
INSERT INTO public.attendance_history(booking_id,customer_id,owner_user_id,attendance_date,cycle,result,next_cycle,duration_seconds,recorded_at,source)
 SELECT b.id,b.customer_id,c.auth_user_id,b.booking_date,b.cycle,b.status,NULL,NULL,b.updated_at,'legacy' FROM public.bookings b LEFT JOIN public.customers c ON c.id=b.customer_id WHERE b.status::text IN ('concluiu','faltou','repetir','passou','atendido','nao_compareceu');
COMMENT ON TABLE public.attendance_history IS 'Append-only attendance snapshots. Legacy rows preserve only known booking facts; prior edits cannot be reconstructed.';