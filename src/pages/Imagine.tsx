import { useCallback, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, Copy, Share2, Wand2, Layers, ChevronUp,
  Sun, Moon, Crown, Image as ImageIcon, History, X, Loader2,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLabStore } from '@/store/lab-store';
import { useGenerationLimit } from '@/hooks/use-generation-limit';
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LumisIcon } from '@/components/lab/LumisIcon';
import {
  getDeviceId, downloadDataUrl, type LabMode,
} from '@/lib/lab-helpers';

type Ratio = '1:1' | '16:9' | '9:16' | '4:3';
type ModelId = 'gemini-free' | 'flux-schnell' | 'flux-pro';

const MODELS: { id: ModelId; label: string; tier: 'FREE' | 'PRO'; mode: LabMode }[] = [
  { id: 'gemini-free', label: 'Gemini Nano Banana — rápido', tier: 'FREE', mode: 'image' },
  { id: 'flux-schnell', label: 'Flux Schnell — fal.ai', tier: 'PRO', mode: 'pro-fal' },
  { id: 'flux-pro', label: 'Flux Pro — alta qualidade', tier: 'PRO', mode: 'pro-fal' },
];

const STYLE_CHIPS: { id: string; label: string; suffix: string }[] = [
  { id: 'photo', label: 'Photorealistic', suffix: 'photorealistic style' },
  { id: 'cyber', label: 'Cyberpunk', suffix: 'cyberpunk style' },
  { id: 'anime', label: 'Anime', suffix: 'anime style' },
  { id: 'mini', label: 'Minimalista', suffix: 'minimalist, clean' },
  { id: '3d', label: '3D Render', suffix: '3d render, octane' },
  { id: 'water', label: 'Aquarela', suffix: 'watercolor painting' },
  { id: 'pixel', label: 'Pixel Art', suffix: 'pixel art, 16-bit' },
  { id: 'noir', label: 'Noir', suffix: 'film noir, high contrast' },
  { id: 'oil', label: 'Pintura óleo', suffix: 'oil painting' },
  { id: 'iso', label: 'Isométrico', suffix: 'isometric illustration' },
];

const RATIOS: { id: Ratio; label: string; w: number; h: number }[] = [
  { id: '1:1', label: '1:1', w: 1, h: 1 },
  { id: '16:9', label: '16:9', w: 16, h: 9 },
  { id: '9:16', label: '9:16', w: 9, h: 16 },
  { id: '4:3', label: '4:3', w: 4, h: 3 },
];

interface CanvasResult {
  url: string;
  prompt: string;
  ratio: Ratio;
  model: ModelId;
  ts: number;
}

const Imagine = () => {
  const { toast } = useToast();
  const limit = useGenerationLimit();
  const setProStore = useLabStore((s) => s.setPro);

  const [model, setModel] = useState<ModelId>('gemini-free');
  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [ratio, setRatio] = useState<Ratio>('1:1');
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState<CanvasResult | null>(null);
  const [history, setHistory] = useState<CanvasResult[]>([]);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixReason, setPixReason] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const isLight = theme === 'light';

  const buildPrompt = (base: string) => {
    if (!styles.length) return base;
    const suffix = STYLE_CHIPS.filter((c) => styles.includes(c.id)).map((c) => c.suffix).join(', ');
    return `${base}, ${suffix}`;
  };

  const toggleStyle = (id: string) =>
    setStyles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const aspectStyle = useMemo(() => {
    const r = RATIOS.find((x) => x.id === ratio)!;
    return { aspectRatio: `${r.w} / ${r.h}` };
  }, [ratio]);

  const handleGenerate = useCallback(async () => {
    const txt = prompt.trim();
    if (!txt) {
      toast({ title: 'Escreva um prompt', description: 'Descreva a imagem que quer gerar.' });
      return;
    }

    const selectedModel = MODELS.find((m) => m.id === model)!;
    if (selectedModel.tier === 'PRO' && !limit.isPro) {
      setPixReason('Esse modelo é Pro. Desbloqueia por R$ 9,90 PIX.');
      setPixOpen(true);
      return;
    }
    if (limit.limitReached) {
      setPixReason('Você bateu o limite mensal grátis. Desbloqueia por R$ 9,90 PIX.');
      setPixOpen(true);
      return;
    }

    setGenerating(true);
    setSheetOpen(false);
    try {
      const final = buildPrompt(txt);
      const aspect = ratio;
      let url: string | undefined;

      if (selectedModel.mode === 'pro-fal') {
        const { data, error } = await supabase.functions.invoke('generate-fal', {
          body: { prompt: final, model: model === 'flux-pro' ? 'flux-pro' : 'flux-schnell', aspect_ratio: aspect },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        url = data.imageUrl;
      } else {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: final, model: 'google/gemini-2.5-flash-image', aspect_ratio: aspect },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        url = data.imageUrl;
      }

      if (!url) throw new Error('Sem resultado');
      const res: CanvasResult = { url, prompt: txt, ratio, model, ts: Date.now() };
      setCurrent(res);
      setHistory((h) => [res, ...h].slice(0, 8));
      limit.increment();
    } catch (e: any) {
      toast({ title: 'Falha', description: e?.message?.slice(0, 200) || 'Tente novamente', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [prompt, styles, ratio, model, limit, toast]);

  const handleVariations = async () => {
    if (!current) return;
    const variants = ['mais vibrante', 'ângulo diferente', 'iluminação dramática', 'estilo alternativo'];
    for (const v of variants.slice(0, 1)) {
      setPrompt(`${current.prompt}, ${v}`);
      await handleGenerate();
    }
  };

  const handleRemix = () => {
    if (!current) return;
    setPrompt(current.prompt);
    setSheetOpen(true);
  };

  const handleCopy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.url);
      toast({ title: 'URL copiada' });
    } catch {
      toast({ title: 'Falha ao copiar', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    if (!current) return;
    if (!limit.isPro) {
      setPixReason('Download HD é exclusivo Pro.');
      setPixOpen(true);
      return;
    }
    downloadDataUrl(current.url, `imagine-${current.ts}.png`);
  };

  const handleShare = async () => {
    if (!current) return;
    setSharing(true);
    try {
      const { data, error } = await supabase
        .from('lab_generations')
        .insert({
          prompt: current.prompt,
          type: 'image',
          result_url: current.url,
          model: current.model,
          device_id: getDeviceId(),
        })
        .select('id')
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/lab/share/${data.id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: 'Link copiado!', description: url });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  // Tokens semânticos light/dark
  const t = isLight
    ? {
        bg: 'bg-[#FAFAFA] text-neutral-900',
        glass: 'bg-white/60 backdrop-blur-md border border-black/5',
        border: 'border-black/5',
        chipIdle: 'bg-white text-neutral-700 border border-black/5 hover:bg-neutral-50',
        chipActive: 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white border-transparent',
        input: 'bg-white border border-black/10 text-neutral-900 placeholder:text-neutral-400',
        sub: 'text-neutral-500',
        canvasBg: 'bg-white',
        soft: 'bg-neutral-100',
      }
    : {
        bg: 'bg-[#0A0A0B] text-white',
        glass: 'bg-white/5 backdrop-blur-md border border-white/10',
        border: 'border-white/10',
        chipIdle: 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10',
        chipActive: 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white border-transparent',
        input: 'bg-white/5 border border-white/10 text-white placeholder:text-neutral-500',
        sub: 'text-neutral-400',
        canvasBg: 'bg-neutral-900',
        soft: 'bg-white/5',
      };

  const sidebarContent = (
    <>
      {/* Modelo */}
      <div>
        <label className="text-[11px] uppercase tracking-widest font-semibold mb-2 block">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as ModelId)}
          className={`w-full h-11 rounded-xl px-3 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40`}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} {m.tier === 'PRO' ? '· PRO' : '· FREE'}
            </option>
          ))}
        </select>
      </div>

      {/* Prompt */}
      <div>
        <label className="text-[11px] uppercase tracking-widest font-semibold mb-2 flex items-center justify-between">
          <span>Prompt</span>
          <span className={t.sub}>{prompt.length}/500</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          rows={5}
          placeholder="Ex: astronauta surfando uma onda de neon ao pôr do sol..."
          className={`w-full rounded-xl p-3 text-sm resize-none ${t.input} focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40`}
        />
      </div>

      {/* Estilos */}
      <div>
        <label className="text-[11px] uppercase tracking-widest font-semibold mb-2 block">Estilo</label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory lg:flex-wrap lg:overflow-visible">
          {STYLE_CHIPS.map((c) => {
            const active = styles.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleStyle(c.id)}
                className={`shrink-0 snap-start h-11 min-h-[44px] px-4 rounded-full text-xs font-medium transition-all ${
                  active ? t.chipActive : t.chipIdle
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Proporção */}
      <div>
        <label className="text-[11px] uppercase tracking-widest font-semibold mb-2 block">Proporção</label>
        <div className="grid grid-cols-4 gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRatio(r.id)}
              className={`h-11 min-h-[44px] rounded-xl text-xs font-medium transition-all ${
                ratio === r.id ? t.chipActive : t.chipIdle
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botão Gerar */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-12 min-h-[48px] rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 transition-opacity"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? 'Gerando…' : 'Gerar'}
      </button>

      {!limit.isPro && (
        <p className={`text-[11px] text-center ${t.sub}`}>
          {limit.remaining === Infinity ? 'Pro ativo' : `${limit.remaining} de ${limit.limit} restantes`}
        </p>
      )}
    </>
  );

  return (
    <div className={`min-h-screen ${t.bg}`} style={{ fontFamily: 'Geist, Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>Imagine — Gerador de Imagens IA | Ramdut</title>
        <meta name="description" content="Crie imagens com IA grátis. Modelos Gemini e Flux, múltiplos estilos e proporções. PIX R$9,90 desbloqueia HD." />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${window.location.origin}/imagine` : ''} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Imagine by Ramdut',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '9.90', priceCurrency: 'BRL' },
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className={`sticky top-0 z-40 ${t.glass} border-b ${t.border}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[1600px] mx-auto h-14 px-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">Ramdut</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {[
              { label: 'Imagine', to: '/imagine', active: true },
              { label: 'AI Lab', to: '/lab' },
              { label: 'Agentes', to: '/lab/chat' },
              { label: 'Galeria', to: '/lab' },
              { label: 'Planos', to: '#planos' },
            ].map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className={`px-3 h-9 rounded-lg text-sm flex items-center transition-colors ${
                  n.active ? (isLight ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900') : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`h-10 w-10 min-w-[44px] rounded-lg ${t.chipIdle} grid place-items-center`}
              aria-label="Tema"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <span className={`hidden sm:inline text-xs ${t.sub}`}>PT</span>
            <button className={`hidden sm:inline-flex h-10 px-3 min-w-[44px] rounded-lg ${t.chipIdle} text-sm`}>
              Entrar
            </button>
            <button
              onClick={() => {
                setPixReason('Comece grátis e desbloqueia HD por R$ 9,90 PIX.');
                setPixOpen(true);
              }}
              className="h-10 px-3 min-w-[44px] rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-sm font-semibold flex items-center gap-1"
            >
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Começar grátis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Layout principal */}
      <div className="max-w-[1600px] mx-auto px-4 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 lg:gap-6">
          {/* Sidebar — desktop */}
          <aside className={`hidden lg:flex flex-col gap-5 p-5 rounded-2xl ${t.glass} h-fit sticky top-20`}>
            {sidebarContent}
          </aside>

          {/* Canvas */}
          <section className="flex flex-col gap-4">
            <div className={`rounded-2xl ${t.glass} p-4 lg:p-6`}>
              <div
                className={`relative rounded-xl ${t.canvasBg} overflow-hidden flex items-center justify-center`}
                style={aspectStyle}
              >
                {generating && (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#7C3AED]/10 to-[#2563EB]/10 z-10">
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED]"
                      />
                      <span className={`text-sm ${t.sub}`}>Gerando imagem…</span>
                    </div>
                  </div>
                )}
                {current ? (
                  <motion.img
                    key={current.ts}
                    src={current.url}
                    alt={current.prompt}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  !generating && (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <LumisIcon size={56} />
                      <h2 className={`text-lg font-semibold ${isLight ? 'text-neutral-800' : 'text-white'}`}>
                        Sou o Ramu. Vamos criar?
                      </h2>
                      <p className={`text-sm max-w-sm ${t.sub}`}>
                        Escreva uma ideia, escolha estilos e a proporção. Eu cuido do resto.
                      </p>
                    </div>
                  )
                )}
              </div>

              {current && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleDownload} className={`h-11 min-h-[44px] px-4 rounded-xl ${t.chipIdle} text-sm flex items-center gap-2`}>
                    <Download className="h-4 w-4" /> Download HD
                  </button>
                  <button onClick={handleCopy} className={`h-11 min-h-[44px] px-4 rounded-xl ${t.chipIdle} text-sm flex items-center gap-2`}>
                    <Copy className="h-4 w-4" /> Copiar
                  </button>
                  <button onClick={handleShare} disabled={sharing} className={`h-11 min-h-[44px] px-4 rounded-xl ${t.chipIdle} text-sm flex items-center gap-2 disabled:opacity-50`}>
                    {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
                  </button>
                  <button onClick={handleRemix} className={`h-11 min-h-[44px] px-4 rounded-xl ${t.chipIdle} text-sm flex items-center gap-2`}>
                    <Wand2 className="h-4 w-4" /> Remix
                  </button>
                  <button onClick={handleVariations} disabled={generating} className="h-11 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                    <Layers className="h-4 w-4" /> Variações ×4
                  </button>
                </div>
              )}
            </div>

            {/* Histórico — desktop */}
            {history.length > 0 && (
              <div className={`hidden lg:block rounded-2xl ${t.glass} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Histórico</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {history.slice(0, 4).map((h) => (
                    <button
                      key={h.ts}
                      onClick={() => setCurrent(h)}
                      className={`relative rounded-xl overflow-hidden aspect-square ${t.soft} group`}
                    >
                      <img src={h.url} alt={h.prompt} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botão histórico mobile */}
            {history.length > 0 && (
              <button
                onClick={() => setHistoryOpen(true)}
                className={`lg:hidden h-11 min-h-[44px] px-4 rounded-xl ${t.glass} text-sm flex items-center justify-center gap-2`}
              >
                <History className="h-4 w-4" /> Ver histórico ({history.length})
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Bottom bar mobile/tablet */}
      <div
        className={`lg:hidden fixed inset-x-0 z-30 ${t.glass} border-t ${t.border} px-3 pt-2 pb-3`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSheetOpen(true)}
            className={`flex-1 h-12 min-h-[44px] rounded-xl ${t.input} text-sm text-left px-3 flex items-center gap-2`}
          >
            <ImageIcon className="h-4 w-4 opacity-60" />
            <span className="truncate opacity-70">{prompt || 'Descreva a imagem…'}</span>
            <ChevronUp className="h-4 w-4 ml-auto opacity-60" />
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="h-12 px-5 min-w-[44px] rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar
          </button>
        </div>
      </div>

      {/* Bottom Sheet mobile (sidebar) */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setSheetOpen(false); }}
              className={`lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto ${isLight ? 'bg-white' : 'bg-[#0F0F11]'} rounded-t-3xl pb-32`}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
            >
              <div className="sticky top-0 bg-inherit pt-3 pb-2 flex flex-col items-center border-b border-black/5 dark:border-white/10">
                <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20 mb-2" />
                <span className="text-xs font-semibold">Configurar geração</span>
              </div>
              <div className="p-5 space-y-5">{sidebarContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sheet histórico mobile */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className={`lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto ${isLight ? 'bg-white' : 'bg-[#0F0F11]'} rounded-t-3xl`}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
            >
              <div className="sticky top-0 bg-inherit p-3 flex items-center border-b border-black/5 dark:border-white/10">
                <span className="text-sm font-semibold ml-2">Histórico</span>
                <button onClick={() => setHistoryOpen(false)} className="ml-auto h-10 w-10 grid place-items-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {history.map((h) => (
                  <button
                    key={h.ts}
                    onClick={() => { setCurrent(h); setHistoryOpen(false); }}
                    className={`rounded-xl overflow-hidden aspect-square ${t.soft}`}
                  >
                    <img src={h.url} alt={h.prompt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PixPaymentModal
        open={pixOpen}
        onOpenChange={setPixOpen}
        reason={pixReason}
        onConfirmed={() => {
          limit.setPro(true);
          setProStore(true);
          toast({ title: 'Pro ativado!', description: 'Geração ilimitada e HD liberados.' });
        }}
      />

      <MobileBottomNav />
    </div>
  );
};

export default Imagine;
