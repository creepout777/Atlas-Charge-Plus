import { supabase } from '../supabase.js';

export const fleetService = {
  // --- Fleet Trucks ---
  async getTrucks() {
    return await supabase
      .from('fleet_trucks')
      .select('*')
      .order('truck_code', { ascending: true });
  },

  async createTruck(truckData) {
    const randNum = Math.floor(10 + Math.random() * 90);
    const record = {
      id: truckData.id || crypto.randomUUID(),
      truck_code: truckData.truck_code || `TITAN-${randNum}`,
      display_name: truckData.display_name || `Atlas Titan #${randNum}`,
      license_plate: truckData.license_plate || `EK${Math.floor(24 + Math.random() * 70)} EVX`,
      battery_capacity_kwh: parseFloat(truckData.battery_capacity_kwh) || 200.0,
      current_stored_kwh: parseFloat(truckData.current_stored_kwh) || 160.0,
      max_output_kw: parseFloat(truckData.max_output_kw) || 150.0,
      operational_status: truckData.operational_status || 'AVAILABLE',
      base_address: truckData.base_address || 'London Central Mobility Depot',
      base_lat: parseFloat(truckData.base_lat) || 51.5074,
      base_lng: parseFloat(truckData.base_lng) || -0.1278,
      current_lat: parseFloat(truckData.current_lat) || parseFloat(truckData.base_lat) || 51.5074,
      current_lng: parseFloat(truckData.current_lng) || parseFloat(truckData.base_lng) || -0.1278,
      current_bearing: parseFloat(truckData.current_bearing) || 90.0,
    };
    return await supabase
      .from('fleet_trucks')
      .insert([record])
      .select()
      .single();
  },

  async updateTruck(id, truckData) {
    const updates = { ...truckData };
    if (updates.battery_capacity_kwh !== undefined) updates.battery_capacity_kwh = parseFloat(updates.battery_capacity_kwh);
    if (updates.current_stored_kwh !== undefined) updates.current_stored_kwh = parseFloat(updates.current_stored_kwh);
    if (updates.max_output_kw !== undefined) updates.max_output_kw = parseFloat(updates.max_output_kw);
    if (updates.base_lat !== undefined) updates.base_lat = parseFloat(updates.base_lat);
    if (updates.base_lng !== undefined) updates.base_lng = parseFloat(updates.base_lng);
    if (updates.current_lat !== undefined) updates.current_lat = parseFloat(updates.current_lat);
    if (updates.current_lng !== undefined) updates.current_lng = parseFloat(updates.current_lng);
    if (updates.current_bearing !== undefined) updates.current_bearing = parseFloat(updates.current_bearing);
    return await supabase
      .from('fleet_trucks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteTruck(id) {
    // 1. Unassign truck from drivers
    await supabase.from('driver_profiles').update({ assigned_truck_id: null }).eq('assigned_truck_id', id);
    // 2. Unassign truck from orders
    await supabase.from('orders').update({ assigned_truck_id: null }).eq('assigned_truck_id', id);
    // 3. Unassign truck from reviews
    await supabase.from('order_reviews').update({ truck_id: null }).eq('truck_id', id);
    // 4. Delete installed truck connectors
    await supabase.from('truck_connectors').delete().eq('truck_id', id);
    // 5. Delete GPS breadcrumbs
    await supabase.from('truck_gps_breadcrumbs').delete().eq('truck_id', id);
    // 6. Delete the truck
    return await supabase
      .from('fleet_trucks')
      .delete()
      .eq('id', id);
  },

  // --- Connector Types ---
  async getConnectors() {
    return await supabase
      .from('connector_types')
      .select('*')
      .order('code', { ascending: true });
  },

  async createConnector(connData) {
    const record = {
      id: connData.id || crypto.randomUUID(),
      code: connData.code || 'CCS',
      display_name: connData.display_name || 'CCS Rapid (DC)',
      standard: connData.standard || 'CCS_COMBO2',
      max_voltage_v: parseInt(connData.max_voltage_v) || 1000,
      max_current_a: parseInt(connData.max_current_a) || 350,
      charging_standard: connData.charging_standard || 'Combined Charging System 2',
      is_active: connData.is_active !== undefined ? connData.is_active : true,
    };
    return await supabase
      .from('connector_types')
      .insert([record])
      .select()
      .single();
  },

  async updateConnector(id, connData) {
    const updates = { ...connData };
    if (updates.max_voltage_v !== undefined) updates.max_voltage_v = parseInt(updates.max_voltage_v);
    if (updates.max_current_a !== undefined) updates.max_current_a = parseInt(updates.max_current_a);
    return await supabase
      .from('connector_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteConnector(id) {
    const res = await supabase
      .from('connector_types')
      .delete()
      .eq('id', id);

    // If hard delete fails due to foreign key constraints, soft-delete (archive) instead
    if (res.error) {
      console.warn('Connector referenced by orders/vehicles, archiving instead of hard delete:', res.error.message);
      return await supabase
        .from('connector_types')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
    }
    return res;
  },

  async toggleConnectorActive(id, isActive) {
    return await supabase
      .from('connector_types')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
  },

  // --- Truck Connectors ---
  async getTruckConnectors() {
    return await supabase
      .from('truck_connectors')
      .select('*');
  },

  async createTruckConnector(tcData) {
    const record = {
      id: tcData.id || crypto.randomUUID(),
      truck_id: tcData.truck_id,
      connector_type_id: tcData.connector_type_id,
      cable_length_meters: parseFloat(tcData.cable_length_meters) || 6.5,
      max_kw_rating: parseFloat(tcData.max_kw_rating) || 150.0,
      is_operational: tcData.is_operational !== undefined ? tcData.is_operational : true,
    };
    return await supabase
      .from('truck_connectors')
      .insert([record])
      .select()
      .single();
  },

  async updateTruckConnector(id, tcData) {
    const updates = { ...tcData };
    if (updates.cable_length_meters !== undefined) updates.cable_length_meters = parseFloat(updates.cable_length_meters);
    if (updates.max_kw_rating !== undefined) updates.max_kw_rating = parseFloat(updates.max_kw_rating);
    return await supabase
      .from('truck_connectors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteTruckConnector(id) {
    return await supabase
      .from('truck_connectors')
      .delete()
      .eq('id', id);
  },
};
