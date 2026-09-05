import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_IMAGE_MODEL_FALLBACK = "gemini-3.1-flash-image-preview";

function resolveGeminiModel(model?: string) {
  const normalized = (model || "").replace(/^google\//, "").trim();
  const supportedModels = new Set([
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ]);

  return supportedModels.has(normalized) ? normalized : GEMINI_IMAGE_MODEL_FALLBACK;
}

// Coleta TODAS as chaves Gemini disponíveis (rotação automática)
function collectGeminiKeys(): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const add = (raw?: string | null) => {
    if (!raw) return;
    raw.split(/[,\s;]+/).forEach((k) => {
      const key = k.trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    });
  };

  // Chave única (legado) + lista (nova)
  add(Deno.env.get("GEMINI_API_KEY"));
  add(Deno.env.get("GEMINI_API_KEYS"));

  // Chaves numeradas opcionais GEMINI_API_KEY_1..N
  for (let i = 1; i <= 20; i++) {
    add(Deno.env.get(`GEMINI_API_KEY_${i}`));
  }

  return keys;
}

function dataUrlToInlinePart(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

const GEMINI_ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "5:4", "4:5"]);

async function callGeminiOnce(prompt: string, key: string, model: string, refImages: string[] = [], aspect?: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const parts: any[] = [];
  for (const img of refImages) {
    const p = dataUrlToInlinePart(img);
    if (p) parts.push(p);
  }
  parts.push({ text: prompt });

  const generationConfig: Record<string, unknown> = { responseModalities: ["IMAGE", "TEXT"] };
  // Proporção nativa (Gemini 3 image) — muito melhor que pedir no prompt
  if (aspect && GEMINI_ASPECTS.has(aspect) && aspect !== "1:1") {
    generationConfig.imageConfig = { aspectRatio: aspect };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig }),
  });
  return res;
}

// Tenta cada chave em sequência. Se uma falhar por quota/auth, passa pra próxima.
async function generateWithGeminiRotating(prompt: string, keys: string[], model?: string, refImages: string[] = [], aspect?: string) {
  const geminiModel = resolveGeminiModel(model);
  const errors: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const masked = `key#${i + 1}(...${key.slice(-4)})`;
    try {
      const res = await callGeminiOnce(prompt, key, geminiModel, refImages, aspect);


      if (res.ok) {
        const json = await res.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: any) => p?.inlineData?.data);
        if (!imgPart) {
          errors.push(`${masked}: resposta sem imagem`);
          continue;
        }
        const mime = imgPart.inlineData.mimeType || "image/png";
        console.log(`Gemini OK com ${masked}`);
        return {
          imageUrl: `data:${mime};base64,${imgPart.inlineData.data}`,
          keyIndex: i + 1,
        };
      }

      const t = await res.text();
      const snippet = t.slice(0, 200);
      console.warn(`Gemini ${res.status} em ${masked}: ${snippet}`);

      // 429 (quota) / 403 (perm) / 400 (chave inválida) → tenta próxima
      if ([400, 401, 403, 429].includes(res.status)) {
        errors.push(`${masked}: ${res.status}`);
        continue;
      }

      // Outros erros (5xx) também tentam próxima chave
      errors.push(`${masked}: ${res.status} ${snippet}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${masked}: exception ${msg}`);
      console.error(`Gemini exception ${masked}:`, msg);
    }
  }

  throw new Error(
    `Todas as ${keys.length} chave(s) Gemini falharam. Detalhes: ${errors.join(" | ")}`
  );
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

serve(async (req) => {

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, aspect_ratio, reference_images, provider, quality } = await req.json();
    const refImages: string[] = Array.isArray(reference_images) ? reference_images.filter((s: any) => typeof s === 'string' && s.startsWith('data:')) : [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const geminiKeys = collectGeminiKeys();
    const forcePollinations = provider === 'pollinations';
    const q: 'fast' | 'standard' | 'hd' | 'ultra' = ['fast','standard','hd','ultra'].includes(quality) ? quality : 'standard';

    const aiModel = model || "google/gemini-2.5-flash-image";

    let sizeInstruction = "";
    if (aspect_ratio && aspect_ratio !== "1:1") {
      sizeInstruction = ` The image should have a ${aspect_ratio} aspect ratio.`;
    }
    const mixInstruction = refImages.length
      ? " Blend the referenced ideas into one coherent final image. Do not create a collage."
      : "";
    // Reforço de qualidade proporcional ao nível pedido
    const qualityBoost: Record<string, string> = {
      fast: "clean composition, good lighting",
      standard: "sharp focus, rich detail, professional composition, natural lighting",
      hd: "ultra detailed, sharp focus, high dynamic range, cinematic lighting, professional photography, 8k detail",
      ultra:
        "hyper detailed masterpiece, razor sharp focus, physically accurate materials, cinematic volumetric lighting, professional color grading, ultra high resolution, award winning composition",
    };
    const fullPrompt = `${prompt}${sizeInstruction}${mixInstruction} ${qualityBoost[q]}, no watermark, no text overlay, no logo, no border, no signature.`;

    /** Pollinations com timeout + 2 tentativas (seeds diferentes) */
    const pollinations = async (w: number, h: number, modelName: string, enhance: boolean) => {
      let lastErr = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const seed = Math.floor(Math.random() * 1_000_000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&nologo=true&private=true&enhance=${enhance}&safe=true&seed=${seed}&model=${modelName}`;
        try {
          const imgRes = await fetch(url, { signal: AbortSignal.timeout(120_000) });
          if (!imgRes.ok) throw new Error(`Pollinations ${imgRes.status}`);
          const buf = await imgRes.arrayBuffer();
          if (buf.byteLength < 2048) throw new Error("Imagem vazia do provedor");
          return `data:image/jpeg;base64,${bufToBase64(buf)}`;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
          console.warn(`Pollinations tentativa ${attempt + 1} falhou: ${lastErr}`);
        }
      }
      throw new Error(lastErr || "Pollinations indisponível");
    };

    const ratios: Record<string, [number, number]> = {
      "1:1": [1, 1], "16:9": [16, 9], "9:16": [9, 16],
      "4:3": [4, 3], "3:4": [3, 4], "3:2": [3, 2], "2:3": [2, 3], "21:9": [21, 9],
    };
    const dimsFor = (base: number) => {
      const [rw, rh] = ratios[aspect_ratio || "1:1"] || [1, 1];
      const scale = base / Math.max(rw, rh);
      // múltiplos de 64 melhoram a saída dos modelos de difusão
      const round64 = (n: number) => Math.max(512, Math.round(n / 64) * 64);
      return { w: round64(rw * scale), h: round64(rh * scale) };
    };

    // Se forçou Pollinations, pula direto pro fallback gratuito
    if (forcePollinations) {
      try {
        const baseByQuality: Record<string, number> = { fast: 768, standard: 1152, hd: 1536, ultra: 2048 };
        const { w, h } = dimsFor(baseByQuality[q]);
        const imageUrl = await pollinations(w, h, q === 'fast' ? 'turbo' : 'flux', q === 'hd' || q === 'ultra');
        return new Response(
          JSON.stringify({ imageUrl, provider: `pollinations-${q}`, width: w, height: h }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Pollinations falhou: ${e instanceof Error ? e.message : e}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }






    // 1) Tenta Lovable AI Gateway primeiro
    if (LOVABLE_API_KEY) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [{
              role: "user",
              content: refImages.length
                ? [
                    { type: "text", text: fullPrompt },
                    ...refImages.map((url) => ({ type: "image_url", image_url: { url } })),
                  ]
                : fullPrompt,
            }],
            modalities: ["image", "text"],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          const textContent = data.choices?.[0]?.message?.content || "";
          if (imageUrl) {
            return new Response(
              JSON.stringify({ imageUrl, text: textContent, provider: "lovable-ai" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (response.status !== 402 && response.status !== 429) {
          const t = await response.text();
          console.error("Lovable AI error:", response.status, t);
        } else {
          console.log(`Lovable AI ${response.status}, fallback para Gemini direto (${geminiKeys.length} chaves)`);
        }
      } catch (e) {
        console.error("Lovable AI exception, tentando fallback:", e);
      }
    }

    // 2) Fallback: rotação de chaves Gemini
    let geminiError: string | null = null;
    if (geminiKeys.length > 0) {
      try {
        const { imageUrl, keyIndex } = await generateWithGeminiRotating(fullPrompt, geminiKeys, aiModel, refImages, aspect_ratio);
        return new Response(
          JSON.stringify({
            imageUrl,
            provider: `gemini-direct (chave ${keyIndex}/${geminiKeys.length})`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        geminiError = e instanceof Error ? e.message : "Erro Gemini";
        console.error("Gemini rotação falhou, tentando Pollinations:", geminiError);
      }
    }

    // 3) Último fallback: Pollinations.ai (gratuito, sem chave)
    try {
      const baseByQuality: Record<string, number> = { fast: 768, standard: 1152, hd: 1536, ultra: 2048 };
      const { w, h } = dimsFor(baseByQuality[q]);
      const imageUrl = await pollinations(w, h, 'flux', true);
      console.log("Pollinations OK (fallback gratuito)");
      return new Response(
        JSON.stringify({ imageUrl, provider: "pollinations-free", width: w, height: h }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (e) {
      const pollErr = e instanceof Error ? e.message : "Erro Pollinations";
      console.error("Pollinations falhou:", pollErr);
      return new Response(
        JSON.stringify({
          error: `Todos os provedores falharam. Gemini: ${geminiError || "sem chaves"}. Pollinations: ${pollErr}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
