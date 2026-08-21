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
import { getCurrentLocation } from '../services/nativePermissions';

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
  const { ordersList, createOrder, updateStatus, cancelOrder, deleteOrder, telemetryLogs } = useOrder();
  const { vehicles, packages, connectors, trucks, drivers, tariffs, addReview } = useData();

  // Find this client's active ongoing order
  const activeOrder = useMemo(() => {
    return ordersList.find(o => o.client_user_id === currentUser?.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
  }, [ordersList, currentUser]);

  // Track dismissed completed order IDs so user can book fresh charges
  const [dismissedOrderIds, setDismissedOrderIds] = useState(new Set());
  const [completedOrder, setCompletedOrder] = useState(null);
  const initialDismissRef = useRef(false);

  // Target location & live GPS
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [targetAddress, setTargetAddress] = useState('45 Kensington High St, London W8 5ED');
  const [targetCoords, setTargetCoords] = useState([51.5014, -0.1918]);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseLiveLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentLocation();
      const newCoords = [pos.lat, pos.lng];
      setTargetCoords(newCoords);
      setTargetAddress(`Live GPS: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} (Current Position)`);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(newCoords, 15);
        if (clientMarkerRef.current) {
          clientMarkerRef.current.setLatLng(newCoords);
        }
      }
    } catch (err) {
      console.warn('Could not retrieve live GPS location:', err.message);
    } finally {
      setIsLocating(false);
    }
  };

  // Dismiss historical completed orders on initial load so login shows Request Dispatch form
  useEffect(() => {
    if (ordersList.length > 0 && currentUser?.id && !initialDismissRef.current) {
      initialDismissRef.current = true;
      const historicalCompleted = ordersList
        .filter(o => o.client_user_id === currentUser.id && o.status === 'COMPLETED')
        .map(o => o.id);
      if (historicalCompleted.length > 0) {
        setDismissedOrderIds(prev => new Set([...prev, ...historicalCompleted]));
      }
    }
  }, [ordersList, currentUser]);

  useEffect(() => {
    // Pick the MOST RECENT completed order for this client that hasn't been dismissed
    const userCompleted = ordersList
      .filter(o => o.client_user_id === currentUser?.id && o.status === 'COMPLETED' && !dismissedOrderIds.has(o.id))
      .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));

    const latestCompleted = userCompleted[0] || null;

    if (latestCompleted && !activeOrder) {
      setCompletedOrder(latestCompleted);
    } else {
      setCompletedOrder(null);
    }
  }, [ordersList, currentUser, activeOrder, dismissedOrderIds]);

  const activePackages = packages.filter(p => p.is_active !== false);
  const activeConnectors = connectors.filter(c => c.is_active !== false);

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

  // Target active or completed order
  const targetSession = activeOrder || completedOrder;

  // Assigned Truck & Driver info
  const assignedTruck = useMemo(() => {
    if (targetSession?.assigned_truck_id) {
      return trucks.find(t => t.id === targetSession.assigned_truck_id) || trucks[0] || null;
    }
    return trucks[0] || null;
  }, [trucks, targetSession]);

  const assignedDriver = useMemo(() => {
    if (targetSession?.assigned_driver_id) {
      return drivers.find(d => d.user_id === targetSession.assigned_driver_id) || drivers[0] || null;
    }
    return drivers[0] || null;
  }, [drivers, targetSession]);

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

  const dismissAllCompletedOrders = () => {
    const allCompletedIds = ordersList
      .filter(o => o.client_user_id === currentUser?.id && o.status === 'COMPLETED')
      .map(o => o.id);
    setDismissedOrderIds(prev => new Set([...prev, ...allCompletedIds]));
    setCompletedOrder(null);
  };

  const handleRequestAnotherCharge = () => {
    dismissAllCompletedOrders();
    setReviewSubmitted(false);
    setReviewStars(5);
    setReviewComment('');
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    dismissAllCompletedOrders();
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

  const handleCancelOrder = async (e) => {
    if (e) e.stopPropagation();
    if (!activeOrder) return;
    try {
      await cancelOrder(activeOrder.id);
      setCompletedOrder(null);
    } catch (err) {
      console.error('Cancel order error:', err);
    }
  };

  const handleReviewSubmit = async () => {
    if (!targetSession) return;
    const veh = vehicles.find(v => v.id === targetSession?.vehicle_id) || vehicles[0];
    try {
      await addReview({
        order_id: targetSession?.id,
        truck_id: targetSession?.assigned_truck_id || null,
        driver_user_id: targetSession?.assigned_driver_id || null,
        rating_stars: reviewStars,
        feedback_tags: 'Rapid DC,Professional Tech,Clean Energy',
        comment: reviewComment || 'Outstanding on-demand EV charging service!',
        author_name: currentUser?.full_name || 'EV Driver',
        vehicle_model: veh ? `${veh.make} ${veh.model}` : 'Electric Vehicle',
      });
      setReviewSubmitted(true);
    } catch (e) {
      console.error('Review submit note:', e);
      setReviewSubmitted(true);
    }
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
        {/* CASE 1: No active order and no completed session -> Show Booking Form */}
        {!activeOrder && !completedOrder ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="status-dot emerald pulse" />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--emerald-dark)' }}>PINNED DISPATCH TARGET</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800 }}>{targetAddress}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleUseLiveLocation}
                  disabled={isLocating}
                  className="btn-outline"
                  style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}
                  title="Detect current device GPS location"
                >
                  <Navigation size={12} className={isLocating ? 'spin' : ''} /> {isLocating ? 'Locating...' : 'Use My GPS'}
                </button>
                <span className="brand-pill">
                  <Zap size={12} /> Est. ETA: 8-12 min
                </span>
              </div>
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
        ) : activeOrder ? (
          /* CASE 2: Ongoing Active Order */
          <div>
            {/* Active Dispatch Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)', fontWeight: 800 }}>
                  ● {activeOrder.status === 'WAITING_APPROVAL' ? 'Pairing Mobile Titan...' : activeOrder.status === 'EN_ROUTE' ? 'Technician En Route' : activeOrder.status === 'ARRIVED' ? 'Mobile Unit Arrived Outside' : '⚡ Charging Active'}
                </span>
                <div style={{ fontWeight: 900, fontSize: '17px', marginTop: '4px' }}>{activeOrder.target_address}</div>
              </div>
              <span className="brand-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                {activeOrder.order_reference || activeOrder.id?.slice(0, 8)}
              </span>
            </div>

            {/* WAITING_APPROVAL Radar HUD */}
            {activeOrder.status === 'WAITING_APPROVAL' && (
              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.08))', border: '1px solid rgba(16,185,129,0.2)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '10px' }}>
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

            {/* Charging In Progress Card: Ultra-Simple Reassurance */}
            {activeOrder.status === 'CHARGING' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '24px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', margin: '10px 0' }}>
                <div style={{ width: '52px', height: '52px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#15803d' }}>
                  <Zap size={28} className="pulse" />
                </div>
                <div style={{ fontWeight: 900, fontSize: '18px', color: '#14532d' }}>Your Vehicle is Being Charged</div>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '6px' }}>
                  Mobile Unit is actively dispensing energy to your vehicle.
                </div>
              </div>
            )}

            {/* SINGLE, CLEAR Cancel Dispatch Request Button (Only when not actively charging) */}
            {activeOrder.status !== 'CHARGING' && (
              <button
                type="button"
                className="btn-outline"
                style={{ width: '100%', padding: '10px 0', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5', background: '#fff', fontWeight: 800, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={handleCancelOrder}
              >
                <X size={15} /> Cancel Dispatch Request
              </button>
            )}
          </div>
        ) : (
          /* CASE 3: Completed Session -> Permanent Invoice Breakdown & Driver Rating */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-darker)' }}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)', fontWeight: 800 }}>
                    ● Charging Session Completed
                  </span>
                  <div style={{ fontWeight: 900, fontSize: '16px', marginTop: '2px' }}>
                    {completedOrder?.target_address || 'London Central'}
                  </div>
                </div>
              </div>
              <span className="brand-pill" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 900 }}>
                ● PAID
              </span>
            </div>

            {/* Official Invoice Card */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-600)' }}>
                  INVOICE: <code style={{ color: 'var(--slate-900)' }}>INV-{(completedOrder?.order_reference || completedOrder?.id)?.slice(0, 8)}</code>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(completedOrder?.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rapid Mobile Callout Fee:</span>
                <span style={{ fontWeight: 700 }}>£{parseFloat(completedOrder?.estimated_callout_fee || 5.00).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Energy Delivered ({completedOrder?.actual_kwh_delivered || completedOrder?.target_kwh || 35.0} kWh @ £0.35/kWh):</span>
                <span style={{ fontWeight: 700 }}>£{parseFloat(completedOrder?.estimated_kwh_cost || 12.25).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', color: 'var(--emerald-darker)' }}>
                <span>Total Amount Paid:</span>
                <span>£{parseFloat(completedOrder?.estimated_total_amount || 17.25).toFixed(2)}</span>
              </div>
            </div>

            {/* Driver Rating & Review Section */}
            {!reviewSubmitted ? (
              <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Rate Technician {assignedDriver?.full_name || 'Marcus Webb'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    How was your mobile rapid charging experience?
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <StarRating value={reviewStars} onChange={setReviewStars} size={26} />
                  </div>
                </div>

                <textarea
                  className="metric-card"
                  style={{ width: '100%', minHeight: '60px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '12px', marginBottom: '10px' }}
                  placeholder="Technician arrived on time, super fast 150kW boost..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />

                <button className="btn-emerald" style={{ fontSize: '13px', padding: '8px 0' }} onClick={handleReviewSubmit}>
                  ⭐ Submit Verified Review
                </button>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '16px', color: '#15803d' }}>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>✅ Thank You! Verified Review Submitted</div>
              </div>
            )}

            {/* Book Another Charge Button */}
            <button
              type="button"
              className="btn-outline"
              style={{ width: '100%', padding: '12px 0', fontSize: '14px', fontWeight: 800, borderColor: 'var(--emerald-primary)', color: 'var(--emerald-darker)', cursor: 'pointer' }}
              onClick={handleRequestAnotherCharge}
            >
              ⚡ Request Another Rapid DC Charge
            </button>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}
