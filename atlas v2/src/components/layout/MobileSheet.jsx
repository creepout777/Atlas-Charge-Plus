import React from 'react';

export default function MobileSheet({ children, className = '' }) {
  return (
    <div className={`floating-sheet ${className}`}>
      {children}
    </div>
  );
}
