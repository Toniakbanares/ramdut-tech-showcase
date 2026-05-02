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
  'Pra SVG vetorial, use prompts simples: "ícone de foguete minimalista, traço fino".',
  'Crie variações com Fork — eu mantenho a mesma seed.',
  'Compartilhando uma geração, você ganha um link pronto pra OG do Twitter/Discord.',
  'Ctrl + K abre o comando rápido em qualquer tela do Lab.',
];

export const RamuAssistant = ({ selectedCard, totalCards }: Props) => {
  const [open, setOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTipIdx((v) => (v + 1) % TIPS.length), 7000);
    return () => clearInterval(i);
  }, []);

  // Sugestão contextual baseada no card selecionado
  const contextual = selectedCard
    ? selectedCard.type === 'svg'
      ? 'Tenta adicionar "monocromático, traço único" pra ficar bem clean.'
      : selectedCard.type === 'image' || selectedCard.type === 'pro-fal'
      ? 'Quer tentar outro aspect ratio? 16:9 fica cinematográfico.'
      : selectedCard.type === 'meme'
      ? 'Memes ficam melhores em 1:1 — e com texto curto.'
      : 'Posso transformar esse texto num roteiro ou poema. Pede no Inspector.'
    : totalCards === 0
    ? 'Aperta Ctrl+K e me manda uma ideia! Eu cuido do resto.'
    : TIPS[tipIdx];

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="mb-3 max-w-xs rounded-2xl ramu-glass ramu-card-border p-3 text-sm text-neutral-200"
          >
            <div className="text-[10px] uppercase tracking-widest text-[#06B6D4] mb-1">Ramu</div>
            {contextual}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="relative w-14 h-14 rounded-full ramu-card-border ramu-glass overflow-hidden"
        aria-label="Abrir Ramu Assistant"
      >
        <img src={mascotImg} alt="Ramu" className="w-full h-full object-cover" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#06B6D4] ring-2 ring-[#0A0A0B]" />
      </motion.button>
    </div>
  );
};
