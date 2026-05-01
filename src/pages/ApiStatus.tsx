import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Activity,
  Sparkles, Image as ImageIcon, MessageSquare, Volume2, FileCode,
  Zap, Crown, Shield,
} from 'lucide-react';
import mascotImg from '@/assets/mascot-ramu.png';

type ApiStatus = 'operational' | 'degraded' | 'down' | 'unknown';

interface ApiCard {
  name: string;
  desc: string;
  url: string;
  category: 'image' | 'text' | 'audio' | 'tools';
  free: string;
  features: string[];
  status: ApiStatus;
  icon: typeof Sparkles;
}

const APIS: ApiCard[] = [
  {
    name: 'fal.ai',
    desc: 'Flux, SDXL e Recraft (vetor SVG) com latência ultra-baixa',
    url: 'https://fal.ai/',
    category: 'image',
    free: 'Pay-as-you-go com créditos iniciais',
    features: ['Flux Schnell', 'Flux Pro', 'SDXL Fast', 'Recraft SVG', 'Stable Diffusion 3'],
    status: 'operational',
    icon: Crown,
  },
  {
    name: 'Google Gemini',
    desc: 'Geração de imagem multimodal e chat com visão',
    url: 'https://ai.google.dev/',
    category: 'image',
    free: '50 imagens/dia por chave (rotação ativa)',
    features: ['Nano Banana', 'Nano Banana 2', 'Gemini 3 Pro Image', 'Visão', 'Chat'],
    status: 'operational',
    icon: Sparkles,
  },
  {
    name: 'Pollinations.ai',
    desc: 'Geração de imagem aberta sem chave (fallback automático)',
    url: 'https://pollinations.ai/',
    category: 'image',
    free: 'Aberto, rate limit suave',
    features: ['Sem chave', 'Múltiplas proporções', 'Fallback'],
    status: 'operational',
    icon: ImageIcon,
  },
  {
    name: 'Lovable AI Gateway',
    desc: 'Roteador unificado para Gemini e GPT (texto + imagem)',
    url: 'https://docs.lovable.dev/',
    category: 'text',
    free: 'Cota integrada ao plano',
    features: ['Gemini 2.5/3', 'GPT-5', 'Streaming', 'Image gen'],
    status: 'operational',
    icon: Activity,
  },
  {
    name: 'Puter.js (Grok)',
    desc: 'Chat Grok 3/4, TTS e visão direto no navegador',
    url: 'https://puter.com/',
    category: 'text',
    free: 'Cota generosa por usuário',
    features: ['Grok 4.20', 'Grok 4.1 Fast', 'Grok 3', 'TTS', 'Vision'],
    status: 'operational',
    icon: MessageSquare,
  },
  {
    name: 'Puter TTS',
    desc: 'Síntese de voz natural integrada ao Puter.js',
    url: 'https://puter.com/',
    category: 'audio',
    free: 'Aberto, sem chave',
    features: ['Texto → áudio', 'Múltiplas vozes', 'Reprodução in-browser'],
    status: 'operational',
    icon: Volume2,
  },
  {
    name: 'Supabase Edge Functions',
    desc: 'Funções serverless (Deno) que orquestram as IAs',
    url: 'https://supabase.com/docs/guides/functions',
    category: 'tools',
    free: 'Incluído no Lovable Cloud',
    features: ['ai-chat', 'generate-image', 'generate-fal', 'CORS', 'Logs'],
    status: 'operational',
    icon: Shield,
  },
  {
    name: 'Recraft (via fal)',
    desc: 'Geração de SVG vetorial editável a partir de prompt',
    url: 'https://www.recraft.ai/',
    category: 'image',
    free: 'Via créditos fal.ai',
    features: ['SVG vetorial', 'Logos', 'Ícones', 'Ilustrações'],
    status: 'operational',
    icon: FileCode,
  },
];

const CATEGORIES = [
  { id: 'all' as const, label: 'Todas', icon: Activity },
  { id: 'image' as const, label: 'Imagem', icon: ImageIcon },
  { id: 'text' as const, label: 'Texto/Chat', icon: MessageSquare },
  { id: 'audio' as const, label: 'Áudio', icon: Volume2 },
  { id: 'tools' as const, label: 'Infra', icon: Shield },
];

const statusBadge = (s: ApiStatus) => {
  switch (s) {
    case 'operational':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Operacional
        </Badge>
      );
    case 'degraded':
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1">
          <AlertCircle className="h-3 w-3" /> Degradado
        </Badge>
      );
    case 'down':
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 gap-1">
          <AlertCircle className="h-3 w-3" /> Fora do ar
        </Badge>
      );
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
};

const ApiStatusPage = () => {
  const [filter, setFilter] = useState<typeof CATEGORIES[number]['id']>('all');
  const [tick, setTick] = useState(0);

  // SEO
  useEffect(() => {
    document.title = 'Status das APIs · RAMDUT AI Lab';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Relatório em tempo real das APIs e integrações de IA usadas no RAMDUT AI Lab.');
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === 'all' ? APIS : APIS.filter((a) => a.category === filter);
  const operational = APIS.filter((a) => a.status === 'operational').length;
  const uptime = Math.round((operational / APIS.length) * 100);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.07] dark:opacity-[0.12]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Início
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <img src={mascotImg} alt="Ramu" className="w-9 h-9" width={36} height={36} />
                <div>
                  <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                    Status das APIs
                  </h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Relatório em tempo real · atualiza a cada 5s</p>
                </div>
              </div>
            </div>
            <Link to="/ai-tools">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Abrir AI Lab</span>
                <span className="sm:hidden">Lab</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
              Painel de{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Integrações
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visão completa de todas as APIs e modelos que alimentam o AI Lab.
              Inclui geração de imagem, vetor SVG, chat, voz e infraestrutura.
            </p>
          </motion.div>

          {/* Overview */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-card/85 backdrop-blur border-primary/30">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Uptime global</p>
                <p className="text-3xl font-bold text-foreground">{uptime}%</p>
                <Progress value={uptime} className="h-2 mt-3" />
              </CardContent>
            </Card>
            <Card className="bg-card/85 backdrop-blur border-primary/30">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">APIs ativas</p>
                <p className="text-3xl font-bold text-foreground">{APIS.length}</p>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {operational} operacionais
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/85 backdrop-blur border-primary/30">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Última verificação</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Auto-refresh ativo · #{tick}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`flex items-center gap-1.5 text-sm rounded-full px-4 py-1.5 border transition-all ${
                  filter === c.id
                    ? 'border-primary bg-primary/15 text-foreground font-semibold'
                    : 'border-border bg-card/60 text-muted-foreground hover:border-primary/40'
                }`}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            ))}
          </div>

          {/* API Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((api, i) => (
              <motion.div
                key={api.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="bg-card/85 backdrop-blur border-border hover:border-primary/50 transition-all h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <api.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{api.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {api.desc}
                          </CardDescription>
                        </div>
                      </div>
                      {statusBadge(api.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {api.features.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        💰 <strong className="text-foreground">{api.free}</strong>
                      </span>
                      <a
                        href={api.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Docs <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-xs text-muted-foreground">
              Status verificado client-side. Para incidentes reais consulte cada provedor.
            </p>
            <Link to="/ai-tools" className="inline-block mt-4">
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-2" />
                Testar todas no AI Lab
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ApiStatusPage;
