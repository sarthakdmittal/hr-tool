import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log so the user can share the console output for debugging
    console.error('[ErrorBoundary] caught render error:', error);
    console.error('[ErrorBoundary] component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unknown error';
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, fontFamily: 'sans-serif',
        }}>
          <div style={{
            maxWidth: 520, padding: 32, border: '1px solid #fca5a5',
            borderRadius: 12, background: '#fff',
          }}>
            <h2 style={{ color: '#dc2626', margin: '0 0 8px', fontSize: 18 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#4b5563', margin: '0 0 16px', fontSize: 14, wordBreak: 'break-word' }}>
              {msg}
            </p>
            <p style={{ color: '#9ca3af', margin: '0 0 20px', fontSize: 12 }}>
              Check the browser console (F12) for the full error trace.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: '#2563eb', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                fontSize: 14, marginRight: 8,
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
