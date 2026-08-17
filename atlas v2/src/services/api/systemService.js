import { supabase } from '../supabase.js';

export const systemService = {
  async getLabels() {
    return await supabase
      .from('system_ui_labels')
      .select('*')
      .order('label_key', { ascending: true });
  },

  async createLabel(lblData) {
    const record = {
      id: lblData.id || crypto.randomUUID(),
      label_key: lblData.label_key || `lbl_${Date.now().toString().slice(-6)}`,
      category: lblData.category || 'LABEL',
      locale: lblData.locale || 'en-GB',
      label_value: lblData.label_value || '',
    };
    return await supabase
      .from('system_ui_labels')
      .insert([record])
      .select()
      .single();
  },

  async updateLabel(id, labelData) {
    return await supabase
      .from('system_ui_labels')
      .update(labelData)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteLabel(id) {
    return await supabase
      .from('system_ui_labels')
      .delete()
      .eq('id', id);
  },
};
