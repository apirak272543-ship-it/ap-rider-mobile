(() => {
  'use strict';

  const page = document.body?.dataset?.page;
  if (!['dashboard', 'delivery'].includes(page)) return;
  const statusText = { idle: 'ยังไม่ได้ตรวจสัญญาณ GPS', checking: 'กำลังตรวจสัญญาณ GPS…', healthy: 'GPS ทำงานและส่งพิกัดล่าสุดแล้ว', error: 'GPS ยังไม่พร้อม — กดฟื้นฟูสัญญาณ' };
  const requestPresence = async location => {
    const M = window.APServiceMPA;
    const session = await M?.auth?.refreshSession(false);
    if (!session?.access_token) throw new Error('เซสชัน Rider หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response = await fetch(`${M.config.url}/functions/v1/role-access`, { method: 'POST', headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_rider_presence', operation: 'location', data: { location } }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'ไม่สามารถส่งพิกัดได้');
    return result?.rider;
  };
  const locationNow = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('อุปกรณ์นี้ไม่รองรับ GPS'));
    navigator.geolocation.getCurrentPosition(position => resolve({ lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), captured_at: new Date().toISOString(), source: 'rider-gps-pulse' }), error => reject(new Error(error.code === 1 ? 'ยังไม่ได้อนุญาตตำแหน่ง กรุณาเปิดสิทธิ์แล้วลองใหม่' : 'ยังระบุตำแหน่งไม่ได้ กรุณาตรวจ GPS และสัญญาณ')), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  });
  const mount = () => {
    const topbar = document.querySelector('.mpa-topbar');
    if (!topbar || document.getElementById('riderGpsPulse')) return;
    const pulse = document.createElement('section');
    pulse.id = 'riderGpsPulse';
    pulse.setAttribute('aria-live', 'polite');
    pulse.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:auto;padding:6px 8px;border:1px solid var(--ap-line);border-radius:999px;background:#fff;font-size:12px';
    pulse.innerHTML = `<span data-gps-dot style="width:9px;height:9px;border-radius:50%;background:#8b95a1;display:inline-block"></span><span data-gps-copy>${statusText.idle}</span><button data-gps-recover type="button" style="border:0;background:transparent;color:var(--ap-brand);font:inherit;font-weight:700;padding:3px 4px">ตรวจ GPS</button>`;
    topbar.append(pulse);
    const dot = pulse.querySelector('[data-gps-dot]'), copy = pulse.querySelector('[data-gps-copy]'), button = pulse.querySelector('[data-gps-recover]');
    const paint = (state, detail = '') => { dot.style.background = state === 'healthy' ? '#16803c' : state === 'error' ? '#b42318' : state === 'checking' ? '#d97706' : '#8b95a1'; copy.textContent = detail || statusText[state]; button.textContent = state === 'error' ? 'ฟื้นฟู GPS' : 'ตรวจ GPS'; };
    button.addEventListener('click', async () => {
      button.disabled = true; paint('checking');
      try {
        await requestPresence(await locationNow());
        paint('healthy');
      } catch (error) {
        paint('error', error.message || statusText.error);
      } finally { button.disabled = false; }
    });
  };
  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  mount();
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
