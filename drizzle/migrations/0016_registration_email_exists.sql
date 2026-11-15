CREATE OR REPLACE FUNCTION public.registration_email_exists(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE normalized text := lower(btrim(coalesce(_email, '')));
BEGIN
  IF char_length(normalized) > 255 OR normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;
  RETURN EXISTS (SELECT 1 FROM auth.users u WHERE lower(btrim(u.email)) = normalized)
    OR EXISTS (SELECT 1 FROM public.customers c WHERE lower(btrim(c.email)) = normalized);
END;
$$;
REVOKE ALL ON FUNCTION public.registration_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_email_exists(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.registration_email_exists(text) IS 'Registration-only email existence check; exposes no account details and includes unconfirmed and unapproved registrations.';