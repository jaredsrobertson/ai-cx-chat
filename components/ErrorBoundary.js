import React from 'react';
import { logger } from '@/lib/logger';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Chat widget error boundary caught an error', error, { errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-medium text-red-800">Something went wrong</h3>
          </div>
          <p className="text-red-700 text-sm mb-3">
            The chat widget encountered an error. This could be due to a network issue or temporary service problem.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;