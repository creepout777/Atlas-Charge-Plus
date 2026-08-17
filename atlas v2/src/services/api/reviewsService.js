import { supabase } from '../supabase.js';

export const reviewsService = {
  async getReviews() {
    return await supabase
      .from('order_reviews')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async createReview(reviewData, userId) {
    const record = {
      id: reviewData.id || crypto.randomUUID(),
      order_id: reviewData.order_id || null,
      client_user_id: userId || reviewData.client_user_id || null,
      driver_user_id: reviewData.driver_user_id || null,
      truck_id: reviewData.truck_id || null,
      rating_stars: parseInt(reviewData.rating_stars) || 5,
      feedback_tags: reviewData.feedback_tags || 'Fast,Professional',
      comment: reviewData.comment || '',
      created_at: new Date().toISOString(),
    };
    return await supabase
      .from('order_reviews')
      .insert([record])
      .select()
      .single();
  },
};
