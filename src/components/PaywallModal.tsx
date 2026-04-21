import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, Clock, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'limit' | 'watermark' | 'hd' | 'truncated' | 'tts';
  onUpgrade?: (plan: 'creator' | 'pro') => void;
}

const REASON_COPY: Record<NonNullable<PaywallModalProps['reason']>, { title: string; sub: string }> = {
  limit: {
    title: 'Você usou suas 3 gerações grátis de hoje 🔒',
    sub: 'Desbloqueie agora para continuar criando sem parar.',
  },
  watermark: {
    title: 'Sua imagem está PRONTA — mas com marca d\'água 🔥',
    sub: 'Remova a marca e baixe em alta definição agora.',
  },
  hd: {
    title: 'Resolução HD 1920px é exclusiva Creator 💎',
    sub: 'Imagens 4× mais nítidas, prontas pra uso comercial.',
  },
  truncated: {
    title: 'Resposta completa só na versão Creator 🔓',
    sub: 'Você está vendo apenas 40% da resposta. Desbloqueie tudo.',
  },
  tts: {
    title: 'Áudios longos são exclusivos Creator 🎙️',
    sub: 'Ouça textos de qualquer tamanho com vozes premium.',
  },
};

export const PaywallModal = ({ open, onOpenChange, reason = 'limit', onUpgrade }: PaywallModalProps) => {
  const { toast } = useToast();
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(15 * 60);
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const copy = REASON_COPY[reason];

  const handleClick = (plan: 'creator' | 'pro') => {
    if (onUpgrade) {
      onUpgrade(plan);
    } else {
      toast({
        title: 'Checkout em breve! 🚀',
        description: 'Estamos finalizando a integração de pagamento. Em instantes você poderá assinar.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-primary/40">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              {/* Header com gradiente */}
              <div className="relative bg-gradient-to-br from-primary via-accent to-primary p-6 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-6 w-6" />
                  <span className="text-sm font-bold uppercase tracking-wider">RAMU Creator</span>
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {copy.title}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/90 mt-1">
                  {copy.sub}
                </DialogDescription>

                {/* Timer urgência */}
                <div className="mt-4 inline-flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-mono font-bold">
                    Oferta expira em {mm}:{ss}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                {/* Plano Creator (destaque) */}
                <div className="relative rounded-xl border-2 border-primary bg-primary/5 p-5">
                  <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> MAIS ESCOLHIDO
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-foreground">R$ 9,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                    <span className="text-sm text-muted-foreground line-through ml-2">R$ 19,90</span>
                    <span className="text-xs font-bold text-primary">−50%</span>
                  </div>
                  <ul className="space-y-1.5 text-sm mb-4">
                    {[
                      'Sem marca d\'água (uso comercial)',
                      'HD 1920×1920 (4× mais nítido)',
                      'Gerações ilimitadas hoje',
                      '4 variações por prompt',
                      'Resposta completa do chat',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleClick('creator')}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold text-base h-12"
                    size="lg"
                  >
                    <Zap className="h-5 w-5 mr-1" />
                    Desbloquear por R$ 9,90 →
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Cancele quando quiser. Sem fidelidade.
                  </p>
                </div>

                {/* Plano Pro (decoy) */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Pro</span>
                      <p className="text-xs text-muted-foreground">+ análise de imagem ilimitada · suporte prioritário</p>
                    </div>
                    <span className="text-lg font-bold text-foreground">R$ 29,90<span className="text-xs text-muted-foreground">/mês</span></span>
                  </div>
                  <Button
                    onClick={() => handleClick('pro')}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Ver plano Pro
                  </Button>
                </div>

                {/* Prova social */}
                <p className="text-center text-xs text-muted-foreground">
                  🔥 +2.847 criadores usaram o Ramu hoje
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
