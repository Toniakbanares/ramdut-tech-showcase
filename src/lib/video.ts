import { supabase } from '@/integrations/supabase/client';

export type VideoStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface MotionPreset {
  id: string;
  label: string;
  emoji: string;
  suffix: string;
}

/** Movimentos de câmera viram prompt estruturado (o provider não aceita parâmetro direto) */
export const MOTION_PRESETS: MotionPreset[] = [
  { id: 'static', label: 'Estático', emoji: '🎯', suffix: 'locked-off static camera, no camera movement, subject moves naturally' },
  { id: 'dolly-in', label: 'Dolly In', emoji: '⏩', suffix: 'slow cinematic dolly in toward the subject, steady push' },
  { id: 'dolly-out', label: 'Dolly Out', emoji: '⏪', suffix: 'slow cinematic dolly out revealing the environment' },
  { id: 'pan', label: 'Pan', emoji: '↔️', suffix: 'smooth horizontal camera pan across the scene' },
  { id: 'tilt', label: 'Tilt', emoji: '↕️', suffix: 'smooth vertical camera tilt revealing the scene' },
  { id: 'orbit', label: 'Orbit', emoji: '🔄', suffix: 'camera orbits around the subject in a smooth arc' },
  { id: 'zoom', label: 'Zoom', emoji: '🔍', suffix: 'slow optical zoom in, cinematic framing' },
  { id: 'handheld', label: 'Handheld', emoji: '🎥', suffix: 'handheld documentary camera, subtle natural shake' },
];

export const VIDEO_MODELS = [
  { id: 'google/veo-3.1-lite', label: 'Rápido', desc: 'Mais econômico' },
  { id: 'google/veo-3.1-fast', label: 'Equilibrado', desc: 'Melhor qualidade' },
  { id: 'google/veo-3.1', label: 'Máximo', desc: 'Caro, top qualidade' },
] as const;

export const VIDEO_SIZES = [
  { id: '1280x720', label: '16:9 · 720p' },
  { id: '720x1280', label: '9:16 · 720p' },
  { id: '1920x1080', label: '16:9 · 1080p' },
  { id: '1080x1920', label: '9:16 · 1080p' },
] as const;

export interface CreateVideoInput {
  prompt: string;
  model: string;
  seconds: '4' | '6' | '8';
  size: string;
  /** data URL de imagem para image-to-video */
  inputReference?: string;
}

export interface VideoJob {
  id: string;
  status: VideoStatus;
  progress?: number;
  videoUrl?: string;
  error?: string;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('generate-video', { body });
  if (error) throw new Error(error.message || 'Falha ao falar com o servidor de vídeo');
  return data as any;
}

export async function createVideoJob(input: CreateVideoInput): Promise<string> {
  const data = await call({
    action: 'create',
    prompt: input.prompt,
    model: input.model,
    seconds: input.seconds,
    size: input.size,
    input_reference: input.inputReference,
  });
  if (data?.error) throw new Error(data.error);
  if (!data?.id) throw new Error('O provedor não retornou um job de vídeo.');
  return data.id as string;
}

export async function pollVideoJob(id: string): Promise<VideoJob> {
  const data = await call({ action: 'status', id });
  if (data?.error && !data?.status) throw new Error(data.error);
  return { id, status: data.status, progress: data.progress, videoUrl: data.videoUrl, error: data.error };
}

/**
 * Aguarda a conclusão com polling controlado (sem loop infinito).
 * Timeout padrão: 6 minutos.
 */
export async function waitForVideo(
  id: string,
  onProgress?: (job: VideoJob) => void,
  { intervalMs = 7000, timeoutMs = 6 * 60_000, signal }: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<VideoJob> {
  const deadline = Date.now() + timeoutMs;
  let failures = 0;

  while (Date.now() < deadline) {
    if (signal?.aborted) return { id, status: 'cancelled' };
    await new Promise((r) => setTimeout(r, intervalMs));
    if (signal?.aborted) return { id, status: 'cancelled' };

    try {
      const job = await pollVideoJob(id);
      onProgress?.(job);
      if (job.status === 'completed' || job.status === 'failed') return job;
      failures = 0;
    } catch (e) {
      failures += 1;
      if (failures >= 4) {
        return { id, status: 'failed', error: e instanceof Error ? e.message : 'Erro ao consultar o vídeo' };
      }
    }
  }

  return { id, status: 'failed', error: 'O vídeo demorou demais. Tente uma duração menor ou o modelo Rápido.' };
}

export async function downloadVideo(url: string, name: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

/** Converte uma imagem (data URL ou http) em data URL para image-to-video */
export async function toDataUrl(src: string): Promise<string | undefined> {
  if (src.startsWith('data:image/')) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
