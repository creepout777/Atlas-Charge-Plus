import React from 'react';

export default function LogoLoadingScreen({ message = 'Loading' }) {
  return (
    <div className="app-logo-loader-wrapper">
      <style>{`
        .app-logo-loader-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .logo-wrapper {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid #00b069;
          animation: pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .logo-svg {
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        .logo-path {
          fill: none;
          stroke: #00b069;
          stroke-width: 10;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: draw 2.5s ease-in-out infinite;
        }

        .logo-fill {
          fill: #00b069;
          opacity: 0;
          animation: fadeInFill 2.5s ease-in-out infinite;
        }

        .loading-text {
          color: #00b069;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes draw {
          0% {
            stroke-dashoffset: 600;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeInFill {
          0%, 45% {
            opacity: 0;
          }
          65%, 85% {
            opacity: 0.15;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 0;
          }
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }

        @keyframes blink {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <div className="loader-container">
        <div className="logo-wrapper">
          <div className="pulse-ring"></div>
          
          <svg className="logo-svg" viewBox="0 0 200 200">
            <path className="logo-fill" d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" />
            <path className="logo-path" d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" />
          </svg>
        </div>

        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
}
