import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_TEXT_FALLBACK = "gemini-2.5-flash";

function resolveGeminiTextModel(model?: string) {
  const normalized = (model || "").replace(/^google\//, "").trim();
  // Modelos de texto Gemini suportados via REST v1beta
  const supported = new Set([
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
  ]);
  return supported.has(normalized) ? normalized : GEMINI_TEXT_FALLBACK;
}

// Reúne TODAS as chaves Gemini disponíveis (mesma lógica de generate-image)
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
  add(Deno.env.get("GEMINI_API_KEY"));
  add(Deno.env.get("GEMINI_API_KEYS"));
  for (let i = 1; i <= 20; i++) add(Deno.env.get(`GEMINI_API_KEY_${i}`));
  return keys;
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// Converte mensagens estilo OpenAI para o formato do Gemini REST
function toGeminiPayload(messages: ChatMsg[], temperature?: number, maxTokens?: number) {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => ({ text: m.content }));

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.7,
      maxOutputTokens: typeof maxTokens === "number" ? maxTokens : 2048,
    },
  };
  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts };
  }
  return body;
}

async function callGeminiTextOnce(
  payload: any,
  key: string,
  model: string,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  return await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function generateTextWithGeminiRotating(
  messages: ChatMsg[],
  keys: string[],
  model: string,
  temperature?: number,
  maxTokens?: number,
) {
  const geminiModel = resolveGeminiTextModel(model);
  const payload = toGeminiPayload(messages, temperature, maxTokens);
  const errors: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const masked = `key#${i + 1}(...${key.slice(-4)})`;
    try {
      const res = await callGeminiTextOnce(payload, key, geminiModel);
      if (res.ok) {
        const json = await res.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const text = parts.map((p: any) => p?.text || "").join("").trim();
        if (!text) {
          errors.push(`${masked}: resposta vazia`);
          continue;
        }
        console.log(`Gemini text OK com ${masked}`);
        return { text, keyIndex: i + 1 };
      }
      const t = await res.text();
      const snippet = t.slice(0, 200);
      console.warn(`Gemini text ${res.status} em ${masked}: ${snippet}`);
      if ([400, 401, 403, 429, 500, 502, 503, 504].includes(res.status)) {
        errors.push(`${masked}: ${res.status}`);
        continue;
      }
      errors.push(`${masked}: ${res.status} ${snippet}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${masked}: exception ${msg}`);
      console.error(`Gemini text exception ${masked}:`, msg);
    }
  }

  throw new Error(
    `Todas as ${keys.length} chave(s) Gemini falharam (texto). Detalhes: ${errors.join(" | ")}`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, temperature, max_tokens } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const geminiKeys = collectGeminiKeys();
    const aiModel = model || "google/gemini-2.5-flash";

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
            messages,
            temperature: typeof temperature === "number" ? temperature : 0.7,
            max_tokens: typeof max_tokens === "number" ? max_tokens : 2048,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          if (content) {
            return new Response(
              JSON.stringify({ content, provider: "lovable-ai" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else if (response.status !== 402 && response.status !== 429) {
          const t = await response.text();
          console.error("Lovable AI text error:", response.status, t);
        } else {
          console.log(
            `Lovable AI ${response.status}, fallback para Gemini direto (${geminiKeys.length} chaves)`,
          );
        }
      } catch (e) {
        console.error("Lovable AI text exception, tentando fallback:", e);
      }
    }

    // 2) Fallback: rotação de chaves Gemini
    if (geminiKeys.length > 0) {
      try {
        const { text, keyIndex } = await generateTextWithGeminiRotating(
          messages,
          geminiKeys,
          aiModel,
          temperature,
          max_tokens,
        );
        return new Response(
          JSON.stringify({
            content: text,
            provider: `gemini-direct (chave ${keyIndex}/${geminiKeys.length})`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Erro Gemini";
        console.error("Gemini rotação falhou (texto):", errMsg);
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Nenhum provedor de texto disponível." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
