import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/videos";
const BUCKET = "generated-videos";

const MODELS = new Set([
  "google/veo-3.1-lite",
  "google/veo-3.1-fast",
  "google/veo-3.1",
]);

const SIZES = new Set([
  "1280x720",
  "720x1280",
  "1920x1080",
  "1080x1920",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return json({ error: "Geração de vídeo indisponível: provider não configurado." }, 200);

  try {
    const body = await req.json();
    const action = body?.action === "status" ? "status" : "create";

    // ---------------- STATUS / POLL ----------------
    if (action === "status") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);

      const res = await fetch(`${GATEWAY}/${id}`, { headers: { Authorization: `Bearer ${KEY}` } });
      const job = await res.json().catch(() => null);
      if (!res.ok || !job) {
        return json({ status: "failed", error: job?.message || `Falha ao consultar job (${res.status})` });
      }

      if (job.status === "failed") {
        return json({ status: "failed", error: job?.error?.message || "O provedor recusou a geração." });
      }
      if (job.status !== "completed") {
        return json({ status: job.status === "queued" ? "queued" : "processing", progress: job.progress ?? 0 });
      }

      // Completed → baixa e guarda no storage (idempotente)
      const supabase = admin();
      const path = `${id}.mp4`;

      const existing = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
      if (existing.data?.signedUrl) {
        return json({ status: "completed", videoUrl: existing.data.signedUrl });
      }

      const dl = await fetch(`${GATEWAY}/${id}/content`, { headers: { Authorization: `Bearer ${KEY}` } });
      if (!dl.ok) return json({ status: "failed", error: `Não foi possível baixar o vídeo (${dl.status})` });
      const mp4 = await dl.arrayBuffer();

      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, mp4, { contentType: "video/mp4", upsert: true });
      if (up.error) return json({ status: "failed", error: `Falha ao salvar o vídeo: ${up.error.message}` });

      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
      if (!signed.data?.signedUrl) return json({ status: "failed", error: "Falha ao gerar link do vídeo." });

      return json({ status: "completed", videoUrl: signed.data.signedUrl });
    }

    // ---------------- CREATE ----------------
    const prompt = String(body?.prompt || "").trim();
    if (!prompt) return json({ error: "Descreva o vídeo que você quer criar." }, 400);

    const model = MODELS.has(body?.model) ? body.model : "google/veo-3.1-lite";
    const seconds = ["4", "6", "8"].includes(String(body?.seconds)) ? String(body.seconds) : "8";
    let size = SIZES.has(body?.size) ? body.size : "1280x720";
    // 1080p exige 8s
    const is1080 = size.includes("1920") || size.includes("1080x");
    const finalSeconds = is1080 ? "8" : seconds;

    const payload: Record<string, unknown> = { model, prompt, seconds: finalSeconds, size };

    // image-to-video: precisa ser data URL (bytes), nunca https
    const ref = typeof body?.input_reference === "string" ? body.input_reference : "";
    if (ref.startsWith("data:image/")) payload.input_reference = ref;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const job = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = job?.message || `Erro ${res.status} ao iniciar o vídeo`;
      if (res.status === 429) {
        return json({ error: `Fila cheia: ${msg}`, code: "rate_limit" }, 200);
      }
      if (res.status === 402) {
        return json({ error: `Créditos insuficientes para vídeo: ${msg}`, code: "no_credits" }, 200);
      }
      return json({ error: msg, code: "provider" }, 200);
    }

    return json({ id: job.id, status: job.status ?? "processing", model, seconds: finalSeconds, size });
  } catch (e) {
    console.error("generate-video error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
