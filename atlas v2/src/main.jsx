import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// 1. Android WebView Polyfill for crypto.randomUUID
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

// 2. Global Error Boundary with detailed exception diagnostic output
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Global ErrorBoundary Catch]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#ffffff',
          fontFamily: 'monospace',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>Atlas Charge Plus</h2>
          <div style={{
            background: '#1e293b',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            maxWidth: '100%',
            wordBreak: 'break-word',
            fontSize: '12px',
            color: '#f87171',
            marginBottom: '16px',
            textAlign: 'left'
          }}>
            <b>Runtime Error:</b> {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10b981',
              color: '#022c22',
              fontWeight: 800,
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
