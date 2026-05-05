import { motion } from 'framer-motion';

interface Props {
  size?: number;
  pulsing?: boolean;
  className?: string;
}

// Lumis: ícone SVG inline do mascote (orbe energética roxo→ciano).
// Substitui emojis ✨/🤖 nas mensagens do assistente.
export const LumisIcon = ({ size = 18, pulsing = true, className = '' }: Props) => {
  return (
    <motion.span
      className={`inline-flex items-center justify-center align-[-3px] ${className}`}
      style={{ width: size, height: size }}
      animate={pulsing ? { scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="Lumis"
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <defs>
          <radialGradient id="lumis-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#E0D4FF" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </radialGradient>
          <radialGradient id="lumis-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="url(#lumis-glow)" />
        <circle cx="16" cy="16" r="9" fill="url(#lumis-core)" />
        <circle cx="13" cy="13" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="20" cy="19" r="1" fill="#fff" opacity="0.6" />
      </svg>
    </motion.span>
  );
};
