import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
    this.setState({ errorInfo: errorInfo?.componentStack || '' });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-zinc-950 p-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="size-7 text-red-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            {this.state.errorInfo && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-zinc-900 p-3 text-left text-[11px] text-gray-500">
                {this.state.errorInfo.slice(0, 500)}
              </pre>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
              >
                <RotateCcw className="size-4" />
                Retry
              </button>
              <a
                href="/workspace"
                className="flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-medium text-white"
              >
                <Home className="size-4" />
                Workspace
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
