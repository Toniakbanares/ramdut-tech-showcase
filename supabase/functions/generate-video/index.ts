import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/videos";
const FAL_QUEUE = "https://queue.fal.run";
const BUCKET = "generated-videos";

/** Modelos Veo (Lovable AI Gateway) */
const VEO_MODELS = new Set([
  "google/veo-3.1-lite",
  "google/veo-3.1-fast",
  "google/veo-3.1",
]);

const VEO_SIZES = new Set(["1280x720", "720x1280", "1920x1080", "1080x1920"]);

/** Endpoints reais da fal.ai (queue API) */
const FAL_T2V = "fal-ai/kling-video/v1/standard/text-to-video";
const FAL_I2V = "fal-ai/kling-video/v1/standard/image-to-video";

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

/** ids opacos: "veo:<id>" ou "fal:<endpoint>:<request_id>" */
const encodeVeo = (id: string) => `veo:${id}`;
const encodeFal = (endpoint: string, id: string) => `fal:${endpoint}:${id}`;

function decode(jobId: string) {
  if (jobId.startsWith("fal:")) {
    const rest = jobId.slice(4);
    const i = rest.lastIndexOf(":");
    return { kind: "fal" as const, endpoint: rest.slice(0, i), id: rest.slice(i + 1) };
  }
  return { kind: "veo" as const, endpoint: "", id: jobId.replace(/^veo:/, "") };
}

async function storeAndSign(jobId: string, bytes: ArrayBuffer) {
  const supabase = admin();
  const path = `${jobId.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (up.error) throw new Error(`Falha ao salvar o vídeo: ${up.error.message}`);
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  if (!signed.data?.signedUrl) throw new Error("Falha ao gerar link do vídeo.");
  return { videoUrl: signed.data.signedUrl, path };
}

async function existingUrl(jobId: string) {
  const supabase = admin();
  const path = `${jobId.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`;
  const r = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  return r.data?.signedUrl;
}

// ---------------- fal.ai ----------------
async function falCreate(opts: {
  key: string;
  prompt: string;
  seconds: string;
  size: string;
  image?: string;
}) {
  const endpoint = opts.image ? FAL_I2V : FAL_T2V;
  // Kling aceita apenas 5s ou 10s
  const duration = Number(opts.seconds) > 6 ? "10" : "5";
  const aspect_ratio = opts.size.startsWith("720x") || opts.size.startsWith("1080x")
    ? "9:16"
    : "16:9";

  const input: Record<string, unknown> = { prompt: opts.prompt, duration };
  if (opts.image) input.image_url = opts.image;
  else input.aspect_ratio = aspect_ratio;

  const res = await fetch(`${FAL_QUEUE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${opts.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.request_id) {
    const detail = typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail ?? body ?? {});
    throw new Error(`fal.ai ${res.status}: ${String(detail).slice(0, 220)}`);
  }
  return { id: encodeFal(endpoint, body.request_id), endpoint };
}

async function falStatus(key: string, endpoint: string, id: string) {
  const res = await fetch(`${FAL_QUEUE}/${endpoint}/requests/${id}/status`, {
    headers: { Authorization: `Key ${key}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`fal.ai status ${res.status}: ${String(body?.detail ?? "").slice(0, 200)}`);
  }
  return body as { status: string; queue_position?: number };
}

async function falResult(key: string, endpoint: string, id: string) {
  const res = await fetch(`${FAL_QUEUE}/${endpoint}/requests/${id}`, {
    headers: { Authorization: `Key ${key}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`fal.ai resultado ${res.status}`);
  const url = body?.video?.url || body?.videos?.[0]?.url;
  if (!url) throw new Error("fal.ai não retornou o vídeo.");
  return url as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  const FAL = Deno.env.get("FAL_API_KEY");

  try {
    const body = await req.json();
    const action = String(body?.action || "create");

    // ---------------- STATUS ----------------
    if (action === "status") {
      const jobId = String(body?.id || "");
      if (!jobId) return json({ error: "id obrigatório" }, 400);
      const job = decode(jobId);

      const cached = await existingUrl(jobId);
      if (cached) return json({ status: "completed", videoUrl: cached });

      if (job.kind === "fal") {
        if (!FAL) return json({ status: "failed", error: "Provedor fal.ai não configurado." });
        try {
          const st = await falStatus(FAL, job.endpoint, job.id);
          if (st.status === "IN_QUEUE") {
            return json({ status: "queued", progress: 5, provider: "fal.ai" });
          }
          if (st.status !== "COMPLETED") {
            return json({ status: "processing", progress: 50, provider: "fal.ai" });
          }
          const url = await falResult(FAL, job.endpoint, job.id);
          const dl = await fetch(url);
          if (!dl.ok) return json({ status: "failed", error: `Não foi possível baixar o vídeo (${dl.status})` });
          const stored = await storeAndSign(jobId, await dl.arrayBuffer());
          return json({ status: "completed", videoUrl: stored.videoUrl, provider: "fal.ai" });
        } catch (e) {
          return json({ status: "failed", error: e instanceof Error ? e.message : "Erro no fal.ai" });
        }
      }

      // Veo / Lovable Gateway
      if (!KEY) return json({ status: "failed", error: "Provedor de vídeo não configurado." });
      const res = await fetch(`${GATEWAY}/${job.id}`, { headers: { Authorization: `Bearer ${KEY}` } });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j) {
        return json({ status: "failed", error: j?.message || `Falha ao consultar job (${res.status})` });
      }
      if (j.status === "failed") {
        return json({ status: "failed", error: j?.error?.message || "O provedor recusou a geração." });
      }
      if (j.status !== "completed") {
        return json({ status: j.status === "queued" ? "queued" : "processing", progress: j.progress ?? 0, provider: "veo" });
      }
      const dl = await fetch(`${GATEWAY}/${job.id}/content`, { headers: { Authorization: `Bearer ${KEY}` } });
      if (!dl.ok) return json({ status: "failed", error: `Não foi possível baixar o vídeo (${dl.status})` });
      try {
        const stored = await storeAndSign(jobId, await dl.arrayBuffer());
        return json({ status: "completed", videoUrl: stored.videoUrl, provider: "veo" });
      } catch (e) {
        return json({ status: "failed", error: e instanceof Error ? e.message : "Falha ao salvar o vídeo" });
      }
    }

    // ---------------- CANCEL ----------------
    if (action === "cancel") {
      const jobId = String(body?.id || "");
      const job = decode(jobId);
      if (job.kind === "fal" && FAL) {
        await fetch(`${FAL_QUEUE}/${job.endpoint}/requests/${job.id}/cancel`, {
          method: "PUT",
          headers: { Authorization: `Key ${FAL}` },
        }).catch(() => null);
      }
      return json({ status: "cancelled" });
    }

    // ---------------- DELETE ----------------
    if (action === "delete") {
      const jobId = String(body?.id || "");
      if (!jobId) return json({ error: "id obrigatório" }, 400);
      const path = `${jobId.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`;
      await admin().storage.from(BUCKET).remove([path]).catch(() => null);
      return json({ deleted: true });
    }

    // ---------------- CREATE ----------------
    const prompt = String(body?.prompt || "").trim();
    if (!prompt) return json({ error: "Descreva o vídeo que você quer criar.", code: "invalid_param" }, 400);

    const ref = typeof body?.input_reference === "string" && body.input_reference.startsWith("data:image/")
      ? body.input_reference
      : "";

    const requested = String(body?.provider || "auto");
    const model = VEO_MODELS.has(body?.model) ? body.model : "google/veo-3.1-lite";
    const size = VEO_SIZES.has(body?.size) ? body.size : "1280x720";
    const seconds = ["4", "6", "8"].includes(String(body?.seconds)) ? String(body.seconds) : "8";
    const is1080 = size.includes("1920") || size.includes("1080x1920");
    const finalSeconds = is1080 ? "8" : seconds;

    const tryFal = async (reason?: string) => {
      if (!FAL) {
        return json({
          error: reason
            ? `${reason} E o provedor alternativo (fal.ai) não está configurado.`
            : "Nenhum provedor de vídeo configurado.",
          code: "no_provider",
        });
      }
      try {
        const created = await falCreate({ key: FAL, prompt, seconds: finalSeconds, size, image: ref || undefined });
        return json({ id: created.id, status: "queued", provider: "fal.ai", seconds: finalSeconds, size });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro no fal.ai";
        return json({ error: reason ? `${reason} ${msg}` : msg, code: "provider" });
      }
    };

    if (requested === "fal") return await tryFal();

    if (!KEY) return await tryFal("Provedor principal indisponível.");

    const payload: Record<string, unknown> = { model, prompt, seconds: finalSeconds, size };
    if (ref) payload.input_reference = ref;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const job = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = job?.message || `Erro ${res.status} ao iniciar o vídeo`;
      // 402/429 no gateway → tenta fal.ai automaticamente
      if (res.status === 402 || res.status === 429) {
        return await tryFal(`Veo indisponível (${res.status === 402 ? "sem créditos" : "fila cheia"}).`);
      }
      if (res.status === 400) return json({ error: msg, code: "invalid_param" });
      if (res.status === 401 || res.status === 403) return json({ error: "Falha de autenticação no provedor de vídeo.", code: "auth" });
      return json({ error: msg, code: "provider" });
    }

    return json({ id: encodeVeo(job.id), status: job.status ?? "processing", provider: "veo", model, seconds: finalSeconds, size });
  } catch (e) {
    console.error("generate-video error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", code: "unknown" }, 500);
  }
});
