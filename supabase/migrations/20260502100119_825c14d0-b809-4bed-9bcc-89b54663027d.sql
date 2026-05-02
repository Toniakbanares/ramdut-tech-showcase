-- Tabela de gerações compartilhadas
CREATE TABLE public.lab_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image','svg','chat','meme','pro-fal')),
  result_url TEXT,
  result_text TEXT,
  result_svg TEXT,
  model TEXT,
  device_id TEXT NOT NULL,
  og_image_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_generations_created_at ON public.lab_generations (created_at DESC);
CREATE INDEX idx_lab_generations_device ON public.lab_generations (device_id);

ALTER TABLE public.lab_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared generations"
  ON public.lab_generations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create a shared generation"
  ON public.lab_generations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owner device can delete"
  ON public.lab_generations FOR DELETE
  USING (true);

-- Bucket público para imagens de share/OG
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-shares', 'lab-shares', true);

CREATE POLICY "Public read lab-shares"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lab-shares');

CREATE POLICY "Public upload lab-shares"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lab-shares');