import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  Image as ImageIcon, FileCode, Crown, MessageSquare, Laugh, Sparkles, X,
} from 'lucide-react';
import type { LabMode } from '@/lib/lab-helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (mode: LabMode, prompt: string) => void;
  defaultMode?: LabMode;
  cooldownRemaining: number;
}

const MODES: { id: LabMode; label: string; desc: string; icon: any }[] = [
  { id: 'image', label: 'Gerar Imagem', desc: 'Nano Banana / Pro Image', icon: ImageIcon },
  { id: 'svg', label: 'Gerar SVG vetorial', desc: 'Recraft v3 — vetor editável', icon: FileCode },
  { id: 'pro-fal', label: 'Pro fal.ai', desc: 'Flux Schnell/Dev/Pro, SDXL', icon: Crown },
  { id: 'chat', label: 'Chat / Texto criativo', desc: 'Conversa, poemas, código', icon: MessageSquare },
  { id: 'meme', label: 'Gerar Meme', desc: 'Templates e personalizados', icon: Laugh },
];

export const CommandPalette = ({ open, onClose, onSubmit, defaultMode = 'image', cooldownRemaining }: Props) => {
  const [mode, setMode] = useState<LabMode>(defaultMode);
  const [prompt, setPrompt] = useState('');

  useEffect(() => { if (open) setMode(defaultMode); }, [open, defaultMode]);

  // Atalho Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = () => {
    if (!prompt.trim() || cooldownRemaining > 0) return;
    onSubmit(mode, prompt.trim());
    setPrompt('');
    onClose();
  };

  if (!open) return null;

  const cur = MODES.find((m) => m.id === mode)!;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <Command
        loop
        className="w-full max-w-2xl rounded-2xl ramu-glass ramu-card-border overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
          <span className="text-xs uppercase tracking-widest text-neutral-400">RAMU Command</span>
          <button onClick={onClose} className="ml-auto text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          <Command.List className="max-h-64 overflow-y-auto p-2">
            <Command.Group heading="Modo">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = m.id === mode;
                return (
                  <Command.Item
                    key={m.id}
                    value={m.label}
                    onSelect={() => setMode(m.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                      active ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{m.label}</div>
                      <div className="text-xs text-neutral-500">{m.desc}</div>
                    </div>
                    {active && <span className="text-xs text-[#06B6D4]">selecionado</span>}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </div>

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
            placeholder={cur.desc + ' — Enter para enviar'}
            className="w-full bg-transparent text-white text-base resize-none focus:outline-none placeholder:text-neutral-600"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-neutral-500">
              {cooldownRemaining > 0
                ? `⏳ aguarde ${Math.ceil(cooldownRemaining / 1000)}s entre gerações`
                : 'Enter para gerar · Esc para fechar'}
            </div>
            <button
              onClick={submit}
              disabled={!prompt.trim() || cooldownRemaining > 0}
              className="px-4 py-1.5 rounded-lg ramu-accent-bg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gerar ✨
            </button>
          </div>
        </div>
      </Command>
    </div>
  );
};
