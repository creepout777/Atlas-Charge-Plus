import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating = 5, onRate = null, editable = false }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={20}
          fill={star <= rating ? '#f59e0b' : 'none'}
          color={star <= rating ? '#f59e0b' : 'var(--slate-300)'}
          style={{ cursor: editable ? 'pointer' : 'default', transition: 'transform 0.1s' }}
          onClick={() => editable && onRate && onRate(star)}
        />
      ))}
    </div>
  );
}
