/**
 * GpsBreadcrumbMap — Interactive Leaflet fleet trail visualiser
 * Renders per-truck colour-coded polyline trails, animated live-head markers,
 * waypoint tooltips, stats bar, truck legend and scrollable data table.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Truck, Gauge, Route, Filter, RefreshCw, Radio, Clock } from 'lucide-react';

const TRAIL_COLOURS = [
  '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#64748b', '#a855f7',
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeStats(points) {
  if (!points.length) return { totalKm: '0.00', avgSpeed: '0.0', maxSpeed: '0.0' };
  let totalKm = 0;
  let speedSum = 0;
  let maxSpeed = 0;
  const sorted = [...points].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  for (let i = 1; i < sorted.length; i++) {
    totalKm += haversineKm(
      parseFloat(sorted[i - 1].lat), parseFloat(sorted[i - 1].lng),
      parseFloat(sorted[i].lat), parseFloat(sorted[i].lng)
    );
  }
  for (const p of points) {
    const s = parseFloat(p.speed_kmh) || 0;
    speedSum += s;
    if (s > maxSpeed) maxSpeed = s;
  }
  return {
    totalKm: totalKm.toFixed(2),
    avgSpeed: (speedSum / points.length).toFixed(1),
    maxSpeed: maxSpeed.toFixed(1),
  };
}

export default function GpsBreadcrumbMap({ breadcrumbs = [], trucks = [] }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const layersRef       = useRef({});
  const [filterTruck, setFilterTruck] = useState('all');
  const [liveCount, setLiveCount]     = useState(0);
  const prevLenRef = useRef(breadcrumbs.length);

  // Unique trucks present in breadcrumb data
  const truckOptions = useMemo(() => {
    const ids = [...new Set(breadcrumbs.map(b => b.truck_id))];
    return ids.map(id => {
      const bc = breadcrumbs.find(x => x.truck_id === id);
      const t  = trucks.find(t => t.id === id);
      return {
        id,
        label: t?.truck_code  || bc?.fleet_trucks?.truck_code  || id.slice(0, 8),
        name:  t?.display_name || bc?.fleet_trucks?.display_name || 'Mobile Unit',
      };
    });
  }, [breadcrumbs, trucks]);

  // Filter + group by truck, sorted oldest→newest per truck
  const grouped = useMemo(() => {
    const pts = filterTruck === 'all'
      ? breadcrumbs
      : breadcrumbs.filter(b => b.truck_id === filterTruck);
    const map = {};
    for (const pt of pts) {
      if (!map[pt.truck_id]) map[pt.truck_id] = [];
      map[pt.truck_id].push(pt);
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    }
    return map;
  }, [breadcrumbs, filterTruck]);

  const allFiltered = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const stats = useMemo(() => computeStats(allFiltered), [allFiltered]);

  // Count live arrivals
  useEffect(() => {
    if (breadcrumbs.length > prevLenRef.current) {
      setLiveCount(c => c + (breadcrumbs.length - prevLenRef.current));
    }
    prevLenRef.current = breadcrumbs.length;
  }, [breadcrumbs.length]);

  // Init Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current, { center: [51.5074, -0.1278], zoom: 12 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Redraw trails when data or filter changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove layers for trucks no longer in grouped
    for (const id of Object.keys(layersRef.current)) {
      if (!grouped[id]) {
        const { polyline, markers, head } = layersRef.current[id];
        polyline?.remove(); markers?.forEach(m => m.remove()); head?.remove();
        delete layersRef.current[id];
      }
    }

    const allLatLngs = [];

    Object.keys(grouped).forEach((truckId, ci) => {
      const points  = grouped[truckId];
      const colour  = TRAIL_COLOURS[ci % TRAIL_COLOURS.length];
      const latLngs = points.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
      allLatLngs.push(...latLngs);

      // Remove old layers for this truck
      if (layersRef.current[truckId]) {
        layersRef.current[truckId].polyline?.remove();
        layersRef.current[truckId].markers?.forEach(m => m.remove());
        layersRef.current[truckId].head?.remove();
      }

      // Trail polyline
      const polyline = L.polyline(latLngs, { color: colour, weight: 3, opacity: 0.8 })
        .addTo(mapRef.current);

      // Waypoint circle markers
      const markers = points.map(pt => {
        const ts  = new Date(pt.recorded_at).toLocaleTimeString();
        const spd = parseFloat(pt.speed_kmh || 0).toFixed(1);
        const brg = parseFloat(pt.bearing   || 0).toFixed(0);
        return L.circleMarker([parseFloat(pt.lat), parseFloat(pt.lng)], {
          radius: 4, fillColor: colour, color: '#0f172a', weight: 1, fillOpacity: 0.9,
        })
          .bindTooltip(
            `<div style="font-family:monospace;font-size:12px;line-height:1.6">
              <b>${pt.fleet_trucks?.truck_code || truckId.slice(0, 8)}</b><br>
              🕐 ${ts}<br>⚡ ${spd} km/h · ${brg}°<br>
              📍 ${parseFloat(pt.lat).toFixed(5)}, ${parseFloat(pt.lng).toFixed(5)}
            </div>`,
            { sticky: true, opacity: 0.95 }
          )
          .addTo(mapRef.current);
      });

      // Animated pulsing live-head marker
      const last = points[points.length - 1];
      const head = L.marker([parseFloat(last.lat), parseFloat(last.lng)], {
        icon: L.divIcon({
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: `<div style="width:20px;height:20px;border-radius:50%;background:${colour};border:3px solid #fff;animation:gps-pulse 1.6s infinite"></div>`,
        }),
      })
        .bindPopup(
          `<b>${last.fleet_trucks?.display_name || 'Mobile Unit'}</b><br>
           Last seen: ${new Date(last.recorded_at).toLocaleTimeString()}<br>
           Speed: ${parseFloat(last.speed_kmh || 0).toFixed(1)} km/h`
        )
        .addTo(mapRef.current);

      layersRef.current[truckId] = { polyline, markers, head };
    });

    if (allLatLngs.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(allLatLngs).pad(0.12));
    }
  }, [grouped]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pulse keyframe */}
      <style>{`
        @keyframes gps-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,.6); }
          70%  { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="brand-pill" style={{ background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)' }}>
          <Radio size={11} />
          {breadcrumbs.length === 0 ? 'Awaiting Driver Data' : `${breadcrumbs.length} Waypoints`}
          {liveCount > 0 && (
            <span style={{ marginLeft: 5, background: '#10b981', color: '#fff', borderRadius: 8, padding: '0 6px', fontSize: 10 }}>
              +{liveCount} live
            </span>
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} color="var(--text-muted)" />
          <select
            value={filterTruck}
            onChange={e => setFilterTruck(e.target.value)}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <option value="all">All Trucks ({truckOptions.length})</option>
            {truckOptions.map(t => (
              <option key={t.id} value={t.id}>{t.label} — {t.name}</option>
            ))}
          </select>
        </div>

        {liveCount > 0 && (
          <button className="btn-outline" style={{ width: 'auto', padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setLiveCount(0)}>
            <RefreshCw size={12} /> Clear counter
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { icon: <Truck size={14} color="var(--emerald-primary)" />, label: 'Active Trucks',   value: Object.keys(grouped).length },
          { icon: <MapPin size={14} color="var(--cyan-primary)" />,   label: 'Waypoints',       value: allFiltered.length },
          { icon: <Route size={14} color="var(--amber-primary)" />,   label: 'Total Distance',  value: `${stats.totalKm} km` },
          { icon: <Gauge size={14} color="var(--emerald-primary)" />, label: 'Avg Speed',       value: `${stats.avgSpeed} km/h` },
          { icon: <Clock size={14} color="var(--cyan-primary)" />,    label: 'Max Speed',       value: `${stats.maxSpeed} km/h` },
        ].map((s, i) => (
          <div key={i} className="card-glass" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              {s.icon}
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '.05em' }}>{s.label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Truck colour legend ── */}
      {truckOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {truckOptions.map((t, i) => (
            <div
              key={t.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', opacity: filterTruck !== 'all' && filterTruck !== t.id ? 0.35 : 1, transition: 'opacity .2s' }}
              onClick={() => setFilterTruck(prev => prev === t.id ? 'all' : t.id)}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: TRAIL_COLOURS[i % TRAIL_COLOURS.length], flexShrink: 0 }} />
              <span style={{ fontWeight: 700 }}>{t.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{t.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Leaflet Map ── */}
      <div
        ref={mapContainerRef}
        style={{ height: 480, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#0f172a' }}
      />

      {/* ── Empty state ── */}
      {breadcrumbs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <MapPin size={30} color="var(--slate-400)" />
          <div style={{ fontWeight: 800, fontSize: 15 }}>No GPS Waypoints Yet</div>
          <div>Breadcrumbs stream in as soon as a driver goes on duty and starts moving.</div>
        </div>
      )}

      {/* ── Scrollable waypoint table ── */}
      {allFiltered.length > 0 && (
        <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2 }}>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                {['TIMESTAMP', 'TRUCK', 'COORDINATES', 'BEARING', 'SPEED'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 10, letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...allFiltered].reverse().map((b, i) => {
                const idx    = truckOptions.findIndex(t => t.id === b.truck_id);
                const colour = TRAIL_COLOURS[idx % TRAIL_COLOURS.length] || '#10b981';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(b.recorded_at).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colour, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700 }}>{b.fleet_trucks?.truck_code || b.truck_id?.slice(0, 8)}</span>
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)' }}>
                      {parseFloat(b.lat).toFixed(5)}, {parseFloat(b.lng).toFixed(5)}
                    </td>
                    <td style={{ padding: '7px 10px' }}>{parseFloat(b.bearing || 0).toFixed(0)}°</td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--emerald-dark)' }}>
                      {parseFloat(b.speed_kmh || 0).toFixed(1)} km/h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
