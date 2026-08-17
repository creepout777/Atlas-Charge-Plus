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

  async createInvoice(invoiceData) {
    const record = {
      id: invoiceData.id || crypto.randomUUID(),
      order_id: invoiceData.order_id,
      client_user_id: invoiceData.client_user_id,
      invoice_number: invoiceData.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      base_callout_amount: parseFloat(invoiceData.callout_fee_amount || invoiceData.base_callout_amount) || 5.00,
      energy_delivered_amount: parseFloat(invoiceData.energy_delivered_amount) || 12.25,
      total_billed_amount: parseFloat(invoiceData.total_billed_amount) || 17.25,
      currency: invoiceData.currency || 'GBP',
      billing_status: invoiceData.billing_status || 'PAID',
      issued_at: new Date().toISOString(),
    };
    return await supabase
      .from('order_invoices')
      .insert([record])
      .select()
      .single();
  },
};
