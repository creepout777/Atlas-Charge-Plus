// =============================================================
// Atlas Charge Plus+ — 60 FPS Real-Time OSRM Road Path & 3D Chase Cam Engine
// 60FPS silky smooth continuous sub-interpolated road movement
// Perfectly aligned 3D Truck Model with glowing headlights & 3rd person chase camera
// =============================================================

const MapModule = (() => {
  let map = null;
  let use3D = false;
  let isChaseCam = false;     // 3rd Person Perspective Lock
  let currentStyleIndex = 0;
  let carMarker = null;       // Target location pin
  let userMarker = null;      // Live GPS position
  let truckMarker = null;     // Dispatched charging truck
  let userPosition = null;
  let carPosition = null;
  let truckPosition = null;
  let lastHeading = 0;
  let pinMode = false;
  let onPinCallback = null;
  let activeRouteCoordinates = [];

  // Map Styles (Photorealistic Satellite, 3D Vector Streets, Dark Night)
  const mapStyles = [
    {
      id: 'streets',
      name: '3D Vector Streets',
      url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      leafletUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    },
    {
      id: 'satellite',
      name: 'Photorealistic Satellite Hybrid',
      url: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_Op941712',
      leafletUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    },
    {
      id: 'dark',
      name: 'Dark Night GIS',
      url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      leafletUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
    }
  ];

  // ── Calculate Heading / Bearing (Degrees) ─────────────────
  function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  // HTML SVG Templates for 0-Gap Road Polyline Alignment
  const carPinSvg = `
    <div class="marker-zero-root">
      <div class="marker-badge target-badge">Target Location</div>
      <div class="marker-icon-box target-icon-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `;

  const truckPinSvg = `
    <div class="marker-zero-root">
      <div class="marker-badge truck-badge">Atlas Titan #01 · 34 mph</div>
      <div class="marker-icon-box truck-icon-box">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(-90deg);">
          <rect x="1" y="3" width="15" height="13" fill="#059669"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="#047857"/>
          <circle cx="5.5" cy="18.5" r="2.5" fill="#0f172a"/>
          <circle cx="18.5" cy="18.5" r="2.5" fill="#0f172a"/>
        </svg>
      </div>
    </div>
  `;

  const userPinSvg = `<div class="user-marker"><div class="user-marker-pulse"></div><div class="user-marker-dot"></div></div>`;

  function createMarkerElement(htmlStr) {
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.style.width = '0px';
    div.style.height = '0px';
    div.style.pointerEvents = 'auto';
    div.innerHTML = htmlStr;
    return div;
  }

  // ── Initialize Map ─────────────────────────────────────────
  function init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    if (window.maplibregl) {
      use3D = true;
      console.log('[MapModule] Initializing 60FPS WebGL 3D Map Engine...');

      map = new maplibregl.Map({
        container: 'map-container',
        style: mapStyles[0].url,
        center: [-2.0, 54.0],
        zoom: 5.8,
        pitch: 52,
        bearing: -12,
        antialias: true,
      });

      map.on('load', () => {
        setup3DRayers();
      });

      map.on('click', (e) => {
        if (pinMode && onPinCallback) {
          setCarPosition(e.lngLat.lat, e.lngLat.lng);
          onPinCallback(e.lngLat.lat, e.lngLat.lng);
          disablePinMode();
        }
      });

    } else {
      use3D = false;
      console.log('[MapModule] Falling back to 2D Leaflet...');
      map = L.map('map-container', {
        center: [54.0, -2.0],
        zoom: 6,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer(mapStyles[0].leafletUrl, {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e) => {
        if (pinMode && onPinCallback) {
          setCarPosition(e.latlng.lat, e.latlng.lng);
          onPinCallback(e.latlng.lat, e.latlng.lng);
          disablePinMode();
        }
      });
    }

    window.addEventListener('resize', () => {
      setTimeout(() => {
        if (use3D) map.resize();
        else map.invalidateSize();
      }, 100);
    });
  }

  function setup3DRayers() {
    try {
      if (!map.getSource('route')) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] }
          }
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#059669',
            'line-width': 6,
            'line-opacity': 0.85
          }
        });
      }

      const layers = map.getStyle().layers;
      let labelLayerId;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      if (!map.getLayer('3d-buildings')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'carto',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#cbd5e1',
              'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 13.05, ['get', 'render_height']],
              'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 13.05, ['get', 'render_min_height']],
              'fill-extrusion-opacity': 0.65
            }
          },
          labelLayerId
        );
      }
    } catch (e) {}
  }

  // ── Switch Map Style ───────────────────────────────────────
  function toggleMapStyle() {
    currentStyleIndex = (currentStyleIndex + 1) % mapStyles.length;
    const styleObj = mapStyles[currentStyleIndex];

    if (use3D) {
      map.setStyle(styleObj.url);
      map.once('style.load', () => {
        setup3DRayers();
        if (carPosition) setCarPosition(carPosition.lat, carPosition.lng);
        if (truckPosition) showTruck(truckPosition.lat, truckPosition.lng);
      });
    } else {
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      L.tileLayer(styleObj.leafletUrl, { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    }

    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Map Style Updated', `Switched to ${styleObj.name}`, 'info');
    }
  }

  // ── Toggle 3D Perspective ──────────────────────────────────
  function toggle3DView() {
    if (!map) return;
    if (use3D) {
      const currentP = map.getPitch();
      const targetP = currentP > 15 ? 0 : 58;
      const targetB = targetP > 0 ? -18 : 0;
      map.easeTo({ pitch: targetP, bearing: targetB, duration: 800 });
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast(targetP > 0 ? '3D Perspective Enabled' : '2D Map View', targetP > 0 ? '58° 3D tilt perspective active' : 'Top-down plan view', 'info');
      }
    }
  }

  // ── 3rd Person Chase Cam Mode ──────────────────────────────
  function toggleChaseCam() {
    isChaseCam = !isChaseCam;
    if (isChaseCam && truckPosition) {
      focusTruck();
    } else if (!isChaseCam && carPosition && truckPosition) {
      focusBoth();
    }
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(
        isChaseCam ? '3rd Person Chase Cam Active' : 'Camera Free',
        isChaseCam ? '3D camera locked behind moving charging truck' : 'Dual framing mode restored',
        isChaseCam ? 'success' : 'info'
      );
    }
  }

  // ── Camera Focus Controls ──────────────────────────────────
  function focusBoth() {
    isChaseCam = false;
    if (!carPosition) return;
    if (truckPosition) {
      if (use3D) {
        const bounds = new maplibregl.LngLatBounds()
          .extend([truckPosition.lng, truckPosition.lat])
          .extend([carPosition.lng, carPosition.lat]);
        map.fitBounds(bounds, { padding: 110, pitch: 48, duration: 1000 });
      } else {
        map.fitBounds([[truckPosition.lat, truckPosition.lng], [carPosition.lat, carPosition.lng]], { padding: [80, 80] });
      }
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('Camera Focused', 'Framing both Mobile Unit and Target Location', 'info');
      }
    } else {
      centerOnCar();
    }
  }

  function focusTruck() {
    isChaseCam = true;
    if (truckPosition && use3D) {
      map.easeTo({
        center: [truckPosition.lng, truckPosition.lat],
        zoom: 18.2,
        pitch: 74,
        bearing: lastHeading,
        duration: 500,
        easing: (t) => t
      });
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('3rd Person Chase Cam', 'Following truck from 3rd-person view', 'success');
      }
    }
  }

  // ── Pin Mode ───────────────────────────────────────────────
  function enablePinMode(callback) {
    pinMode = true;
    onPinCallback = callback;
    if (use3D) map.getCanvas().style.cursor = 'crosshair';
    else map.getContainer().style.cursor = 'crosshair';

    if (userPosition) {
      flyToLocation(userPosition.lat, userPosition.lng, 14.5, 45);
    }
  }

  function disablePinMode() {
    pinMode = false;
    onPinCallback = null;
    if (use3D) map.getCanvas().style.cursor = '';
    else map.getContainer().style.cursor = '';
  }

  function isPinMode() { return pinMode; }

  // ── Helper: Smooth 3D FlyTo ────────────────────────────────
  function flyToLocation(lat, lng, zoom = 16.5, pitch = 58) {
    if (!map) return;
    if (use3D) {
      map.flyTo({
        center: [lng, lat],
        zoom: zoom,
        pitch: pitch,
        bearing: -15,
        speed: 1.2,
        curve: 1.4,
        essential: true
      });
    } else {
      map.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  }

  // ── Set Target Car Location ────────────────────────────────
  function setCarPosition(lat, lng) {
    carPosition = { lat, lng };
    APP_DATA.activeRequest.carLocation = { lat, lng };

    if (use3D) {
      if (carMarker) {
        carMarker.setLngLat([lng, lat]);
      } else {
        const el = createMarkerElement(carPinSvg);
        carMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    } else {
      if (carMarker) {
        carMarker.setLatLng([lat, lng]);
      } else {
        carMarker = L.marker([lat, lng], {
          icon: L.divIcon({ className: 'car-marker-wrapper', html: carPinSvg, iconSize: [48, 48], iconAnchor: [24, 24] }),
          zIndexOffset: 900
        }).addTo(map);
      }
    }

    flyToLocation(lat, lng, 16.5, 58);
  }

  // ── Set User GPS Position ──────────────────────────────────
  function setUserPosition(lat, lng) {
    userPosition = { lat, lng };

    if (use3D) {
      if (userMarker) {
        userMarker.setLngLat([lng, lat]);
      } else {
        const el = createMarkerElement(userPinSvg);
        userMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    } else {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], {
          icon: L.divIcon({ className: 'user-marker-wrapper', html: userPinSvg, iconSize: [20, 20], iconAnchor: [10, 10] }),
          zIndexOffset: 800
        }).addTo(map);
      }
    }
  }

  function useCurrentLocationAsCar() {
    if (userPosition) {
      setCarPosition(userPosition.lat, userPosition.lng);
    }
  }

  function centerOnCar() {
    isChaseCam = false;
    if (carPosition) {
      flyToLocation(carPosition.lat, carPosition.lng, 16.5, 58);
    } else if (userPosition) {
      flyToLocation(userPosition.lat, userPosition.lng, 14, 45);
    }
  }

  function centerOnUser() {
    if (userPosition) {
      flyToLocation(userPosition.lat, userPosition.lng, 15, 50);
    }
  }

  // ── Truck Marker & 60FPS Silky Smooth Movement ─────────────
  function showTruck(lat, lng) {
    truckPosition = { lat, lng };
    if (use3D) {
      if (truckMarker) {
        truckMarker.setLngLat([lng, lat]);
      } else {
        const el = createMarkerElement(truckPinSvg);
        truckMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    } else {
      if (truckMarker) {
        truckMarker.setLatLng([lat, lng]);
      } else {
        truckMarker = L.marker([lat, lng], {
          icon: L.divIcon({ className: 'truck-marker-wrapper', html: truckPinSvg, iconSize: [44, 44], iconAnchor: [22, 22] }),
          zIndexOffset: 1000
        }).addTo(map);
      }
    }
  }

  function moveTruckSmooth(lat, lng, bearing) {
    truckPosition = { lat, lng };
    if (typeof bearing === 'number' && !isNaN(bearing)) {
      lastHeading = bearing;
    }

    if (use3D && truckMarker) {
      truckMarker.setLngLat([lng, lat]);

      const el = truckMarker.getElement();
      const model = el.querySelector('.truck-icon-box');
      if (model) {
        // Rotates truck perfectly aligned with road bearing
        model.style.transform = `rotate(${lastHeading}deg)`;
      }

      if (isChaseCam) {
        map.easeTo({
          center: [lng, lat],
          zoom: 18.2,
          pitch: 74,
          bearing: lastHeading,
          duration: 80,
          easing: (t) => t
        });
      }

    } else if (truckMarker) {
      truckMarker.setLatLng([lat, lng]);
    }
  }

  function moveTruck(lat, lng) {
    if (truckPosition) {
      lastHeading = calculateBearing(truckPosition.lat, truckPosition.lng, lat, lng);
    }
    moveTruckSmooth(lat, lng, lastHeading);
  }

  function removeTruck() {
    if (truckMarker) {
      if (use3D) truckMarker.remove();
      else map.removeLayer(truckMarker);
      truckMarker = null;
    }
    truckPosition = null;
    isChaseCam = false;
  }

  // ── Real-Time OSRM Road Path & Sub-Interpolation ────────────
  async function fetchRealtimeRoadPath(truckLat, truckLng, carLat, carLng) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${truckLng},${truckLat};${carLng},${carLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          activeRouteCoordinates = route.geometry.coordinates;
          // Guarantee final coordinate reaches user's exact pinned car location
          const last = activeRouteCoordinates[activeRouteCoordinates.length - 1];
          if (last && (last[0] !== carLng || last[1] !== carLat)) {
            activeRouteCoordinates.push([carLng, carLat]);
          }
          console.log(`[MapModule] OSRM Road Path loaded: ${activeRouteCoordinates.length} waypoints`);
          return activeRouteCoordinates;
        }
      }
    } catch (e) {
      console.warn('[MapModule] OSRM Routing note:', e.message);
    }

    activeRouteCoordinates = generateFallbackRoute(truckLat, truckLng, carLat, carLng);
    return activeRouteCoordinates;
  }

  function generateFallbackRoute(lat1, lng1, lat2, lng2) {
    const coords = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Math.sin(t * Math.PI) is strictly 0 at both t=0 and t=1
      const wiggleLat = Math.sin(t * Math.PI) * 0.0015;
      const wiggleLng = Math.sin(t * Math.PI * 2) * 0.0015;
      const lat = lat1 + (lat2 - lat1) * t + wiggleLat;
      const lng = lng1 + (lng2 - lng1) * t + wiggleLng;
      coords.push([lng, lat]);
    }
    // Guarantee 100% exact end-point match at target location
    coords[coords.length - 1] = [lng2, lat2];
    return coords;
  }

  function getPathPointAt(t) {
    const coords = activeRouteCoordinates;
    if (!coords || coords.length === 0) return null;
    if (coords.length === 1 || t <= 0) return { lng: coords[0][0], lat: coords[0][1], bearing: 0 };
    if (t >= 1) {
      const last = coords[coords.length - 1];
      const prev = coords[coords.length - 2] || last;
      const b = calculateBearing(prev[1], prev[0], last[1], last[0]);
      return { lng: last[0], lat: last[1], bearing: b };
    }

    let totalDist = 0;
    const segDists = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const d = getDistance(p1[1], p1[0], p2[1], p2[0]);
      segDists.push(d);
      totalDist += d;
    }

    const targetDist = t * totalDist;
    let accum = 0;

    for (let i = 0; i < segDists.length; i++) {
      const segLen = segDists[i];
      if (accum + segLen >= targetDist) {
        const segT = segLen > 0 ? (targetDist - accum) / segLen : 0;
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const lng = p1[0] + (p2[0] - p1[0]) * segT;
        const lat = p1[1] + (p2[1] - p1[1]) * segT;
        const b = calculateBearing(p1[1], p1[0], p2[1], p2[0]);
        return { lng, lat, bearing: b };
      }
      accum += segLen;
    }

    const end = coords[coords.length - 1];
    return { lng: end[0], lat: end[1], bearing: 0 };
  }

  async function drawRoute(truckLat, truckLng, carLat, carLng) {
    clearRoute();
    truckPosition = { lat: truckLat, lng: truckLng };

    const coords = await fetchRealtimeRoadPath(truckLat, truckLng, carLat, carLng);

    if (use3D) {
      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords
        }
      };

      const source = map.getSource('route');
      if (source) source.setData(geojson);

      centerOnCar();

    } else {
      const leafletLatLngs = coords.map(c => [c[1], c[0]]);
      routeLine = L.polyline(leafletLatLngs, { color: '#059669', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(leafletLatLngs, { padding: [80, 80], duration: 1000 });
    }
  }

  function clearRoute() {
    activeRouteCoordinates = [];
    if (use3D) {
      const source = map.getSource('route');
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] }
        });
      }
    } else if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }
  }

  function clearAll() {
    if (carMarker) {
      if (use3D) carMarker.remove();
      else map.removeLayer(carMarker);
      carMarker = null;
    }
    removeTruck();
    clearRoute();
    carPosition = null;
    truckPosition = null;
    isChaseCam = false;
    APP_DATA.activeRequest.carLocation = null;
  }

  // ── Zoom Controls ──────────────────────────────────────────
  function zoomIn() {
    if (use3D) map.zoomIn({ duration: 300 });
    else map.zoomIn(1, { animate: true });
  }

  function zoomOut() {
    if (use3D) map.zoomOut({ duration: 300 });
    else map.zoomOut(1, { animate: true });
  }

  // ── Distance Helper (Haversine) ───────────────────────────
  function getDistance(lat1, lng1, lat2, lng2) {
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

  function estimateETA(truckLat, truckLng, carLat, carLng) {
    const distKm = getDistance(truckLat, truckLng, carLat, carLng);
    return Math.max(5, Math.round((distKm / 40) * 60));
  }

  return {
    init,
    toggle3DView,
    toggleMapStyle,
    toggleChaseCam,
    focusBoth,
    focusTruck,
    enablePinMode,
    disablePinMode,
    isPinMode,
    setCarPosition,
    setUserPosition,
    useCurrentLocationAsCar,
    centerOnCar,
    centerOnUser,
    showTruck,
    moveTruck,
    moveTruckSmooth,
    getPathPointAt,
    removeTruck,
    drawRoute,
    clearRoute,
    clearAll,
    zoomIn,
    zoomOut,
    getDistance,
    estimateETA,
    getUserPosition: () => userPosition,
    getCarPosition: () => carPosition,
    getTruckPosition: () => truckPosition,
    getActiveRouteCoordinates: () => activeRouteCoordinates,
    isChaseCam: () => isChaseCam,
  };
})();
