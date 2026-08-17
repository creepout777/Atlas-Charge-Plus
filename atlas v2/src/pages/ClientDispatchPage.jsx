import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Zap, Navigation, Clock, ShieldCheck, CheckCircle2, Star, Sparkles, MapPin, Gauge, Cpu } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { useData } from '../context/DataContext';
import MobileSheet from '../components/layout/MobileSheet';
import Modal from '../components/layout/Modal';
import SpeedometerGauge from '../components/telemetry/SpeedometerGauge';
import StarRating from '../components/shared/StarRating';

export default function ClientDispatchPage() {
  const { activeOrder, createOrder, updateStatus } = useOrder();
  const { vehicles, packages, connectors, addReview } = useData();

  const activePackages = packages.filter(p => p.is_active !== false);
  const activeConnectors = connectors.filter(c => c.is_active !== false);

  const [selectedPkg, setSelectedPkg] = useState(activePackages[1] || activePackages[0] || packages[0]);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [selectedConnector, setSelectedConnector] = useState(activeConnectors[0] || connectors[0]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clientMarkerRef = useRef(null);
  const truckMarkerRef = useRef(null);

  useEffect(() => {
    if (activePackages.length > 0 && !selectedPkg) setSelectedPkg(activePackages[1] || activePackages[0]);
    if (vehicles.length > 0 && !selectedVehicle) setSelectedVehicle(vehicles[0]);
    if (activeConnectors.length > 0 && !selectedConnector) setSelectedConnector(activeConnectors[0]);
  }, [packages, vehicles, connectors]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [51.5014, -0.1918], // Kensington, London
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
      html: '<div class="client-pulse-marker"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    clientMarkerRef.current = L.marker([51.5014, -0.1918], { icon: clientIcon }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Truck Marker during Active Order
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (activeOrder && activeOrder.status !== 'WAITING_APPROVAL' && activeOrder.status !== 'COMPLETED') {
      if (!truckMarkerRef.current) {
        const truckIcon = L.divIcon({
          className: 'custom-truck-icon',
          html: `
            <div class="truck-heading-marker">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        truckMarkerRef.current = L.marker([51.4652, -0.1195], { icon: truckIcon }).addTo(mapInstanceRef.current);
      }
    }
  }, [activeOrder]);

  const handleDispatch = async () => {
    const pkg = selectedPkg || packages[0];
    const veh = selectedVehicle || vehicles[0];
    const conn = selectedConnector || connectors[0];

    await createOrder({
      charge_package_id: pkg.id,
      connector_type_id: conn.id,
      vehicle_id: veh.id,
      target_address: '45 Kensington High St, London W8 5ED',
      target_lat: 51.5014,
      target_lng: -0.1918,
      estimated_kwh_cost: (pkg.target_kwh || 35) * 0.35,
      estimated_total_amount: 5.00 + ((pkg.target_kwh || 35) * 0.35),
    });
  };

  const handleReviewSubmit = async () => {
    await addReview({
      order_id: activeOrder ? activeOrder.id : 'ORD-982110',
      rating_stars: reviewStars,
      feedback_tags: 'Fast,Professional,Clean',
      comment: reviewComment || 'Great rapid charging experience!',
    });
    setReviewSubmitted(true);
    setTimeout(() => {
      setShowReviewModal(false);
      setReviewSubmitted(false);
    }, 1500);
  };

  return (
    <div className="map-layout">
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800 }}>45 Kensington High St, London W8</div>
                </div>
              </div>
              <span className="brand-pill">
                <Zap size={12} /> Fast ETA: 12 min
              </span>
            </div>

            {/* EV Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', display: 'block', marginBottom: '6px' }}>SELECT VEHICLE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {vehicles.map((veh) => (
                  <div
                    key={veh.id || veh.license_plate}
                    onClick={() => setSelectedVehicle(veh)}
                    style={{
                      border: `2px solid ${selectedVehicle?.id === veh.id ? 'var(--emerald-primary)' : 'var(--border-subtle)'}`,
                      background: selectedVehicle?.id === veh.id ? 'var(--emerald-light)' : 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '13px' }}>{veh.make} {veh.model}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{veh.license_plate} · {veh.battery_capacity_kwh}kWh</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Package Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', display: 'block', marginBottom: '6px' }}>CHARGE PACKAGE</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: `2px solid ${selectedPkg?.id === pkg.id ? 'var(--emerald-primary)' : 'var(--border-subtle)'}`,
                      background: selectedPkg?.id === pkg.id ? 'var(--emerald-light)' : 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{pkg.display_name} ({pkg.target_kwh} kWh)</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{pkg.description} · {pkg.display_estimate_label}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 900, color: 'var(--emerald-darker)', fontSize: '15px' }}>
                      £{(5.00 + (pkg.target_kwh * 0.35)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-emerald" onClick={handleDispatch}>
              <Zap size={18} />
              Authorize & Dispatch Mobile Unit (£{(5.00 + ((selectedPkg?.target_kwh || 35) * 0.35)).toFixed(2)})
            </button>
          </div>
        ) : activeOrder.status === 'WAITING_APPROVAL' ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--amber-light)', border: '2px solid var(--amber-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--amber-primary)' }}>
              <Clock size={24} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>Dispatch Broadcast Active</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 16px' }}>Order #{activeOrder.order_reference} broadcasted to mobile technicians in Supabase...</div>
            <button className="btn-outline" style={{ width: '100%' }} onClick={() => updateStatus(activeOrder.id, { status: 'CANCELED' })}>
              Cancel Request
            </button>
          </div>
        ) : activeOrder.status === 'EN_ROUTE' ? (
          <div>
            <div style={{ background: 'var(--emerald-light)', border: '1px solid var(--emerald-border)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--emerald-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="status-dot emerald pulse" /> DRIVER EN ROUTE
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>Atlas Titan #01 is Navigating to You</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Technician <b>Marcus Webb</b> is 8 mins away.</div>
            </div>
            <div className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLATE</div>
                <div style={{ fontWeight: 800 }}>EK72 ZAP</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CONNECTOR</div>
                <div style={{ fontWeight: 800 }}>CCS Rapid 150kW</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESTIMATED TOTAL</div>
                <div style={{ fontWeight: 800, color: 'var(--emerald-dark)' }}>£17.25</div>
              </div>
            </div>
          </div>
        ) : activeOrder.status === 'CHARGING' ? (
          <div>
            <div style={{ background: 'var(--cyan-light)', border: '1px solid var(--cyan-primary)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span className="status-dot emerald pulse" /> HIGH-POWER RAPID CHARGING ACTIVE
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>Vehicle Receiving High-Voltage DC</div>
            </div>
            <SpeedometerGauge currentKw={145.5} maxKw={150} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div className="metric-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ENERGY DELIVERED</div>
                <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>18.5 kWh</div>
              </div>
              <div className="metric-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT BATTERY</div>
                <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>58%</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--emerald-primary)' }}>
              <CheckCircle2 size={26} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>Charging Complete!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 16px' }}>35.0 kWh delivered. Billed £17.25 to Visa card.</div>
            <button className="btn-emerald" onClick={() => setShowReviewModal(true)}>
              <Star size={16} /> Rate Technician & Experience
            </button>
          </div>
        )}
      </MobileSheet>

      {/* Review Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Rate Your Charging Experience">
        {reviewSubmitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={40} color="var(--emerald-primary)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 800, fontSize: '16px' }}>Thank You for Your Feedback!</div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>How was Technician Marcus Webb?</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <StarRating rating={reviewStars} onRate={setReviewStars} editable />
              </div>
            </div>
            <textarea
              className="metric-card"
              rows={3}
              placeholder="Leave an optional comment..."
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              style={{ width: '100%', marginBottom: '14px', outline: 'none' }}
            />
            <button className="btn-emerald" onClick={handleReviewSubmit}>
              Submit Verified Review
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
