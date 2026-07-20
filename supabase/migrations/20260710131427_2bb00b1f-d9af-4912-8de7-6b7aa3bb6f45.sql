
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
DROP POLICY IF EXISTS "contact anon insert" ON public.contact_messages;
CREATE POLICY "contact anon insert" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 200
    AND length(message) BETWEEN 1 AND 5000
  );
