(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || window.APRiderDeliveryLocation) return;
  const $ = selector => document.querySelector(selector);
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
    navigator.geolocation.getCurrentPosition(position => resolve({ lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), captured_at: M.ui.nowIso(), source: 'rider-delivery-geolocation' }), error => reject(new Error(error.code === 1 ? 'คุณยังไม่ได้อนุญาตตำแหน่ง กรุณาเปิดสิทธิ์ในเบราว์เซอร์แล้วลองใหม่ หรือใช้ปุ่มเปิดแผนที่' : 'ยังระบุตำแหน่งไม่ได้ กรุณาตรวจสัญญาณและลองใหม่')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
  const setStatus = (message, type = '') => { const target = $('#riderGpsVerifyResult'); if (!target) return; target.textContent = message; target.className = `rider-location-status${type ? ` is-${type}` : ''}`; };
  const mount = job => {
    const host = $('#riderDeliveryLocationHost'); if (!host || host.dataset.mounted) return; host.dataset.mounted = 'true';
    const pickup = validPoint(job?.pickup_location) ? toPoint(job.pickup_location) : null;
    const destination = validPoint(job?.delivery_location) ? toPoint(job.delivery_location) : null;
    const destinationMaps = maps(destination);
    const routeUrl = route(pickup, destination);
    host.innerHTML = `<section class="rider-location-card" aria-labelledby="riderLocationTitle"><h2 id="riderLocationTitle">ยืนยันจุดส่งและนำทาง</h2><p class="mpa-muted">ใช้ GPS เพื่อตรวจว่าคุณอยู่ใกล้จุดส่งตามรูปแบบ legacy (รัศมีอ้างอิง 50 เมตร) และเปิดแผนที่จากพิกัดของออร์เดอร์</p><p id="riderGpsVerifyResult" class="rider-location-status" aria-live="polite">${destination ? 'ยังไม่ได้ตรวจสอบตำแหน่ง GPS' : 'ออร์เดอร์นี้ยังไม่มีพิกัดปลายทาง ใช้แผนที่จากที่อยู่หรือกรอกพิกัดอ้างอิงเพื่อเปิดนำทางได้'}</p><div class="rider-location-actions"><button id="riderVerifyGps" type="button" class="mpa-button mpa-button-secondary">ตรวจสอบ GPS ปัจจุบัน</button>${routeUrl ? `<a class="mpa-button" target="_blank" rel="noopener" href="${routeUrl}">เปิดเส้นทางจุดรับ → จุดส่ง</a>` : ''}${destinationMaps ? `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${destinationMaps.google}">เปิดจุดส่งใน Google Maps</a><a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${destinationMaps.osm}">เปิดจุดส่งใน OpenStreetMap</a>` : `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${addressMap(job?.delivery_address)}">ค้นหาที่อยู่ปลายทางในแผนที่</a>`}</div><div class="rider-location-manual"><div class="mpa-field"><label>Latitude อ้างอิง (กรณีพิกัดงานไม่ครบ)</label><input id="riderManualLat" inputmode="decimal" placeholder="เช่น 13.756300"></div><div class="mpa-field"><label>Longitude อ้างอิง</label><input id="riderManualLng" inputmode="decimal" placeholder="เช่น 100.501800"></div><div><button id="riderOpenManualMap" type="button" class="mpa-button mpa-button-secondary">เปิดพิกัดอ้างอิงในแผนที่</button></div></div><p class="rider-location-policy">พิกัดอ้างอิงนี้ใช้เปิดแผนที่เท่านั้น และจะไม่เขียนทับจุดส่งของลูกค้า การปิดงานยังอยู่ภายใต้สิทธิ์และกฎธุรกิจฝั่ง server</p></section>`;
    $('#riderVerifyGps').onclick = async () => { const button = $('#riderVerifyGps'); button.disabled = true; setStatus('กำลังตรวจสอบตำแหน่งจากอุปกรณ์…'); try { const current = await gps(); if (!destination) { setStatus(`อ่านพิกัดปัจจุบันแล้ว: ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)} · ความแม่นยำประมาณ ${Math.round(current.accuracy || 0)} เมตร แต่ยังเปรียบเทียบไม่ได้เพราะออร์เดอร์ไม่มีพิกัดปลายทาง`, 'warning'); return; } const meters = distanceMeters(current, destination); const accuracy = Math.round(current.accuracy || 0); setStatus(meters <= 50 ? `ยืนยันตำแหน่งผ่าน: คุณอยู่ห่างจุดส่งประมาณ ${Math.round(meters)} เมตร · ความแม่นยำ GPS ประมาณ ${accuracy} เมตร` : `คุณอยู่ห่างจุดส่งประมาณ ${Math.round(meters)} เมตร · ความแม่นยำ GPS ประมาณ ${accuracy} เมตร โปรดตรวจสอบจุดส่งหรือเปิดนำทางต่อ`, meters <= 50 ? 'success' : 'warning'); } catch (error) { setStatus(error.message, 'warning'); M.ui.setNotice(error.message, 'error'); } finally { button.disabled = false; } };
    $('#riderOpenManualMap').onclick = () => { const point = { lat: Number($('#riderManualLat')?.value), lng: Number($('#riderManualLng')?.value) }; if (!validPoint(point)) return M.ui.setNotice('กรุณากรอก Latitude และ Longitude ให้ถูกต้อง', 'error'); const urls = maps(point); window.open(urls.google, '_blank', 'noopener'); setStatus(`เปิดพิกัดอ้างอิง ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)} ในแผนที่แล้ว`, 'success'); };
  };
  window.APRiderDeliveryLocation = { mount, distanceMeters, validPoint, route };
})();
