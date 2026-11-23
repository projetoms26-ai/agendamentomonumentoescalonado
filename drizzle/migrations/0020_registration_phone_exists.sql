CREATE OR REPLACE FUNCTION public.registration_phone_exists(_whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE normalized text := regexp_replace(coalesce(_whatsapp, ''), '\D', '', 'g');
BEGIN
  IF normalized !~ '^\d{10,11}$' THEN
    RAISE EXCEPTION 'Celular inválido';
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.customers c WHERE c.whatsapp = normalized);
END;
$$;
REVOKE ALL ON FUNCTION public.registration_phone_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_phone_exists(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.registration_phone_exists(text) IS 'Registration-only phone existence check; returns a boolean without exposing customer details. The Auth lifecycle trigger remains the authoritative duplicate guard.';