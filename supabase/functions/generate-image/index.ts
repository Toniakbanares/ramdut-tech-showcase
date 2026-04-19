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

async function callGeminiOnce(prompt: string, key: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  return res;
}

// Tenta cada chave em sequência. Se uma falhar por quota/auth, passa pra próxima.
async function generateWithGeminiRotating(prompt: string, keys: string[], model?: string) {
  const geminiModel = resolveGeminiModel(model);
  const errors: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const masked = `key#${i + 1}(...${key.slice(-4)})`;
    try {
      const res = await callGeminiOnce(prompt, key, geminiModel);

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, aspect_ratio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const geminiKeys = collectGeminiKeys();

    const aiModel = model || "google/gemini-2.5-flash-image";

    let sizeInstruction = "";
    if (aspect_ratio && aspect_ratio !== "1:1") {
      sizeInstruction = ` The image should have a ${aspect_ratio} aspect ratio.`;
    }
    const fullPrompt = prompt + sizeInstruction;

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
            messages: [{ role: "user", content: fullPrompt }],
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
    if (geminiKeys.length > 0) {
      try {
        const { imageUrl, keyIndex } = await generateWithGeminiRotating(fullPrompt, geminiKeys, aiModel);
        return new Response(
          JSON.stringify({
            imageUrl,
            provider: `gemini-direct (chave ${keyIndex}/${geminiKeys.length})`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Gemini rotação falhou:", e);
        return new Response(
          JSON.stringify({ error: e instanceof Error ? e.message : "Erro Gemini" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Nenhum provedor de IA configurado." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
