'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Error Boundary for Animation System
 * 
 * Catches render errors in animation components and fails silently.
 * Logs errors for debugging without disrupting user experience.
 */
export class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('[Animation Error Boundary] Caught error:', error);
    console.error('[Animation Error Boundary] Error info:', errorInfo);
    
    // Call optional error handler (for Sentry logging when installed)
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Silent failure - return nothing or optional fallback
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

export default AnimationErrorBoundary;
