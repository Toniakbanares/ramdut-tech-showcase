import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Endpoints suportados (mapeamento amigável -> fal endpoint)
const FAL_ENDPOINTS: Record<string, string> = {
  "flux-schnell": "fal-ai/flux/schnell",
  "flux-dev": "fal-ai/flux/dev",
  "flux-pro": "fal-ai/flux-pro/v1.1",
  "sdxl": "fal-ai/fast-sdxl",
  "stable-diffusion-3": "fal-ai/stable-diffusion-v3-medium",
  "recraft-svg": "fal-ai/recraft-v3",
};

function resolveEndpoint(model?: string) {
  const key = (model || "flux-schnell").toLowerCase();
  return FAL_ENDPOINTS[key] || FAL_ENDPOINTS["flux-schnell"];
}

function aspectToSize(ratio?: string) {
  switch (ratio) {
    case "16:9": return { width: 1280, height: 720 };
    case "9:16": return { width: 720, height: 1280 };
    case "4:3": return { width: 1024, height: 768 };
    case "3:2": return { width: 1080, height: 720 };
    case "21:9": return { width: 1280, height: 548 };
    case "1:1":
    default: return { width: 1024, height: 1024 };
  }
}

async function urlToDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar imagem fal: ${r.status}`);
  const ct = r.headers.get("content-type") || "image/png";
  const buf = await r.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${ct};base64,${b64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, aspect_ratio, svg } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) {
      return new Response(JSON.stringify({ error: "FAL_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Para SVG, usar Recraft v3 com style svg
    const endpoint = svg ? FAL_ENDPOINTS["recraft-svg"] : resolveEndpoint(model);
    const url = `https://fal.run/${endpoint}`;

    const { width, height } = aspectToSize(aspect_ratio);
    const body: any = {
      prompt,
      image_size: { width, height },
    };

    if (svg) {
      body.style = "vector_illustration";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("fal error:", res.status, t);
      return new Response(JSON.stringify({ error: `fal.ai ${res.status}: ${t.slice(0, 300)}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    // fal retorna { images: [{ url, content_type, width, height }] }
    const first = data?.images?.[0];
    if (!first?.url) {
      return new Response(JSON.stringify({ error: "fal.ai sem imagem na resposta" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Para SVG: tentar baixar como texto svg
    if (svg) {
      const svgRes = await fetch(first.url);
      const ct = svgRes.headers.get("content-type") || "";
      if (ct.includes("svg") || first.url.endsWith(".svg")) {
        const svgText = await svgRes.text();
        return new Response(JSON.stringify({
          svg: svgText,
          imageUrl: first.url,
          provider: `fal.ai (${endpoint})`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // fallback: data url
      const dataUrl = await urlToDataUrl(first.url);
      return new Response(JSON.stringify({
        imageUrl: dataUrl,
        provider: `fal.ai (${endpoint})`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dataUrl = await urlToDataUrl(first.url);
    return new Response(JSON.stringify({
      imageUrl: dataUrl,
      provider: `fal.ai (${endpoint})`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-fal error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro desconhecido",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
