// Edge function: HTML SSR mínimo com OG meta para crawlers (/lab/share/:id)
// Crawlers (Twitter, Discord, WhatsApp, Slack) leem o HTML servido aqui.
// Browsers reais são redirecionados para a SPA via meta refresh.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const base = url.searchParams.get("base") || "https://ramdut-tech-showcase.lovable.app";
  if (!id) return new Response("missing id", { status: 400, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: gen } = await supabase
    .from("lab_generations")
    .select("prompt, result_url, og_image_url, type")
    .eq("id", id)
    .single();

  if (!gen) {
    return new Response("not found", { status: 404, headers: corsHeaders });
  }

  const title = escape(gen.prompt.slice(0, 60));
  const desc = escape(`Geração ${gen.type} criada no Ramdut Lab: ${gen.prompt.slice(0, 140)}`);
  const image = gen.og_image_url || gen.result_url || `${base}/placeholder.svg`;
  const canonical = `${base}/lab/share/${id}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title} | RAMU Lab</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${escape(image)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${escape(image)}" />
  <meta http-equiv="refresh" content="0; url=${canonical}" />
</head>
<body>
  <p>Redirecionando para <a href="${canonical}">${canonical}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
