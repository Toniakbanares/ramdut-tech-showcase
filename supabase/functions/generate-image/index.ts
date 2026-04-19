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

// Fallback: gera imagem diretamente via Google Gemini API (chave do usuário)
async function generateWithGemini(prompt: string, geminiKey: string, model?: string) {
  const geminiModel = resolveGeminiModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini direct error ${res.status} [${geminiModel}]: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p: any) => p?.inlineData?.data);
  if (!imgPart) throw new Error("Gemini não retornou imagem");
  const mime = imgPart.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${imgPart.inlineData.data}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, aspect_ratio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const aiModel = model || "google/gemini-2.5-flash-image";
    
    let sizeInstruction = "";
    if (aspect_ratio && aspect_ratio !== "1:1") {
      sizeInstruction = ` The image should have a ${aspect_ratio} aspect ratio.`;
    }
    const fullPrompt = prompt + sizeInstruction;

    // Tenta primeiro Lovable AI Gateway se a chave existir
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
            return new Response(JSON.stringify({ imageUrl, text: textContent, provider: "lovable-ai" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else if (response.status !== 402 && response.status !== 429) {
          // Erro real (não rate/credit) — log e segue para fallback
          const t = await response.text();
          console.error("Lovable AI error:", response.status, t);
        } else {
          console.log(`Lovable AI ${response.status}, fallback para Gemini direto`);
        }
      } catch (e) {
        console.error("Lovable AI exception, tentando fallback:", e);
      }
    }

    // Fallback: Gemini direto com a chave do usuário
    if (GEMINI_API_KEY) {
      try {
        const imageUrl = await generateWithGemini(fullPrompt, GEMINI_API_KEY, aiModel);
        return new Response(JSON.stringify({ imageUrl, provider: "gemini-direct" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Gemini fallback error:", e);
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro Gemini" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Nenhum provedor de IA configurado." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
