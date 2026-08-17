import { supabase } from '../supabase.js';

export const vehiclesService = {
  async getVehicles(userId) {
    let query = supabase.from('customer_vehicles').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    return await query;
  },

  async createVehicle(vehData, userId) {
    const record = {
      id: vehData.id || crypto.randomUUID(),
      user_id: userId || vehData.user_id,
      make: vehData.make || 'Tesla',
      model: vehData.model || 'Model Y',
      year: parseInt(vehData.year) || 2024,
      license_plate: vehData.license_plate || 'EV24 PLT',
      battery_capacity_kwh: parseFloat(vehData.battery_capacity_kwh) || 78.1,
      primary_connector_id: vehData.primary_connector_id || 'e5555555-5555-5555-5555-555555555555',
      charge_port_location: vehData.charge_port_location || 'REAR_LEFT',
    };
    return await supabase
      .from('customer_vehicles')
      .insert([record])
      .select()
      .maybeSingle();
  },

  async updateVehicle(id, vehData) {
    const updates = {};
    if (vehData.make !== undefined) updates.make = vehData.make;
    if (vehData.model !== undefined) updates.model = vehData.model;
    if (vehData.year !== undefined) updates.year = parseInt(vehData.year);
    if (vehData.license_plate !== undefined) updates.license_plate = vehData.license_plate;
    if (vehData.battery_capacity_kwh !== undefined) updates.battery_capacity_kwh = parseFloat(vehData.battery_capacity_kwh);
    if (vehData.primary_connector_id !== undefined) updates.primary_connector_id = vehData.primary_connector_id;
    if (vehData.charge_port_location !== undefined) updates.charge_port_location = vehData.charge_port_location;

    if (Object.keys(updates).length === 0) {
      return { data: { id, ...vehData }, error: null };
    }

    return await supabase
      .from('customer_vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
  },

  async deleteVehicle(id) {
    // Unlink any historical orders first to guarantee clean deletion
    await supabase.from('orders').update({ vehicle_id: null }).eq('vehicle_id', id);
    return await supabase
      .from('customer_vehicles')
      .delete()
      .eq('id', id);
  },
};
