import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import mascotImg from '@/assets/mascot-ramu.png';
import type { LabCard } from '@/store/lab-store';

interface Props {
  selectedCard: LabCard | null;
  totalCards: number;
}

const TIPS = [
  'Quanto mais específico o prompt, melhor a imagem. Descreva luz, ângulo e estilo.',
  'Pra SVG, prefira: "ícone minimalista, traço fino, monocromático".',
  'Use Fork pra criar variações sem perder o original.',
  'Compartilhar gera link pronto pra OG do Twitter/Discord.',
  'Atalho /mix abre o modo whisky: Objetivo + Local + Estilo.',
  'Toque num card e abra o Inspector pra editar o prompt.',
];

// Lumis: rebrand do antigo Ramu, com idle (float + piscar)
export const RamuAssistant = ({ selectedCard, totalCards }: Props) => {
  const [open, setOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTipIdx((v) => (v + 1) % TIPS.length), 7000);
    return () => clearInterval(i);
  }, []);

  const contextual = selectedCard
    ? selectedCard.type === 'svg'
      ? 'Adicione "monocromático, traço único" pra ficar bem clean.'
      : selectedCard.type === 'image' || selectedCard.type === 'pro-fal'
      ? 'Tente um ratio diferente — 16:9 fica cinematográfico.'
      : selectedCard.type === 'meme'
      ? 'Memes ficam melhor 1:1 com texto curto.'
      : 'Posso transformar esse texto em poema ou roteiro.'
    : totalCards === 0
    ? 'Oi! Sou o Lumis ✨ Aperta o + ali embaixo e me manda uma ideia.'
    : TIPS[tipIdx];

  return (
    <div
      className="fixed bottom-24 sm:bottom-6 left-3 sm:left-4 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="mb-3 max-w-[280px] rounded-2xl ramu-glass ramu-card-border p-3 text-sm text-neutral-200"
          >
            <div className="text-[10px] uppercase tracking-widest text-[#06B6D4] mb-1">Lumis</div>
            {contextual}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -6, 0] }}
        transition={{
          y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="relative w-14 h-14 min-w-[44px] min-h-[44px] rounded-full ramu-card-border ramu-glass overflow-hidden"
        aria-label="Abrir Lumis"
      >
        <img src={mascotImg} alt="Lumis mascote" className="w-full h-full object-cover" />
        <motion.span
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#06B6D4] ring-2 ring-[#0A0A0B]"
        />
      </motion.button>
    </div>
  );
};
