import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Search,
  Loader2,
  Sun,
  Moon,
  MessageSquare,
  Sparkles,
  StopCircle,
  Menu,
  X,
  Copy,
  RefreshCw,
} from 'lucide-react';

import mascotImg from '@/assets/mascot-ramu.png';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useChatStore, type ChatMessage } from '@/store/chat-store';
import { MobileBottomNav } from '@/components/MobileBottomNav';

const SYSTEM_PROMPT = `Você é Ramu, o assistente de IA principal do RAMDUT AI Lab.

Princípios fundamentais:
- Responda SEMPRE no mesmo idioma da última mensagem do usuário (PT, EN, ES, etc). Nunca troque de idioma sem pedido.
- Raciocine passo a passo internamente antes de responder, mas apresente APENAS a resposta final clara e organizada (sem despejar chain-of-thought bruto).
- Para perguntas técnicas ou lógicas complexas, quebre o problema em etapas explícitas numeradas.
- Priorize precisão sobre volume. Se não souber algo, diga que não sabe em vez de inventar.
- Use markdown quando ajudar a leitura (títulos curtos, listas, blocos de código com linguagem).
- Evite repetir o que já foi dito. Cada resposta deve agregar valor novo.
- Seja direto e caloroso, sem enrolação.
- Considere TODO o histórico da conversa para manter contexto — referências como "aquilo", "o código anterior" devem ser resolvidas usando o histórico.
- Quando o usuário pedir código, entregue código completo e funcional, não fragmentos didáticos.`;

type Theme = 'light' | 'dark';

const Chat = () => {
  const { toast } = useToast();
  const threads = useChatStore((s) => s.threads);
  const activeId = useChatStore((s) => s.activeId);
  const createThread = useChatStore((s) => s.createThread);
  const selectThread = useChatStore((s) => s.selectThread);
  const deleteThread = useChatStore((s) => s.deleteThread);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('ramu-chat-theme') as Theme) || 'light';
  });
  useEffect(() => {
    localStorage.setItem('ramu-chat-theme', theme);
  }, [theme]);

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Bootstrap: cria primeira thread se não houver
  useEffect(() => {
    if (threads.length === 0) {
      createThread();
    } else if (!activeId) {
      selectThread(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId],
  );

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [threads, search]);

  // Auto-scroll no fim
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [activeThread?.messages.length, sending]);

  // Focus textarea ao trocar thread
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      let threadId = activeId;
      if (!threadId) threadId = createThread();

      const userMsg = appendMessage(threadId, { role: 'user', content: text.trim() });
      setInput('');

      // Constrói contexto — inclui system + histórico completo
      const thread = useChatStore.getState().threads.find((t) => t.id === threadId);
      const history = thread?.messages ?? [userMsg];
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSending(true);

      // placeholder assistant
      const pending = appendMessage(threadId, { role: 'assistant', content: '' });

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages,
            model: 'google/gemini-2.5-flash',
            temperature: 0.6,
            max_tokens: 4096,
          }),
          signal: ctrl.signal,
        });

        const data = await res.json();
        if (!res.ok || data?.error) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const content: string = data.content || '';

        // Typewriter effect (por chunk pequeno)
        const chunkSize = Math.max(2, Math.ceil(content.length / 80));
        let i = 0;
        const step = () => {
          if (ctrl.signal.aborted) return;
          i = Math.min(content.length, i + chunkSize);
          updateMessage(threadId!, pending.id, { content: content.slice(0, i) });
          if (i < content.length) {
            setTimeout(step, 12);
          } else {
            setSending(false);
            abortRef.current = null;
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        };
        step();
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          updateMessage(threadId, pending.id, { content: '_(Interrompido)_' });
        } else {
          updateMessage(threadId, pending.id, {
            content: `_Erro: ${e?.message || 'falha na resposta'}_`,
          });
          toast({ title: 'Falha no chat', description: e?.message?.slice(0, 200), variant: 'destructive' });
        }
        setSending(false);
        abortRef.current = null;
      }
    },
    [activeId, appendMessage, createThread, sending, toast, updateMessage],
  );

  const regenerate = useCallback(() => {
    if (!activeThread || sending) return;
    const msgs = activeThread.messages;
    // encontra última mensagem do usuário
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        // remove tudo depois dela recriando thread trimada
        const trimmed = msgs.slice(0, i + 1);
        useChatStore.setState((s) => ({
          threads: s.threads.map((t) =>
            t.id === activeThread.id ? { ...t, messages: trimmed } : t,
          ),
        }));
        send(msgs[i].content);
        break;
      }
    }
  }, [activeThread, send, sending]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado' });
    } catch {}
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const isDark = theme === 'dark';

  return (
    <div className={cn('min-h-screen ramu-canvas-bg text-white', isDark ? '' : 'ramu-light')}>
      <Helmet>
        <title>Chat IA — Converse com Ramu | RAMDUT AI Lab</title>
        <meta
          name="description"
          content="Chat IA dedicado do RAMDUT AI Lab: converse com Ramu, com histórico local persistente, múltiplas conversas, busca e raciocínio avançado."
        />
        <link rel="canonical" href={`${typeof window !== 'undefined' ? window.location.origin : ''}/chat`} />
      </Helmet>

      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 z-40 h-14 ramu-glass border-b border-white/10 px-3 flex items-center gap-2"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          className="lg:hidden h-10 w-10 grid place-items-center rounded-lg border border-white/10 text-neutral-300"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir conversas"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 shrink-0 text-neutral-300 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={mascotImg} alt="Ramu" className="h-8 w-8 rounded-full object-cover ramu-card-border" />
        <div className="min-w-0">
          <h1 className="text-sm font-bold truncate">Chat IA · Ramu</h1>
          <p className="text-[10px] text-neutral-400 truncate">
            {activeThread?.title || 'Nova conversa'} · {activeThread?.messages.length ?? 0} msgs
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => createThread()}
            className="h-10 px-3 rounded-lg ramu-accent-bg text-white text-xs font-semibold flex items-center gap-1.5"
            aria-label="Nova conversa"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-10 w-10 grid place-items-center rounded-lg border border-white/10 text-neutral-300 hover:text-white"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="pt-14 pb-16 lg:pb-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-screen">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col border-r border-white/10 ramu-glass min-h-0">
          <ThreadList
            threads={filteredThreads}
            activeId={activeId}
            onSelect={(id) => selectThread(id)}
            onDelete={deleteThread}
            search={search}
            setSearch={setSearch}
          />
        </aside>

        {/* Sidebar drawer mobile */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-[320px] ramu-glass border-r border-white/10 flex flex-col"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              <div className="h-14 flex items-center justify-between px-3 border-b border-white/10">
                <span className="text-sm font-bold">Conversas</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="h-10 w-10 grid place-items-center rounded-lg border border-white/10"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ThreadList
                threads={filteredThreads}
                activeId={activeId}
                onSelect={(id) => {
                  selectThread(id);
                  setSidebarOpen(false);
                }}
                onDelete={deleteThread}
                search={search}
                setSearch={setSearch}
              />
            </aside>
          </>
        )}

        {/* Área do chat */}
        <section className="flex flex-col min-h-0 h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
            <div className="mx-auto max-w-3xl space-y-4">
              {!activeThread || activeThread.messages.length === 0 ? (
                <EmptyState onPick={(p) => send(p)} />
              ) : (
                activeThread.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onCopy={() => copy(m.content)} />
                ))
              )}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 px-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ramu está pensando...
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <form
            onSubmit={onSubmit}
            className="border-t border-white/10 p-2 sm:p-3 ramu-glass"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl bg-black/30 border border-white/10 focus-within:border-[#8B5CF6]/60 p-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Fale com o Ramu... (Shift+Enter quebra linha)"
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder:text-neutral-500 max-h-40 min-h-[40px] px-2 py-2"
                />
                <div className="flex items-center gap-1">
                  {activeThread && activeThread.messages.length > 0 && !sending && (
                    <button
                      type="button"
                      onClick={regenerate}
                      className="h-11 w-11 grid place-items-center rounded-xl border border-white/10 text-neutral-400 hover:text-white"
                      title="Regenerar última resposta"
                      aria-label="Regenerar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  {sending ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="h-11 w-11 grid place-items-center rounded-xl bg-red-500/90 hover:bg-red-500 text-white"
                      title="Parar"
                      aria-label="Parar"
                    >
                      <StopCircle className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="h-11 w-11 grid place-items-center rounded-xl ramu-accent-bg text-white disabled:opacity-40"
                      title="Enviar"
                      aria-label="Enviar"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 text-center mt-1.5">
                Histórico salvo neste dispositivo · Ramu pode errar · confirme informações críticas
              </p>
            </div>
          </form>
        </section>
      </div>

      <MobileBottomNav />
    </div>
  );
};

// ============= Subcomponents =============

const ThreadList = ({
  threads,
  activeId,
  onSelect,
  onDelete,
  search,
  setSearch,
}: {
  threads: ReturnType<typeof useChatStore.getState>['threads'];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) => (
  <div className="flex flex-col min-h-0 flex-1">
    <div className="p-3 border-b border-white/10">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar conversas..."
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-[#8B5CF6]/60"
        />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {threads.length === 0 ? (
        <p className="text-center text-xs text-neutral-500 py-8">Nenhuma conversa</p>
      ) : (
        threads.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-1 rounded-lg border border-transparent px-1',
              t.id === activeId && 'border-white/10 bg-white/5',
            )}
          >
            <button
              onClick={() => onSelect(t.id)}
              className="flex-1 min-w-0 flex items-start gap-2 px-2 py-2 text-left rounded-md hover:bg-white/5"
            >
              <MessageSquare className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-100 truncate">{t.title}</p>
                <p className="text-[10px] text-neutral-500">
                  {t.messages.length} msgs · {new Date(t.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                if (confirm(`Apagar "${t.title}"?`)) onDelete(t.id);
              }}
              className="h-9 w-9 grid place-items-center rounded-md text-neutral-500 hover:text-red-400 hover:bg-white/5"
              aria-label="Apagar conversa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);

const EmptyState = ({ onPick }: { onPick: (prompt: string) => void }) => {
  const suggestions = [
    'Explique a diferença entre React Server Components e Client Components.',
    'Me ajude a escrever um prompt de imagem cinematográfico para pôr do sol na praia.',
    'Resuma os principais conceitos de RLS no Postgres.',
    'Escreva uma função TypeScript que valida CPF.',
  ];
  return (
    <div className="text-center py-8">
      <img
        src={mascotImg}
        alt="Ramu"
        className="mx-auto h-20 w-20 rounded-full object-cover ramu-card-border mb-4"
      />
      <h2 className="text-xl sm:text-2xl font-bold ramu-accent-text mb-1 flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5" /> Como posso ajudar?
      </h2>
      <p className="text-sm text-neutral-400 mb-6">Pergunte qualquer coisa. Suas conversas ficam salvas neste dispositivo.</p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left p-3 rounded-xl border border-white/10 hover:border-[#8B5CF6]/40 bg-black/20 text-sm text-neutral-200 hover:text-white transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, onCopy }: { message: ChatMessage; onCopy: () => void }) => {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <img src={mascotImg} alt="Ramu" className="h-8 w-8 rounded-full object-cover shrink-0 mt-1" />
      )}
      <div className={cn('group max-w-[85%] sm:max-w-[75%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm break-words',
            isUser
              ? 'ramu-accent-bg text-white rounded-br-sm'
              : 'bg-white/5 border border-white/10 text-neutral-100 rounded-bl-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-pre:bg-black/60 prose-code:text-[#c4b5fd] prose-headings:mt-3 prose-headings:mb-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <span className="inline-flex gap-1 items-center text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
        {!isUser && message.content && (
          <button
            onClick={onCopy}
            className="opacity-0 group-hover:opacity-100 transition mt-1 text-[10px] text-neutral-500 hover:text-white flex items-center gap-1"
          >
            <Copy className="h-3 w-3" /> copiar
          </button>
        )}
      </div>
    </div>
  );
};

export default Chat;
