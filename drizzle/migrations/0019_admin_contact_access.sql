CREATE OR REPLACE FUNCTION public.add_admin_contact(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE target_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Somente administradores podem liberar este acesso.' USING ERRCODE = '42501';
  END IF;
  IF _email IS NULL OR length(btrim(_email)) > 254 OR btrim(_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Informe um e-mail válido.' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO target_id FROM auth.users
    WHERE lower(email) = lower(btrim(_email)) AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL AND NOT is_anonymous;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'O contato precisa ter uma conta cadastrada e confirmar o e-mail antes de receber acesso administrativo.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (target_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  IF NOT FOUND THEN RETURN 'already_admin'; END IF;
  RETURN 'added';
END;
$$;
REVOKE ALL ON FUNCTION public.add_admin_contact(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_admin_contact(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admin_contacts()
RETURNS TABLE(user_id uuid, email text, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT u.id, u.email::text, coalesce(p.display_name, '')
    FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE r.role = 'admin'::public.app_role ORDER BY lower(u.email);
END;
$$;
REVOKE ALL ON FUNCTION public.list_admin_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_contacts() TO authenticated;