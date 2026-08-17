import { supabase } from '../supabase.js';

export const ordersService = {
  async getOrders() {
    return await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async createOrder(orderData, userId) {
    const record = {
      id: orderData.id || crypto.randomUUID(),
      client_user_id: userId || orderData.client_user_id,
      assigned_truck_id: orderData.assigned_truck_id || null,
      assigned_driver_id: orderData.assigned_driver_id || null,
      charge_package_id: orderData.charge_package_id || null,
      connector_type_id: orderData.connector_type_id || null,
      vehicle_id: orderData.vehicle_id || null,
      tariff_id: orderData.tariff_id || null,
      order_reference: orderData.order_reference || 'ORD-' + Date.now().toString().slice(-6),
      status: orderData.status || 'WAITING_APPROVAL',
      target_address: orderData.target_address || 'London Central Pinned Location',
      target_lat: parseFloat(orderData.target_lat) || 51.5014,
      target_lng: parseFloat(orderData.target_lng) || -0.1918,
      estimated_callout_fee: parseFloat(orderData.estimated_callout_fee) || 5.0,
      estimated_kwh_cost: parseFloat(orderData.estimated_kwh_cost) || 12.25,
      estimated_total_amount: parseFloat(orderData.estimated_total_amount) || 17.25,
      actual_kwh_delivered: 0,
      actual_duration_minutes: 0,
      created_at: new Date().toISOString(),
    };
    return await supabase
      .from('orders')
      .insert([record])
      .select()
      .single();
  },

  async updateOrder(id, statusFields) {
    return await supabase
      .from('orders')
      .update(statusFields)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteOrder(id) {
    return await supabase
      .from('orders')
      .delete()
      .eq('id', id);
  },

  async logTelemetry(logData) {
    const record = {
      order_id: logData.order_id,
      current_output_kw: parseFloat(logData.current_output_kw) || 150,
      energy_deliv_kwh: parseFloat(logData.energy_deliv_kwh) || 0,
      vehicle_battery_pct: parseFloat(logData.battery_pct || logData.vehicle_battery_pct) || 25,
      voltage_volts: parseFloat(logData.voltage_volts) || 820,
      charging_amps: parseFloat(logData.charging_amps) || 180,
      recorded_at: logData.recorded_at || new Date().toISOString(),
    };
    return await supabase
      .from('order_telemetry_logs')
      .insert([record]);
  },

  async broadcastGps(breadcrumb) {
    const { error: bError } = await supabase
      .from('truck_gps_breadcrumbs')
      .insert([breadcrumb]);

    if (!bError && breadcrumb.truck_id) {
      await supabase
        .from('fleet_trucks')
        .update({
          current_lat: breadcrumb.lat,
          current_lng: breadcrumb.lng,
          current_bearing: breadcrumb.bearing || 90,
        })
        .eq('id', breadcrumb.truck_id);
    }
    return { error: bError };
  },

  subscribeToOrders(userId, onInsert, onUpdate) {
    const channelName = userId ? `orders:user:${userId}` : 'orders:all';
    return supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new);
        }
      })
      .subscribe();
  },
};
