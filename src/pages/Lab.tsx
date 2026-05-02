import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  type Node,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Command as CmdIcon, Crown, ArrowLeft, Activity, Sparkles, Plus, Zap } from 'lucide-react';

import { useLabStore, type LabCard } from '@/store/lab-store';
import { useGenerationLimit } from '@/hooks/use-generation-limit';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommandPalette } from '@/components/lab/CommandPalette';
import { GenerationCard } from '@/components/lab/GenerationCard';
import { Inspector } from '@/components/lab/Inspector';
import { RamuAssistant } from '@/components/lab/RamuAssistant';
import { PaywallModal } from '@/components/PaywallModal';
import {
  type LabMode,
  enrichSvg,
  getDeviceId,
  downloadDataUrl,
  downloadText,
} from '@/lib/lab-helpers';

const nodeTypes: NodeTypes = { generation: GenerationCard };

const META: Record<string, { title: string; description: string; mode: LabMode }> = {
  default: {
    title: 'RAMU Lab — Estúdio de IA generativa | Ramdut',
    description:
      'Crie imagens, SVGs vetoriais, memes e textos com IA num canvas infinito. Nano Banana, Flux, SDXL e Recraft no mesmo lugar.',
    mode: 'image',
  },
  imagens: {
    title: 'Gerador de Imagens IA grátis | RAMU Lab Ramdut',
    description: 'Gere imagens em alta qualidade com Gemini Nano Banana e modelos Pro Image direto do navegador.',
    mode: 'image',
  },
  svg: {
    title: 'Gerador de SVG Vetorial por IA | RAMU Lab Ramdut',
    description: 'Crie ícones e ilustrações vetoriais SVG editáveis usando Recraft v3. Download instantâneo.',
    mode: 'svg',
  },
  'pro-fal': {
    title: 'Imagem Pro com fal.ai (Flux/SDXL) | RAMU Lab Ramdut',
    description: 'Acesse os melhores modelos de imagem Flux Schnell, Dev, Pro, SDXL e Stable Diffusion 3.',
    mode: 'pro-fal',
  },
  chat: {
    title: 'Chat IA gratuito com Gemini | RAMU Lab Ramdut',
    description: 'Converse com IA, gere poemas, contos, roteiros, código e textos criativos com Gemini.',
    mode: 'chat',
  },
};

interface Props {
  initialMode?: LabMode;
  metaKey?: keyof typeof META;
}

const Lab = ({ initialMode, metaKey = 'default' }: Props) => {
  const meta = META[metaKey] || META.default;
  const { toast } = useToast();
  const navigate = useNavigate();

  const cards = useLabStore((s) => s.cards);
  const isPro = useLabStore((s) => s.isPro);
  const selectedId = useLabStore((s) => s.selectedId);
  const addCard = useLabStore((s) => s.addCard);
  const removeCard = useLabStore((s) => s.removeCard);
  const updateCard = useLabStore((s) => s.updateCard);
  const select = useLabStore((s) => s.select);
  const setPro = useLabStore((s) => s.setPro);
  const markGenerated = useLabStore((s) => s.markGenerated);
  const cooldownRemaining = useLabStore((s) => s.cooldownRemaining);

  const limit = useGenerationLimit();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'limit' | 'hd' | 'watermark' | 'truncated' | 'tts'>('limit');
  const [generating, setGenerating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);

  // Tick para atualizar cooldown na UI
  useEffect(() => {
    const i = setInterval(() => setCooldownTick((v) => v + 1), 500);
    return () => clearInterval(i);
  }, []);
  const cdRem = cooldownRemaining();

  // Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Sincroniza cards -> nodes do React Flow
  const initialNodes = useMemo<Node[]>(() => [], []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  useEffect(() => {
    setNodes(
      cards.map((c) => ({
        id: c.id,
        type: 'generation',
        position: c.position,
        data: {
          card: c,
          isPro,
          selected: selectedId === c.id,
          onSelect: () => select(c.id),
          onFork: () => handleGenerate(c.type, c.prompt),
          onShare: () => handleShare(c),
          onDownload: () => handleDownload(c),
          onDelete: () => removeCard(c.id),
          sharing: sharingId === c.id,
        },
        draggable: true,
      })),
    );
  }, [cards, isPro, selectedId, sharingId, setNodes]);

  // ---- Geração ----
  const handleGenerate = useCallback(
    async (mode: LabMode, prompt: string) => {
      if (limit.limitReached) {
        setPaywallReason('limit');
        setPaywallOpen(true);
        return;
      }
      if (cooldownRemaining() > 0) {
        toast({ title: 'Cooldown ativo', description: `Aguarde ${Math.ceil(cooldownRemaining() / 1000)}s.` });
        return;
      }

      setGenerating(true);
      markGenerated();

      try {
        if (mode === 'chat') {
          const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: { messages: [{ role: 'user', content: prompt }] },
          });
          if (error) throw error;
          const text = data?.message || data?.text || JSON.stringify(data);
          addCard({ type: 'chat', prompt, text, model: 'gemini' });
        } else if (mode === 'svg') {
          const { data, error } = await supabase.functions.invoke('generate-fal', {
            body: { prompt, svg: true },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          if (data?.svg) {
            addCard({ type: 'svg', prompt, svg: enrichSvg(data.svg, prompt), model: data.provider });
          } else if (data?.imageUrl) {
            addCard({ type: 'svg', prompt, imageUrl: data.imageUrl, model: data.provider });
          } else {
            throw new Error('Sem resultado');
          }
        } else if (mode === 'pro-fal') {
          const { data, error } = await supabase.functions.invoke('generate-fal', {
            body: { prompt, model: 'flux-schnell' },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          addCard({ type: 'pro-fal', prompt, imageUrl: data.imageUrl, model: data.provider });
        } else {
          // image / meme
          const finalPrompt =
            mode === 'meme' ? `Meme estilo internet, engraçado, sobre: ${prompt}` : prompt;
          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt: finalPrompt, model: 'google/gemini-2.5-flash-image' },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          addCard({ type: mode, prompt, imageUrl: data.imageUrl, model: 'gemini' });
        }
        limit.increment();
      } catch (e: any) {
        toast({
          title: 'Falha na geração',
          description: e?.message?.slice(0, 200) || 'Tente novamente',
          variant: 'destructive',
        });
      } finally {
        setGenerating(false);
      }
    },
    [limit, addCard, markGenerated, cooldownRemaining, toast],
  );

  // ---- Download ----
  const handleDownload = (c: LabCard) => {
    if (!isPro && (c.imageUrl || c.svg)) {
      setPaywallReason('hd');
      setPaywallOpen(true);
      return;
    }
    if (c.svg) {
      downloadText(c.svg, `ramu-${c.id.slice(0, 8)}.svg`, 'image/svg+xml');
    } else if (c.imageUrl) {
      downloadDataUrl(c.imageUrl, `ramu-${c.id.slice(0, 8)}.png`);
    } else if (c.text) {
      downloadText(c.text, `ramu-${c.id.slice(0, 8)}.txt`);
    }
  };

  // ---- Share ----
  const handleShare = async (c: LabCard) => {
    setSharingId(c.id);
    try {
      const device_id = getDeviceId();
      const { data, error } = await supabase
        .from('lab_generations')
        .insert({
          prompt: c.prompt,
          type: c.type,
          result_url: c.imageUrl ?? null,
          result_text: c.text ?? null,
          result_svg: c.svg ?? null,
          model: c.model ?? null,
          device_id,
        })
        .select('id')
        .single();
      if (error) throw error;
      updateCard(c.id, { shareId: data.id });
      const url = `${window.location.origin}/lab/share/${data.id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: 'Link copiado!', description: url });
    } catch (e: any) {
      toast({ title: 'Erro ao compartilhar', description: e?.message, variant: 'destructive' });
    } finally {
      setSharingId(null);
    }
  };

  const selectedCard = cards.find((c) => c.id === selectedId) || null;

  // JSON-LD para SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RAMU Lab',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: meta.description,
    offers: { '@type': 'Offer', price: '9.90', priceCurrency: 'BRL' },
  };

  return (
    <div className="min-h-screen ramu-canvas-bg text-white relative overflow-hidden">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <link rel="canonical" href={`${typeof window !== 'undefined' ? window.location.origin : ''}/lab`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Header fino */}
      <header className="fixed top-0 inset-x-0 h-14 z-40 ramu-glass border-b border-white/5 px-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-neutral-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-bold ramu-accent-text text-base">RAMU<span className="text-neutral-500">.lab</span></span>
        </Link>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-4 flex-1 max-w-md mx-auto h-9 px-3 rounded-lg bg-black/30 border border-white/10 hover:border-[#8B5CF6]/40 text-left text-sm text-neutral-400 flex items-center gap-2 transition-colors"
        >
          <CmdIcon className="h-4 w-4" />
          <span>Buscar / Gerar...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">Ctrl K</kbd>
        </button>

        {!isPro && (
          <span className="hidden sm:inline text-xs text-neutral-400">
            <span className="text-white font-medium">{limit.remaining}</span> restantes
          </span>
        )}

        <button
          onClick={() => { setPaywallReason('hd'); setPaywallOpen(true); }}
          className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-lg ramu-accent-bg text-white text-xs font-medium"
        >
          <Crown className="h-3.5 w-3.5" /> {isPro ? 'Pro ativo' : 'Upgrade'}
        </button>

        <Link
          to="/api-status"
          className="h-9 w-9 rounded-lg border border-white/10 hover:border-[#06B6D4]/40 flex items-center justify-center text-neutral-400 hover:text-[#06B6D4]"
          title="Status das integrações"
        >
          <Activity className="h-4 w-4" />
        </Link>

        <div className="h-9 w-9 rounded-full ramu-accent-bg flex items-center justify-center text-xs font-bold">
          JD
        </div>
      </header>

      {/* Canvas */}
      <main className="pt-14 h-screen">
        {cards.length === 0 && !generating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="text-center pointer-events-auto"
            >
              <Sparkles className="h-12 w-12 mx-auto text-[#8B5CF6] mb-4" />
              <h1 className="text-3xl md:text-4xl font-bold ramu-accent-text mb-2">
                Canvas em branco
              </h1>
              <p className="text-neutral-400 mb-6 max-w-md">
                Aperta <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Ctrl K</kbd> e
                manda uma ideia. Cada geração vira um card aqui.
              </p>
              <button
                onClick={() => setPaletteOpen(true)}
                className="px-5 py-2.5 ramu-accent-bg rounded-lg text-white font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" /> Nova geração
              </button>
            </motion.div>
          </div>
        )}

        {generating && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 ramu-glass ramu-card-border px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#06B6D4] animate-pulse" />
            Gerando...
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView={cards.length > 0}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={20} size={1} />
          <Controls className="!bg-black/40 !border !border-white/10 !rounded-lg" />
          <MiniMap
            className="!bg-black/40 !border !border-white/10 !rounded-lg"
            nodeColor="#8B5CF6"
            maskColor="rgba(10,10,11,0.8)"
          />
        </ReactFlow>
      </main>

      <Inspector
        card={selectedCard}
        isPro={isPro}
        onClose={() => select(null)}
        onRegenerate={(p) => selectedCard && handleGenerate(selectedCard.type, p)}
      />

      <RamuAssistant selectedCard={selectedCard} totalCards={cards.length} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSubmit={handleGenerate}
        defaultMode={initialMode || meta.mode}
        cooldownRemaining={cdRem}
      />

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason={paywallReason}
        onUpgrade={() => {
          setPro(true);
          limit.setPro(true);
          setPaywallOpen(false);
          toast({ title: '👑 Pro desbloqueado!', description: 'Tudo em HD, sem blur, sem limite.' });
        }}
      />
    </div>
  );
};

export default Lab;
