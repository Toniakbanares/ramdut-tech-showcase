// Helpers compartilhados do RAMU Lab

export const DEVICE_ID_KEY = 'ramu_device_id';

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
};

export type LabMode = 'image' | 'svg' | 'pro-fal' | 'chat' | 'meme';

export const MODE_META: Record<LabMode, { label: string; icon: string; placeholder: string }> = {
  image: { label: 'Imagem', icon: '🎨', placeholder: 'Descreva a imagem que quer gerar...' },
  svg: { label: 'SVG Vetorial', icon: '✒️', placeholder: 'Descreva o ícone/ilustração vetorial...' },
  'pro-fal': { label: 'Pro (fal.ai)', icon: '👑', placeholder: 'Imagem em alta qualidade Flux/SDXL...' },
  chat: { label: 'Chat / Texto', icon: '💬', placeholder: 'Pergunte ou peça um texto criativo...' },
  meme: { label: 'Meme', icon: '😂', placeholder: 'Tema do meme (ex: programador no Monday)...' },
};

// Insere <title> e <desc> no SVG para SEO/acessibilidade
export const enrichSvg = (svg: string, prompt: string): string => {
  if (!svg.includes('<svg')) return svg;
  const title = prompt.slice(0, 120).replace(/[<>&]/g, '');
  const meta = `<title>${title}</title><desc>Gerado no Ramdut Lab — ramdut.tech</desc>`;
  // injeta logo após o primeiro <svg ...>
  return svg.replace(/(<svg[^>]*>)/, `$1${meta}`);
};

export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const downloadText = (text: string, filename: string, mime = 'text/plain') => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
