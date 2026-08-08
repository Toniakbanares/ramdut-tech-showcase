import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Wand2, Sparkles, Upload, ImagePlus, X, Loader2 } from 'lucide-react';
import { invokeAi, humanizeAiError } from '@/lib/ai-invoke';
import { useToast } from '@/hooks/use-toast';


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Recebe prompt final + lista de imagens de referência (data URLs) */
  onGenerate: (prompt: string, references: string[], count: number) => void;
}

type SlotKey = 'objeto' | 'local' | 'estilo';

interface Slot {
  text: string;
  image?: string; // data URL
  generating?: boolean;
}

const SLOT_META: Record<SlotKey, { label: string; placeholder: string; hint: string }> = {
  objeto: { label: 'Objeto', placeholder: '', hint: 'O sujeito principal da imagem' },
  local: { label: 'Local', placeholder: '', hint: 'O cenário / background' },
  estilo: { label: 'Estilo', placeholder: '', hint: 'Estética visual / técnica' },
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export const MixModal = ({ open, onOpenChange, onGenerate }: Props) => {
  const { toast } = useToast();
  const [count, setCount] = useState(1);
  const [bulk, setBulk] = useState(false);
  const [slots, setSlots] = useState<Record<SlotKey, Slot>>({
    objeto: { text: '' },
    local: { text: '' },
    estilo: { text: '' },
  });
  const fileInputRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    objeto: null, local: null, estilo: null,
  });


  const update = (key: SlotKey, patch: Partial<Slot>) =>
    setSlots((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const handleUpload = async (key: SlotKey, file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máx 4MB.', variant: 'destructive' });
      return;
    }
    const url = await fileToDataUrl(file);
    update(key, { image: url });
  };

  const generateRef = async (key: SlotKey) => {
    const txt = slots[key].text.trim();
    if (!txt) {
      toast({ title: 'Descreva primeiro', description: `Escreva o ${SLOT_META[key].label.toLowerCase()}.` });
      return;
    }
    update(key, { generating: true });
    try {
      const promptByKey =
        key === 'objeto' ? `${txt}, isolated subject, clean background, product shot reference, high detail`
        : key === 'local' ? `${txt}, empty scene background reference, wide shot, no people, cinematic`
        : `style reference: ${txt}, abstract texture sample, no subject, high detail`;
      // Referências usam Pollinations (grátis, ilimitado, rápido)
      const data = await invokeAi<any>('generate-image', {
        prompt: promptByKey,
        provider: 'pollinations',
        quality: 'fast',
      });
      if (!data?.imageUrl) throw new Error('Sem imagem');
      update(key, { image: data.imageUrl });
    } catch (e) {
      const info = humanizeAiError(e);
      toast({ title: 'Falha na referência', description: info.description, variant: 'destructive' });
    } finally {
      update(key, { generating: false });
    }
  };

  // Gera em paralelo todas as referências que têm texto e ainda não têm imagem
  const generateAllRefs = async () => {
    const pending = (Object.keys(SLOT_META) as SlotKey[]).filter(
      (k) => slots[k].text.trim() && !slots[k].image,
    );
    if (!pending.length) {
      toast({ title: 'Nada pra gerar', description: 'Descreva ao menos um campo sem referência.' });
      return;
    }
    setBulk(true);
    await Promise.allSettled(pending.map((k) => generateRef(k)));
    setBulk(false);
  };

  const buildPrompt = () => {
    const parts: string[] = [];
    if (slots.objeto.text.trim()) parts.push(slots.objeto.text.trim());
    if (slots.local.text.trim()) parts.push(`em ${slots.local.text.trim()}`);
    if (slots.estilo.text.trim()) parts.push(`estilo ${slots.estilo.text.trim()}`);
    // Hints sobre as referências enviadas
    const refHints: string[] = [];
    if (slots.objeto.image) refHints.push('use a 1ª imagem como referência do objeto principal');
    if (slots.local.image) refHints.push('use a próxima imagem como referência do cenário/background');
    if (slots.estilo.image) refHints.push('use a última imagem como referência do estilo visual');
    let p = parts.join(', ');
    if (refHints.length) p += `. ${refHints.join('; ')}.`;
    return p;
  };

  const submit = () => {
    const prompt = buildPrompt();
    if (!prompt) {
      toast({ title: 'Preencha ao menos um campo' });
      return;
    }
    const refs = [slots.objeto.image, slots.local.image, slots.estilo.image].filter(Boolean) as string[];
    onGenerate(prompt, refs, count);
    onOpenChange(false);
    setSlots({ objeto: { text: '' }, local: { text: '' }, estilo: { text: '' } });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#0F0F11] border-[#8B5CF6]/30 text-white max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <div className="bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] p-5">
            <div className="flex items-center gap-2 mb-1 text-white/90">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-bold">/mix · referências reais</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Objeto + Local + Estilo
            </DialogTitle>
            <DialogDescription className="text-white/85 text-sm mt-1">
              Descreva cada parte. Faça upload ou gere uma imagem de referência pra cada uma. Tudo vai junto pro modelo.
            </DialogDescription>
          </div>

          <div className="p-5 space-y-4">
            {(Object.keys(SLOT_META) as SlotKey[]).map((key) => {
              const meta = SLOT_META[key];
              const slot = slots[key];
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-white/90 font-bold">{meta.label}</div>
                      <div className="text-[10px] text-neutral-500">{meta.hint}</div>
                    </div>
                    {slot.image && (
                      <button
                        onClick={() => update(key, { image: undefined })}
                        className="text-neutral-400 hover:text-white"
                        aria-label="Remover imagem"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <input
                    value={slot.text}
                    onChange={(e) => update(key, { text: e.target.value })}
                    placeholder={meta.placeholder}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6] mb-2"
                  />

                  <div className="flex items-center gap-2">
                    {slot.image ? (
                      <img
                        src={slot.image}
                        alt={`Referência ${meta.label}`}
                        className="h-16 w-16 rounded-lg object-cover border border-[#8B5CF6]/40"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg border border-dashed border-white/10 grid place-items-center text-neutral-600">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        ref={(el) => (fileInputRefs.current[key] = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(key, f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[key]?.click()}
                        className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload local
                      </button>
                      <button
                        onClick={() => generateRef(key)}
                        disabled={slot.generating}
                        className="h-9 px-3 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-xs text-white hover:bg-[#8B5CF6]/30 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {slot.generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Gerar referência
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={generateAllRefs}
              disabled={bulk}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar todas as referências em paralelo
            </button>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">Variações</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`h-11 rounded-lg text-sm font-medium transition-colors ${
                      count === n
                        ? 'bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white border border-purple-400'
                        : 'bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-xs text-neutral-400">
              <span className="text-neutral-500">Prompt final:</span>{' '}
              <span className="text-white">{buildPrompt() || '...'}</span>
            </div>

            <Button
              onClick={submit}
              className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white font-bold"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Gerar {count > 1 ? `${count} variações` : 'com referências'}
            </Button>

          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
