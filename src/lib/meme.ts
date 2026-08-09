// Composição de memes no cliente (canvas) — legendas estilo Impact
// Usado pelo /studio. Se a imagem bloquear CORS, o chamador cai no overlay em DOM.

export interface MemeTexts {
  top?: string;
  bottom?: string;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cors'));
    img.src = src;
  });

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawBlock = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  position: 'top' | 'bottom',
) => {
  const fontSize = Math.round(width * 0.085);
  ctx.font = `900 ${fontSize}px Impact, "Anton", "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, fontSize * 0.14);
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';

  const lines = wrap(ctx, text.toUpperCase(), width * 0.9);
  const lineHeight = fontSize * 1.12;
  const x = width / 2;

  lines.forEach((l, i) => {
    const y =
      position === 'top'
        ? fontSize + i * lineHeight + height * 0.03
        : height - height * 0.04 - (lines.length - 1 - i) * lineHeight;
    ctx.strokeText(l, x, y);
    ctx.fillText(l, x, y);
  });
};

/** Retorna um dataURL do meme pronto, ou null quando a imagem não permite leitura (CORS). */
export const composeMeme = async (imageUrl: string, texts: MemeTexts): Promise<string | null> => {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (texts.top?.trim()) drawBlock(ctx, texts.top.trim(), canvas.width, canvas.height, 'top');
    if (texts.bottom?.trim()) drawBlock(ctx, texts.bottom.trim(), canvas.width, canvas.height, 'bottom');
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

export interface MemeSubject {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

/** Assuntos clássicos de meme: gatos, pets, pessoas, bichos em geral */
export const MEME_SUBJECTS: MemeSubject[] = [
  { id: 'cat', label: 'Gato', emoji: '🐱', prompt: 'a chubby domestic cat with an extremely judgmental expression' },
  { id: 'dog', label: 'Cachorro', emoji: '🐶', prompt: 'a goofy happy dog mid-zoomies, tongue out' },
  { id: 'capybara', label: 'Capivara', emoji: '🦫', prompt: 'a supremely relaxed capybara chilling like a boss' },
  { id: 'person', label: 'Pessoa', emoji: '🧑', prompt: 'an ordinary person with an exaggerated dramatic facial reaction' },
  { id: 'office', label: 'Trabalho', emoji: '💼', prompt: 'a tired office worker in front of a computer, corporate chaos around' },
  { id: 'gym', label: 'Academia', emoji: '🏋️', prompt: 'an over-confident gym bro flexing in the mirror' },
  { id: 'monkey', label: 'Macaco', emoji: '🐵', prompt: 'a mischievous monkey caught red-handed doing something silly' },
  { id: 'frog', label: 'Sapo', emoji: '🐸', prompt: 'a smug frog sipping tea, deadpan stare' },
  { id: 'baby', label: 'Bebê', emoji: '👶', prompt: 'a determined baby with clenched fists, victory pose' },
  { id: 'animals', label: 'Bicharada', emoji: '🦝', prompt: 'a chaotic raccoon rummaging with pure confidence' },
];

/** Estilos visuais de meme */
export const MEME_STYLES: { id: string; label: string; suffix: string }[] = [
  { id: 'photo', label: 'Foto real', suffix: 'hyper realistic photo, amateur phone camera, harsh flash, meme aesthetic' },
  { id: 'cartoon', label: 'Cartoon', suffix: 'bold cartoon illustration, thick outlines, funny exaggerated proportions' },
  { id: 'cursed', label: 'Cursed', suffix: 'low quality deep fried meme, oversaturated, jpeg artifacts, absurd' },
  { id: 'render', label: '3D Pixar', suffix: '3d animated movie style character, expressive eyes, studio lighting' },
  { id: 'classic', label: 'Clássico', suffix: 'classic internet meme stock photo look, plain background' },
];
