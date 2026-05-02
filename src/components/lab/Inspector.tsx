import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LabCard } from '@/store/lab-store';
import { MODE_META } from '@/lib/lab-helpers';

interface Props {
  card: LabCard | null;
  isPro: boolean;
  onClose: () => void;
  onRegenerate: (newPrompt: string) => void;
}

export const Inspector = ({ card, isPro, onClose, onRegenerate }: Props) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (card) setPrompt(card.prompt);
  }, [card?.id]);

  return (
    <AnimatePresence>
      {card && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          className="fixed top-16 right-4 bottom-4 w-[360px] z-30 rounded-2xl ramu-glass ramu-card-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span>{MODE_META[card.type].icon}</span>
              <span className="text-xs uppercase tracking-widest text-neutral-400">Inspector</span>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {card.imageUrl && (
              <img
                src={card.imageUrl}
                alt={card.prompt}
                className={`w-full rounded-lg ${!isPro ? 'blur-sm' : ''}`}
              />
            )}
            {card.svg && (
              <div
                className={`w-full bg-white rounded-lg p-3 ${!isPro ? 'blur-sm' : ''}`}
                dangerouslySetInnerHTML={{ __html: card.svg }}
              />
            )}
            {card.text && (
              <div className={`text-sm text-neutral-200 whitespace-pre-wrap ${!isPro ? 'blur-[2px] select-none' : ''}`}>
                {card.text}
              </div>
            )}

            {card.svg && isPro && (
              <details className="text-xs">
                <summary className="cursor-pointer text-neutral-400 hover:text-white">Ver código SVG</summary>
                <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] text-neutral-300 overflow-auto max-h-40">
                  {card.svg}
                </pre>
              </details>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-500">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white resize-none focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {card.model && (
              <div className="text-xs text-neutral-500">
                Modelo: <span className="text-neutral-300">{card.model}</span>
              </div>
            )}

            {card.shareId && (
              <div className="text-xs text-neutral-500 break-all">
                Share: <a href={`/lab/share/${card.shareId}`} className="text-[#06B6D4] hover:underline">/lab/share/{card.shareId.slice(0, 8)}…</a>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 p-3 flex gap-2">
            <button
              onClick={() => onRegenerate(prompt.trim() || card.prompt)}
              disabled={!prompt.trim()}
              className="flex-1 px-3 py-2 rounded-lg ramu-accent-bg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" /> Regerar com edição
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
