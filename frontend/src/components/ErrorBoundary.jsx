import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-8 flex flex-col items-center justify-center text-center bg-surface rounded-2xl border border-border-subtle shadow-sm my-6 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-error-bg text-error flex items-center justify-center mb-4 border border-error">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {this.props.fallbackTitle || 'Component Encountered an Issue'}
          </h2>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            {this.props.fallbackMessage ||
              'A rendering issue occurred. Your data is safe on the server. You can retry or return to dashboard.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast font-bold text-xs cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-strong bg-base hover:bg-surface text-text-primary font-bold text-xs cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
