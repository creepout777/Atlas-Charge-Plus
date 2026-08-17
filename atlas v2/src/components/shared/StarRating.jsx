import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating, value, onRate, onChange, editable = true, size = 24 }) {
  const currentRating = value !== undefined ? value : (rating !== undefined ? rating : 5);
  const handleRate = onChange || onRate;
  const [hoverRating, setHoverRating] = useState(0);

  const isClickable = editable && !!handleRate;

  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = hoverRating > 0 ? star <= hoverRating : star <= currentRating;
        return (
          <button
            key={star}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: isClickable ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'transform 0.15s ease',
              transform: hoverRating === star ? 'scale(1.2)' : 'scale(1)',
            }}
            onClick={() => isClickable && handleRate(star)}
            onMouseEnter={() => isClickable && setHoverRating(star)}
            onMouseLeave={() => isClickable && setHoverRating(0)}
          >
            <Star
              size={size}
              fill={isFilled ? '#f59e0b' : 'none'}
              color={isFilled ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
