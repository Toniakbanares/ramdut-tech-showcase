import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, GitFork, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MODE_META } from '@/lib/lab-helpers';

interface Generation {
  id: string;
  prompt: string;
  type: string;
  result_url: string | null;
  result_text: string | null;
  result_svg: string | null;
  model: string | null;
  og_image_url: string | null;
  created_at: string;
}

const SharePage = () => {
  const { id } = useParams<{ id: string }>();
  const [gen, setGen] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('lab_generations')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setError('Geração não encontrada');
      } else {
        setGen(data as Generation);
      }
      setLoading(false);
    })();
  }, [id]);

  const title = gen ? gen.prompt.slice(0, 60) : 'RAMU Lab — Compartilhamento';
  const meta = gen ? MODE_META[gen.type as keyof typeof MODE_META] : null;
  const ogImage =
    gen?.og_image_url || gen?.result_url ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/og-default.png`;

  return (
    <div className="min-h-screen ramu-canvas-bg text-white">
      <Helmet>
        <title>{title} | RAMU Lab</title>
        <meta name="description" content={`Geração ${meta?.label || ''} criada no Ramdut Lab: ${gen?.prompt?.slice(0, 140) || ''}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={gen?.prompt?.slice(0, 200) || 'RAMU Lab'} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <header className="h-14 ramu-glass border-b border-white/5 px-4 flex items-center gap-3">
        <Link to="/lab" className="flex items-center gap-2 text-neutral-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-bold ramu-accent-text">RAMU<span className="text-neutral-500">.lab</span></span>
        </Link>
        <span className="ml-auto text-xs text-neutral-500">share/{id?.slice(0, 8)}</span>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-32 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-center py-32 text-neutral-400">{error}</div>
        )}
        {gen && (
          <article className="ramu-glass ramu-card-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <span>{meta?.icon}</span>
              <span className="text-xs uppercase tracking-widest text-neutral-400">{meta?.label}</span>
              <span className="ml-auto text-xs text-neutral-600">
                {new Date(gen.created_at).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="bg-neutral-950">
              {gen.result_url && (
                <img src={gen.result_url} alt={gen.prompt} className="w-full" />
              )}
              {gen.result_svg && (
                <div className="bg-white p-8 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: gen.result_svg }} />
              )}
              {gen.result_text && !gen.result_url && !gen.result_svg && (
                <pre className="p-6 whitespace-pre-wrap text-sm text-neutral-200">{gen.result_text}</pre>
              )}
            </div>

            <div className="p-5 space-y-3">
              <h1 className="text-lg font-medium text-white">{gen.prompt}</h1>
              {gen.model && <p className="text-xs text-neutral-500">Modelo: {gen.model}</p>}
              <div className="flex gap-2 pt-2">
                <Link
                  to="/lab"
                  className="px-4 py-2 ramu-accent-bg text-white text-sm rounded-lg flex items-center gap-2"
                >
                  <GitFork className="h-4 w-4" /> Forkar no Lab
                </Link>
                {gen.result_url && (
                  <a
                    href={gen.result_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-white/10 text-neutral-300 hover:text-white text-sm rounded-lg flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Abrir original
                  </a>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default SharePage;
