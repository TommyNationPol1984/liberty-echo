import React, { ReactNode, ReactElement } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for catching and displaying lazy-loaded component errors
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            <h3 className="font-bold">Error loading component</h3>
            <p className="text-sm mt-2">{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
