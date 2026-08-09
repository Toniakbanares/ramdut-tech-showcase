import { motion } from 'framer-motion';
import { Download, Share2, GitFork, Trash2, Lock, Loader2, Wand2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Handle, Position } from 'reactflow';
import type { LabCard } from '@/store/lab-store';
import { MODE_META } from '@/lib/lab-helpers';

interface Props {
  data: {
    card: LabCard;
    isPro: boolean;
    selected: boolean;
    onSelect: () => void;
    onFork: () => void;
    onShare: () => void;
    onDownload: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onRetry: () => void;
    sharing?: boolean;
  };
}

export const GenerationCard = ({ data }: Props) => {
  const { card, isPro, selected, onSelect, onFork, onShare, onDownload, onDelete, onEdit, onRetry, sharing } = data;
  const meta = MODE_META[card.type];
  const isImage = !!card.imageUrl;
  const isLoading = card.status === 'loading';
  const isError = card.status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      onClick={onSelect}
      className={`w-[210px] sm:w-[260px] md:w-[300px] rounded-xl overflow-hidden ramu-glass cursor-pointer transition-all ${
        selected ? 'ring-2 ring-[#8B5CF6]' : isError ? 'ring-1 ring-red-500/50' : 'ramu-card-border'
      }`}
    >
      <Handle type="target" position={Position.Top} id="in-top" className="!bg-[#8B5CF6] !border-2 !border-white/30 !w-5 !h-5 md:!w-4 md:!h-4 hover:!scale-125 transition-transform" />
      <Handle type="target" position={Position.Left} id="in-left" className="!bg-[#8B5CF6] !border-2 !border-white/30 !w-5 !h-5 md:!w-4 md:!h-4 hover:!scale-125 transition-transform" />

      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <span className="text-sm">{meta.icon}</span>
        <span className="text-xs uppercase tracking-wider text-neutral-400">{meta.label}</span>
        <span className="ml-auto text-[10px] text-neutral-600">
          {new Date(card.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="relative aspect-square bg-neutral-900 flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#8B5CF6]/10 to-[#06B6D4]/10">
            <div className="text-center px-4">
              <Loader2 className="h-7 w-7 mx-auto text-[#8B5CF6] animate-spin mb-2" />
              <p className="text-xs text-neutral-400">Gerando… isso leva alguns segundos</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 grid place-items-center bg-red-950/30 px-4">
            <div className="text-center">
              <AlertTriangle className="h-7 w-7 mx-auto text-red-400 mb-2" />
              <p className="text-[11px] text-neutral-300 mb-3 line-clamp-4">{card.error || 'Falha na geração'}</p>
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                className="min-h-[44px] px-4 rounded-lg ramu-accent-bg text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </button>
            </div>
          </div>
        )}

        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.prompt}
            loading="lazy"
            className={`w-full h-full object-cover ${!isPro ? 'blur-md' : ''}`}
            draggable={false}
          />
        )}
        {card.svg && (
          <div
            className={`w-full h-full flex items-center justify-center p-4 bg-white ${!isPro ? 'blur-md' : ''}`}
            dangerouslySetInnerHTML={{ __html: card.svg }}
          />
        )}
        {card.text && !card.imageUrl && !card.svg && (
          <div className={`w-full h-full overflow-auto p-3 text-xs text-neutral-200 whitespace-pre-wrap ${!isPro ? 'blur-sm select-none' : ''}`}>
            {card.text}
          </div>
        )}

        {!isPro && (card.imageUrl || card.svg) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <Lock className="h-6 w-6 text-white mx-auto mb-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="px-3 py-2 min-h-[44px] rounded-md ramu-accent-bg text-white text-xs font-medium"
              >
                Ver em HD
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 text-xs text-neutral-300 line-clamp-2 min-h-[2.5em] border-b border-white/5">
        {card.prompt}
      </div>

      <div className="grid grid-cols-5 gap-1 p-2">
        {isImage && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="min-h-[44px] text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded flex flex-col items-center justify-center gap-0.5"
            title="Editar no Fabric"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span className="text-[10px]">Editar</span>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); isError ? onRetry() : onFork(); }}
          disabled={isLoading}
          className="min-h-[44px] text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded flex flex-col items-center justify-center gap-0.5 disabled:opacity-30"
          title={isError ? 'Tentar novamente' : 'Fork — nova variação a partir desta'}
        >
          {isError ? <RefreshCw className="h-3.5 w-3.5" /> : <GitFork className="h-3.5 w-3.5" />}
          <span className="text-[10px]">{isError ? 'Retry' : 'Fork'}</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          disabled={sharing || isLoading || isError}
          className="min-h-[44px] text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded flex flex-col items-center justify-center gap-0.5 disabled:opacity-30"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          <span className="text-[10px]">Share</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          disabled={isLoading || isError || (!isPro && !!(card.imageUrl || card.svg))}
          className="min-h-[44px] text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded flex flex-col items-center justify-center gap-0.5 disabled:opacity-30"
          title={!isPro && (card.imageUrl || card.svg) ? 'Pro pra baixar' : 'Download'}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-[10px]">Get</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="min-h-[44px] text-xs text-neutral-500 hover:text-red-400 hover:bg-white/5 rounded flex flex-col items-center justify-center gap-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-[10px]">Del</span>
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} id="out-bottom" className="!bg-[#06B6D4] !border-2 !border-white/30 !w-5 !h-5 md:!w-4 md:!h-4 hover:!scale-125 transition-transform" />
      <Handle type="source" position={Position.Right} id="out-right" className="!bg-[#06B6D4] !border-2 !border-white/30 !w-5 !h-5 md:!w-4 md:!h-4 hover:!scale-125 transition-transform" />
    </motion.div>
  );
};
