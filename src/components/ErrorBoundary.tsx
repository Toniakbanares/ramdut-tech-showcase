import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** nome da área (aparece na mensagem) */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * Fallback gracioso: evita tela branca quando um módulo do Lab/Studio quebra.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.area ?? 'app', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen grid place-items-center px-6 bg-[#0A0A0B] text-neutral-200">
        <div className="max-w-sm w-full text-center rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <AlertTriangle className="h-9 w-9 mx-auto text-amber-400 mb-3" />
          <h1 className="text-lg font-semibold mb-1">Algo quebrou por aqui</h1>
          <p className="text-xs text-neutral-400 mb-4 break-words">
            {error.message || 'Erro inesperado ao carregar esta área.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Tentar de novo
            </button>
            <a
              href="/"
              className="min-h-[44px] px-4 rounded-xl bg-white/5 border border-white/10 text-sm flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" /> Início
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
