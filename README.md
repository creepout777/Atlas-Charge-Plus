# Atlas Charge Plus+

Atlas Charge Plus+ is an enterprise-grade, multi-platform mobile EV charging fleet management platform. It enables on-demand, mobile high-power DC rapid charging for electric vehicles through dispatchable charging trucks.

The platform provides a unified ecosystem connecting vehicle owners, fleet drivers, operations dispatchers, and executive administrators across Web, Native Android, and Android Automotive OS (AAOS) interfaces.

---

## Executive Summary

The project consists of three core application layers backed by a secure cloud infrastructure:

1. **Multi-Role Web Application**: Single-Page Application (SPA) built with React 18 and Vite 5, providing tailored interfaces for four distinct user roles (Client, Driver, Dispatcher, Super Admin).
2. **Native Mobile Application**: Native Android application powered by Capacitor 8, leveraging device-level APIs including high-precision GPS tracking, push notifications, and custom status bar integration.
3. **Android Automotive OS (AAOS) Application**: Dedicated in-vehicle dashboard application using the Google Car App Library, enabling real-time navigation and charging session management directly on vehicle head units.
4. **Backend Infrastructure**: Serverless PostgreSQL database managed via Supabase, enforcing 28 Row-Level Security (RLS) policies, WebSockets real-time change data capture (CDC), and Turnstile CAPTCHA verification.
5. **Artificial Intelligence Engine**: Integrated Google Gemini 2.5 Flash AI statistical intelligence service combined with Web Speech API for voice-driven business analytics.

---

## Key Features by User Role

### Client Espace
- **Mobile DC Charging Dispatch**: Pin exact GPS coordinates on an interactive Leaflet map to request 150 kW mobile rapid charging.
- **EV Garage Management**: Register electric vehicles with battery capacities, preferred connector types (CCS Combo 2, Tesla NACS, Type 2, CHAdeMO), and port locations.
- **Transparent Pricing & Tariffs**: Browse dynamic tariffs, rush-hour multipliers, and pre-configured kWh charging packages.
- **Real-Time Order Tracking**: Monitor driver assignment, truck en-route status, live charging telemetry, and digital invoice generation.

### Driver Cockpit
- **Intervention Queue**: Receive and accept mobile charging dispatch assignments in real-time.
- **Turn-by-Turn GPS Navigation**: Route optimization directly to the client's parked vehicle location.
- **Live DC Telemetry Engine**: Stream active charging metrics including output power (kW), total energy dispensed (kWh), truck buffer battery reserve, and vehicle state of charge.

### Fleet Dispatcher Console
- **Interactive Fleet Operations Map**: Live GPS breadcrumb tracking of mobile charging units across London.
- **Resource Allocation**: Monitor truck readiness, technician on-duty status, and active queue dispatches.
- **Tariff & Package Control**: Manage dynamic callout fees, energy rates, and surge pricing schedules.

### Super Admin & Intelligence
- **Gemini AI Statistical Intelligence**: Natural language text and voice querying over 8 aggregate fleet performance metrics using Google Gemini.
- **Executive Analytics**: Gross dispatch revenue, energy dispensed, customer satisfaction scores (CSAT), and driver leaderboards.
- **System Access & Security Control**: Role-based access control (RBAC) and real-time database audit logging.

---

## Android Automotive OS (AAOS) Integration

The platform extends directly into the vehicle's infotainment system via Google's Car App Library and native Android Auto services:

- **Canvas 2D Map Rendering**: High-performance vector map navigation integrated into vehicle displays.
- **In-Vehicle Session Management**: Initiate, monitor, and finalize charging dispatches without leaving the driver cockpit.
- **Native Bridge (`CarDataBridge`)**: Seamless synchronization between vehicle head unit events and the Supabase WebSocket real-time cluster.

---

## Technical Architecture & Technology Stack

### Frontend & Mobile
- Core Framework: React 18, Vite 5, JavaScript (ES2022)
- State & Context Management: React Context API (`AuthContext`, `DataContext`, `OrderContext`)
- Mapping & Geolocation: Leaflet 1.9, OpenStreetMap / Carto Basemaps, `@capacitor/geolocation`
- UI & Styling: Custom Vanilla CSS design system, Lucide Icons, responsive dark mode
- Mobile Runtime: Capacitor 8 (Android SDK 24+)
- In-Vehicle Dashboard: Android Automotive OS, Google Car App Library

### Backend & Cloud
- Database & Auth: Supabase (PostgreSQL 15), GoTrue Authentication, WebSockets Realtime
- Security: 28 Row-Level Security (RLS) policies, `SECURITY DEFINER` SQL helper functions
- Artificial Intelligence: Google Gemini 2.5 Flash API, Web Speech API (Voice-to-Text)
- Bot Protection: Cloudflare Turnstile CAPTCHA

---

## Repository Structure

```
Atlas-Charge-Plus/
├── atlas v2/                   # Core Web, Mobile & AAOS Source Code
│   ├── android/                # Native Android Studio Project (Capacitor wrapper)
│   ├── public/                 # Static assets, icons, and hero media
│   ├── src/
│   │   ├── components/         # Reusable UI components, modals, and navigation
│   │   ├── context/            # Auth, Data, and Order state contexts
│   │   ├── pages/              # 14 role-based view pages
│   │   ├── services/           # Supabase client, Gemini AI, and Capacitor bridges
│   │   ├── styles/             # Modular CSS design system and variables
│   │   └── utils/              # Helper functions, math utilities, and formatters
│   ├── capacitor.config.json   # Capacitor native project settings
│   ├── package.json            # Node.js dependencies and build scripts
│   └── vite.config.js          # Vite build and bundling configuration
├── apk-server/                 # Pre-compiled Android APK binaries and distribution page
└── report/                     # Technical academic report and UML PlantUML diagrams
```

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Android Studio (for native Android / AAOS builds)

### Installation & Development

1. Navigate to the application directory:
   ```bash
   cd "atlas v2"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Mobile Build (Capacitor Android)

1. Sync web build artifacts to native Android project:
   ```bash
   npx cap sync android
   ```

2. Open in Android Studio:
   ```bash
   npx cap open android
   ```

---

## Database Schema & Security

The platform operates on a 16-table relational PostgreSQL schema on Supabase:

- `users`: Core authentication identity table linked with Supabase Auth.
- `client_profiles`: Client preferences, referral codes, and default payment methods.
- `fleet_trucks`: Mobile charging truck hardware specs, GPS coordinates, and battery state.
- `driver_profiles`: Driver licenses, assigned trucks, service status, and ratings.
- `connector_types`: Supported charging plug specifications (CCS2, NACS, CHAdeMO, Type 2).
- `customer_vehicles`: Registered EV specifications, battery pack sizes, and port locations.
- `charge_packages`: Standard kWh charging bundles.
- `pricing_tariffs`: Dynamic pricing rates, callout fees, and peak-hour multipliers.
- `orders`: Master order state machine supporting 8 distinct order statuses.
- `order_telemetry_logs`: Real-time charging telemetry samples (kW, kWh, battery %).
- `truck_gps_breadcrumbs`: Historical GPS position log for fleet tracking.
- `order_invoices`: Financial transaction invoices and line-item breakdowns.

Row-Level Security (RLS) is strictly enforced across all tables, ensuring clients only access their own vehicles and orders, while drivers and dispatchers receive scoped operational data.

---

## Project Contributors

Developed as part of the engineering graduation project at **Euromed University of Fes (UEMF)** — **EIDIA** (School of Digital Engineering and Artificial Intelligence) in collaboration with **Atlas E-Mobility Group**:

- **Yassine Aitaouicha**
- **Haytam Hannoun**
- **Brahim Nakkar**

**University Supervisor**: Mr. Taha Ait Tchakoucht  
**Host Organization**: Atlas E-Mobility Group  

---

## License

Copyright 2025/2026 Atlas E-Mobility Group. All rights reserved.
