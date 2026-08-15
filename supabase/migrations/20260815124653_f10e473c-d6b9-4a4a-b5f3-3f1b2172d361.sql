
ALTER TABLE public.contact_messages DROP CONSTRAINT contact_messages_email_valid;
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_email_valid
  CHECK (char_length(email) <= 255 AND email ~* ('^[A-Za-z0-9._' || chr(37) || '+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'));
