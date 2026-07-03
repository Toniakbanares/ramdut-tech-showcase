import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Command as CmdIcon, Crown, ArrowLeft, Activity, Sparkles, Plus, Zap, Wand2, Sun, Moon } from 'lucide-react';

import { useLabStore, type LabCard } from '@/store/lab-store';
import { useGenerationLimit } from '@/hooks/use-generation-limit';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommandPalette } from '@/components/lab/CommandPalette';
import { GenerationCard } from '@/components/lab/GenerationCard';
import { Inspector } from '@/components/lab/Inspector';
import { RamuAssistant } from '@/components/lab/RamuAssistant';
import { MixModal } from '@/components/lab/MixModal';
import { FabricEditor } from '@/components/lab/FabricEditor';
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { PIX_AMOUNT } from '@/config/pix';
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
      'Crie imagens, SVGs vetoriais, memes e textos com IA num canvas infinito. Editor Fabric integrado, modo /mix, mobile-first.',
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
  const [mixOpen, setMixOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixReason, setPixReason] = useState<string>('');
  const [editor, setEditor] = useState<{ open: boolean; imageUrl?: string; sourcePrompt?: string }>({ open: false });
  const [generating, setGenerating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [, setCooldownTick] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('ramu-lab-theme') as 'dark' | 'light') || 'dark';
  });
  useEffect(() => {
    localStorage.setItem('ramu-lab-theme', theme);
  }, [theme]);

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

  const initialNodes = useMemo<Node[]>(() => [], []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  // Geração — declarada antes do useEffect que a referencia
  const handleGenerate = useCallback(
    async (mode: LabMode, prompt: string, parentId?: string, referenceImages?: string[]) => {
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
          addCard({ type: 'chat', prompt, text, model: 'gemini', parentId });
        } else if (mode === 'svg') {
          const { data, error } = await supabase.functions.invoke('generate-fal', {
            body: { prompt, svg: true },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          if (data?.svg) {
            addCard({ type: 'svg', prompt, svg: enrichSvg(data.svg, prompt), model: data.provider, parentId });
          } else if (data?.imageUrl) {
            addCard({ type: 'svg', prompt, imageUrl: data.imageUrl, model: data.provider, parentId });
          } else {
            throw new Error('Sem resultado');
          }
        } else if (mode === 'pro-fal') {
          const { data, error } = await supabase.functions.invoke('generate-fal', {
            body: { prompt, model: 'flux-schnell' },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          addCard({ type: 'pro-fal', prompt, imageUrl: data.imageUrl, model: data.provider, parentId });
        } else {
          const finalPrompt =
            mode === 'meme' ? `Meme estilo internet, engraçado, sobre: ${prompt}` : prompt;
          const isPollinations = mode === 'pollinations';
          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: {
              prompt: finalPrompt,
              model: isPollinations ? undefined : 'google/gemini-2.5-flash-image',
              provider: isPollinations ? 'pollinations' : undefined,
              reference_images: referenceImages && referenceImages.length ? referenceImages : undefined,
            },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          addCard({ type: mode, prompt, imageUrl: data.imageUrl, model: data.provider || (isPollinations ? 'pollinations' : 'gemini'), parentId });
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

  // Mix: gera N variações com as mesmas referências
  const handleMix = useCallback(
    async (prompt: string, references: string[], count = 1) => {
      for (let i = 0; i < count; i++) {
        const seeded = count > 1 ? `${prompt} (variação ${i + 1})` : prompt;
        await handleGenerate('image', seeded, undefined, references);
      }
    },
    [handleGenerate],
  );

  // Salvar resultado do editor como novo card
  const handleEditorSave = useCallback(
    (dataUrl: string) => {
      addCard({
        type: 'image',
        prompt: `[editado] ${editor.sourcePrompt || ''}`.trim() || 'Editado no Lab',
        imageUrl: dataUrl,
        model: 'fabric-editor',
      });
      toast({ title: 'Salvo no Canvas', description: 'Novo card criado a partir da edição.' });
    },
    [addCard, editor.sourcePrompt, toast],
  );

  const handleDownload = (c: LabCard) => {
    if (c.svg) downloadText(c.svg, `ramu-${c.id.slice(0, 8)}.svg`, 'image/svg+xml');
    else if (c.imageUrl) downloadDataUrl(c.imageUrl, `ramu-${c.id.slice(0, 8)}.png`);
    else if (c.text) downloadText(c.text, `ramu-${c.id.slice(0, 8)}.txt`);
  };

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

  const handleEdit = (c: LabCard) => {
    if (!c.imageUrl) {
      toast({ title: 'Editor disponível só pra imagens' });
      return;
    }
    setEditor({ open: true, imageUrl: c.imageUrl, sourcePrompt: c.prompt });
  };

  // Sincroniza cards -> nodes + edges (parentId)
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
          onFork: () => handleGenerate(c.type, c.prompt, c.id),
          onShare: () => handleShare(c),
          onDownload: () => handleDownload(c),
          onDelete: () => removeCard(c.id),
          onEdit: () => handleEdit(c),
          sharing: sharingId === c.id,
        },
        draggable: true,
      })),
    );
    setEdges((prev) => {
      const fromParent: Edge[] = cards
        .filter((c) => c.parentId && cards.some((p) => p.id === c.parentId))
        .map((c) => ({
          id: `e-${c.parentId}-${c.id}`,
          source: c.parentId!,
          target: c.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8B5CF6', strokeWidth: 2 },
        }));
      // mantém edges manuais (criadas via onConnect) que não envolvem cards removidos
      const ids = new Set(cards.map((c) => c.id));
      const manual = prev.filter(
        (e) => !e.id.startsWith('e-') && ids.has(e.source) && ids.has(e.target),
      );
      return [...fromParent, ...manual];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, isPro, selectedId, sharingId]);

  const selectedCard = cards.find((c) => c.id === selectedId) || null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RAMU Lab',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: meta.description,
    offers: { '@type': 'Offer', price: PIX_AMOUNT.toFixed(2), priceCurrency: 'BRL' },
  };

  const openPaywall = (reason: string) => {
    setPixReason(reason);
    setPixOpen(true);
  };

  return (
    <div className={`min-h-screen ramu-canvas-bg text-white relative overflow-hidden ${theme === 'light' ? 'ramu-light' : ''}`}>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <link rel="canonical" href={`${typeof window !== 'undefined' ? window.location.origin : ''}/lab`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 h-14 z-40 ramu-glass border-b border-white/5 px-3 sm:px-4 flex items-center gap-2 sm:gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Link to="/" className="flex items-center gap-2 text-neutral-300 hover:text-white shrink-0">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-bold ramu-accent-text text-base hidden sm:inline">
            RAMU<span className="text-neutral-500">.lab</span>
          </span>
        </Link>

        {/* Search/command — escondido no mobile (vai pro bottom) */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden lg:flex flex-1 max-w-md mx-auto h-9 px-3 rounded-lg bg-black/30 border border-white/10 hover:border-[#8B5CF6]/40 text-left text-sm text-neutral-400 items-center gap-2"
        >
          <CmdIcon className="h-4 w-4" />
          <span>Buscar / Gerar...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">Ctrl K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {!isPro && (
            <span className="hidden md:inline text-xs text-neutral-400">
              <span className="text-white font-medium">{limit.remaining}</span> hoje
            </span>
          )}

          <button
            onClick={() => openPaywall('Desbloqueia HD, sem blur, sem limite diário.')}
            className="h-10 px-3 min-w-[44px] rounded-lg ramu-accent-bg text-white text-xs font-medium flex items-center gap-1"
          >
            <Crown className="h-3.5 w-3.5" /> {isPro ? 'Pro' : 'PIX'}
          </button>

          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="h-10 w-10 rounded-lg border border-white/10 hover:border-[#8B5CF6]/40 flex items-center justify-center text-neutral-400 hover:text-white"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/api-status"
            className="h-10 w-10 rounded-lg border border-white/10 hover:border-[#06B6D4]/40 flex items-center justify-center text-neutral-400 hover:text-[#06B6D4]"
            title="Status das integrações"
          >
            <Activity className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Canvas */}
      <main className="pt-14 pb-24 lg:pb-0 h-screen">
        {cards.length === 0 && !generating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="text-center pointer-events-auto"
            >
              <Sparkles className="h-12 w-12 mx-auto text-[#8B5CF6] mb-4" />
              <h1 className="text-3xl sm:text-4xl font-bold ramu-accent-text mb-2">Canvas em branco</h1>
              <p className="text-neutral-400 mb-6 max-w-md text-sm sm:text-base">
                Toque no <span className="text-white font-medium">+</span> abaixo (ou{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Ctrl K</kbd>) e mande uma ideia.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="h-12 px-5 ramu-accent-bg rounded-lg text-white font-medium flex items-center gap-2 justify-center"
                >
                  <Plus className="h-4 w-4" /> Nova geração
                </button>
                <button
                  onClick={() => setMixOpen(true)}
                  className="h-12 px-5 rounded-lg border border-[#8B5CF6]/40 text-white font-medium flex items-center gap-2 justify-center hover:bg-white/5"
                >
                  <Wand2 className="h-4 w-4" /> Modo /mix
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {generating && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 ramu-glass ramu-card-border px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#06B6D4] animate-pulse" />
            Gerando...
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView={cards.length > 0}
          minZoom={0.2}
          maxZoom={2}
          panOnScroll
          panOnDrag
          zoomOnPinch
          defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={20} size={1} />
          <Controls className="!bg-black/40 !border !border-white/10 !rounded-lg hidden sm:flex" />
          <MiniMap
            className="!bg-black/40 !border !border-white/10 !rounded-lg hidden md:block"
            nodeColor="#8B5CF6"
            maskColor="rgba(10,10,11,0.8)"
          />
        </ReactFlow>
      </main>

      {/* Bottom command bar — mobile/tablet */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 ramu-glass border-t border-white/5 px-3 pt-2 pb-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 min-h-[48px] h-12 px-3 rounded-xl bg-black/40 border border-white/10 text-left text-sm text-neutral-400 flex items-center gap-2"
          >
            <CmdIcon className="h-4 w-4" />
            <span>Gerar com IA…</span>
          </button>
          <button
            onClick={() => setMixOpen(true)}
            className="h-12 w-12 min-w-[44px] rounded-xl border border-[#8B5CF6]/40 grid place-items-center text-[#06B6D4]"
            aria-label="Modo /mix"
          >
            <Wand2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="h-12 w-12 min-w-[44px] rounded-xl ramu-accent-bg grid place-items-center text-white"
            aria-label="Nova geração"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

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
        onMix={() => setMixOpen(true)}
        defaultMode={initialMode || meta.mode}
        cooldownRemaining={cdRem}
      />

      <MixModal
        open={mixOpen}
        onOpenChange={setMixOpen}
        onGenerate={(p, refs, n) => handleMix(p, refs, n)}
      />

      <FabricEditor
        open={editor.open}
        imageUrl={editor.imageUrl}
        onClose={() => setEditor({ open: false })}
        onSave={handleEditorSave}
      />

      <PixPaymentModal
        open={pixOpen}
        onOpenChange={setPixOpen}
        reason={pixReason}
        onConfirmed={() => {
          setPro(true);
          limit.setPro(true);
          toast({ title: 'Pro desbloqueado', description: 'Tudo em HD, sem blur, sem limite.' });
        }}
      />
    </div>
  );
};

export default Lab;
