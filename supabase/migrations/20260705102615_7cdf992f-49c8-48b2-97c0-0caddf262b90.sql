CREATE TABLE public.ramon_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ramon_chat_threads TO authenticated;
GRANT ALL ON public.ramon_chat_threads TO service_role;
ALTER TABLE public.ramon_chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own Ramon chat threads"
ON public.ramon_chat_threads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can create own Ramon chat threads"
ON public.ramon_chat_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own Ramon chat threads"
ON public.ramon_chat_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own Ramon chat threads"
ON public.ramon_chat_threads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.ramon_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ramon_chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ai_message_id text,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ramon_chat_messages TO authenticated;
GRANT ALL ON public.ramon_chat_messages TO service_role;
ALTER TABLE public.ramon_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own Ramon chat messages"
ON public.ramon_chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can create own Ramon chat messages"
ON public.ramon_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.ramon_chat_threads t
    WHERE t.id = thread_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own Ramon chat messages"
ON public.ramon_chat_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own Ramon chat messages"
ON public.ramon_chat_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_ramon_chat_threads_user_updated ON public.ramon_chat_threads(user_id, updated_at DESC);
CREATE INDEX idx_ramon_chat_messages_thread_created ON public.ramon_chat_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ramon_chat_threads_updated_at
BEFORE UPDATE ON public.ramon_chat_threads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();