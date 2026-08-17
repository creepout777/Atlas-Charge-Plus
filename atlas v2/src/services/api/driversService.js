import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase.js';
import { createClient } from '@supabase/supabase-js';

export const driversService = {
  async getDrivers() {
    // 1. Fetch only users with role DRIVER (never SUPER_ADMIN, FLEET_DISPATCHER, or CLIENT)
    const { data: driverUsers, error: uError } = await supabase
      .from('users')
      .select('id, full_name, email, phone_number, role, is_active')
      .eq('role', 'DRIVER')
      .order('created_at', { ascending: false });

    if (uError) return { data: [], error: uError };
    if (!driverUsers || driverUsers.length === 0) return { data: [], error: null };

    // 2. Fetch driver_profiles for these driver user IDs
    const userIds = driverUsers.map(u => u.id);
    const { data: profiles, error: pError } = await supabase
      .from('driver_profiles')
      .select('*')
      .in('user_id', userIds);

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {});

    // 3. Merge user account details with profile details
    const merged = driverUsers.map(u => {
      const p = profileMap[u.id];
      return {
        user_id: u.id,
        full_name: u.full_name || 'Technician Driver',
        email: u.email || 'driver@atlascharge.com',
        phone_number: u.phone_number || '+447911999888',
        license_number: p?.license_number || 'UK-DRV-PENDING',
        license_expiry_date: p?.license_expiry_date || '2028-12-31',
        assigned_truck_id: p?.assigned_truck_id || null,
        is_on_duty: p?.is_on_duty !== undefined ? p?.is_on_duty : true,
        duty_status: p?.duty_status || 'AVAILABLE',
        rating_score: p?.rating_score || 5.00,
        total_completed_jobs: p?.total_completed_jobs || 0,
        is_active: u.is_active !== false,
      };
    });

    return { data: merged, error: null };
  },

  async createDriver(driverData) {
    const email = driverData.email;
    const password = driverData.password || 'Password123!';
    const fullName = driverData.full_name || 'Technician Driver';
    const phone = driverData.phone_number || `+447911${Math.floor(100000 + Math.random() * 900000)}`;
    const license = driverData.license_number || `UK-DRV-${Math.floor(100000 + Math.random() * 900000)}`;
    const expiry = driverData.license_expiry_date || '2028-12-31';
    const truckId = driverData.assigned_truck_id || null;
    const dutyStatus = driverData.duty_status || 'AVAILABLE';

    // 1. Create a standalone Supabase client that won't overwrite current admin session
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authResult, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          role: 'DRIVER',
          license_number: license,
          license_expiry_date: expiry,
          assigned_truck_id: truckId,
          duty_status: dutyStatus,
        }
      }
    });

    if (authError) {
      console.error('Driver Auth SignUp Error:', authError.message);
      return { data: null, error: authError };
    }

    const userId = authResult?.user?.id;
    if (!userId) {
      return { data: null, error: new Error('Could not generate authentication user ID for driver.') };
    }

    // 2. Explicitly ensure public.users has the driver entry
    const { error: userUpsertError } = await supabase.from('users').upsert({
      id: userId,
      email,
      phone_number: phone,
      password_hash: 'supabase_managed_auth',
      full_name: fullName,
      role: 'DRIVER',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (userUpsertError) {
      console.warn('Driver user upsert note:', userUpsertError.message);
    }

    // 3. Explicitly ensure public.driver_profiles is configured
    const profileRecord = {
      user_id: userId,
      license_number: license,
      license_expiry_date: expiry,
      assigned_truck_id: truckId,
      is_on_duty: dutyStatus === 'AVAILABLE',
      duty_status: dutyStatus,
      rating_score: 5.00,
      total_completed_jobs: 0,
    };

    const { data: profile, error: profileError } = await supabase
      .from('driver_profiles')
      .upsert(profileRecord)
      .select()
      .single();

    if (profileError) {
      console.warn('Driver profile upsert note:', profileError.message);
    }

    return {
      data: {
        ...(profile || profileRecord),
        user_id: userId,
        full_name: fullName,
        email,
        phone_number: phone,
        password, // returned so admin can display credentials confirmation
      },
      error: null,
    };
  },

  async updateDriver(userId, driverData) {
    const userUpdates = {};
    if (driverData.full_name) userUpdates.full_name = driverData.full_name;
    if (driverData.email) userUpdates.email = driverData.email;
    if (driverData.phone_number) userUpdates.phone_number = driverData.phone_number;

    if (Object.keys(userUpdates).length > 0) {
      await supabase.from('users').update(userUpdates).eq('id', userId);
    }

    const profileUpdates = { ...driverData };
    delete profileUpdates.full_name;
    delete profileUpdates.email;
    delete profileUpdates.phone_number;
    delete profileUpdates.user_id;

    if (Object.keys(profileUpdates).length > 0) {
      return await supabase
        .from('driver_profiles')
        .update(profileUpdates)
        .eq('user_id', userId)
        .select()
        .single();
    }

    return { data: { user_id: userId, ...driverData }, error: null };
  },

  async deleteDriver(userId) {
    // 1. Unlink from orders
    await supabase.from('orders').update({ assigned_driver_id: null }).eq('assigned_driver_id', userId);
    // 2. Unlink from reviews
    await supabase.from('order_reviews').update({ driver_user_id: null }).eq('driver_user_id', userId);
    // 3. Delete driver profile
    await supabase.from('driver_profiles').delete().eq('user_id', userId);
    // 4. Delete user account
    return await supabase.from('users').delete().eq('id', userId);
  },
};
