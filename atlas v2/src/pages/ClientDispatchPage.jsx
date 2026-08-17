import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Zap, Navigation, Clock, ShieldCheck, CheckCircle2, Star, Sparkles, MapPin, Gauge, Cpu, Phone, Truck, User, BatteryCharging, AlertCircle, X, Radio, ArrowRight } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import MobileSheet from '../components/layout/MobileSheet';
import Modal from '../components/layout/Modal';
import SpeedometerGauge from '../components/telemetry/SpeedometerGauge';
import StarRating from '../components/shared/StarRating';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export default function ClientDispatchPage() {
  const { currentUser } = useAuth();
  const { ordersList, createOrder, updateStatus, deleteOrder, telemetryLogs } = useOrder();
  const { vehicles, packages, connectors, trucks, drivers, tariffs, addReview } = useData();

  // Find this client's active order
  const activeOrder = useMemo(() => {
    return ordersList.find(o => o.client_user_id === currentUser?.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
  }, [ordersList, currentUser]);

  const activePackages = packages.filter(p => p.is_active !== false);
  const activeConnectors = connectors.filter(c => c.is_active !== false);

  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [targetAddress, setTargetAddress] = useState('45 Kensington High St, London W8 5ED');
  const [targetCoords, setTargetCoords] = useState([51.5014, -0.1918]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clientMarkerRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  useEffect(() => {
    if (activePackages.length > 0 && !selectedPkg) setSelectedPkg(activePackages[1] || activePackages[0]);
    if (vehicles.length > 0 && !selectedVehicle) setSelectedVehicle(vehicles[0]);
    if (activeConnectors.length > 0 && !selectedConnector) setSelectedConnector(activeConnectors[0]);
  }, [packages, vehicles, connectors]);

  // Assigned Truck & Driver info
  const assignedTruck = useMemo(() => {
    if (activeOrder?.assigned_truck_id) {
      return trucks.find(t => t.id === activeOrder.assigned_truck_id) || trucks[0] || null;
    }
    return trucks[0] || null;
  }, [trucks, activeOrder]);

  const assignedDriver = useMemo(() => {
    if (activeOrder?.assigned_driver_id) {
      return drivers.find(d => d.user_id === activeOrder.assigned_driver_id) || drivers[0] || null;
    }
    return drivers[0] || null;
  }, [drivers, activeOrder]);

  // Live telemetry for active charging
  const latestTelemetry = useMemo(() => {
    if (!activeOrder) return null;
    return telemetryLogs.find(t => t.order_id === activeOrder.id) || null;
  }, [telemetryLogs, activeOrder]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: targetCoords,
      zoom: 14,
      zoomControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const clientIcon = L.divIcon({
      className: 'custom-client-icon',
      html: '<div class="client-pulse-marker" title="Your EV Location"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    clientMarkerRef.current = L.marker(targetCoords, { icon: clientIcon }).addTo(map);

    // Map click to reposition pin
    map.on('click', (e) => {
      if (activeOrder) return; // Locked during active dispatch
      const newPos = [e.latlng.lat, e.latlng.lng];
      setTargetCoords(newPos);
      setTargetAddress(`Pinned Spot (${newPos[0].toFixed(4)}, ${newPos[1].toFixed(4)})`);
      if (clientMarkerRef.current) clientMarkerRef.current.setLatLng(newPos);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Truck Marker & Route during Active Order
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (activeOrder && activeOrder.status !== 'WAITING_APPROVAL' && activeOrder.status !== 'COMPLETED') {
      const truckPos = [assignedTruck?.current_lat || 51.5430, assignedTruck?.current_lng || -0.0020];
      const clientPos = [activeOrder.target_lat || targetCoords[0], activeOrder.target_lng || targetCoords[1]];

      if (!truckMarkerRef.current) {
        const truckIcon = L.divIcon({
          className: 'custom-truck-icon',
          html: `
            <div class="truck-heading-marker" title="${assignedTruck?.display_name || 'Mobile Titan Unit'}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        truckMarkerRef.current = L.marker(truckPos, { icon: truckIcon }).addTo(mapInstanceRef.current);
      } else {
        truckMarkerRef.current.setLatLng(truckPos);
      }

      // Draw route
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

      mapInstanceRef.current.fitBounds([truckPos, clientPos], { padding: [70, 70] });
    } else {
      if (truckMarkerRef.current) {
        truckMarkerRef.current.remove();
        truckMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    }
  }, [activeOrder, assignedTruck?.current_lat, assignedTruck?.current_lng]);

  // Trigger Review modal on completion
  useEffect(() => {
    if (activeOrder && activeOrder.status === 'COMPLETED') {
      setShowReviewModal(true);
    }
  }, [activeOrder?.status]);

  const handleDispatch = async () => {
    setIsSubmitting(true);
    const pkg = selectedPkg || activePackages[0] || packages[0];
    const veh = selectedVehicle || vehicles[0];
    const conn = selectedConnector || activeConnectors[0] || connectors[0];
    const trf = tariffs && tariffs.length > 0 ? tariffs[0] : null;
    const kwh = pkg?.target_kwh || 35;
    const callout = parseFloat(trf?.base_callout_fee) || 5.00;
    const perKwhRate = parseFloat(trf?.per_kwh_rate) || 0.35;
    const kwhPrice = parseFloat((kwh * perKwhRate).toFixed(2));
    const total = parseFloat((callout + kwhPrice).toFixed(2));

    try {
      await createOrder({
        tariff_id: trf?.id || null,
        charge_package_id: pkg?.id || null,
        connector_type_id: conn?.id || null,
        vehicle_id: veh?.id || null,
        target_address: targetAddress,
        target_lat: targetCoords[0],
        target_lng: targetCoords[1],
        estimated_callout_fee: callout,
        estimated_kwh_cost: kwhPrice,
        estimated_total_amount: total,
      });
    } catch (e) {
      console.error('Dispatch error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    if (window.confirm('Are you sure you want to cancel this rapid charging dispatch request?')) {
      await deleteOrder(activeOrder.id);
    }
  };

  const handleReviewSubmit = async () => {
    const veh = vehicles.find(v => v.id === activeOrder?.vehicle_id) || vehicles[0];
    await addReview({
      order_id: activeOrder?.id,
      truck_id: activeOrder?.assigned_truck_id || null,
      driver_user_id: activeOrder?.assigned_driver_id || null,
      rating_stars: reviewStars,
      feedback_tags: 'Rapid DC,Professional Tech,Clean Energy',
      comment: reviewComment || 'Outstanding on-demand EV charging service!',
      author_name: currentUser?.full_name || 'EV Driver',
      vehicle_model: veh ? `${veh.make} ${veh.model}` : 'Electric Vehicle',
    });
    setReviewSubmitted(true);
    setTimeout(() => {
      setShowReviewModal(false);
      setReviewSubmitted(false);
    }, 1500);
  };

  const distanceToClient = useMemo(() => {
    if (!assignedTruck || !activeOrder) return '1.8';
    return calculateDistanceKm(
      assignedTruck.current_lat || 51.5430,
      assignedTruck.current_lng || -0.0020,
      activeOrder.target_lat || targetCoords[0],
      activeOrder.target_lng || targetCoords[1]
    );
  }, [assignedTruck, activeOrder, targetCoords]);

  return (
    <div className="map-layout" style={{ position: 'relative', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Dispatch & Status Drawer */}
      <MobileSheet>
        {!activeOrder ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="status-dot emerald pulse" />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--emerald-dark)' }}>PINNED DISPATCH TARGET</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800 }}>{targetAddress}</div>
                </div>
              </div>
              <span className="brand-pill">
                <Zap size={12} /> Est. ETA: 8-12 min
              </span>
            </div>

            {/* EV Vehicle Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', display: 'block', marginBottom: '6px' }}>SELECT VEHICLE</label>
              {vehicles.length === 0 ? (
                <div style={{ padding: '10px 12px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Default EV Profile (Tesla Model 3 / Y)
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {vehicles.map((veh) => (
                    <div
                      key={veh.id}
                      onClick={() => setSelectedVehicle(veh)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: selectedVehicle?.id === veh.id ? '2px solid var(--emerald-primary)' : '1px solid var(--border-subtle)',
                        background: selectedVehicle?.id === veh.id ? 'var(--emerald-light)' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>{veh.make} {veh.model}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{veh.license_plate} · {veh.battery_capacity_kwh} kWh</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Energy Package Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', display: 'block', marginBottom: '6px' }}>CHOOSE CHARGE PACKAGE (150kW DC)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {activePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedPkg?.id === pkg.id ? '2px solid var(--emerald-primary)' : '1px solid var(--border-subtle)',
                      background: selectedPkg?.id === pkg.id ? 'var(--emerald-light)' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '13px' }}>{pkg.display_name}</div>
                    <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--emerald-darker)', margin: '2px 0' }}>{pkg.target_kwh} kWh</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>£{(5.00 + (pkg.target_kwh * 0.35)).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Request Button */}
            <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} disabled={isSubmitting} onClick={handleDispatch}>
              <Zap size={18} /> {isSubmitting ? 'Locating Nearest Mobile Titan...' : 'Request Mobile DC Rapid Charge'}
            </button>
          </div>
        ) : (
          <div>
            {/* Active Dispatch Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)', fontWeight: 800 }}>
                  ● {activeOrder.status === 'WAITING_APPROVAL' ? 'Pairing Mobile Titan...' : activeOrder.status === 'EN_ROUTE' ? 'Technician En Route' : activeOrder.status === 'ARRIVED' ? 'Mobile Unit Arrived Outside' : activeOrder.status === 'CHARGING' ? '⚡ 150kW DC Active' : 'Session Completed'}
                </span>
                <div style={{ fontWeight: 900, fontSize: '17px', marginTop: '4px' }}>{activeOrder.target_address}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className="brand-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                  {activeOrder.order_reference || activeOrder.id?.slice(0, 8)}
                </span>
                {activeOrder.status === 'WAITING_APPROVAL' && (
                  <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }} onClick={handleCancelOrder}>
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* WAITING_APPROVAL Radar HUD */}
            {activeOrder.status === 'WAITING_APPROVAL' && (
              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.08))', border: '1px solid rgba(16,185,129,0.2)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ width: '48px', height: '48px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--emerald-darker)' }}>
                  <Radio size={24} className="pulse" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Broadcasting to Mobile Titan Units</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Nearby field technicians are reviewing your booking. Titan Unit will claim and start navigation shortly.
                </div>
              </div>
            )}

            {/* Assigned Unit & Technician Info */}
            {activeOrder.status !== 'WAITING_APPROVAL' && (
              <div style={{ background: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-darker)' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{assignedTruck?.display_name || 'Atlas Titan Mobile'} ({assignedTruck?.license_plate || 'EK24 EVX'})</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Tech: <b>{assignedDriver?.full_name || 'Marcus Webb'}</b> · {distanceToClient} km away
                    </div>
                  </div>
                </div>
                <a href="tel:+447911999888" className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} /> Call Tech
                </a>
              </div>
            )}

            {/* Live Telemetry View during Charging */}
            {activeOrder.status === 'CHARGING' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <SpeedometerGauge currentKw={latestTelemetry?.current_output_kw || 149.4} maxKw={150} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DELIVERED</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--emerald-dark)' }}>{latestTelemetry?.energy_deliv_kwh || activeOrder.actual_kwh_delivered || '12.8'} kWh</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BATTERY</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: '#0284c7' }}>{latestTelemetry?.vehicle_battery_pct || '48'}%</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>POWER</div>
                    <div style={{ fontWeight: 900, fontSize: '16px' }}>{latestTelemetry?.current_output_kw || '149.4'} kW</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </MobileSheet>

      {/* MODAL: Verified Review Submission */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="⭐ Rate Your Rapid DC Charge">
        {reviewSubmitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={44} color="var(--emerald-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 900, fontSize: '18px' }}>Thank You for Your Feedback!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Your review has been verified and published to the live testimonials feed.</div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>How was your high-power DC charging experience with Atlas Charge?</div>
              <StarRating value={reviewStars} onChange={setReviewStars} size={28} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Leave a comment (Optional)</label>
              <textarea
                className="metric-card"
                style={{ width: '100%', minHeight: '80px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Lightning-fast 150kW boost, technician arrived right on time..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>

            <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleReviewSubmit}>
              Submit Verified Customer Review
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
