// Edge function: serve sitemap.xml dinâmico do RAMU Lab
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_PATHS = [
  "/",
  "/lab",
  "/lab/imagens",
  "/lab/svg",
  "/lab/pro-fal",
  "/lab/chat",
  "/api-status",
  "/ai-tools",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const baseUrl = url.searchParams.get("base") || "https://ramdut-tech-showcase.lovable.app";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: shares } = await supabase
    .from("lab_generations")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const now = new Date().toISOString();
  const urlsXml = [
    ...STATIC_PATHS.map(
      (p) => `<url><loc>${baseUrl}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ),
    ...(shares || []).map(
      (s) => `<url><loc>${baseUrl}/lab/share/${s.id}</loc><lastmod>${s.created_at}</lastmod><priority>0.5</priority></url>`,
    ),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlsXml}</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
  });
});
