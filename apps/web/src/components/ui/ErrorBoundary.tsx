// apps/web/src/components/ui/ErrorBoundary.tsx
// React error boundary — shows a friendly fallback page on uncaught render errors.

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}
interface State { error: Error | null; errorInfo: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ errorInfo: info.componentStack ?? '' });
    console.error('[ErrorBoundary]', error, info);
  }

  private reset = () => this.setState({ error: null, errorInfo: '' });

  render(): ReactNode {
    const { error, errorInfo } = this.state;

    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: 'var(--color-bg, #0f1117)',
          color: 'var(--color-text, #e5e7eb)',
        }}
      >
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: 'var(--color-muted, #6b7280)', fontSize: 14, maxWidth: 440, margin: 0 }}>
          {error.message}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid var(--color-accent, #6366f1)',
              background: 'var(--color-accent, #6366f1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid var(--color-border, #2d2d3a)',
              background: 'transparent',
              color: 'var(--color-text, #e5e7eb)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Go home
          </button>
          {errorInfo && (
            <button
              onClick={() => navigator.clipboard?.writeText(`${error.message}\n${errorInfo}`)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid var(--color-border, #2d2d3a)',
                background: 'transparent',
                color: 'var(--color-muted, #6b7280)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Copy details
            </button>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && errorInfo && (
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              fontSize: 11,
              maxWidth: 700,
              overflow: 'auto',
              textAlign: 'left',
              color: 'var(--color-danger, #ef4444)',
              maxHeight: 200,
            }}
          >
            {errorInfo.trim()}
          </pre>
        )}
      </div>
    );
  }
}
