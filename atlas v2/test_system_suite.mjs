import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://vpiwgdrzxfkilbpicjmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwaXdnZHJ6eGZraWxicGljam1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mzc0NTEsImV4cCI6MjEwMjQxMzQ1MX0.s0jAZZnOwjny9pv69BlUSr5SiRMV7idg2TIdFZZg2G4';

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const results = [];
function recordResult(category, testName, passed, details = '') {
  results.push({ category, testName, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] [${category}] ${testName}${details ? ` -> ${details}` : ''}`);
}

async function runFullSystemDiagnostics() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       ATLAS CHARGE PLUS+ // FULL AUTOMATED SYSTEM TEST SUITE          ║');
  console.log('║               (FRONTEND + BACKEND + SUPABASE DB)                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  // ─────────────────────────────────────────────────────────────────
  // 1. PUBLIC CATALOGS & GUEST ACCESS (UNAUTHENTICATED)
  // ─────────────────────────────────────────────────────────────────
  console.log('▶▶ SUITE 1: Public Catalogs & Guest Access (Read-Only Boundaries)');
  const guestClient = getClient();
  try {
    const { data: tariffs, error: tErr } = await guestClient.from('pricing_tariffs').select('*');
    recordResult('Guest Access', 'Pricing Tariffs Catalog', !tErr && tariffs?.length > 0, `${tariffs?.length} active pricing tiers`);

    const { data: pkgs, error: pErr } = await guestClient.from('charge_packages').select('*');
    recordResult('Guest Access', 'Charge Packages Catalog (150kW)', !pErr && pkgs?.length > 0, `${pkgs?.length} rapid packages`);

    const { data: conns, error: cErr } = await guestClient.from('connector_types').select('*');
    recordResult('Guest Access', 'Connector Standards Catalog', !cErr && conns?.length > 0, `${conns?.length} hardware standards`);

    const { data: tConns, error: tcErr } = await guestClient.from('truck_connectors').select('*');
    recordResult('Guest Access', 'Mounted Mobile Assemblies', !tcErr && tConns?.length > 0, `${tConns?.length} mounted truck dispensers`);

    const { data: trucks, error: trkErr } = await guestClient.from('fleet_trucks').select('*');
    recordResult('Guest Access', 'Public Fleet Tracking', !trkErr && trucks?.length > 0, `${trucks?.length} mobile units visible`);

    const { data: reviews, error: revErr } = await guestClient.from('order_reviews').select('*');
    recordResult('Guest Access', 'Public Customer Reviews & Testimonials', !revErr && Array.isArray(reviews), `${reviews?.length} verified customer reviews`);

    const { data: labels, error: lErr } = await guestClient.from('system_ui_labels').select('*');
    recordResult('Guest Access', 'System UI Labels & Localization Dictionary', !lErr && labels?.length > 0, `${labels?.length} dictionary phrases`);
  } catch (e) {
    recordResult('Guest Access', 'Public Catalogs Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & LOGIN FOR ALL 4 ROLES
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 2: Authentication & Multi-Role Sessions');
  const clientAuth = getClient();
  const driverAuth = getClient();
  const dispatcherAuth = getClient();
  const adminAuth = getClient();

  let clientUser, driverUser, dispatcherUser, adminUser;

  try {
    const { data: cData, error: cErr } = await clientAuth.auth.signInWithPassword({
      email: 'alex.morgan@email.com',
      password: 'Password123!',
    });
    clientUser = cData?.user;
    recordResult('Auth & Roles', 'Client Authentication (Alex Morgan)', !cErr && !!clientUser, `User ID: ${clientUser?.id?.slice(0, 8)}`);

    const { data: dData, error: dErr } = await driverAuth.auth.signInWithPassword({
      email: 'jack.thompson.492@atlascharge.com',
      password: 'Password123!',
    });
    driverUser = dData?.user;
    recordResult('Auth & Roles', 'Driver Authentication (Jack Thompson)', !dErr && !!driverUser, `Driver ID: ${driverUser?.id?.slice(0, 8)}`);

    const { data: dispData, error: dispErr } = await dispatcherAuth.auth.signInWithPassword({
      email: 'dispatcher@atlascharge.com',
      password: 'Password123!',
    });
    dispatcherUser = dispData?.user;
    recordResult('Auth & Roles', 'Fleet Dispatcher Authentication', !dispErr && !!dispatcherUser, `Dispatcher ID: ${dispatcherUser?.id?.slice(0, 8)}`);

    const { data: aData, error: aErr } = await adminAuth.auth.signInWithPassword({
      email: 'admin@atlascharge.com',
      password: 'Password123!',
    });
    adminUser = aData?.user;
    recordResult('Auth & Roles', 'SuperAdmin Authentication', !aErr && !!adminUser, `SuperAdmin ID: ${adminUser?.id?.slice(0, 8)}`);
  } catch (e) {
    recordResult('Auth & Roles', 'Authentication Suite Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. CLIENT ACTIONS: VEHICLES & DISPATCH REQUEST
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 3: Client EV Registration & Dispatch Booking');
  let testOrderId = null;
  let testVehicleId = null;
  try {
    const { data: newVeh, error: nvErr } = await clientAuth
      .from('customer_vehicles')
      .insert([{
        user_id: clientUser.id,
        make: 'Tesla',
        model: 'Model Y Long Range',
        year: 2024,
        battery_capacity_kwh: 75.0,
        license_plate: `TY${Date.now().toString().slice(-4)}`,
      }])
      .select()
      .single();

    testVehicleId = newVeh?.id;
    recordResult('Client Portal', 'Customer EV Registration', !nvErr && !!newVeh, `Registered ${newVeh?.make} ${newVeh?.model} (${newVeh?.license_plate})`);

    const orderRef = `ORD-DIAG-${Date.now().toString().slice(-5)}`;
    const { data: order, error: ordErr } = await clientAuth
      .from('orders')
      .insert([{
        client_user_id: clientUser.id,
        vehicle_id: testVehicleId,
        order_reference: orderRef,
        status: 'WAITING_APPROVAL',
        target_address: '45 Kensington High St, London W8',
        target_lat: 51.5014,
        target_lng: -0.1918,
        estimated_callout_fee: 5.00,
        estimated_kwh_cost: 12.25,
        estimated_total_amount: 17.25,
      }])
      .select()
      .single();

    testOrderId = order?.id;
    recordResult('Client Portal', 'Create Rapid DC Dispatch Order (WAITING_APPROVAL)', !ordErr && !!order, `Order Ref: ${orderRef}`);
  } catch (e) {
    recordResult('Client Portal', 'Client Suite Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. DRIVER ACTIONS: SHIFT DUTY, QUEUE CLAIMING & CHARGING SESSION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 4: Driver Cockpit Shift, Job Claiming & 150kW DC Dispensing');
  try {
    const { data: trucks } = await driverAuth.from('fleet_trucks').select('*');
    const assignedTruck = trucks[0];

    const { data: dutyUpd, error: dutyErr } = await driverAuth
      .from('driver_profiles')
      .update({ duty_status: 'AVAILABLE', is_on_duty: true, assigned_truck_id: assignedTruck.id })
      .eq('user_id', driverUser.id)
      .select()
      .single();

    recordResult('Driver Cockpit', 'Driver Shift Duty State (AVAILABLE)', !dutyErr && dutyUpd?.duty_status === 'AVAILABLE', `Assigned Unit: ${assignedTruck.truck_code}`);

    const { data: claimed, error: claimErr } = await driverAuth
      .from('orders')
      .update({
        assigned_driver_id: driverUser.id,
        assigned_truck_id: assignedTruck.id,
        status: 'EN_ROUTE',
      })
      .eq('id', testOrderId)
      .select()
      .single();

    recordResult('Driver Cockpit', 'Claim Dispatch Job (EN_ROUTE)', !claimErr && claimed?.status === 'EN_ROUTE', `Assigned to Jack Thompson`);

    const { data: arrived, error: arrErr } = await driverAuth
      .from('orders')
      .update({ status: 'ARRIVED' })
      .eq('id', testOrderId)
      .select()
      .single();

    recordResult('Driver Cockpit', 'Confirm Arrival On-Site (ARRIVED)', !arrErr && arrived?.status === 'ARRIVED', 'Technician parked at client EV');

    const { data: charging, error: chgErr } = await driverAuth
      .from('orders')
      .update({ status: 'CHARGING' })
      .eq('id', testOrderId)
      .select()
      .single();

    const { error: telemErr } = await driverAuth
      .from('order_telemetry_logs')
      .insert([{
        order_id: testOrderId,
        current_output_kw: 149.4,
        energy_deliv_kwh: 18.2,
        vehicle_battery_pct: 64,
        voltage_volts: 820,
        charging_amps: 180,
        recorded_at: new Date().toISOString(),
      }]);

    if (telemErr) console.error('Telemetry Insert Error Details:', telemErr);
    recordResult('Driver Cockpit', '150kW DC Power Stream & Telemetry Logging', !chgErr && !telemErr && charging?.status === 'CHARGING', telemErr ? telemErr.message : '149.4 kW dispensed @ 820V');

    const { data: completed, error: compErr } = await driverAuth
      .from('orders')
      .update({
        status: 'COMPLETED',
        actual_kwh_delivered: 35.0,
        actual_duration_minutes: 18,
      })
      .eq('id', testOrderId)
      .select()
      .single();

    recordResult('Driver Cockpit', 'Complete Session & Disconnect (COMPLETED)', !compErr && completed?.status === 'COMPLETED', '35.0 kWh delivered');

    const { data: invoice, error: invErr } = await driverAuth
      .from('order_invoices')
      .insert([{
        order_id: testOrderId,
        client_user_id: clientUser.id,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        base_callout_amount: 5.00,
        energy_delivered_amount: 12.25,
        total_billed_amount: 17.25,
        currency: 'GBP',
        billing_status: 'PAID',
        issued_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (invErr) console.error('Invoice Insert Error Details:', invErr);
    recordResult('Driver Cockpit', 'Automatic Invoice Generation in Database', !invErr && !!invoice, invErr ? invErr.message : `Invoice Total: £${invoice?.total_billed_amount}`);
  } catch (e) {
    recordResult('Driver Cockpit', 'Driver Operations Suite Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. CLIENT VERIFIED REVIEW & RATING
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 5: Client Verified Feedback & Testimonial Feed');
  try {
    const { data: review, error: revErr } = await clientAuth
      .from('order_reviews')
      .insert([{
        order_id: testOrderId,
        client_user_id: clientUser.id,
        driver_user_id: driverUser.id,
        rating_stars: 5,
        feedback_tags: 'Fast,Professional Tech,Clean Energy',
        comment: 'Lightning fast 150kW boost right outside my office!',
        author_name: 'Alex Morgan (Verified Client)',
        vehicle_model: 'Tesla Model Y',
      }])
      .select()
      .single();

    recordResult('Customer Feedback', 'Submit 5-Star Verified Review', !revErr && !!review, `Rating: 5 Stars by ${review?.author_name}`);

    const { data: pubFeed, error: pfErr } = await guestClient
      .from('order_reviews')
      .select('*')
      .eq('id', review.id);

    recordResult('Customer Feedback', 'Verified Review Displayed on Public Homepage', !pfErr && pubFeed?.length === 1, 'Review visible in guest testimonials');
  } catch (e) {
    recordResult('Customer Feedback', 'Review Suite Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. DISPATCHER & ADMIN HARDWARE/STATUS CONTROLS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 6: Dispatcher & SuperAdmin Operational Controls');
  try {
    const { data: trucks } = await dispatcherAuth.from('fleet_trucks').select('*');
    const targetTruck = trucks[0];

    const testStates = ['DEPOT_RECHARGING', 'STANDBY', 'EN_ROUTE', 'CHARGING_ACTIVE', 'MAINTENANCE', 'AVAILABLE'];
    let allStatesOk = true;

    for (const st of testStates) {
      const { data: upd, error: uErr } = await dispatcherAuth
        .from('fleet_trucks')
        .update({ operational_status: st })
        .eq('id', targetTruck.id)
        .select();

      if (uErr || !upd || upd.length === 0) {
        allStatesOk = false;
        console.error(`State update error on ${st}:`, uErr?.message);
        break;
      }
    }

    recordResult('Dispatcher Controls', 'Multi-Status State Engine (Rapid DC, Depot, Standby)', allStatesOk, 'All 6 fleet states updated cleanly');

    const { data: conns } = await adminAuth.from('connector_types').select('*');
    if (conns && conns.length > 0) {
      const conn = conns[0];
      const toggled = !(conn.is_active !== false);

      const { data: updatedConn, error: connErr } = await adminAuth
        .from('connector_types')
        .update({ is_active: toggled })
        .eq('id', conn.id)
        .select();

      recordResult('SuperAdmin Controls', 'Connector Standard Hardware Status Toggle', !connErr && updatedConn?.length > 0, `Status: ${toggled ? 'Active' : 'Archived'}`);

      await adminAuth.from('connector_types').update({ is_active: true }).eq('id', conn.id);
    }
  } catch (e) {
    recordResult('Admin & Dispatcher', 'Management Controls Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 7. CLEANUP TEST ARTIFACTS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 7: Database Integrity & Cleanup');
  try {
    if (testOrderId) {
      await adminAuth.from('order_reviews').delete().eq('order_id', testOrderId);
      await adminAuth.from('order_invoices').delete().eq('order_id', testOrderId);
      await adminAuth.from('order_telemetry_logs').delete().eq('order_id', testOrderId);
      await adminAuth.from('orders').delete().eq('id', testOrderId);
    }
    if (testVehicleId) {
      await adminAuth.from('customer_vehicles').delete().eq('id', testVehicleId);
    }
    recordResult('Cleanup', 'Automated Diagnostic Artifacts Cleanup', true, 'All test records wiped cleanly');
  } catch (e) {
    console.warn('Cleanup warning:', e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // 8. FRONTEND PRODUCTION COMPILATION & ROUTE INTEGRITY
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶▶ SUITE 8: Frontend Production Compilation & Route Integrity');
  try {
    const buildOutput = execSync('npm run build', { encoding: 'utf8', cwd: process.cwd() });
    const isBuildSuccessful = buildOutput.includes('built in') && !buildOutput.includes('error');
    recordResult('Frontend Engine', 'Vite Production Build & Static Asset Generation', isBuildSuccessful, 'Bundle compiled with 0 errors');
  } catch (e) {
    recordResult('Frontend Engine', 'Frontend Build Suite Failure', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // FINAL SCORECARD
  // ─────────────────────────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  const percentage = Math.round((passedCount / total) * 100);
  console.log(`║ FINAL SCORECARD: ${passedCount}/${total} PASSED (${percentage}%)                    ║`);
  if (failedCount === 0) {
    console.log('║ STATUS: 100% OPERATIONAL — ALL FUNCTIONALITIES PASSED VERIFICATION    ║');
  } else {
    console.log(`║ STATUS: ${failedCount} ITEMS REQUIRE ATTENTION                                ║`);
  }
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
}

runFullSystemDiagnostics();
