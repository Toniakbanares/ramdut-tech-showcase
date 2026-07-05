import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é Ramon, o assistente direto do RAMU Lab.
Converse de forma natural, prestativa e objetiva em português do Brasil quando o usuário falar português.
Você pode ajudar com qualquer assunto, mas quando o tema for criação visual, ajude a montar prompts bons para Pollinations, mixagem de imagem, fork, estilo, cenário, iluminação e qualidade.
Não prometa acesso a ferramentas internas. Se o usuário pedir imagem, explique um prompt pronto para usar no Lab.`;

type Body = {
  threadId?: string;
  messages?: UIMessage[];
};

function textFromParts(message: UIMessage) {
  return (message.parts || [])
    .map((part: any) => (part?.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Faça login para conversar com o Ramon." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Entre novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { threadId, messages }: Body = await req.json();
    if (!threadId || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Conversa e mensagens são obrigatórias." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: thread, error: threadError } = await db
      .from("ramon_chat_threads")
      .select("id,title")
      .eq("id", threadId)
      .eq("user_id", userData.user.id)
      .single();

    if (threadError || !thread) {
      return new Response(JSON.stringify({ error: "Conversa não encontrada." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("IA indisponível no momento.");

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey },
    });

    const result = streamText({
      model: gateway.chatModel("google/gemini-3-flash-preview"),
      system: SYSTEM,
      messages: await convertToModelMessages(messages),
      temperature: 0.75,
      onError: ({ error }) => console.error("ramon-chat stream error", error),
    });

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      originalMessages: messages,
      onFinish: async ({ messages: finishedMessages }) => {
        const rows = finishedMessages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            thread_id: threadId,
            user_id: userData.user.id,
            ai_message_id: message.id,
            role: message.role,
            parts: message.parts as any,
            content: textFromParts(message),
          }));

        const { error: deleteError } = await db
          .from("ramon_chat_messages")
          .delete()
          .eq("thread_id", threadId)
          .eq("user_id", userData.user.id);
        if (deleteError) console.error("ramon-chat delete error", deleteError);

        if (rows.length) {
          const { error: insertError } = await db.from("ramon_chat_messages").insert(rows);
          if (insertError) console.error("ramon-chat insert error", insertError);
        }

        const firstUser = finishedMessages.find((message) => message.role === "user");
        const firstText = firstUser ? textFromParts(firstUser).slice(0, 48) : "";
        if (firstText && (!thread.title || thread.title === "Nova conversa")) {
          const { error: titleError } = await db
            .from("ramon_chat_threads")
            .update({ title: firstText })
            .eq("id", threadId)
            .eq("user_id", userData.user.id);
          if (titleError) console.error("ramon-chat title error", titleError);
        } else {
          await db.from("ramon_chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        }
      },
    });
  } catch (e) {
    console.error("ramon-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro no chat" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});