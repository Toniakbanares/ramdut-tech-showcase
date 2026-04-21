/**
 * Aplica marca d'água "RAMU.AI" em uma imagem (data URL ou URL externa).
 * Retorna data URL PNG. Usado para travar imagens grátis em uso comercial.
 */
export async function applyWatermark(
  imageSrc: string,
  text: string = 'RAMU.AI',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageSrc);

        ctx.drawImage(img, 0, 0);

        // Marca d'água diagonal repetida (forte, dificulta remoção)
        const fontSize = Math.max(18, Math.floor(canvas.width / 22));
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(1, fontSize / 16);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);

        const stepX = fontSize * 8;
        const stepY = fontSize * 4;
        const reach = Math.max(canvas.width, canvas.height);
        for (let x = -reach; x < reach; x += stepX) {
          for (let y = -reach; y < reach; y += stepY) {
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }
        }
        ctx.restore();

        // Marca d'água sólida no canto inferior direito
        const cornerSize = Math.max(14, Math.floor(canvas.width / 28));
        ctx.font = `bold ${cornerSize}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(
          canvas.width - cornerSize * 7,
          canvas.height - cornerSize * 2,
          cornerSize * 7,
          cornerSize * 2,
        );
        ctx.fillStyle = '#fff';
        ctx.fillText(
          `${text} · Free`,
          canvas.width - cornerSize / 2,
          canvas.height - cornerSize / 2,
        );

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => resolve(imageSrc); // fallback: devolve original
    img.src = imageSrc;
  });
}

/**
 * Trunca um texto em ~40% e adiciona marcador de upgrade.
 */
export function truncateForFree(text: string, ratio = 0.4): string {
  if (!text) return '';
  const cut = Math.max(80, Math.floor(text.length * ratio));
  // Tenta cortar em final de frase
  const slice = text.slice(0, cut);
  const lastDot = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'));
  const finalCut = lastDot > 60 ? lastDot + 1 : cut;
  return text.slice(0, finalCut).trim() + '\n\n…';
}
