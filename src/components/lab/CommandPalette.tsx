import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  Image as ImageIcon, FileCode, Crown, MessageSquare, Laugh, Sparkles, X, Wand2, Flower2, Music, Clapperboard,
} from 'lucide-react';
import type { LabMode } from '@/lib/lab-helpers';

export interface GenerateOptions {
  aspect_ratio?: string;
  quality?: 'fast' | 'standard' | 'hd' | 'ultra';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (mode: LabMode, prompt: string, opts?: GenerateOptions) => void;
  onMix: () => void;
  defaultMode?: LabMode;
  cooldownRemaining: number;
}


const MODES: { id: LabMode; label: string; desc: string; icon: any }[] = [
  { id: 'image', label: 'Gerar Imagem', desc: 'Nano Banana / Gemini', icon: ImageIcon },
  { id: 'pollinations', label: 'Pollinations (grátis)', desc: 'Flux ilimitado, sem chave', icon: Flower2 },
  { id: 'svg', label: 'SVG vetorial', desc: 'Recraft v3 — vetor editável', icon: FileCode },
  { id: 'pro-fal', label: 'Pro fal.ai', desc: 'Flux / SDXL / SD 3', icon: Crown },
  { id: 'music', label: 'Compositor de Músicas', desc: 'Letra, acordes e estrutura', icon: Music },
  { id: 'story', label: 'Roteiro de Vídeo', desc: 'História em cenas para vídeo', icon: Clapperboard },
  { id: 'chat', label: 'Chat / Texto', desc: 'Conversa, poemas, código', icon: MessageSquare },
  { id: 'meme', label: 'Meme', desc: 'Templates e personalizados', icon: Laugh },
];

// Chips de estilo — clicáveis e mescláveis. Vão concatenados ao prompt.
const STYLE_CHIPS: { id: string; label: string; suffix: string }[] = [
  { id: 'photo', label: 'Photorealistic', suffix: 'photorealistic' },
  { id: 'cyber', label: 'Cyberpunk', suffix: 'cyberpunk style' },
  { id: 'anime', label: 'Anime', suffix: 'anime style' },
  { id: 'mini', label: 'Minimalista', suffix: 'minimalist, clean' },
  { id: '3d', label: '3D Render', suffix: '3d render, octane' },
  { id: 'water', label: 'Aquarela', suffix: 'watercolor painting' },
  { id: 'pixel', label: 'Pixel Art', suffix: 'pixel art, 16-bit' },
  { id: 'noir', label: 'Noir', suffix: 'film noir, high contrast' },
];

export const CommandPalette = ({ open, onClose, onSubmit, onMix, defaultMode = 'image', cooldownRemaining }: Props) => {
  const [mode, setMode] = useState<LabMode>(defaultMode);
  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [aspect, setAspect] = useState<string>('1:1');
  const [quality, setQuality] = useState<'fast' | 'standard' | 'hd' | 'ultra'>('standard');

  useEffect(() => { if (open) setMode(defaultMode); }, [open, defaultMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleStyle = (id: string) =>
    setStyles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const buildFinalPrompt = (base: string) => {
    if (!styles.length) return base;
    const suffixes = STYLE_CHIPS.filter((c) => styles.includes(c.id)).map((c) => c.suffix);
    return `${base}, ${suffixes.join(', ')}`;
  };

  const submit = () => {
    if (cooldownRemaining > 0) return;
    const trimmed = prompt.trim();
    if (trimmed === '/mix' || trimmed.toLowerCase() === 'mix') {
      onMix();
      setPrompt('');
      onClose();
      return;
    }
    if (!trimmed) return;
    const opts: GenerateOptions =
      mode === 'pollinations' || mode === 'image' || mode === 'pro-fal'
        ? { aspect_ratio: aspect, quality }
        : {};
    onSubmit(mode, buildFinalPrompt(trimmed), opts);
    setPrompt('');
    onClose();
  };

  if (!open) return null;
  const cur = MODES.find((m) => m.id === mode)!;
  const showChips = mode === 'image' || mode === 'svg' || mode === 'pro-fal' || mode === 'meme' || mode === 'pollinations';
  const showQuality = mode === 'pollinations' || mode === 'image' || mode === 'pro-fal';

  const ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:2', '21:9'];
  const QUALITIES: { id: 'fast' | 'standard' | 'hd' | 'ultra'; label: string; hint: string }[] = [
    { id: 'fast', label: 'Rápido', hint: '~768px' },
    { id: 'standard', label: 'Padrão', hint: '~1024px' },
    { id: 'hd', label: 'HD', hint: '~1536px' },
    { id: 'ultra', label: 'Ultra', hint: '~2048px' },
  ];


  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-start justify-center sm:pt-[12vh] px-0 sm:px-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Command
        loop
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl ramu-glass ramu-card-border overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
          <span className="text-xs uppercase tracking-widest text-neutral-400">RAMU Command</span>
          <button
            onClick={() => { onMix(); onClose(); }}
            className="ml-auto h-9 px-3 rounded-lg bg-black/30 border border-[#8B5CF6]/30 text-xs text-[#06B6D4] flex items-center gap-1 hover:border-[#8B5CF6]/60"
          >
            <Wand2 className="h-3.5 w-3.5" /> /mix
          </button>
          <button onClick={onClose} className="h-10 w-10 grid place-items-center text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          <Command.List className="max-h-[40vh] sm:max-h-64 overflow-y-auto p-2">
            <Command.Group heading="Modo">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = m.id === mode;
                return (
                  <Command.Item
                    key={m.id}
                    value={m.label}
                    onSelect={() => setMode(m.id)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-sm min-h-[44px] ${
                      active ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{m.label}</div>
                      <div className="text-xs text-neutral-500">{m.desc}</div>
                    </div>
                    {active && <span className="text-xs text-[#06B6D4]">✓</span>}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </div>

        {showChips && (
          <div className="border-t border-white/5 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
              Estilos (clique pra mesclar)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_CHIPS.map((c) => {
                const active = styles.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleStyle(c.id)}
                    className={`h-9 min-h-[36px] px-3 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showQuality && (
          <div className="border-t border-white/5 px-3 py-2 space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">Proporção</div>
              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAspect(a)}
                    className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-mono transition-colors ${
                      aspect === a
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">Qualidade</div>
              <div className="grid grid-cols-4 gap-1.5">
                {QUALITIES.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuality(q.id)}
                    className={`h-11 rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center ${
                      quality === q.id
                        ? 'bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white border border-purple-400'
                        : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span>{q.label}</span>
                    <span className="text-[9px] opacity-70">{q.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}





        <div className="border-t border-white/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
            {cur.label}
          </div>
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder={`${cur.desc} — digite /mix pra modo whisky`}
            className="w-full bg-transparent text-white text-base resize-none focus:outline-none placeholder:text-neutral-600"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="text-[11px] text-neutral-500">
              {cooldownRemaining > 0
                ? `${Math.ceil(cooldownRemaining / 1000)}s de cooldown`
                : 'Enter envia · Esc fecha'}
            </div>
            <button
              onClick={submit}
              disabled={(!prompt.trim() && true) || cooldownRemaining > 0}
              className="h-11 px-5 rounded-lg ramu-accent-bg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gerar
            </button>
          </div>
        </div>
      </Command>
    </div>
  );
};
