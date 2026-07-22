"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-5 py-16">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--fail-deep)]">
            Something broke
          </h1>
          <p className="mt-3 text-sm text-[var(--ink)]">{this.state.error.message}</p>
          <pre className="mt-4 overflow-auto rounded-xl bg-[var(--surface-raised)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            className="mt-6 text-sm font-semibold underline"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
