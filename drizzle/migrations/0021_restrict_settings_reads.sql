DROP POLICY IF EXISTS "signed in read settings" ON public.settings;
CREATE POLICY "admin read settings" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE OR REPLACE FUNCTION public.get_payment_note() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT payment_note FROM public.settings WHERE id = 1 $$;
REVOKE ALL ON FUNCTION public.get_payment_note() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payment_note() TO authenticated;