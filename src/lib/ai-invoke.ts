import { supabase } from '@/integrations/supabase/client';

/** Erro normalizado das edge functions de IA */
export class AiError extends Error {
  code: string;
  retryable: boolean;
  constructor(message: string, code = 'unknown', retryable = false) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.retryable = retryable;
  }
}

const HUMAN: Record<string, string> = {
  rate_limit: 'Muitas gerações seguidas. Aguarde alguns segundos e tente de novo.',
  no_credits: 'Os créditos de IA acabaram. Adicione créditos para voltar a gerar imagens.',
  timeout: 'O modelo demorou demais para responder. Tente novamente ou reduza a qualidade.',
  network: 'Sem conexão com o servidor de IA. Verifique sua internet.',
  empty: 'O modelo não retornou resultado. Reformule o prompt e tente de novo.',
  blocked: 'O provedor bloqueou esta solicitação. Consulte o motivo informado pelo provedor.',
};

export function humanizeAiError(e: unknown): { title: string; description: string; retryable: boolean } {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const msg = raw.toLowerCase();

  const pick = (code: string, retryable: boolean) => ({
    title: 'Não deu pra gerar',
    description: HUMAN[code],
    retryable,
  });

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return pick('rate_limit', true);
  if (msg.includes('402') || msg.includes('credit') || msg.includes('crédito')) return pick('no_credits', false);
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('timed out')) return pick('timeout', true);
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed'))
    return pick('network', true);
  if (msg.includes('sem imagem') || msg.includes('sem resultado') || msg.includes('no result')) return pick('empty', true);
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('prohibited')) return { title: 'Solicitação bloqueada', description: raw.slice(0, 220), retryable: false };

  return {
    title: 'Não deu pra gerar',
    description: raw.slice(0, 220) || 'Erro desconhecido. Tente novamente.',
    retryable: true,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface InvokeOptions {
  /** Tentativas totais (inclui a primeira). Default 3. */
  retries?: number;
  /** Timeout por tentativa em ms. Default 90s. */
  timeoutMs?: number;
  /** Chamado antes de cada retry */
  onRetry?: (attempt: number, err: unknown) => void;
}

/**
 * Invoca uma edge function com timeout, retry exponencial e erros normalizados.
 */
export async function invokeAi<T = any>(
  fn: string,
  body: Record<string, unknown>,
  { retries = 1, onRetry }: InvokeOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body,
      });


      if (error) {
        const response = error.context as Response | undefined;
        const payload = await response?.clone().json().catch(() => null);
        const message = payload?.error || payload?.message || error.message || 'Falha na geração';
        throw new AiError(message, String(response?.status || 'invoke'), response?.status === 429 || (response?.status || 0) >= 500);
      }
      if (data?.error) throw new AiError(String(data.error), 'provider', false);
      return data as T;
    } catch (e) {
      lastError = e;
      const info = humanizeAiError(e);
      if (!(e instanceof AiError ? e.retryable : info.retryable) || attempt === retries) break;
      onRetry?.(attempt, e);
      await sleep(600 * 2 ** (attempt - 1)); // 600ms, 1.2s, 2.4s...
    }
  }

  throw lastError instanceof Error ? lastError : new AiError(String(lastError));
}
