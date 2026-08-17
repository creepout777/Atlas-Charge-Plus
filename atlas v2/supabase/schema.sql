-- =============================================================
-- Atlas Charge Plus+ v2 — Supabase (PostgreSQL) Database Schema
-- 100% Exact 16-Entity Relational Model with Realtime & RLS
-- =============================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(32) NOT NULL CHECK (role IN ('CLIENT', 'DRIVER', 'FLEET_DISPATCHER', 'SUPER_ADMIN')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 2. client_profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    default_payment_method_id UUID,
    preferred_connector_id UUID,
    push_notification_token TEXT,
    referral_code VARCHAR(32) UNIQUE,
    notification_preferences_json JSONB DEFAULT '{"push": true, "email": true}'::jsonb
);

-- ── 3. fleet_trucks ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_code VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    license_plate VARCHAR(32) UNIQUE NOT NULL,
    battery_capacity_kwh NUMERIC(6, 2) DEFAULT 200.00 NOT NULL,
    current_stored_kwh NUMERIC(6, 2) DEFAULT 160.00 NOT NULL,
    max_output_kw NUMERIC(5, 2) DEFAULT 150.00 NOT NULL,
    operational_status VARCHAR(32) DEFAULT 'AVAILABLE' NOT NULL CHECK (operational_status IN ('AVAILABLE', 'EN_ROUTE', 'CHARGING', 'MAINTENANCE', 'RETURNING', 'OFFLINE')),
    base_address TEXT NOT NULL,
    base_lat NUMERIC(10, 7) NOT NULL,
    base_lng NUMERIC(10, 7) NOT NULL,
    current_lat NUMERIC(10, 7) NOT NULL,
    current_lng NUMERIC(10, 7) NOT NULL,
    current_bearing NUMERIC(5, 2) DEFAULT 90.00 NOT NULL
);

-- ── 4. driver_profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    license_number VARCHAR(64) UNIQUE NOT NULL,
    license_expiry_date DATE NOT NULL,
    assigned_truck_id UUID REFERENCES public.fleet_trucks(id) ON DELETE SET NULL,
    is_on_duty BOOLEAN DEFAULT TRUE NOT NULL,
    duty_status VARCHAR(32) DEFAULT 'AVAILABLE' NOT NULL CHECK (duty_status IN ('AVAILABLE', 'ASSIGNED', 'RESTING', 'OFF_DUTY')),
    current_lat NUMERIC(10, 7),
    current_lng NUMERIC(10, 7),
    current_bearing NUMERIC(5, 2) DEFAULT 90.00,
    last_gps_ping_at TIMESTAMPTZ,
    rating_score NUMERIC(3, 2) DEFAULT 5.00 NOT NULL,
    total_completed_jobs INTEGER DEFAULT 0 NOT NULL
);

-- ── 5. connector_types ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    standard VARCHAR(32) NOT NULL CHECK (standard IN ('IEC_TYPE2', 'CCS_COMBO2', 'CHAdeMO', 'GB_T', 'TESLA_NACS')),
    max_voltage_v INTEGER DEFAULT 800 NOT NULL,
    max_current_a INTEGER DEFAULT 350 NOT NULL,
    charging_standard VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- ── 6. truck_connectors ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.truck_connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID NOT NULL REFERENCES public.fleet_trucks(id) ON DELETE CASCADE,
    connector_type_id UUID NOT NULL REFERENCES public.connector_types(id) ON DELETE CASCADE,
    cable_length_meters NUMERIC(4, 2) DEFAULT 5.00 NOT NULL,
    max_kw_rating NUMERIC(5, 2) DEFAULT 150.00 NOT NULL,
    is_operational BOOLEAN DEFAULT TRUE NOT NULL
);

-- ── 7. customer_vehicles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    year INTEGER DEFAULT 2024 NOT NULL,
    license_plate VARCHAR(32) NOT NULL,
    battery_capacity_kwh NUMERIC(5, 1) DEFAULT 77.4 NOT NULL,
    primary_connector_id UUID REFERENCES public.connector_types(id) ON DELETE SET NULL,
    charge_port_location VARCHAR(32) DEFAULT 'REAR_LEFT' NOT NULL CHECK (charge_port_location IN ('REAR_LEFT', 'REAR_RIGHT', 'FRONT_LEFT', 'FRONT_RIGHT', 'NOSE'))
);

-- ── 8. charge_packages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.charge_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    target_kwh NUMERIC(5, 2) NOT NULL,
    display_estimate_label VARCHAR(64) NOT NULL,
    unit_name VARCHAR(32) DEFAULT 'kWh' NOT NULL,
    display_order INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- ── 9. pricing_tariffs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_tariffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    base_callout_fee NUMERIC(6, 2) DEFAULT 5.00 NOT NULL,
    per_kwh_rate NUMERIC(6, 2) DEFAULT 0.3500 NOT NULL,
    rush_hour_multiplier NUMERIC(4, 2) DEFAULT 1.20 NOT NULL,
    start_peak_time TIME DEFAULT '17:00:00' NOT NULL,
    end_peak_time TIME DEFAULT '20:00:00' NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'GBP' NOT NULL,
    currency_symbol VARCHAR(4) DEFAULT '£' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- ── 10. orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_reference VARCHAR(32) UNIQUE NOT NULL,
    client_user_id UUID NOT NULL REFERENCES public.users(id),
    assigned_truck_id UUID REFERENCES public.fleet_trucks(id),
    assigned_driver_id UUID REFERENCES public.users(id),
    charge_package_id UUID REFERENCES public.charge_packages(id),
    connector_type_id UUID REFERENCES public.connector_types(id),
    vehicle_id UUID REFERENCES public.customer_vehicles(id),
    tariff_id UUID REFERENCES public.pricing_tariffs(id),
    status VARCHAR(32) DEFAULT 'WAITING_APPROVAL' NOT NULL CHECK (status IN ('PENDING', 'WAITING_APPROVAL', 'EN_ROUTE', 'ARRIVED', 'CHARGING', 'COMPLETED', 'CANCELED', 'REJECTED')),
    target_address TEXT NOT NULL,
    target_lat NUMERIC(10, 7) NOT NULL,
    target_lng NUMERIC(10, 7) NOT NULL,
    estimated_callout_fee NUMERIC(6, 2) NOT NULL,
    estimated_kwh_cost NUMERIC(6, 2) NOT NULL,
    estimated_total_amount NUMERIC(6, 2) NOT NULL,
    actual_kwh_delivered NUMERIC(6, 2) DEFAULT 0.00 NOT NULL,
    actual_duration_minutes INTEGER DEFAULT 0 NOT NULL,
    final_charged_amount NUMERIC(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_at TIMESTAMPTZ,
    en_route_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    charging_started_at TIMESTAMPTZ,
    charging_completed_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ
);

-- ── 11. order_telemetry_logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    current_output_kw NUMERIC(5, 2) NOT NULL,
    vehicle_battery_pct NUMERIC(5, 2) NOT NULL,
    truck_remaining_kwh NUMERIC(6, 2) NOT NULL,
    energy_deliv_kwh NUMERIC(6, 2) NOT NULL,
    charging_amps NUMERIC(6, 2) NOT NULL,
    voltage_volts NUMERIC(6, 2) NOT NULL,
    error_state VARCHAR(64)
);

-- ── 12. truck_gps_breadcrumbs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.truck_gps_breadcrumbs (
    id BIGSERIAL PRIMARY KEY,
    truck_id UUID NOT NULL REFERENCES public.fleet_trucks(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    bearing NUMERIC(5, 2) NOT NULL,
    speed_kmh NUMERIC(5, 2) NOT NULL
);

-- ── 13. payment_methods ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('STRIPE', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY')),
    stripe_customer_id VARCHAR(64),
    card_brand VARCHAR(32) NOT NULL,
    card_last4 VARCHAR(4) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL
);

-- ── 14. order_invoices ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    client_user_id UUID NOT NULL REFERENCES public.users(id),
    payment_method_id UUID REFERENCES public.payment_methods(id),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    base_callout_amount NUMERIC(6, 2) DEFAULT 5.00 NOT NULL,
    energy_delivered_amount NUMERIC(6, 2) NOT NULL,
    total_billed_amount NUMERIC(6, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP' NOT NULL,
    billing_status VARCHAR(32) DEFAULT 'CAPTURED' NOT NULL CHECK (billing_status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED')),
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    paid_at TIMESTAMPTZ
);

-- ── 15. order_reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    client_user_id UUID NOT NULL REFERENCES public.users(id),
    driver_user_id UUID REFERENCES public.users(id),
    truck_id UUID REFERENCES public.fleet_trucks(id),
    rating_stars INTEGER NOT NULL CHECK (rating_stars BETWEEN 1 AND 5),
    feedback_tags VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 16. system_ui_labels ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_ui_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label_key VARCHAR(128) UNIQUE NOT NULL,
    locale VARCHAR(12) DEFAULT 'en-GB' NOT NULL,
    label_value TEXT NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('BUTTON', 'MODAL_TITLE', 'STATUS_BADGE', 'ERROR_MESSAGE', 'TOAST_NOTIFICATION', 'METRIC_UNIT', 'HEADER', 'STATUS', 'LABEL'))
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_order ON public.order_telemetry_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_truck ON public.truck_gps_breadcrumbs(truck_id);

-- ── Enable Supabase Realtime Replication ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_telemetry_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truck_gps_breadcrumbs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_trucks;

-- ── Role-Based Helper Functions (Security Definers) ──────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dispatcher()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'FLEET_DISPATCHER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'DRIVER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'CLIENT'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('FLEET_DISPATCHER', 'SUPER_ADMIN')
  );
$$;

-- ── Row Level Security (RLS) ──────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_gps_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ui_labels ENABLE ROW LEVEL SECURITY;

-- 1. Catalogs: pricing_tariffs, charge_packages, connector_types, truck_connectors, system_ui_labels
CREATE POLICY "Public read pricing_tariffs" ON public.pricing_tariffs FOR SELECT USING (true);
CREATE POLICY "SuperAdmin manage pricing_tariffs" ON public.pricing_tariffs FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Public read charge_packages" ON public.charge_packages FOR SELECT USING (true);
CREATE POLICY "SuperAdmin manage charge_packages" ON public.charge_packages FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Public read connector_types" ON public.connector_types FOR SELECT USING (true);
CREATE POLICY "SuperAdmin manage connector_types" ON public.connector_types FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Public read truck_connectors" ON public.truck_connectors FOR SELECT USING (true);
CREATE POLICY "SuperAdmin manage truck_connectors" ON public.truck_connectors FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Public read system_ui_labels" ON public.system_ui_labels FOR SELECT USING (true);
CREATE POLICY "SuperAdmin manage system_ui_labels" ON public.system_ui_labels FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 2. Fleet: fleet_trucks
CREATE POLICY "Public read fleet_trucks" ON public.fleet_trucks FOR SELECT USING (true);
CREATE POLICY "SuperAdmin full manage fleet_trucks" ON public.fleet_trucks FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Dispatcher update fleet_trucks" ON public.fleet_trucks FOR UPDATE TO authenticated USING (public.is_dispatcher()) WITH CHECK (public.is_dispatcher());
CREATE POLICY "Driver update assigned truck" ON public.fleet_trucks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = auth.uid() AND assigned_truck_id = fleet_trucks.id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = auth.uid() AND assigned_truck_id = fleet_trucks.id));

-- 3. Users & Profiles: users, client_profiles, driver_profiles
CREATE POLICY "Users read own and staff read all" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff());
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "SuperAdmin full manage users" ON public.users FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Client manage own profile" ON public.client_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff read client profiles" ON public.client_profiles FOR SELECT TO authenticated
  USING (public.is_staff());
CREATE POLICY "SuperAdmin manage client profiles" ON public.client_profiles FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Driver read/update own profile" ON public.driver_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());
CREATE POLICY "Driver update own duty status" ON public.driver_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Dispatcher assign trucks and duty to drivers" ON public.driver_profiles FOR UPDATE TO authenticated
  USING (public.is_dispatcher()) WITH CHECK (public.is_dispatcher());
CREATE POLICY "SuperAdmin manage driver profiles" ON public.driver_profiles FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 4. Customer Vehicles & Payment Methods
CREATE POLICY "Clients full manage own vehicles" ON public.customer_vehicles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff read all vehicles" ON public.customer_vehicles FOR SELECT TO authenticated
  USING (public.is_staff());
CREATE POLICY "Drivers read vehicles for active orders" ON public.customer_vehicles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.vehicle_id = customer_vehicles.id AND orders.assigned_driver_id = auth.uid()));
CREATE POLICY "SuperAdmin manage customer_vehicles" ON public.customer_vehicles FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Clients full manage own payment methods" ON public.payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SuperAdmin audit payment methods" ON public.payment_methods FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 5. Orders
CREATE POLICY "Orders read access" ON public.orders FOR SELECT TO authenticated
  USING (
    auth.uid() = client_user_id
    OR auth.uid() = assigned_driver_id
    OR (public.is_driver() AND status = 'WAITING_APPROVAL')
    OR public.is_staff()
  );
CREATE POLICY "Client create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_user_id);
CREATE POLICY "Client cancel own pending orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = client_user_id AND status IN ('PENDING', 'WAITING_APPROVAL'))
  WITH CHECK (auth.uid() = client_user_id);
CREATE POLICY "Driver update assigned orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_driver_id OR (public.is_driver() AND status = 'WAITING_APPROVAL'))
  WITH CHECK (auth.uid() = assigned_driver_id OR public.is_driver());
CREATE POLICY "Dispatcher update and assign orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_dispatcher()) WITH CHECK (public.is_dispatcher());
CREATE POLICY "SuperAdmin full manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 6. Telemetry & GPS
CREATE POLICY "Telemetry read access" ON public.order_telemetry_logs FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_telemetry_logs.order_id AND (orders.client_user_id = auth.uid() OR orders.assigned_driver_id = auth.uid()))
  );
CREATE POLICY "Driver insert telemetry" ON public.order_telemetry_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_driver() OR public.is_staff());
CREATE POLICY "SuperAdmin manage telemetry" ON public.order_telemetry_logs FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Breadcrumbs read access" ON public.truck_gps_breadcrumbs FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Driver insert breadcrumbs" ON public.truck_gps_breadcrumbs FOR INSERT TO authenticated
  WITH CHECK (public.is_driver() OR public.is_staff());
CREATE POLICY "SuperAdmin manage breadcrumbs" ON public.truck_gps_breadcrumbs FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 7. Billing & Invoices
CREATE POLICY "Client read own invoices" ON public.order_invoices FOR SELECT TO authenticated
  USING (auth.uid() = client_user_id);
CREATE POLICY "Staff read all invoices" ON public.order_invoices FOR SELECT TO authenticated
  USING (public.is_staff());
CREATE POLICY "Dispatcher update invoice billing status" ON public.order_invoices FOR UPDATE TO authenticated
  USING (public.is_dispatcher()) WITH CHECK (public.is_dispatcher());
CREATE POLICY "SuperAdmin full manage invoices" ON public.order_invoices FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 8. Reviews
CREATE POLICY "All authenticated read reviews" ON public.order_reviews FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Client insert own reviews" ON public.order_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_user_id);
CREATE POLICY "Client update own review" ON public.order_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = client_user_id) WITH CHECK (auth.uid() = client_user_id);
CREATE POLICY "SuperAdmin manage reviews" ON public.order_reviews FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
