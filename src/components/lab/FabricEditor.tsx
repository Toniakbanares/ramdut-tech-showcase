import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Type, Sticker, Pencil, Crop, Save, Trash2, Layers, Undo, Image as ImageIcon, Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  imageUrl?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const STICKERS = ['✨', '🔥', '💜', '🚀', '🌈', '⚡', '🎨', '⭐', '👑', '💎', '🦄', '🍀'];
const FILTERS = [
  { id: 'none', label: 'Original' },
  { id: 'grayscale', label: 'P&B' },
  { id: 'sepia', label: 'Sépia' },
  { id: 'invert', label: 'Invert' },
  { id: 'blur', label: 'Blur' },
];

type Tool = 'select' | 'text' | 'sticker' | 'draw' | 'crop' | 'layers' | 'filters';

export const FabricEditor = ({ open, imageUrl, onClose, onSave }: Props) => {
  const { toast } = useToast();
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const bgImgRef = useRef<fabric.FabricImage | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [drawColor, setDrawColor] = useState('#8B5CF6');
  const [drawWidth, setDrawWidth] = useState(4);

  // Init canvas
  useEffect(() => {
    if (!open || !canvasElRef.current) return;

    const wrapper = canvasElRef.current.parentElement;
    const w = Math.min(wrapper?.clientWidth || 800, 900);
    const h = Math.min(wrapper?.clientHeight || 600, 700);

    const c = new fabric.Canvas(canvasElRef.current, {
      width: w,
      height: h,
      backgroundColor: '#111',
      preserveObjectStacking: true,
    });
    fabricRef.current = c;

    if (imageUrl) {
      fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
        .then((img) => {
          const scale = Math.min((w - 40) / img.width!, (h - 40) / img.height!);
          img.scale(scale);
          img.set({
            left: (w - img.width! * scale) / 2,
            top: (h - img.height! * scale) / 2,
            selectable: false,
            evented: false,
          });
          c.add(img);
          c.sendObjectToBack(img);
          bgImgRef.current = img;
          c.requestRenderAll();
        })
        .catch(() => toast({ title: 'Erro ao carregar imagem', variant: 'destructive' }));
    }

    return () => {
      c.dispose();
      fabricRef.current = null;
      bgImgRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageUrl]);

  // Tool switching
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.isDrawingMode = tool === 'draw';
    if (c.isDrawingMode) {
      const brush = new fabric.PencilBrush(c);
      brush.color = drawColor;
      brush.width = drawWidth;
      c.freeDrawingBrush = brush;
    }
  }, [tool, drawColor, drawWidth]);

  const addText = () => {
    const c = fabricRef.current;
    if (!c) return;
    const text = new fabric.IText('Edite seu texto', {
      left: c.width! / 2 - 80,
      top: c.height! / 2 - 20,
      fill: '#ffffff',
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fontSize: 36,
      stroke: '#000',
      strokeWidth: 1,
    });
    c.add(text);
    c.setActiveObject(text);
    c.requestRenderAll();
    setTool('select');
  };

  const addSticker = (emoji: string) => {
    const c = fabricRef.current;
    if (!c) return;
    const text = new fabric.IText(emoji, {
      left: c.width! / 2 - 40,
      top: c.height! / 2 - 40,
      fontSize: 80,
    });
    c.add(text);
    c.setActiveObject(text);
    c.requestRenderAll();
  };

  const removeSelected = () => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObjects();
    active.forEach((o) => {
      if (o !== bgImgRef.current) c.remove(o);
    });
    c.discardActiveObject();
    c.requestRenderAll();
  };

  const undo = () => {
    const c = fabricRef.current;
    if (!c) return;
    const objs = c.getObjects().filter((o) => o !== bgImgRef.current);
    const last = objs[objs.length - 1];
    if (last) c.remove(last);
    c.requestRenderAll();
  };

  const applyFilter = (id: string) => {
    const img = bgImgRef.current;
    const c = fabricRef.current;
    if (!img || !c) return;
    img.filters = [];
    if (id === 'grayscale') img.filters.push(new fabric.filters.Grayscale());
    if (id === 'sepia') img.filters.push(new fabric.filters.Sepia());
    if (id === 'invert') img.filters.push(new fabric.filters.Invert());
    if (id === 'blur') img.filters.push(new fabric.filters.Blur({ blur: 0.15 }));
    img.applyFilters();
    c.requestRenderAll();
  };

  const cropToImage = () => {
    const c = fabricRef.current;
    const img = bgImgRef.current;
    if (!c || !img) return;
    const w = img.getScaledWidth();
    const h = img.getScaledHeight();
    c.setDimensions({ width: w, height: h });
    img.set({ left: 0, top: 0 });
    c.requestRenderAll();
    toast({ title: 'Recortado pra imagem' });
  };

  const handleSave = () => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.requestRenderAll();
    const dataUrl = c.toDataURL({ format: 'png', multiplier: 2 });
    onSave(dataUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-[#0A0A0B] flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Header */}
          <header className="h-14 px-3 sm:px-4 border-b border-white/5 flex items-center gap-2 ramu-glass">
            <button
              onClick={onClose}
              className="h-10 w-10 grid place-items-center rounded-lg hover:bg-white/5"
              aria-label="Fechar editor"
            >
              <X className="h-5 w-5 text-neutral-300" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
              <span className="font-bold text-white text-sm">Editor</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={undo}
                className="hidden sm:flex h-10 px-3 items-center gap-1 rounded-lg border border-white/10 hover:bg-white/5 text-sm text-neutral-300"
              >
                <Undo className="h-4 w-4" /> Desfazer
              </button>
              <button
                onClick={removeSelected}
                className="h-10 w-10 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5 text-neutral-300"
                aria-label="Remover selecionado"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleSave}
                className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white text-sm font-bold flex items-center gap-1"
              >
                <Save className="h-4 w-4" /> Salvar
              </button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            {/* Canvas */}
            <div className="flex-1 grid place-items-center p-2 sm:p-4 overflow-auto bg-[#0F0F11]">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <canvas ref={canvasElRef} />
              </div>
            </div>

            {/* Panel (lateral em desktop, secondary bottom em mobile) */}
            <aside className="md:w-72 md:border-l border-white/5 ramu-glass overflow-y-auto">
              <div className="p-3 space-y-3">
                {/* Toolbar visual */}
                <div className="grid grid-cols-6 md:grid-cols-3 gap-1">
                  <ToolBtn icon={Type} label="Texto" active={tool === 'text'} onClick={() => { setTool('text'); addText(); }} />
                  <ToolBtn icon={Sticker} label="Sticker" active={tool === 'sticker'} onClick={() => setTool('sticker')} />
                  <ToolBtn icon={Pencil} label="Desenhar" active={tool === 'draw'} onClick={() => setTool('draw')} />
                  <ToolBtn icon={Crop} label="Recortar" active={tool === 'crop'} onClick={() => { setTool('crop'); cropToImage(); }} />
                  <ToolBtn icon={ImageIcon} label="Filtros" active={tool === 'filters'} onClick={() => setTool('filters')} />
                  <ToolBtn icon={Layers} label="Camadas" active={tool === 'layers'} onClick={() => setTool('layers')} />
                </div>

                {tool === 'sticker' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 block">Stickers</label>
                    <div className="grid grid-cols-6 gap-1">
                      {STICKERS.map((s) => (
                        <button
                          key={s}
                          onClick={() => addSticker(s)}
                          className="h-11 w-11 grid place-items-center rounded-lg bg-black/30 border border-white/5 hover:border-[#8B5CF6]/40 text-2xl"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tool === 'draw' && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block">Cor</label>
                    <div className="flex flex-wrap gap-1">
                      {['#8B5CF6', '#06B6D4', '#FFFFFF', '#000000', '#EF4444', '#F59E0B', '#10B981'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setDrawColor(c)}
                          className={`h-8 w-8 rounded-full border-2 ${drawColor === c ? 'border-white' : 'border-white/10'}`}
                          style={{ background: c }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block">Espessura: {drawWidth}px</label>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={drawWidth}
                      onChange={(e) => setDrawWidth(Number(e.target.value))}
                      className="w-full accent-[#8B5CF6]"
                    />
                  </div>
                )}

                {tool === 'filters' && (
                  <div className="grid grid-cols-2 gap-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => applyFilter(f.id)}
                        className="h-10 rounded-lg bg-black/30 border border-white/5 hover:border-[#06B6D4]/40 text-xs text-neutral-200"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {tool === 'layers' && (
                  <div className="text-xs text-neutral-400">
                    Toque num elemento no canvas pra selecionar. Use <Trash2 className="inline h-3 w-3" /> pra remover ou arraste pra reposicionar.
                  </div>
                )}

                <p className="text-[10px] text-neutral-500 pt-2 border-t border-white/5">
                  💡 Salvar volta o resultado pro Canvas como um novo card.
                </p>
              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function ToolBtn({
  icon: Icon, label, active, onClick,
}: { icon: any; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
        active
          ? 'bg-gradient-to-br from-[#8B5CF6]/30 to-[#06B6D4]/20 border border-[#8B5CF6]/40 text-white'
          : 'bg-black/30 border border-white/5 text-neutral-300 hover:border-white/20'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
