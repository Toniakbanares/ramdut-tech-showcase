import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ArrowLeft, LogIn, MessageCircle, Plus, Trash2 } from 'lucide-react';

import mascotImg from '@/assets/mascot-ramu.png';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Conversation, ConversationContent, ConversationEmptyState } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';

type Thread = {
  id: string;
  title: string;
  updated_at: string;
};

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ramon-chat`;

const toMessage = (row: { id: string; role: string; parts: unknown; content: string }): UIMessage => ({
  id: row.id,
  role: row.role as UIMessage['role'],
  parts: Array.isArray(row.parts) && row.parts.length ? (row.parts as UIMessage['parts']) : [{ type: 'text', text: row.content }],
});

const ChatPanel = ({ threadId, initialMessages, onFinished }: { threadId: string; initialMessages: UIMessage[]; onFinished: () => void }) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: CHAT_ENDPOINT,
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
        body: { threadId },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      onFinished();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    onError: (err) => toast({ title: 'Ramon não respondeu', description: err.message, variant: 'destructive' }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  const submit = async (message: PromptInputMessage) => {
    const text = (input || message.text).trim();
    if (!text || status === 'submitted' || status === 'streaming') return;
    setInput('');
    await sendMessage({ text });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const busy = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent ref={scrollRef}>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={mascotImg} alt="Ramon" className="h-20 w-20 rounded-full ramu-card-border object-cover" />}
              title="Ramon está online"
              description="Converse sobre ideias, prompts, trabalho, estudo ou qualquer assunto."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => (part.type === 'text' ? <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse> : null))}
                </MessageContent>
              </Message>
            ))
          )}
          {status === 'submitted' && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Ramon está pensando...</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error.message}</div>}
        </ConversationContent>
      </Conversation>

      <div className="border-t border-white/10 p-3 sm:p-4">
        <PromptInput onSubmit={submit} className="mx-auto max-w-3xl bg-black/30 text-white">
          <PromptInputTextarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit({ text: input });
              }
            }}
            placeholder="Fale com o Ramon..."
          />
          <PromptInputFooter>
            <span className="mr-auto px-2 text-[11px] text-neutral-500">Enter envia · Shift Enter quebra linha</span>
            <PromptInputSubmit status={busy ? status : 'ready'} disabled={!input.trim() || busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

const RamonChat = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from('ramon_chat_threads')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    setThreads(data || []);
    return data || [];
  }, []);

  const createThread = useCallback(async () => {
    const { data, error } = await supabase
      .from('ramon_chat_threads')
      .insert({ title: 'Nova conversa' })
      .select('id')
      .single();
    if (error) throw error;
    navigate(`/lab/ramon/${data.id}`, { replace: !threadId });
  }, [navigate, threadId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setIsAuthed(!!data.session);
      if (!data.session) setLoading(false);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setSessionReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !isAuthed) return;
    let active = true;
    const boot = async () => {
      setLoading(true);
      try {
        const list = await loadThreads();
        if (!threadId) {
          if (list[0]?.id) navigate(`/lab/ramon/${list[0].id}`, { replace: true });
          else await createThread();
          return;
        }
        const { data, error } = await supabase
          .from('ramon_chat_messages')
          .select('id,role,parts,content')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (active) setMessages((data || []).map(toMessage));
      } catch (e) {
        toast({ title: 'Falha ao carregar chat', description: e instanceof Error ? e.message : 'Tente novamente', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    };
    boot();
    return () => {
      active = false;
    };
  }, [createThread, isAuthed, loadThreads, navigate, sessionReady, threadId, toast]);

  const deleteThread = async (id: string) => {
    const { error } = await supabase.from('ramon_chat_threads').delete().eq('id', id);
    if (error) {
      toast({ title: 'Não consegui apagar', description: error.message, variant: 'destructive' });
      return;
    }
    const list = await loadThreads();
    navigate(list.find((thread) => thread.id !== id)?.id ? `/lab/ramon/${list.find((thread) => thread.id !== id)?.id}` : '/lab/ramon', { replace: true });
  };

  const signIn = async () => {
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/lab/ramon` });
    if (result.error) toast({ title: 'Login não abriu', description: result.error.message, variant: 'destructive' });
  };

  return (
    <div className="min-h-screen ramu-canvas-bg text-white">
      <Helmet>
        <title>Chat com Ramon | RAMU Lab</title>
        <meta name="description" content="Converse diretamente com o Ramon no RAMU Lab, com histórico salvo por conversa." />
      </Helmet>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-white/5 px-3 ramu-glass">
        <Link to="/lab" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-neutral-300">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <img src={mascotImg} alt="Ramon" className="h-9 w-9 rounded-full object-cover" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold">Chat com Ramon</h1>
          <p className="truncate text-[11px] text-neutral-400">conversas salvas no backend</p>
        </div>
        {isAuthed && (
          <button onClick={createThread} className="ml-auto flex h-10 items-center gap-1.5 rounded-lg ramu-accent-bg px-3 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> Nova
          </button>
        )}
      </header>

      {!sessionReady || loading ? (
        <main className="grid h-screen place-items-center pt-14 text-sm text-neutral-400">Carregando Ramon...</main>
      ) : !isAuthed ? (
        <main className="grid min-h-screen place-items-center px-4 pt-14">
          <div className="max-w-sm rounded-2xl p-5 text-center ramu-glass ramu-card-border">
            <img src={mascotImg} alt="Ramon" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
            <h1 className="mb-2 text-xl font-bold">Entre para falar com o Ramon</h1>
            <p className="mb-4 text-sm text-neutral-400">O histórico fica salvo por conversa e volta quando você abrir no celular.</p>
            <button onClick={signIn} className="mx-auto flex h-11 items-center gap-2 rounded-lg ramu-accent-bg px-4 text-sm font-semibold text-white">
              <LogIn className="h-4 w-4" /> Entrar com Google
            </button>
          </div>
        </main>
      ) : (
        <main className="grid h-screen grid-cols-1 pt-14 lg:grid-cols-[280px_1fr]">
          <aside className="hidden min-h-0 border-r border-white/5 p-3 lg:block ramu-glass">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
              <MessageCircle className="h-4 w-4" /> Conversas
            </div>
            <div className="space-y-1 overflow-y-auto">
              {threads.map((thread) => (
                <div key={thread.id} className={cn('flex items-center gap-1 rounded-lg border border-transparent p-1', thread.id === threadId && 'border-white/10 bg-white/5')}>
                  <button onClick={() => navigate(`/lab/ramon/${thread.id}`)} className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm text-neutral-200 hover:bg-white/5">
                    <span className="block truncate">{thread.title}</span>
                  </button>
                  <button onClick={() => deleteThread(thread.id)} className="grid h-9 w-9 place-items-center rounded-md text-neutral-500 hover:bg-white/5 hover:text-red-400" aria-label="Apagar conversa">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            {threadId && <ChatPanel key={threadId} threadId={threadId} initialMessages={messages} onFinished={loadThreads} />}
          </section>
        </main>
      )}
    </div>
  );
};

export default RamonChat;