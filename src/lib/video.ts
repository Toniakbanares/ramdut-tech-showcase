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
  { id: 'google/gemini-omni-1.1-flash', label: 'Omni', desc: 'Mais novo, com áudio' },
  { id: 'fal/kling-standard', label: 'Kling', desc: 'Alternativa econômica' },
  { id: 'google/veo-3.1-lite', label: 'Veo', desc: 'Qualidade Google' },
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
  provider?: string;
}

export class VideoCallError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = 'unknown', status?: number) {
    super(message);
    this.name = 'VideoCallError';
    this.code = code;
    this.status = status;
  }
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('generate-video', { body });
  if (error) {
    const response = error.context as Response | undefined;
    if (response) {
      const payload = await response.clone().json().catch(() => null);
      const message = payload?.error || payload?.message || error.message || 'Falha ao falar com o servidor de vídeo';
      throw new VideoCallError(message, payload?.code || 'provider', response.status);
    }
    throw new VideoCallError(error.message || 'Falha ao falar com o servidor de vídeo', 'network');
  }
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
  if (data?.error) throw new VideoCallError(data.error, data.code || 'provider');
  if (!data?.id) throw new Error('O provedor não retornou um job de vídeo.');
  return data.id as string;
}

export async function cancelVideoJob(id: string) {
  try {
    await call({ action: 'cancel', id });
  } catch {
    /* cancelamento é best-effort */
  }
}

export async function deleteVideoJob(id: string) {
  try {
    await call({ action: 'delete', id });
  } catch {
    /* exclusão local acontece de qualquer forma */
  }
}

export async function pollVideoJob(id: string): Promise<VideoJob> {
  const data = await call({ action: 'status', id });
  if (data?.error && !data?.status) throw new Error(data.error);
  return { id, status: data.status, progress: data.progress, videoUrl: data.videoUrl, error: data.error, provider: data.provider };
}


/**
 * Aguarda a conclusão até o provedor terminar ou o usuário cancelar.
 * Gerações longas não são abandonadas por um timeout artificial.
 */
export async function waitForVideo(
  id: string,
  onProgress?: (job: VideoJob) => void,
  { intervalMs = 7000, signal }: { intervalMs?: number; signal?: AbortSignal } = {},
): Promise<VideoJob> {
  let failures = 0;

  while (!signal?.aborted) {
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

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { id, status: 'cancelled' };
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
