import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Base da API Agnes (sobrescrevível pelo secret AGNES_API_BASE) */
const BASE = Deno.env.get("AGNES_API_BASE") || "https://api.agnes-ai.com/api/v1";


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Traduz status HTTP em mensagem clara pro usuário */
function friendly(status: number, msg?: string) {
  if (status === 401 || status === 403) {
    return { code: "invalid_key", error: "Chave da Agnes AI inválida ou expirada. Gere outra em platform.agnes-ai.com." };
  }
  if (status === 402) return { code: "no_credits", error: "Créditos da Agnes AI esgotados." };
  if (status === 429) return { code: "rate_limit", error: "Muitas requisições na Agnes AI. Aguarde alguns segundos." };
  return { code: "provider", error: msg || `Agnes AI respondeu com erro ${status}.` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const KEY = Deno.env.get("AGNES_API_KEY");
  if (!KEY) return json({ code: "not_configured", error: "Agnes AI não configurada." }, 200);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "chat");

    const call = async (path: string, init?: RequestInit) =>
      fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });




    // ---- ping/status: usado pela página de APIs ----
    if (action === "status") {
      const res = await call("/models");
      const data = await res.json().catch(() => null);
      if (!res.ok) return json({ ok: false, ...friendly(res.status, data?.message) });
      const models = Array.isArray(data?.data)
        ? data.data.map((m: any) => m?.id ?? m?.name).filter(Boolean)
        : [];
      return json({ ok: true, models });
    }

    // ---- chat / texto ----
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!messages && !prompt) return json({ error: "Envie um prompt ou mensagens." }, 400);

    const payload = {
      model: typeof body?.model === "string" && body.model ? body.model : "gpt-4o-mini",
      messages: messages ?? [{ role: "user", content: prompt }],
      stream: false,
      ...(typeof body?.system === "string" && body.system
        ? {}
        : {}),
    } as Record<string, unknown>;

    if (typeof body?.system === "string" && body.system) {
      (payload.messages as any[]).unshift({ role: "system", content: body.system });
    }

    const res = await call("/chat/completions", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json().catch(() => null);

    if (!res.ok) return json(friendly(res.status, data?.message), 200);

    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) return json({ code: "empty", error: "A Agnes AI não retornou resultado." }, 200);

    return json({ text, model: payload.model, provider: "agnes" });
  } catch (e) {
    console.error("agnes-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
