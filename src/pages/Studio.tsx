import { useCallback, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Loader2, Download, Share2, RefreshCw, X, Upload,
  AlertTriangle, Wand2, ImagePlus, Layers, Laugh, Maximize2, Grid2x2, Grid3x3,
} from 'lucide-react';

import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useToast } from '@/hooks/use-toast';
import { invokeAi, humanizeAiError } from '@/lib/ai-invoke';
import { downloadDataUrl } from '@/lib/lab-helpers';
import { composeMeme, MEME_SUBJECTS, MEME_STYLES } from '@/lib/meme';

type Quality = 'fast' | 'standard' | 'hd' | 'ultra';

interface Preset {
  id: string;
  label: string;
  emoji: string;
  suffix: string;
  aspect: string;
}

/** Presets no espírito do Higgsfield: um clique = look completo */
const PRESETS: Preset[] = [
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', aspect: '21:9', suffix: 'cinematic still, anamorphic lens, shallow depth of field, dramatic film lighting, kodak color grade' },
  { id: 'portrait', label: 'Retrato Pro', emoji: '🧑‍🎤', aspect: '4:3', suffix: 'editorial portrait, 85mm lens, softbox lighting, skin texture detail, high fashion' },
  { id: 'product', label: 'Produto', emoji: '📦', aspect: '1:1', suffix: 'studio product photography, seamless background, reflective surface, crisp specular highlights' },
  { id: 'anime', label: 'Anime', emoji: '🌸', aspect: '9:16', suffix: 'modern anime key visual, cel shading, vibrant colors, detailed background art' },
  { id: 'render3d', label: '3D Render', emoji: '🧊', aspect: '1:1', suffix: '3d render, octane, subsurface scattering, studio hdri lighting, ultra detailed' },
  { id: 'poster', label: 'Poster', emoji: '🖼️', aspect: '9:16', suffix: 'graphic poster art, bold composition, duotone palette, print quality' },
  { id: 'concept', label: 'Concept Art', emoji: '⚔️', aspect: '16:9', suffix: 'concept art, matte painting, epic scale, volumetric light, artstation trending' },
  { id: 'analog', label: 'Analógico', emoji: '📷', aspect: '3:2', suffix: '35mm film photo, grain, natural light, candid moment, faded colors' },
];

const ENGINES: { id: 'auto' | 'pollinations' | 'pro-fal'; label: string; desc: string }[] = [
  { id: 'auto', label: 'Auto', desc: 'Gemini com fallback' },
  { id: 'pollinations', label: 'Turbo', desc: 'Grátis e ilimitado' },
  { id: 'pro-fal', label: 'Pro', desc: 'Flux / SDXL' },
];

const ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:2', '21:9'];
const QUALITIES: { id: Quality; label: string }[] = [
  { id: 'fast', label: 'Rápido' },
  { id: 'standard', label: 'Padrão' },
  { id: 'hd', label: 'HD' },
  { id: 'ultra', label: 'Ultra' },
];

interface Shot {
  id: string;
  prompt: string;
  status: 'loading' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
  model?: string;
  engine: 'auto' | 'pollinations' | 'pro-fal';
  aspect: string;
  quality: Quality;
  ref?: string;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const Studio = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState('');
  const [preset, setPreset] = useState<string | null>('cinematic');
  const [engine, setEngine] = useState<'auto' | 'pollinations' | 'pro-fal'>('auto');
  const [aspect, setAspect] = useState('16:9');
  const [quality, setQuality] = useState<Quality>('hd');
  const [batch, setBatch] = useState(1);
  const [reference, setReference] = useState<string | undefined>();
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);

  const activePreset = useMemo(() => PRESETS.find((p) => p.id === preset), [preset]);

  const patch = (id: string, p: Partial<Shot>) =>
    setShots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const runShot = useCallback(
    async (shot: Shot) => {
      try {
        const full = activePreset && shot.prompt.indexOf(activePreset.suffix) === -1
          ? `${shot.prompt}, ${activePreset.suffix}`
          : shot.prompt;

        const data =
          shot.engine === 'pro-fal'
            ? await invokeAi<any>('generate-fal', { prompt: full, model: 'flux-schnell' })
            : await invokeAi<any>('generate-image', {
                prompt: full,
                provider: shot.engine === 'pollinations' ? 'pollinations' : undefined,
                aspect_ratio: shot.aspect,
                quality: shot.quality,
                reference_images: shot.ref ? [shot.ref] : undefined,
              });

        if (!data?.imageUrl) throw new Error('Sem imagem');
        patch(shot.id, { imageUrl: data.imageUrl, model: data.provider, status: 'done' });
      } catch (e) {
        const info = humanizeAiError(e);
        patch(shot.id, { status: 'error', error: info.description });
      }
    },
    [activePreset],
  );

  const generate = useCallback(async () => {
    const base = prompt.trim();
    if (!base) {
      toast({ title: 'Escreva uma ideia', description: 'Descreva o que você quer criar.' });
      return;
    }
    setBusy(true);
    const newShots: Shot[] = Array.from({ length: batch }, (_, i) => ({
      id: crypto.randomUUID(),
      prompt: batch > 1 ? `${base} (variação ${i + 1})` : base,
      status: 'loading',
      engine,
      aspect,
      quality,
      ref: reference,
    }));
    setShots((s) => [...newShots, ...s]);
    await Promise.allSettled(newShots.map(runShot));
    setBusy(false);
  }, [prompt, batch, engine, aspect, quality, reference, runShot, toast]);

  const retry = (shot: Shot) => {
    patch(shot.id, { status: 'loading', error: undefined });
    runShot({ ...shot, status: 'loading' });
  };

  const remix = (shot: Shot) => {
    if (!shot.imageUrl) return;
    setReference(shot.imageUrl);
    setPrompt(shot.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: 'Remix pronto', description: 'A imagem virou referência. Ajuste o prompt e gere.' });
  };

  const share = async (shot: Shot) => {
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;
    if (canShare) {
      try {
        await navigator.share({ title: 'RAMDUT Studio', text: shot.prompt });
        return;
      } catch { /* usuário cancelou */ }
    }
    await navigator.clipboard.writeText(shot.prompt).catch(() => {});
    toast({ title: 'Prompt copiado' });
  };

  const onPickFile = async (f: File) => {
    if (f.size > 4 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 4MB.', variant: 'destructive' });
      return;
    }
    setReference(await fileToDataUrl(f));
  };

  const title = 'RAMDUT Studio — Gerador de imagens IA com presets cinematográficos';
  const description =
    'Studio de criação visual com IA: presets cinematográficos, remix por referência, lote de variações e download em alta. Grátis, mobile-first.';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header
        className="sticky top-0 z-40 ramu-glass border-b border-white/5 px-3 h-14 flex items-center gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Link to="/" className="text-neutral-400 hover:text-white" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-base">
          RAMDUT<span className="text-[#8B5CF6]">.studio</span>
        </h1>
        <Link
          to="/lab"
          className="ml-auto h-9 px-3 rounded-lg border border-white/10 text-xs text-neutral-300 hover:text-white flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" /> Canvas
        </Link>
      </header>

      <main className="px-3 pb-40 lg:pb-10 max-w-5xl mx-auto">
        {/* Presets */}
        <section className="pt-4">
          <h2 className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Presets</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 snap-x">
            {PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPreset(active ? null : p.id);
                    if (!active) setAspect(p.aspect);
                  }}
                  className={`snap-start shrink-0 w-[104px] h-[104px] rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    active
                      ? 'border-[#8B5CF6] bg-gradient-to-br from-[#8B5CF6]/25 to-[#06B6D4]/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{p.aspect}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Composer */}
        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Descreva a cena… ex: um astronauta tomando café numa varanda em Marte"
            className="w-full bg-transparent text-base resize-none focus:outline-none placeholder:text-neutral-600"
          />

          {/* Referência */}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.target.value = '';
              }}
            />
            {reference ? (
              <div className="relative">
                <img src={reference} alt="Imagem de referência" className="h-14 w-14 rounded-xl object-cover border border-[#8B5CF6]/50" />
                <button
                  onClick={() => setReference(undefined)}
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-black border border-white/20 grid place-items-center"
                  aria-label="Remover referência"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="h-14 w-14 rounded-xl border border-dashed border-white/15 grid place-items-center text-neutral-500 hover:text-white"
                aria-label="Adicionar referência"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
            <p className="text-[11px] text-neutral-500 flex-1">
              {reference ? 'Referência ativa — a IA vai manter o sujeito.' : 'Opcional: envie uma imagem de referência (img2img).'}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          </div>

          {/* Engine */}
          <div className="grid grid-cols-3 gap-1.5">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                onClick={() => setEngine(e.id)}
                className={`h-12 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-colors ${
                  engine === e.id
                    ? 'bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white'
                    : 'bg-white/5 border border-white/10 text-neutral-300'
                }`}
              >
                {e.label}
                <span className="text-[9px] opacity-70">{e.desc}</span>
              </button>
            ))}
          </div>

          {/* Aspect */}
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={`h-10 px-3 rounded-lg text-xs font-mono ${
                  aspect === a ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-neutral-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Quality + batch */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={`h-10 rounded-lg text-xs font-medium ${
                  quality === q.id ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-neutral-300'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Lote</span>
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setBatch(n)}
                className={`h-10 w-12 rounded-lg text-xs font-medium ${
                  batch === n ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-neutral-300'
                }`}
              >
                {n}x
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {busy ? 'Criando…' : `Criar ${batch > 1 ? `${batch} imagens` : 'imagem'}`}
          </button>
        </section>

        {/* Galeria */}
        <section className="mt-5">
          {shots.length === 0 ? (
            <div className="text-center py-14 text-neutral-500">
              <Wand2 className="h-10 w-10 mx-auto mb-3 text-[#8B5CF6]/60" />
              <p className="text-sm">Escolha um preset, descreva a cena e crie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <AnimatePresence initial={false}>
                {shots.map((s) => (
                  <motion.article
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]"
                  >
                    <div className="relative aspect-square bg-neutral-900 grid place-items-center">
                      {s.status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />}
                      {s.status === 'error' && (
                        <div className="text-center px-3">
                          <AlertTriangle className="h-6 w-6 mx-auto text-red-400 mb-1.5" />
                          <p className="text-[10px] text-neutral-400 line-clamp-3 mb-2">{s.error}</p>
                          <button
                            onClick={() => retry(s)}
                            className="min-h-[40px] px-3 rounded-lg bg-white/10 text-xs flex items-center gap-1.5 mx-auto"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Repetir
                          </button>
                        </div>
                      )}
                      {s.imageUrl && (
                        <img src={s.imageUrl} alt={s.prompt} loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="px-2.5 py-2 text-[11px] text-neutral-400 line-clamp-2">{s.prompt}</p>
                    {s.status === 'done' && (
                      <div className="grid grid-cols-3 border-t border-white/5">
                        <button
                          onClick={() => remix(s)}
                          className="min-h-[44px] text-[10px] text-neutral-300 hover:bg-white/5 flex flex-col items-center justify-center gap-0.5"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Remix
                        </button>
                        <button
                          onClick={() => s.imageUrl && downloadDataUrl(s.imageUrl, `ramdut-${s.id.slice(0, 6)}.png`)}
                          className="min-h-[44px] text-[10px] text-neutral-300 hover:bg-white/5 flex flex-col items-center justify-center gap-0.5"
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar
                        </button>
                        <button
                          onClick={() => share(s)}
                          className="min-h-[44px] text-[10px] text-neutral-300 hover:bg-white/5 flex flex-col items-center justify-center gap-0.5"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Enviar
                        </button>
                      </div>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Studio;
