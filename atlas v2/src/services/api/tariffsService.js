import { supabase } from '../supabase.js';

export const tariffsService = {
  // --- Pricing Tariffs ---
  async getTariffs() {
    return await supabase
      .from('pricing_tariffs')
      .select('*')
      .order('code', { ascending: true });
  },

  async createTariff(tariffData) {
    const record = {
      id: tariffData.id || crypto.randomUUID(),
      code: tariffData.code || `TARIFF_${Date.now().toString().slice(-4)}`,
      display_name: tariffData.display_name || 'New Regional Tariff',
      base_callout_fee: parseFloat(tariffData.base_callout_fee) || 5.00,
      per_kwh_rate: parseFloat(tariffData.per_kwh_rate) || 0.35,
      rush_hour_multiplier: parseFloat(tariffData.rush_hour_multiplier) || 1.20,
      start_peak_time: tariffData.start_peak_time || '17:00:00',
      end_peak_time: tariffData.end_peak_time || '20:00:00',
      currency_code: tariffData.currency_code || 'GBP',
      currency_symbol: tariffData.currency_symbol || '£',
      is_active: tariffData.is_active !== undefined ? tariffData.is_active : true,
    };
    return await supabase
      .from('pricing_tariffs')
      .insert([record])
      .select()
      .single();
  },

  async updateTariff(id, tariffData) {
    const updates = { ...tariffData };
    if (updates.base_callout_fee !== undefined) updates.base_callout_fee = parseFloat(updates.base_callout_fee);
    if (updates.per_kwh_rate !== undefined) updates.per_kwh_rate = parseFloat(updates.per_kwh_rate);
    if (updates.rush_hour_multiplier !== undefined) updates.rush_hour_multiplier = parseFloat(updates.rush_hour_multiplier);
    delete updates.cancellation_fee;
    delete updates.idle_fee_per_min;
    delete updates.currency;

    return await supabase
      .from('pricing_tariffs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteTariff(id) {
    const res = await supabase
      .from('pricing_tariffs')
      .delete()
      .eq('id', id);

    // If hard delete fails due to foreign key constraints, soft-delete (archive) instead
    if (res.error) {
      console.warn('Tariff referenced by orders, archiving instead of hard delete:', res.error.message);
      return await supabase
        .from('pricing_tariffs')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
    }
    return res;
  },

  async toggleTariffActive(id, isActive) {
    return await supabase
      .from('pricing_tariffs')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
  },

  // --- Charge Packages ---
  async getPackages() {
    return await supabase
      .from('charge_packages')
      .select('*')
      .order('display_order', { ascending: true });
  },

  async createPackage(pkgData) {
    const record = {
      id: pkgData.id || crypto.randomUUID(),
      code: pkgData.code || `PKG_${Date.now().toString().slice(-4)}`,
      display_name: pkgData.display_name || 'New Charge Package',
      description: pkgData.description || 'Rapid mobile charge package',
      target_kwh: parseFloat(pkgData.target_kwh) || 30.00,
      display_estimate_label: pkgData.display_estimate_label || '+100 miles in 12 mins',
      unit_name: pkgData.unit_name || 'kWh',
      display_order: parseInt(pkgData.display_order) || 1,
      is_active: pkgData.is_active !== undefined ? pkgData.is_active : true,
    };
    return await supabase
      .from('charge_packages')
      .insert([record])
      .select()
      .single();
  },

  async updatePackage(id, pkgData) {
    const updates = { ...pkgData };
    if (updates.target_kwh !== undefined) updates.target_kwh = parseFloat(updates.target_kwh);
    if (updates.display_order !== undefined) updates.display_order = parseInt(updates.display_order);
    return await supabase
      .from('charge_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deletePackage(id) {
    const res = await supabase
      .from('charge_packages')
      .delete()
      .eq('id', id);

    // If hard delete fails due to foreign key constraints, soft-delete (archive) instead
    if (res.error) {
      console.warn('Package referenced by orders, archiving instead of hard delete:', res.error.message);
      return await supabase
        .from('charge_packages')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
    }
    return res;
  },

  async togglePackageActive(id, isActive) {
    return await supabase
      .from('charge_packages')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
  },
};
