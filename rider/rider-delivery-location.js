(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || window.APRiderDeliveryLocation) return;
  const $ = selector => document.querySelector(selector);
  const h = M.ui.escapeHtml;
  const coordinateValue = value => {
    if (value === null || value === undefined || String(value).trim() === '') return NaN;
    return Number(value);
  };
  const validPoint = point => {
    const lat = coordinateValue(point?.lat), lng = coordinateValue(point?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  };
  const toPoint = point => ({ lat: coordinateValue(point.lat), lng: coordinateValue(point.lng) });
  const distanceMeters = (origin, destination) => {
    if (!validPoint(origin) || !validPoint(destination)) return null;
    const radians = value => Number(value) * Math.PI / 180;
    const latDelta = radians(Number(destination.lat) - Number(origin.lat));
    const lngDelta = radians(Number(destination.lng) - Number(origin.lng));
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) * Math.sin(lngDelta / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  };
  const maps = point => validPoint(point) ? {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(point.lat)},${Number(point.lng)}`)}`,
    osm: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(Number(point.lat))}&mlon=${encodeURIComponent(Number(point.lng))}#map=18/${encodeURIComponent(Number(point.lat))}/${encodeURIComponent(Number(point.lng))}`,
  } : null;
  const route = (origin, destination) => validPoint(origin) && validPoint(destination) ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${Number(origin.lat)},${Number(origin.lng)}`)}&destination=${encodeURIComponent(`${Number(destination.lat)},${Number(destination.lng)}`)}&travelmode=driving` : '';
  const addressMap = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(address || ''))}`;
  const gps = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่งอัตโนมัติ'));
    navigator.geolocation.getCurrentPosition(position => resolve({ lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), heading: Number.isFinite(Number(position.coords.heading)) ? Number(position.coords.heading) : null, captured_at: M.ui.nowIso(), source: 'rider-delivery-geolocation' }), error => reject(new Error(error.code === 1 ? 'คุณยังไม่ได้อนุญาตตำแหน่ง กรุณาเปิดสิทธิ์ในเบราว์เซอร์แล้วลองใหม่' : 'ยังระบุตำแหน่งไม่ได้ กรุณาตรวจสัญญาณและลองใหม่')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
  const directionLabel = modifier => ({ straight: 'ตรงไป', left: 'เลี้ยวซ้าย', right: 'เลี้ยวขวา', slight_left: 'เบี่ยงซ้ายเล็กน้อย', slight_right: 'เบี่ยงขวาเล็กน้อย', sharp_left: 'เลี้ยวซ้ายหักศอก', sharp_right: 'เลี้ยวขวาหักศอก', uturn: 'กลับรถ' }[String(modifier || '').replace(/ /g, '_')] || 'เดินทางตามเส้นทาง');
  const orderStatus = window.APServiceCore?.contracts?.orderStatus || {};
  const pickupStatuses = new Set([orderStatus.STORE_ACCEPTED, orderStatus.PREPARING, orderStatus.RIDER_PICKUP].filter(Boolean));
  const ARRIVAL_RADIUS_METERS = 50;
  const MAX_ARRIVAL_ACCURACY_METERS = 80;
  const setStatus = (message, type = '') => { const target = $('#riderGpsVerifyResult'); if (!target) return; target.textContent = message; target.className = `rider-location-status${type ? ` is-${type}` : ''}`; };
  const setMapStatus = (message, type = '') => { const target = $('#riderMapStatus'); if (!target) return; target.textContent = message; target.className = `rider-map-status${type ? ` is-${type}` : ''}`; };
  const formatDistance = meters => Number.isFinite(Number(meters)) ? Number(meters) >= 1000 ? `${(Number(meters) / 1000).toFixed(1)} กม.` : `${Math.round(Number(meters))} ม.` : 'ยังไม่ทราบระยะทาง';
  const formatDuration = seconds => Number.isFinite(Number(seconds)) ? Number(seconds) >= 3600 ? `${Math.floor(Number(seconds) / 3600)} ชม. ${Math.round((Number(seconds) % 3600) / 60)} นาที` : `${Math.max(1, Math.round(Number(seconds) / 60))} นาที` : 'ยังไม่ทราบเวลา';
  const fetchRoute = async (origin, destination) => {
    if (!validPoint(origin) || !validPoint(destination)) return null;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), 10000);
    try {
      const coordinates = `${Number(origin.lng)},${Number(origin.lat)};${Number(destination.lng)},${Number(destination.lat)}`;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`, { signal: controller?.signal });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.code !== 'Ok' || !result.routes?.[0]) throw new Error('ยังคำนวณเส้นทางไม่ได้');
      return result.routes[0];
    } finally { clearTimeout(timeout); }
  };
  const mount = (job, options = {}) => {
    const host = $('#riderDeliveryLocationHost'); if (!host || host.dataset.mounted) return; host.dataset.mounted = 'true';
    const pickup = validPoint(job?.pickup_location) ? toPoint(job.pickup_location) : null;
    const destination = validPoint(job?.delivery_location) ? toPoint(job.delivery_location) : null;
    const target = pickupStatuses.has(job?.status) ? pickup : destination;
    const targetLabel = pickupStatuses.has(job?.status) ? 'ร้านค้า' : 'ลูกค้า';
    const arrivalEligible = job?.status === orderStatus.RIDER_PICKUP;
    const destinationMaps = maps(target || destination);
    const routeUrl = route(pickup, destination);
    const initialMapMessage = target ? `กำลังเตรียมเส้นทางไป${targetLabel}` : 'งานนี้ยังไม่มีพิกัด ใช้ที่อยู่เป็นข้อมูลสำรอง';
    host.innerHTML = `<section class="rider-location-card" aria-labelledby="riderLocationTitle"><div class="rider-location-heading"><div><p class="rider-eyebrow">แผนที่ในแอป</p><h2 id="riderLocationTitle">เดินทางไป${h(targetLabel)}</h2><p class="mpa-muted">ดูตำแหน่ง จุดหมาย และเส้นทางได้ที่หน้านี้ ไม่ต้องสลับไปแอปอื่น</p></div><span class="rider-map-badge">GPS</span></div><div id="riderInAppMap" class="rider-in-app-map" role="img" aria-label="แผนที่เส้นทาง Rider"></div><p id="riderMapStatus" class="rider-map-status" aria-live="polite">${initialMapMessage}</p>${arrivalEligible && pickup ? `<section id="riderArrivalAssist" class="rider-arrival-assist is-waiting" aria-live="polite"><div class="rider-arrival-assist__copy"><span class="rider-arrival-assist__icon" aria-hidden="true">⌖</span><div><strong id="riderArrivalTitle">รอตรวจว่าคุณถึงร้านแล้ว</strong><small id="riderArrivalDetail">กด “ใช้ตำแหน่งปัจจุบัน” เพื่อเริ่มตรวจจับอัตโนมัติ</small></div></div><button id="riderConfirmArrival" type="button" class="mpa-button" disabled>ยืนยันถึงร้านค้า</button><details class="rider-arrival-fallback"><summary>GPS ใช้ไม่ได้?</summary><div><p>ใช้เมื่อคุณอยู่หน้าร้านแล้วแต่สัญญาณ GPS ไม่พร้อม ระบบจะบันทึกว่าเป็นการยืนยันด้วยตนเอง</p><button id="riderManualArrival" type="button" class="mpa-button mpa-button-secondary">ยืนยันถึงร้านด้วยตนเอง</button></div></details></section>` : ''}<div class="rider-route-summary" id="riderRouteSummary"><div><small>ไปยัง</small><strong>${h(targetLabel)}</strong></div><div><small>ระยะทาง</small><strong data-route-distance>—</strong></div><div><small>เวลาโดยประมาณ</small><strong data-route-duration>—</strong></div></div><div class="rider-location-actions"><button id="riderVerifyGps" type="button" class="mpa-button">ใช้ตำแหน่งปัจจุบัน</button><button id="riderCenterMap" type="button" class="mpa-button mpa-button-secondary">จัดแผนที่ให้เห็นเส้นทาง</button></div><p id="riderGpsVerifyResult" class="rider-location-status" aria-live="polite">${target ? 'กดใช้ตำแหน่งปัจจุบันเพื่อคำนวณเส้นทางจากจุดที่คุณอยู่' : 'ยังไม่มีพิกัดปลายทางสำหรับตรวจสอบ GPS'}</p><details class="rider-map-fallback"><summary>ข้อมูลสำรองและการเปิดแผนที่ภายนอก</summary><div class="rider-map-fallback__body"><p class="mpa-muted">จุดรับ: ${h(job?.pickup_address || 'ยังไม่ระบุ')}<br>จุดส่ง: ${h(job?.delivery_address || 'ยังไม่ระบุ')}</p>${routeUrl ? `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${routeUrl}">เปิดเส้นทางจุดรับ → จุดส่ง</a>` : ''}${destinationMaps ? `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${destinationMaps.google}">เปิดจุดส่งใน Google Maps</a><a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${destinationMaps.osm}">เปิดจุดส่งใน OpenStreetMap</a>` : `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${addressMap(job?.delivery_address)}">ค้นหาที่อยู่ปลายทางในแผนที่</a>`}</div></details><div class="rider-location-manual"><details><summary>กรอกพิกัดอ้างอิงเองกรณีข้อมูลจากงานไม่ครบ</summary><div class="rider-location-manual__body"><div class="mpa-field"><label>Latitude อ้างอิง</label><input id="riderManualLat" inputmode="decimal" placeholder="เช่น 13.756300"></div><div class="mpa-field"><label>Longitude อ้างอิง</label><input id="riderManualLng" inputmode="decimal" placeholder="เช่น 100.501800"></div><button id="riderOpenManualMap" type="button" class="mpa-button mpa-button-secondary">แสดงพิกัดอ้างอิงในแผนที่</button></div></details></div><p class="rider-location-policy">แผนที่ใช้เพื่อช่วยนำทางและไม่เขียนทับพิกัดของลูกค้า การเปลี่ยนสถานะงานยังอยู่ภายใต้กฎ workflow ฝั่ง server</p></section>`;
    const state = { map: null, current: null, routeLayer: null, fallbackLayer: null, markers: [], lastRoute: null, arrivalWatchId: null, arrivalReady: false };
    const setArrivalState = (point, trusted = true) => {
      if (!arrivalEligible || !pickup) return;
      const assist = $('#riderArrivalAssist'), title = $('#riderArrivalTitle'), detail = $('#riderArrivalDetail'), button = $('#riderConfirmArrival');
      if (!assist || !title || !detail || !button) return;
      if (!trusted || !validPoint(point)) { state.arrivalReady = false; assist.className = 'rider-arrival-assist is-waiting'; title.textContent = 'รอตรวจว่าคุณถึงร้านแล้ว'; detail.textContent = 'ต้องใช้ตำแหน่ง GPS จากอุปกรณ์เพื่อช่วยยืนยัน'; button.disabled = true; return; }
      const distance = distanceMeters(point, pickup), accuracy = Number(point.accuracy);
      const accurateEnough = Number.isFinite(accuracy) && accuracy <= MAX_ARRIVAL_ACCURACY_METERS;
      if (distance !== null && distance <= ARRIVAL_RADIUS_METERS && accurateEnough) { state.arrivalReady = true; assist.className = 'rider-arrival-assist is-ready'; title.textContent = 'ตรวจพบว่าคุณถึงใกล้ร้านแล้ว'; detail.textContent = `อยู่ห่างร้านประมาณ ${Math.round(distance)} เมตร · GPS แม่นยำประมาณ ${Math.round(accuracy)} เมตร`; button.disabled = false; return; }
      state.arrivalReady = false; assist.className = 'rider-arrival-assist is-waiting'; title.textContent = distance !== null && distance <= ARRIVAL_RADIUS_METERS ? 'อยู่ใกล้ร้านแล้ว แต่รอ GPS ให้แม่นขึ้น' : 'กำลังตรวจระยะทางถึงร้าน'; detail.textContent = distance === null ? 'ยังคำนวณระยะทางไม่ได้' : `ห่างร้านประมาณ ${Math.round(distance)} เมตร · ต้องเข้าในรัศมี ${ARRIVAL_RADIUS_METERS} เมตร`; button.disabled = true;
    };
    const stopArrivalWatch = () => { if (state.arrivalWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(state.arrivalWatchId); state.arrivalWatchId = null; };
    const startArrivalWatch = () => {
      if (!arrivalEligible || !pickup || !navigator.geolocation || state.arrivalWatchId !== null) return;
      state.arrivalWatchId = navigator.geolocation.watchPosition(position => { state.current = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), heading: Number.isFinite(Number(position.coords.heading)) ? Number(position.coords.heading) : null, captured_at: M.ui.nowIso(), source: 'rider-arrival-watch' }; setArrivalState(state.current); setStatus(`กำลังติดตามตำแหน่ง · ห่างร้านประมาณ ${Math.round(distanceMeters(state.current, pickup) || 0)} เมตร`, 'success'); void renderMap({ refreshRoute: false }); }, error => { setStatus(error.code === 1 ? 'ยังไม่ได้รับสิทธิ์ GPS จึงตรวจการถึงร้านไม่ได้' : 'สัญญาณ GPS ขาดหาย ระบบจะรอตรวจใหม่เมื่อมีสัญญาณ', 'warning'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
    };
    const renderMap = async ({ refreshRoute = true } = {}) => {
      if (!window.L) { setMapStatus('แผนที่ยังโหลดไม่พร้อม กรุณารีเฟรชแล้วลองใหม่', 'warning'); return; }
      const center = state.current || target || pickup || destination;
      if (!center) { setMapStatus('ยังไม่มีพิกัดสำหรับแสดงแผนที่ ใช้ที่อยู่สำรองด้านล่างได้', 'warning'); return; }
      if (!state.map) {
        state.map = window.L.map('riderInAppMap', { zoomControl: false, attributionControl: true });
        window.L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(state.map);
      }
      state.markers.forEach(marker => marker.remove()); state.markers = [];
      state.routeLayer?.remove(); state.fallbackLayer?.remove();
      const points = [];
      const addMarker = (point, label, className) => { if (!validPoint(point)) return; const marker = window.L.circleMarker([point.lat, point.lng], { radius: className === 'rider-map-marker--current' ? 8 : 7, color: className === 'rider-map-marker--current' ? '#ffffff' : '#243fbd', weight: 3, fillColor: className === 'rider-map-marker--current' ? '#ef6c35' : className === 'rider-map-marker--pickup' ? '#243fbd' : '#138a62', fillOpacity: 1, className }); marker.bindTooltip(label, { direction: 'top', offset: [0, -8] }).addTo(state.map); state.markers.push(marker); points.push([point.lat, point.lng]); };
      addMarker(state.current, 'ตำแหน่งของคุณ', 'rider-map-marker--current');
      addMarker(pickup, 'จุดรับสินค้า', 'rider-map-marker--pickup');
      addMarker(destination, 'จุดส่งสินค้า', 'rider-map-marker--dropoff');
      const origin = state.current || (pickupStatuses.has(job?.status) ? pickup : pickup);
      const routeDestination = target || destination;
      let routed = refreshRoute ? null : state.lastRoute;
      if (refreshRoute && validPoint(origin) && validPoint(routeDestination) && (origin.lat !== routeDestination.lat || origin.lng !== routeDestination.lng)) {
        try { routed = await fetchRoute(origin, routeDestination); } catch (_) { routed = null; }
      }
      state.lastRoute = routed;
      if (routed?.geometry?.coordinates?.length) {
        const latLngs = routed.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        state.routeLayer = window.L.polyline(latLngs, { color: '#243fbd', weight: 6, opacity: .88, lineCap: 'round', lineJoin: 'round' }).addTo(state.map);
        $('[data-route-distance]').textContent = formatDistance(routed.distance);
        $('[data-route-duration]').textContent = formatDuration(routed.duration);
        const firstStep = routed.legs?.[0]?.steps?.find(step => step?.maneuver);
        setMapStatus(`${directionLabel(firstStep?.maneuver?.modifier)}${firstStep?.name ? ` เข้าสู่ ${firstStep.name}` : ''} · ไป${targetLabel}`, 'success');
      } else {
        if (validPoint(origin) && validPoint(routeDestination)) state.fallbackLayer = window.L.polyline([[origin.lat, origin.lng], [routeDestination.lat, routeDestination.lng]], { color: '#8c96c9', weight: 4, dashArray: '8 8', opacity: .85 }).addTo(state.map);
        const directDistance = distanceMeters(origin, routeDestination);
        $('[data-route-distance]').textContent = directDistance ? `${formatDistance(directDistance)} (เส้นตรง)` : '—';
        $('[data-route-duration]').textContent = 'รอคำนวณเส้นทาง';
        setMapStatus(validPoint(origin) && validPoint(routeDestination) ? 'แสดงเส้นตรงเป็นข้อมูลสำรอง กำลังรอเส้นทางถนน' : `แสดงจุด${targetLabel}จากพิกัดงาน`, 'warning');
      }
      if (points.length > 1) state.map.fitBounds(points, { padding: [22, 22], maxZoom: 16 }); else state.map.setView([center.lat, center.lng], 15);
      setTimeout(() => state.map?.invalidateSize(), 50);
    };
    void renderMap();
    const verifyButton = $('#riderVerifyGps');
    if (verifyButton) verifyButton.onclick = async () => { const button = verifyButton; button.disabled = true; setStatus('กำลังอ่านตำแหน่งจากอุปกรณ์…'); try { state.current = await gps(); const accuracy = Math.round(state.current.accuracy || 0); setArrivalState(state.current); startArrivalWatch(); setStatus(`พบตำแหน่งของคุณแล้ว · ความแม่นยำประมาณ ${accuracy} เมตร`, 'success'); await renderMap(); } catch (error) { setArrivalState(null, false); setStatus(error.message, 'warning'); setMapStatus('ยังใช้ตำแหน่งปัจจุบันไม่ได้ แผนที่ยังแสดงจุดหมายจากข้อมูล order', 'warning'); M.ui.setNotice(error.message, 'error'); } finally { button.disabled = false; } };
    const confirmArrivalButton = $('#riderConfirmArrival');
    if (confirmArrivalButton) confirmArrivalButton.onclick = () => { if (!state.arrivalReady) return M.ui.setNotice('ระบบยังยืนยันไม่ได้ว่าคุณถึงร้าน กรุณาตรวจ GPS แล้วลองใหม่ หรือใช้การยืนยันด้วยตนเอง', 'error'); confirmArrivalButton.disabled = true; stopArrivalWatch(); options.onArrivalConfirmed?.({ jobId: job?.id, distance: distanceMeters(state.current, pickup), accuracy: state.current?.accuracy, location: state.current, manual: false }); };
    const manualArrivalButton = $('#riderManualArrival');
    if (manualArrivalButton) manualArrivalButton.onclick = () => { if (!confirm('ยืนยันว่าคุณอยู่หน้าร้านค้าแล้วใช่หรือไม่?')) return; manualArrivalButton.disabled = true; stopArrivalWatch(); options.onArrivalConfirmed?.({ jobId: job?.id, distance: null, accuracy: null, location: null, manual: true }); };
    const centerMapButton = $('#riderCenterMap');
    if (centerMapButton) centerMapButton.onclick = () => { if (!state.map) return; const point = state.current || target || pickup || destination; if (point) state.map.setView([point.lat, point.lng], 16); };
    const manualMapButton = $('#riderOpenManualMap');
    if (manualMapButton) manualMapButton.onclick = async () => { const rawPoint = { lat: $('#riderManualLat')?.value, lng: $('#riderManualLng')?.value }; if (!validPoint(rawPoint)) return M.ui.setNotice('กรุณากรอก Latitude และ Longitude ให้ถูกต้อง', 'error'); const point = toPoint(rawPoint); state.current = point; setArrivalState(state.current, false); setStatus(`ใช้พิกัดอ้างอิง ${state.current.lat.toFixed(6)}, ${state.current.lng.toFixed(6)} เพื่อจัดแผนที่`, 'success'); await renderMap(); };
    addEventListener('pagehide', stopArrivalWatch, { once: true });

  };
  window.APRiderDeliveryLocation = { mount, distanceMeters, validPoint, route };
})();
