-- Tabela para armazenar mensagens do formulário de contato
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT email_length CHECK (char_length(email) BETWEEN 3 AND 255),
  CONSTRAINT subject_length CHECK (char_length(subject) BETWEEN 1 AND 200),
  CONSTRAINT message_length CHECK (char_length(message) BETWEEN 1 AND 5000)
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode enviar mensagem (insert público)
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Ninguém pode ler via cliente (somente admin via service role no painel)
-- Nenhuma policy SELECT é criada propositalmente.

-- Index para ordenação rápida por data
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages (created_at DESC);