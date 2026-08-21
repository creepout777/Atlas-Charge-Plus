import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation, Zap, CheckCircle2, AlertTriangle, Play, Square, BellRing, Gauge, Battery, Activity, Coffee, Power, Phone, User, Clock, ChevronRight, MapPin, Compass, ShieldCheck } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { playDispatchChime } from '../services/sound';
import MobileSheet from '../components/layout/MobileSheet';
import Modal from '../components/layout/Modal';
import SpeedometerGauge from '../components/telemetry/SpeedometerGauge';
import { watchLocation, clearWatchLocation, getCurrentLocation } from '../services/nativePermissions';

const DUTY_STATUSES = [
  { value: 'AVAILABLE', label: '🟢 Available (On Duty)', color: 'var(--emerald-light)', text: 'var(--emerald-darker)' },
  { value: 'ON_BREAK', label: '☕ Rest Break', color: '#fef3c7', text: '#b45309' },
  { value: 'DEPOT_RESTOCK', label: '📦 Depot Restock', color: '#f3e8ff', text: '#7e22ce' },
  { value: 'OFF_DUTY', label: '🔴 Off Duty', color: 'var(--slate-100)', text: 'var(--slate-600)' },
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos((lon2 - lon1) * (Math.PI / 180));
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return Math.round((brng + 360) % 360);
}

export default function DriverCockpitPage() {
  const { currentUser } = useAuth();
  const { ordersList, updateStatus, claimOrder, logTelemetry, broadcastGps } = useOrder();
  const { trucks, drivers, vehicles, packages, updateTruck, updateDriver, addInvoice } = useData();

  // Identify logged in driver and assigned mobile unit
  const myDriverProfile = useMemo(() => {
    return drivers.find(d => d.user_id === currentUser?.id) || drivers[0] || null;
  }, [drivers, currentUser]);

  const [myDutyStatus, setMyDutyStatus] = useState(myDriverProfile?.duty_status || 'AVAILABLE');
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const currentTruck = useMemo(() => {
    if (myDriverProfile?.assigned_truck_id) {
      return trucks.find(t => t.id === myDriverProfile.assigned_truck_id) || trucks[0] || null;
    }
    return trucks[0] || null;
  }, [trucks, myDriverProfile]);

  // Find driver's active job
  const myActiveJob = useMemo(() => {
    return ordersList.find(o => o.assigned_driver_id === currentUser?.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
  }, [ordersList, currentUser]);

  const jobVehicle = useMemo(() => {
    return vehicles.find(v => v.id === myActiveJob?.vehicle_id) || null;
  }, [vehicles, myActiveJob]);

  const jobPackage = useMemo(() => {
    return packages.find(p => p.id === myActiveJob?.charge_package_id) || null;
  }, [packages, myActiveJob]);

  // Find open unassigned queue bookings
  const availableQueueJobs = useMemo(() => {
    return ordersList.filter(o => !o.assigned_driver_id && (o.status === 'WAITING_APPROVAL' || o.status === 'PENDING_DISPATCH' || o.status === 'PENDING'));
  }, [ordersList]);

  // Target job for modal alert (either assigned waiting job or first available pool job)
  const incomingJob = myActiveJob && myActiveJob.status === 'WAITING_APPROVAL' ? myActiveJob : (availableQueueJobs[0] || null);

  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [chargingKw, setChargingKw] = useState(0);
  const [deliveredKwh, setDeliveredKwh] = useState(0);
  const [batteryPct, setBatteryPct] = useState(24);
  const [truckPos, setTruckPos] = useState([currentTruck?.current_lat || 51.5074, currentTruck?.current_lng || -0.1278]);
  const [navDistanceKm, setNavDistanceKm] = useState(0);
  const [navEtaMins, setNavEtaMins] = useState(0);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const clientMarkerRef = useRef(null);
  const queueMarkersRef = useRef({});
  const routeLineRef = useRef(null);
  const simTimerRef = useRef(null);
  const navGpsTimerRef = useRef(null);
  const hasFittedJobBoundsRef = useRef(false);

  useEffect(() => {
    hasFittedJobBoundsRef.current = false;
  }, [myActiveJob?.id]);

  // Live GPS continuous tracking effect (only updates if moved >= 5 meters to prevent fake jitter)
  useEffect(() => {
    if (myDutyStatus === 'OFF_DUTY') {
      setGpsActive(false);
      return;
    }

    let activeWatchId = null;
    watchLocation(
      (pos) => {
        const newLat = pos.lat;
        const newLng = pos.lng;
        setGpsAccuracy(pos.accuracy ? Math.round(pos.accuracy) : 10);
        setGpsActive(true);

        setTruckPos(prevPos => {
          const distMeters = calculateDistanceKm(prevPos[0], prevPos[1], newLat, newLng) * 1000;
          // If moved less than 5 meters, ignore micro-noise so driver marker stays completely still
          if (distMeters < 5 && prevPos[0] !== 51.5074) {
            return prevPos;
          }

          if (truckMarkerRef.current) {
            truckMarkerRef.current.setLatLng([newLat, newLng]);
          }

          if (currentTruck?.id) {
            updateTruck(currentTruck.id, { current_lat: newLat, current_lng: newLng }).catch(() => {});
          }

          return [newLat, newLng];
        });
      },
      (err) => {
        console.warn('Driver GPS watch note:', err?.message);
        setGpsActive(false);
      }
    ).then(id => {
      activeWatchId = id;
    });

    return () => {
      if (activeWatchId) {
        clearWatchLocation(activeWatchId);
      }
    };
  }, [myDutyStatus, currentTruck?.id, updateTruck]);

  // Synchronize initial truck coordinates
  useEffect(() => {
    if (currentTruck?.current_lat && currentTruck?.current_lng) {
      setTruckPos([currentTruck.current_lat, currentTruck.current_lng]);
    }
  }, [currentTruck?.current_lat, currentTruck?.current_lng]);

  // Play chime and show modal when a new unassigned job arrives
  useEffect(() => {
    if (incomingJob && !myActiveJob?.status?.includes('EN_ROUTE') && !myActiveJob?.status?.includes('CHARGING')) {
      setShowIncomingModal(true);
      playDispatchChime();
    }
  }, [incomingJob?.id]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = truckPos[0] || 51.5074;
    const initialLng = truckPos[1] || -0.1278;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const truckIcon = L.divIcon({
      className: 'custom-truck-icon',
      html: `
        <div class="truck-heading-marker" id="driver-truck-marker">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    truckMarkerRef.current = L.marker([initialLat, initialLng], { icon: truckIcon }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Available Queue Job Markers (Amber Pulsing Pins with Interactive Popups)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear old queue markers no longer available
    Object.keys(queueMarkersRef.current).forEach(id => {
      if (!availableQueueJobs.find(j => j.id === id) || (myActiveJob && myActiveJob.id === id)) {
        queueMarkersRef.current[id]?.remove();
        delete queueMarkersRef.current[id];
      }
    });

    // If driver already has an active job, hide other queue pins to focus on navigation
    if (myActiveJob) {
      Object.keys(queueMarkersRef.current).forEach(id => {
        queueMarkersRef.current[id]?.remove();
        delete queueMarkersRef.current[id];
      });
      return;
    }

    availableQueueJobs.forEach(job => {
      const lat = job.target_lat || 51.5014;
      const lng = job.target_lng || -0.1918;

      if (!queueMarkersRef.current[job.id]) {
        const queueIcon = L.divIcon({
          className: 'custom-queue-icon',
          html: `<div class="pending-job-pulse-marker" title="Open Job: ${job.target_address}"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([lat, lng], { icon: queueIcon }).addTo(mapInstanceRef.current);

        const popupContent = `
          <div style="font-family: Inter, system-ui, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">OPEN DISPATCH</span>
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">${job.order_reference || job.id?.slice(0, 8)}</span>
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 6px;">${job.target_address || 'London Central'}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; background: #f8fafc; padding: 6px 8px; border-radius: 6px; margin-bottom: 10px;">
              <span>⚡ ${job.target_kwh || 35} kWh (150kW DC)</span>
              <span style="color: #10b981;">£${job.estimated_total_amount || '17.25'}</span>
            </div>
            <button id="btn-claim-${job.id}" style="width: 100%; background: #10b981; color: #fff; font-weight: 800; font-size: 12px; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              ⚡ Claim Job & Navigate
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-claim-${job.id}`);
          if (btn) {
            btn.onclick = () => {
              handleAcceptOrClaimSpecificJob(job);
            };
          }
        });

        queueMarkersRef.current[job.id] = marker;
      } else {
        queueMarkersRef.current[job.id].setLatLng([lat, lng]);
      }
    });

    // If we have available jobs and no active job, fit bounds ONCE to show all
    if (availableQueueJobs.length > 0 && !myActiveJob && !hasFittedJobBoundsRef.current) {
      hasFittedJobBoundsRef.current = true;
      const allPoints = [
        truckPos,
        ...availableQueueJobs.map(j => [j.target_lat || 51.5014, j.target_lng || -0.1918]),
      ];
      mapInstanceRef.current.fitBounds(allPoints, { padding: [60, 60], maxZoom: 15 });
    }
  }, [availableQueueJobs, myActiveJob]);

  // 3. Render Active Assigned Job (Neon Emerald Marker & Navigation Route)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (myActiveJob && myActiveJob.target_lat && myActiveJob.target_lng) {
      const clientPos = [myActiveJob.target_lat, myActiveJob.target_lng];

      // Calculate real distance & ETA
      const dist = calculateDistanceKm(truckPos[0], truckPos[1], clientPos[0], clientPos[1]);
      setNavDistanceKm(dist);
      setNavEtaMins(Math.max(1, Math.round(dist * 2.5)));

      // Render client destination marker
      if (!clientMarkerRef.current) {
        const clientIcon = L.divIcon({
          className: 'custom-client-icon',
          html: `<div class="client-pulse-marker" title="Client Destination: ${myActiveJob.target_address}"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        clientMarkerRef.current = L.marker(clientPos, { icon: clientIcon }).addTo(mapInstanceRef.current);
      } else {
        clientMarkerRef.current.setLatLng(clientPos);
      }

      // Draw high-visibility dashed dispatch route line
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline([truckPos, clientPos], {
          color: '#10b981',
          weight: 5,
          dashArray: '8, 10',
          opacity: 0.9,
        }).addTo(mapInstanceRef.current);
      } else {
        routeLineRef.current.setLatLngs([truckPos, clientPos]);
      }

      if (!hasFittedJobBoundsRef.current) {
        hasFittedJobBoundsRef.current = true;
        mapInstanceRef.current.fitBounds([truckPos, clientPos], { padding: [70, 70] });
      }
    } else {
      if (clientMarkerRef.current) {
        clientMarkerRef.current.remove();
        clientMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    }
  }, [myActiveJob, truckPos]);

  // 4. Clean real hardware GPS updates (no artificial movement simulation)
  useEffect(() => {
    if (navGpsTimerRef.current) {
      clearInterval(navGpsTimerRef.current);
    }
  }, []);

  // 5. Active Charging Telemetry Setup
  useEffect(() => {
    if (myActiveJob && myActiveJob.status === 'CHARGING') {
      const targetKw = currentTruck?.max_output_kw || 150;
      setChargingKw(targetKw);
      const pkgKwh = parseFloat(myActiveJob.target_kwh) || parseFloat(jobPackage?.target_kwh) || 35.0;
      setDeliveredKwh(pkgKwh);
    } else {
      setChargingKw(0);
    }
  }, [myActiveJob?.status, currentTruck, jobPackage]);

  // Actions
  const handleAcceptOrClaimSpecificJob = async (job) => {
    if (!job) return;
    try {
      await claimOrder(job.id, currentUser?.id || myDriverProfile?.user_id, currentTruck?.id);
      if (myDriverProfile) {
        await updateDriver(myDriverProfile.user_id, { duty_status: 'EN_ROUTE', is_on_duty: true });
      }
      if (currentTruck) {
        await updateTruck(currentTruck.id, { operational_status: 'EN_ROUTE' });
      }
      setShowIncomingModal(false);
    } catch (e) {
      console.error('Claim job error:', e);
    }
  };

  const handleArrived = async () => {
    if (!myActiveJob) return;
    await updateStatus(myActiveJob.id, { status: 'ARRIVED' });
  };

  const handleStartCharging = async () => {
    if (!myActiveJob) return;
    setDeliveredKwh(0);
    await updateStatus(myActiveJob.id, { status: 'CHARGING' });
    if (currentTruck) {
      await updateTruck(currentTruck.id, { operational_status: 'CHARGING_ACTIVE' });
    }
    if (myDriverProfile) {
      await updateDriver(myDriverProfile.user_id, { duty_status: 'CHARGING_SESSION' });
    }
  };

  const handleCompleteCharge = async () => {
    if (!myActiveJob) return;
    const finalDelivered = deliveredKwh > 0 ? deliveredKwh : 35.0;
    const callout = parseFloat(myActiveJob.estimated_callout_fee) || 5.00;
    const kwhCost = parseFloat((finalDelivered * 0.35).toFixed(2));
    const totalAmount = parseFloat((callout + kwhCost).toFixed(2));

    try {
      // 1. Complete order
      await updateStatus(myActiveJob.id, {
        status: 'COMPLETED',
        actual_kwh_delivered: finalDelivered,
        actual_duration_minutes: 18,
      });

      // 2. Generate invoice in database
      await addInvoice({
        order_id: myActiveJob.id,
        client_user_id: myActiveJob.client_user_id,
        callout_fee_amount: callout,
        energy_delivered_amount: kwhCost,
        total_billed_amount: totalAmount,
        pdf_url: `https://atlas-charge.com/invoices/inv_${myActiveJob.id?.slice(0, 8)}.pdf`,
      });

      // 3. Update truck stored battery reserve
      if (currentTruck) {
        const newStored = Math.max(0, (currentTruck.current_stored_kwh || 160) - finalDelivered);
        await updateTruck(currentTruck.id, {
          current_stored_kwh: parseFloat(newStored.toFixed(1)),
          operational_status: 'AVAILABLE',
        });
      }

      // 4. Reset driver duty to AVAILABLE
      if (myDriverProfile) {
        await updateDriver(myDriverProfile.user_id, {
          duty_status: 'AVAILABLE',
          total_completed_jobs: (myDriverProfile.total_completed_jobs || 0) + 1,
        });
      }

      setDeliveredKwh(0);
      setChargingKw(0);
    } catch (e) {
      console.error('Complete charge error:', e);
    }
  };

  const handleDutyStatusChange = async (newStatus) => {
    if (!myDriverProfile) return;
    await updateDriver(myDriverProfile.user_id, {
      duty_status: newStatus,
      is_on_duty: newStatus !== 'OFF_DUTY',
    });
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Telemetry & Duty HUD */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '42px', height: '42px', background: 'var(--emerald-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{currentTruck?.display_name || 'Atlas Titan Mobile'}</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
              {currentTruck?.truck_code} · {currentTruck?.license_plate} · Tech: <b>{currentUser?.full_name || myDriverProfile?.full_name || 'Field Driver'}</b>
            </div>
          </div>
        </div>

        {/* Duty Status Selector */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 800,
              outline: 'none',
              cursor: 'pointer',
            }}
            value={myDriverProfile?.duty_status || 'AVAILABLE'}
            onChange={e => handleDutyStatusChange(e.target.value)}
          >
            {DUTY_STATUSES.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#0f172a', color: '#fff' }}>
                {s.label}
              </option>
            ))}
          </select>

          {/* GPS Live Signal Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: gpsActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${gpsActive ? '#10b981' : '#ef4444'}`,
            borderRadius: 'var(--radius-full)',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 800,
            color: gpsActive ? '#34d399' : '#f87171'
          }}>
            <Navigation size={11} className={gpsActive ? 'pulse' : ''} />
            {gpsActive ? `GPS LIVE ${gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}` : 'GPS Offline'}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>BUFFER BATTERY</div>
            <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#10b981' }}>
              {currentTruck?.current_stored_kwh || 160} / {currentTruck?.battery_capacity_kwh || 200} kWh
            </div>
          </div>
        </div>
      </div>

      {/* Floating Active Navigation HUD (When EN_ROUTE) */}
      {myActiveJob && myActiveJob.status === 'EN_ROUTE' && (
        <div style={{
          position: 'absolute',
          top: '90px',
          left: '16px',
          right: '16px',
          zIndex: 490,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Navigation size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>LIVE GPS NAVIGATION ACTIVE</div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>{myActiveJob.target_address || 'London Central'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div className="metric-card" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>DISTANCE</div>
              <div style={{ fontWeight: 900, color: '#fff', fontSize: '14px' }}>{navDistanceKm} km</div>
            </div>
            <div className="metric-card" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>EST. ETA</div>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: '14px' }}>{navEtaMins} mins</div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Cockpit Bottom Drawer */}
      <MobileSheet>
        {!myActiveJob ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <Activity size={36} style={{ margin: '0 auto 10px', color: 'var(--emerald-primary)' }} />
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--slate-900)' }}>Field Cockpit Standing By</div>
            <div style={{ fontSize: '13px', marginTop: '4px', maxWidth: '360px', margin: '4px auto 14px' }}>
              GPS beacon live. Ready to receive high-power mobile DC rapid charging jobs across London.
            </div>

            {availableQueueJobs.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#b45309', marginBottom: '8px' }}>
                  🟡 {availableQueueJobs.length} Pending Booking Pin(s) Visible On Map:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
                  {availableQueueJobs.map(job => (
                    <div
                      key={job.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--slate-900)' }}>{job.target_address || 'London Central'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.target_kwh || 35} kWh · £{job.estimated_total_amount || '17.25'}</div>
                      </div>
                      <button
                        className="btn-emerald"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleAcceptOrClaimSpecificJob(job)}
                      >
                        Claim Job
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Active Job Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                  ● Job Status: {myActiveJob.status}
                </span>
                <div style={{ fontWeight: 900, fontSize: '18px', marginTop: '4px' }}>
                  {myActiveJob.target_address || 'Kensington High Street, London'}
                </div>
              </div>
              <span className="brand-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                Ref: {myActiveJob.order_reference || myActiveJob.id?.slice(0, 8)}
              </span>
            </div>

            {/* Target Client EV Card */}
            <div style={{ background: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>TARGET CLIENT EV</div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>{jobVehicle ? `${jobVehicle.make} ${jobVehicle.model} (${jobVehicle.license_plate})` : 'Client Electric Vehicle'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target Energy: <b>{jobPackage?.target_kwh || myActiveJob.target_kwh || 35} kWh</b> (£{myActiveJob.estimated_total_amount || '17.25'})</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="tel:+447911999888" className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} /> Call Client
                </a>
              </div>
            </div>

            {/* State Machine Action Controls */}
            {myActiveJob.status === 'EN_ROUTE' && (
              <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleArrived}>
                <Navigation size={18} /> Confirm Arrival On-Site
              </button>
            )}

            {myActiveJob.status === 'ARRIVED' && (
              <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleStartCharging}>
                <Zap size={18} /> Connect CCS2 Cable & Start 150kW DC Dispensing
              </button>
            )}

            {myActiveJob.status === 'CHARGING' && (
              <div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#15803d' }}>
                    <Zap size={24} className="pulse" />
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '17px', color: '#14532d' }}>Charging Session in Progress</div>
                  <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
                    Currently charging <b>{jobVehicle ? `${jobVehicle.make} ${jobVehicle.model}` : 'Client EV'}</b> ({myActiveJob.target_address})
                  </div>
                </div>

                {/* 2 Primary Action Buttons: Call Client + Stop Charging & Mark Done */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <a
                    href="tel:+447911999888"
                    className="btn-outline"
                    style={{ padding: '14px 0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 800, textDecoration: 'none' }}
                  >
                    <Phone size={16} /> Call Client
                  </a>

                  <button
                    className="btn-emerald"
                    style={{ fontSize: '14px', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleCompleteCharge}
                  >
                    <CheckCircle2 size={18} /> 🔌 Stop Charging & Mark Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </MobileSheet>

      {/* MODAL: Incoming Dispatch Job Alert */}
      <Modal isOpen={showIncomingModal && !!incomingJob} onClose={() => setShowIncomingModal(false)} title="🚨 Incoming Rapid DC Dispatch Alert">
        {incomingJob && (
          <div>
            <div style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellRing size={18} /> Fast Mobile EV Charging Requested
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>DESTINATION ADDRESS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, marginTop: '2px' }}>{incomingJob.target_address || 'London Central'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div className="metric-card">
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>REQUESTED ENERGY</div>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{incomingJob.target_kwh || 35} kWh (150kW DC)</div>
              </div>
              <div className="metric-card">
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ESTIMATED TOTAL</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--emerald-dark)' }}>£{incomingJob.estimated_total_amount || '17.25'}</div>
              </div>
            </div>

            <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={() => handleAcceptOrClaimSpecificJob(incomingJob)}>
              <CheckCircle2 size={18} /> Accept & Start Navigation (EN ROUTE)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
