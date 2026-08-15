
-- 1) Admin check without exposing the SECURITY DEFINER function to signed-in users
DROP POLICY IF EXISTS "Admins can read contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;

-- 2) Validate contact message inserts
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT contact_messages_email_valid CHECK (char_length(email) <= 255 AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT contact_messages_subject_len CHECK (char_length(btrim(subject)) BETWEEN 1 AND 200),
  ADD CONSTRAINT contact_messages_message_len CHECK (char_length(btrim(message)) BETWEEN 10 AND 5000);

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 100
  AND char_length(btrim(subject)) BETWEEN 1 AND 200
  AND char_length(btrim(message)) BETWEEN 10 AND 5000
  AND char_length(email) <= 255
);
