import { supabase } from '../supabase.js';

export const paymentsService = {
  // --- Payment Methods ---
  async getPaymentMethods(userId) {
    let query = supabase.from('payment_methods').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    return await query.order('is_default', { ascending: false });
  },

  async createPaymentMethod(pmData, userId) {
    const record = {
      id: pmData.id || crypto.randomUUID(),
      user_id: userId || pmData.user_id,
      provider: pmData.provider || 'STRIPE',
      stripe_customer_id: pmData.stripe_customer_id || `cus_${(userId || 'demo').slice(0, 10)}`,
      card_brand: pmData.card_brand || 'Visa',
      card_last4: pmData.card_last4 || '4242',
      is_default: pmData.is_default !== undefined ? pmData.is_default : false,
    };
    return await supabase
      .from('payment_methods')
      .insert([record])
      .select()
      .single();
  },

  async setDefaultPaymentMethod(id, userId) {
    if (userId) {
      await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', userId);
    } else {
      await supabase.from('payment_methods').update({ is_default: false }).neq('id', id);
    }
    return await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();
  },

  async deletePaymentMethod(id) {
    return await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);
  },

  // --- Invoices ---
  async getInvoices(userId) {
    let query = supabase.from('order_invoices').select('*');
    if (userId) {
      query = query.eq('client_user_id', userId);
    }
    return await query.order('issued_at', { ascending: false });
  },
};
