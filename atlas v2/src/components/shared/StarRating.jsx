import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
  rating,
  value,
  onRate,
  onChange,
  editable = true,
  size = 22,
}) {
  const currentRating = value !== undefined ? value : (rating !== undefined ? rating : 5);
  const callback = onChange || onRate;
  const isInteractive = Boolean(editable && callback);
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || currentRating;

  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        return (
          <button
            key={star}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: isInteractive ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isInteractive && hoverRating === star ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={() => isInteractive && setHoverRating(star)}
            onMouseLeave={() => isInteractive && setHoverRating(0)}
            onClick={() => {
              if (isInteractive && callback) {
                callback(star);
              }
            }}
            aria-label={`${star} Star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              fill={isFilled ? '#f59e0b' : 'none'}
              color={isFilled ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={1.75}
            />
          </button>
        );
      })}
    </div>
  );
}

