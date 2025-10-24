import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Normalize error and info
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorInfoObj = errorInfo || { componentStack: 'No component stack available' };

    // Log the error (can send to monitoring service)
    console.error('ErrorBoundary caught an error:', errorObj, errorInfoObj);

    // Update state
    this.setState({
      error: errorObj,
      errorInfo: errorInfoObj,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#d63031', marginBottom: '16px' }}>
            Oops! Something went wrong.
          </h1>

          <p style={{ color: '#636e72', marginBottom: '20px' }}>
            We’re sorry, but something unexpected happened. Please try refreshing
            the page or contact support if the problem persists.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0984e3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Refresh Page
          </button>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: '20px',
                textAlign: 'left',
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  color: '#d63031',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                }}
              >
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  color: '#2d3436',
                  overflow: 'auto',
                }}
              >
                {this.state.error?.toString()}
                <br />
                {this.state.errorInfo?.componentStack || 'No component stack available'}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // When no error — render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;