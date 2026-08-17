import React, { useState } from 'react';
import { Star, CheckCircle, MessageSquare, Plus, Send } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/shared/StarRating.jsx';
import Modal from '../components/layout/Modal.jsx';

export default function ReviewsFeedbackPage() {
  const { reviews, addReview, isLoading } = useData();
  const { currentUser } = useAuth();

  // Role permissions: Only CLIENT (and SuperAdmin) can write reviews; DRIVERS and DISPATCHERS cannot
  const canWriteReview = currentUser?.role === 'CLIENT' || currentUser?.role === 'SUPER_ADMIN';

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Fast', 'Professional']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const availableTags = ['Fast', 'Professional', 'Clean', 'On-Time', 'Great Communication', 'Eco-Friendly', 'Emergency Savior'];

  // Compute aggregate stats directly from database records
  const totalReviews = (reviews || []).length;
  const avgRating = totalReviews > 0
    ? ((reviews || []).reduce((sum, r) => sum + (r.rating_stars || 5), 0) / totalReviews).toFixed(2)
    : '5.00';

  // Aggregate dynamic tags from database
  const tagCounts = {};
  (reviews || []).forEach(r => {
    if (r.feedback_tags) {
      r.feedback_tags.split(',').forEach(tag => {
        const clean = tag.trim();
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    }
  });

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleOpenModal = () => {
    setRatingStars(5);
    setComment('');
    setSelectedTags(['Fast', 'Professional']);
    setFeedbackMsg('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    setFeedbackMsg('');
    try {
      await addReview({
        rating_stars: ratingStars,
        comment: comment.trim(),
        feedback_tags: selectedTags.join(','),
        client_user_id: currentUser?.id,
      });
      setFeedbackMsg('Review successfully saved to PostgreSQL (order_reviews)!');
      setTimeout(() => {
        setShowReviewModal(false);
        setFeedbackMsg('');
      }, 1000);
    } catch (err) {
      setFeedbackMsg('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Customer Reviews & Quality Ratings</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live feedback pulled directly from PostgreSQL (<code>order_reviews</code>)
          </div>
        </div>
        {canWriteReview && (
          <button className="btn-emerald" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={handleOpenModal}>
            <Plus size={15} /> Write Customer Review
          </button>
        )}
      </div>

      {/* Aggregate Score Card */}
      <div className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--emerald-darker)' }}>
            {avgRating} ★
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Overall Service Rating calculated across {totalReviews} completed sessions
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(tagCounts).map(([tag, count]) => (
            <span key={tag} className="brand-pill" style={{ fontSize: '11px' }}>
              {tag} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {totalReviews === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
            <MessageSquare size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Customer Reviews Yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no reviews recorded in the database.</div>
          {canWriteReview && (
            <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={handleOpenModal}>
              <Plus size={15} /> Write First Customer Review
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(reviews || []).map((r) => (
            <div key={r.id} className="card-glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StarRating rating={r.rating_stars || 5} size={16} />
                  <span style={{ fontWeight: 800, fontSize: '14px' }}>Verified Mobile Charge</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(r.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.6 }}>
                "{r.comment || 'Smooth, fast delivery and charge!'}"
              </p>

              {r.feedback_tags && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {r.feedback_tags.split(',').map((tag) => (
                    <span key={tag} className="brand-pill" style={{ fontSize: '10px', background: 'var(--slate-100)', color: 'var(--slate-700)' }}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal (Clients Only) */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Write Customer Review (order_reviews)">
        <form onSubmit={handleSubmitReview}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Rating Score</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: star <= ratingStars ? '#f59e0b' : '#cbd5e1'
                  }}
                >
                  <Star size={24} fill={star <= ratingStars ? '#f59e0b' : 'none'} />
                </button>
              ))}
              <span style={{ fontSize: '14px', fontWeight: 800, marginLeft: '8px' }}>{ratingStars} of 5 Stars</span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Compliment Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--emerald-primary)' : 'var(--border-subtle)',
                      background: isSelected ? 'var(--emerald-light)' : '#fff',
                      color: isSelected ? 'var(--emerald-darker)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Detailed Feedback</label>
            <textarea
              className="metric-card"
              rows={3}
              placeholder="Tell us about the technician arrival, charge delivery speed, or overall experience..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              style={{ width: '100%', outline: 'none' }}
              required
            />
          </div>

          {feedbackMsg && (
            <div style={{
              marginBottom: '14px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 700,
              background: feedbackMsg.includes('Error') ? 'var(--red-light)' : 'var(--emerald-light)',
              color: feedbackMsg.includes('Error') ? 'var(--red-primary)' : 'var(--emerald-darker)',
            }}>
              {feedbackMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-emerald"
            disabled={isSubmitting || !comment.trim()}
            style={{ opacity: (isSubmitting || !comment.trim()) ? 0.6 : 1 }}
          >
            <Send size={15} /> {isSubmitting ? 'Publishing Review...' : 'Publish Customer Feedback'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
