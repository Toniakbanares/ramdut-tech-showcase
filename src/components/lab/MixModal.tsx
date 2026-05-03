import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Wand2, Sparkles } from 'lucide-react';

const STYLES = [
  'Cinematográfico',
  'Cyberpunk neon',
  'Aquarela suave',
  'Pixel art',
  'Anime studio Ghibli',
  'Fotorrealista 4K',
  'Pôster vintage',
  'Ilustração editorial',
  'Low poly 3D',
  'Surrealismo Dali',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerate: (prompt: string, count: number) => void;
}

export const MixModal = ({ open, onOpenChange, onGenerate }: Props) => {
  const [objetivo, setObjetivo] = useState('');
  const [local, setLocal] = useState('');
  const [estilo, setEstilo] = useState(STYLES[0]);

  const submit = () => {
    if (!objetivo.trim() || !local.trim()) return;
    const prompt = `${objetivo.trim()} em ${local.trim()}, estilo ${estilo}`;
    onGenerate(prompt, 4);
    onOpenChange(false);
    setObjetivo('');
    setLocal('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0F0F11] border-[#8B5CF6]/30 text-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <div className="bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] p-5">
            <div className="flex items-center gap-2 mb-1 text-white/90">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-bold">/mix · estilo whisky</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Misture e renderize 4 variações
            </DialogTitle>
            <DialogDescription className="text-white/85 text-sm mt-1">
              Combine Objetivo + Local + Estilo. Eu monto o prompt e gero 4 versões.
            </DialogDescription>
          </div>

          <div className="p-5 space-y-4">
            <Field label="Objetivo" placeholder="Ex: um robô meditando">
              <input
                autoFocus
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="um robô meditando"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]"
              />
            </Field>

            <Field label="Local" placeholder="Ex: floresta de bambu ao amanhecer">
              <input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="floresta de bambu ao amanhecer"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]"
              />
            </Field>

            <Field label="Estilo">
              <select
                value={estilo}
                onChange={(e) => setEstilo(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s} className="bg-[#0F0F11]">
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-xs text-neutral-400">
              <span className="text-neutral-500">Prompt final:</span>{' '}
              <span className="text-white">
                {objetivo || '...'} em {local || '...'}, estilo {estilo}
              </span>
            </div>

            <Button
              onClick={submit}
              disabled={!objetivo.trim() || !local.trim()}
              className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white font-bold"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Gerar 4 variações
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

function Field({
  label,
  children,
}: {
  label: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}
