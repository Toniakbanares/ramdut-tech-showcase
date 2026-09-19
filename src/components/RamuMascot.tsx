import { motion } from 'framer-motion';
import mascotImg from '@/assets/mascot-ramu.png';
import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  float?: boolean;
  ring?: boolean;
  className?: string;
}

/**
 * Mascote oficial Ramu — fonte única de verdade.
 * Use sempre este componente para exibir o mascote em qualquer lugar do app.
 */
export const RamuMascot = ({ size = 40, float = false, ring = true, className = '' }: Props) => (
  <motion.span
    animate={float ? { y: [0, -5, 0] } : undefined}
    transition={float ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
    className={cn(
      'inline-block overflow-hidden rounded-full shrink-0',
      ring && 'ring-1 ring-[#8B5CF6]/40',
      className,
    )}
    style={{ width: size, height: size }}
  >
    <img src={mascotImg} alt="Ramu, mascote do RAMDUT AI" className="w-full h-full object-cover" />
  </motion.span>
);

export default RamuMascot;
