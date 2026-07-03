import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Coffee, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildPixPayload, PIX_KEY } from '@/config/pix';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Compat: chamado quando o usuário fecha o modal. Não é mais obrigatório. */
  onConfirmed?: () => void;
  reason?: string;
}

/**
 * Modal "Me pague um café" — 100% opcional.
 * Todas as funções do Lab funcionam de graça; isto é só um apoio ao dev.
 */
export const PixPaymentModal = ({ open, onOpenChange, onConfirmed, reason }: Props) => {
  const { toast } = useToast();
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const payload = buildPixPayload();

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(payload, { width: 280, margin: 1, color: { dark: '#0A0A0B', light: '#FFFFFF' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [open, payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast({ title: 'PIX copiado!', description: 'Cole no app do banco e escolha o valor.' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: 'Não consegui copiar', variant: 'destructive' });
    }
  };

  const close = () => {
    onConfirmed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] p-0 overflow-hidden bg-[#0F0F11] border-[#8B5CF6]/30 text-white">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <div className="bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] p-5">
                <div className="flex items-center gap-2 mb-1 text-white/90">
                  <Coffee className="h-5 w-5" />
                  <span className="text-xs uppercase tracking-widest font-bold">Apoie o RAMU</span>
                </div>
                <DialogTitle className="text-xl font-bold leading-tight text-white">
                  Me pague um café ☕
                </DialogTitle>
                <DialogDescription className="text-white/85 text-sm mt-1">
                  {reason || 'Tudo aqui é grátis e continua grátis. Se curtir, um cafezinho ajuda a manter as APIs no ar.'}
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-white rounded-xl p-3 mx-auto w-fit">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR Code PIX" width={220} height={220} className="block max-w-full h-auto" />
                  ) : (
                    <div className="w-[220px] h-[220px] grid place-items-center text-xs text-neutral-500">
                      Gerando QR…
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-neutral-400">
                  Valor livre — você escolhe no app do banco. R$ 1, R$ 5, o que der.
                </p>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400">
                    PIX copia e cola
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      readOnly
                      value={payload}
                      className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-neutral-300 font-mono truncate"
                    />
                    <button
                      onClick={copy}
                      className="shrink-0 h-11 w-11 rounded-lg bg-[#8B5CF6] hover:bg-[#7c3aed] grid place-items-center transition-colors"
                      aria-label="Copiar PIX"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 break-all">
                    Chave: {PIX_KEY}
                  </p>
                </div>

                <Button
                  onClick={close}
                  className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white font-bold"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Voltar pro Lab
                </Button>

                <p className="text-[10px] text-center text-neutral-500">
                  Sem obrigação. Sem cadastro. Sem paywall. Só código aberto e um dev humano.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
