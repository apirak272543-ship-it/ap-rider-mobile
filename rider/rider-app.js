(() => {
  'use strict';
  const M = window.APServiceMPA;
  const C = window.APServiceCore;
  const $ = selector => document.querySelector(selector);
  const h = M.ui.escapeHtml;
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const pageScope = name => { const scope = M.network.createScope(name); addEventListener('pagehide', () => scope.dispose(), { once: true }); return scope; };
  const links = [['dashboard', 'ภาพรวม', '⌂'], ['jobs', 'งาน', '▣'], ['earnings', 'รายได้', '฿'], ['notifications', 'แจ้งเตือน', '♢']];
  const secondaryLinks = [['profile', 'โปรไฟล์', '◉'], ['settings', 'ตั้งค่า', '⚙']];
  const dispatchLabels = Object.freeze({ unassigned: 'ยังไม่มอบหมาย', assigned: 'มอบหมายแล้ว', en_route: 'กำลังไปจุดรับ', arrived_pickup: 'ถึงจุดรับแล้ว', picked_up: 'รับสินค้าแล้ว', delivering: 'กำลังไปส่ง', delivered: 'ส่งสำเร็จ', exception: 'มีเหตุขัดข้อง' });
  const dispatchLabel = value => dispatchLabels[String(value || '')] || String(value || 'ยังไม่ระบุ');
  const terminalOrderStatuses = new Set([C.contracts.orderStatus.COMPLETED, C.contracts.orderStatus.CANCELLED]);
  const isActiveOrder = order => Boolean(order?.id && !terminalOrderStatuses.has(String(order.status || '')));
  const activeOrderLabel = order => order?.store_name || 'งานจัดส่งปัจจุบัน';
  const formatEta = value => { const date = new Date(value); if (Number.isNaN(date.getTime())) return 'ยังไม่กำหนด'; const minutes = Math.round((date.getTime() - Date.now()) / 60000); return minutes < 0 ? `เลยกำหนด ${Math.abs(minutes)} นาที` : minutes < 60 ? `อีกประมาณ ${minutes} นาที` : `ประมาณ ${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`; };

  const app = (active, content, focusOrder = null) => {
    const locked = isActiveOrder(focusOrder);
    const disabledLink = (key, label, icon) => `<span class="rider-nav-disabled" aria-disabled="true" title="ปิดงานปัจจุบันก่อนจึงใช้เมนูนี้ได้"><span class="rider-nav-icon" aria-hidden="true">${icon}</span><span>${label}</span><small>ล็อกระหว่างส่งงาน</small></span>`;
    const focusLink = `<a class="active rider-focus-nav" href="delivery.html?id=${encodeURIComponent(focusOrder?.id || '')}"><span class="rider-nav-icon" aria-hidden="true">▣</span><span>งานปัจจุบัน</span></a>`;
    const primaryNav = locked ? `${focusLink}${links.map(([key, label, icon]) => disabledLink(key, label, icon)).join('')}` : links.map(([key, label, icon]) => `<a class="${active === key ? 'active' : ''}" href="${key}.html"><span class="rider-nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
    const secondaryNav = locked ? secondaryLinks.map(([key, label, icon]) => disabledLink(key, label, icon)).join('') : secondaryLinks.map(([key, label, icon]) => `<a href="${key}.html"><span class="rider-nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
    const morePanel = locked ? `<div class="rider-lock-menu-note"><strong>เมนูถูกพักชั่วคราว</strong><small>ทำงานปัจจุบันให้เสร็จก่อน แล้วเมนูทั้งหมดจะปลดล็อก</small></div>${secondaryNav}<button type="button" class="rider-nav-logout" data-rider-logout>ออกจากระบบ</button>` : `${secondaryNav}<a href="../rider.html" aria-label="เปิดระบบไรเดอร์เดิม">ระบบเดิม</a>`;
    const mobileNav = locked ? `${focusLink}<details class="rider-more-menu"><summary><span class="rider-nav-icon" aria-hidden="true">🔒</span><span>เมนูถูกล็อก</span></summary><div class="rider-more-menu__panel">${morePanel}</div></details>` : `${primaryNav}<details class="rider-more-menu"><summary><span class="rider-nav-icon" aria-hidden="true">⋯</span><span>เพิ่มเติม</span></summary><div class="rider-more-menu__panel">${morePanel}</div></details>`;
    document.body.classList.toggle('rider-order-locked', locked);
    document.body.innerHTML = `<header class="mpa-topbar${locked ? ' rider-topbar--locked' : ''}"><a class="mpa-brand" href="${locked ? `delivery.html?id=${encodeURIComponent(focusOrder.id)}` : 'dashboard.html'}"><span class="rider-brand-mark">AS</span><span><strong>AP Service · ไรเดอร์</strong><small>${locked ? `กำลังทำงาน · ${h(activeOrderLabel(focusOrder))}` : 'ศูนย์งานส่ง'}</small></span></a><nav class="mpa-nav rider-desktop-nav">${primaryNav}<details class="rider-more-menu"><summary><span class="rider-nav-icon" aria-hidden="true">${locked ? '🔒' : '⋯'}</span><span>${locked ? 'เมนูถูกล็อก' : 'เพิ่มเติม'}</span></summary><div class="rider-more-menu__panel">${morePanel}</div></details></nav></header>${locked ? `<section class="rider-focus-banner" role="status"><span class="rider-focus-banner__icon" aria-hidden="true">▣</span><div><strong>โหมดทำงาน: ${h(activeOrderLabel(focusOrder))}</strong><small>เมนูอื่นจะปลดล็อกหลังปิดงานนี้</small></div><a href="delivery.html?id=${encodeURIComponent(focusOrder.id)}">กลับไปทำงาน</a></section>` : ''}<main class="mpa-shell" data-page-content>${content}</main><nav class="rider-bottom-nav" aria-label="เมนูหลักสำหรับมือถือ">${mobileNav}</nav>`;
  };

  async function ownRider(user) {
    const rows = await M.request(`riders?select=id,name,phone,vehicle,status,user_id,last_location,ride_available,compliance_status,compliance_note,compliance_reviewed_at,identity_verified,identity_document_image_url,license_expiry,license_image_url,vehicle_registration_image_url,insurance_expiry,insurance_image_url&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, cacheTtlMs: 10_000, cacheKey: `rider-profile:${user.id}` });
    return rows?.[0] || null;
  }

  async function updateRiderPresence(operation, data) {
    const session = await M.auth.refreshSession(false);
    if (!session?.access_token) throw new Error('เซสชัน Rider หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response = await fetch(`${M.config.url}/functions/v1/role-access`, { method: 'POST', headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_rider_presence', operation, data }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'ไม่สามารถบันทึกข้อมูล Rider ได้');
    return result?.rider || null;
  }

  async function updateRiderDelivery(operation, orderId, data) {
    const session = await M.auth.refreshSession(false);
    if (!session?.access_token) throw new Error('เซสชัน Rider หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response = await fetch(`${M.config.url}/functions/v1/role-access`, { method: 'POST', headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_rider_delivery', operation, order_id: orderId, data }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'ไม่สามารถบันทึกงานจัดส่งผ่าน server ได้');
    return result?.order || null;
  }

  const riderLocationLabel = location => {
    const lat = Number(location?.lat), lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'ยังไม่ได้ส่งพิกัดจากอุปกรณ์';
    const captured = location?.captured_at ? new Date(location.captured_at).toLocaleString('th-TH') : 'ไม่ระบุเวลา';
    const source = location?.source === 'manual-coordinate' ? 'กรอกพิกัดเอง' : location?.source === 'rider-geolocation' ? 'GPS อุปกรณ์' : 'แหล่งที่มาไม่ระบุ';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)} · ${captured} · ${source}`;
  };
  const normalizeSavedLocation = (rider, fallback) => {
    const current = rider?.last_location && typeof rider.last_location === 'object' ? rider.last_location : {};
    const source = ['manual-coordinate', 'rider-geolocation'].includes(String(current.source || '')) ? current.source : fallback.source;
    return { ...(rider || {}), last_location: { ...fallback, ...current, source } };
  };

  async function gate(active, content) {
    app(active, M.ui.loading('กำลังตรวจสอบงานปัจจุบัน…'), { id: '__checking__', status: 'กำลังตรวจสอบงาน', store_name: 'กำลังตรวจสอบงาน' });
    const access = await M.auth.requireRole('rider', { loginUrl: 'login.html', container: $('[data-page-content]'), renderLoading: false });
    if (!access) return null;
    const controls = await M.request(`account_controls?select=status,suspension_reason,feature_overrides&user_id=eq.${encodeURIComponent(access.user.id)}&limit=1`, { private: true, cacheTtlMs: 10_000, cacheKey: `rider-account-control:${access.user.id}` });
    const control = controls?.[0] || { status: 'active', feature_overrides: {} };
    if (control.status === 'suspended') {
      $('[data-page-content]').innerHTML = M.ui.error('บัญชีไรเดอร์ถูกระงับการใช้งาน', control.suspension_reason || 'กรุณาติดต่อผู้ดูแลระบบ');
      return null;
    }
    const rider = await ownRider(access.user);
    if (!rider) {
      $('[data-page-content]').innerHTML = M.ui.error('ไม่พบโปรไฟล์ไรเดอร์', 'กรุณาติดต่อผู้ดูแลระบบ');
      return null;
    }
    let activeOrder = null;
    try {
      const assigned = await M.request(ordersPath(rider.id), { private: true, forceFresh: true, cacheTtlMs: 5_000, cacheKey: `rider-active-order:${rider.id}` });
      activeOrder = (assigned || []).find(isActiveOrder) || null;
    } catch (error) { console.warn('Rider active-order guard read skipped', error); }
    if (activeOrder && page !== 'delivery') {
      location.replace(`delivery.html?id=${encodeURIComponent(activeOrder.id)}`);
      return null;
    }
    if (activeOrder && page === 'delivery' && params.get('id') !== String(activeOrder.id)) {
      location.replace(`delivery.html?id=${encodeURIComponent(activeOrder.id)}`);
      return null;
    }
    app(active, content, activeOrder);
    document.querySelectorAll('[data-rider-logout]').forEach(button => { button.onclick = () => M.auth.signOut('login.html'); });
    const config = await readCentralConfig(access.user.id);
    mountCentralConfig(config);
    void window.APServiceRiderRecognition?.notify(access);
    return { ...access, rider, control, config, activeOrder, orderLocked: Boolean(activeOrder) };
  }

  async function readCentralConfig(userId) {
    const read = async (path, options = {}) => { try { return await M.request(path, options); } catch (error) { console.warn('Rider central config read skipped', error); return []; } };
    const [publicRows, paymentRows] = await Promise.all([
      read('platform_configs?select=key,value&key=in.(brand_public,customer_promotions)', { cacheTtlMs: 30_000, cacheKey: 'rider-platform-public-configs' }),
      read('platform_configs?select=key,value&key=eq.payment_public', { private: true, cacheTtlMs: 30_000, cacheKey: `rider-payment-public:${userId}` }),
    ]);
    const rows = [...(publicRows || []), ...(paymentRows || [])];
    return { brand: rows.find(row => row.key === 'brand_public')?.value || {}, promotions: rows.find(row => row.key === 'customer_promotions')?.value || {}, payment: rows.find(row => row.key === 'payment_public')?.value || {} };
  }

  const configValue = (value, keys, fallback = '') => keys.map(key => value?.[key]).find(item => item !== undefined && item !== null && String(item).trim() !== '') ?? fallback;
  const safeAsset = value => { const text = String(value || '').trim(); return /^https?:/i.test(text) || text.toLowerCase().startsWith('data:image/') ? text : ''; };
  function centralConfigMarkup(config) {
    const brand = config?.brand || {}, promotions = Array.isArray(config?.promotions?.items) ? config.promotions.items.filter(item => item && item.active !== false) : [];
    const name = configValue(brand, ['brand_name', 'brandName', 'name', 'title'], 'AP Service');
    const logo = safeAsset(configValue(brand, ['logo_url', 'logoUrl', 'logo']));
    const background = safeAsset(configValue(brand, ['background_url', 'backgroundUrl', 'background']));
    const banner = safeAsset(configValue(brand, ['banner_url', 'bannerUrl', 'banner']));
    const payment = config?.payment || {}, provider = configValue(payment, ['provider'], 'ยังไม่กำหนด');
    return `<details class="rider-secondary-card" data-central-config-card><summary><span><strong>ข้อมูลจากระบบกลาง</strong><small>โปรโมชันและช่องทางรับเงิน</small></span><span class="rider-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rider-secondary-card__body"><div class="rider-central-brand" style="${background ? `background-image:linear-gradient(90deg,rgba(16,43,73,.78),rgba(16,43,73,.2)),url('${h(background)}')` : ''}"><div class="rider-central-brand__mark">${logo ? `<img src="${h(logo)}" alt="">` : 'AS'}</div><div><strong>${h(name)}</strong><small>ช่องทางชำระเงิน: ${h(provider)}</small></div></div>${banner ? `<img class="rider-central-banner" src="${h(banner)}" alt="แบนเนอร์จากผู้ดูแล" loading="lazy">` : ''}<strong class="rider-secondary-label">โปรโมชันที่เผยแพร่</strong>${promotions.length ? `<div class="rider-promo-list">${promotions.slice(0, 4).map(item => `<div class="rider-promo-item"><div class="rider-promo-item__icon">${safeAsset(item.image_url) ? `<img src="${h(safeAsset(item.image_url))}" alt="">` : '✦'}</div><div><strong>${h(item.badge ? `${item.badge} · ` : '')}${h(item.title || 'โปรโมชัน')}</strong><small>${h(item.description || '')}</small></div></div>`).join('')}</div>` : '<p class="mpa-muted">ยังไม่มีโปรโมชันที่เปิดเผย</p>'}</div></details>`;
  }
  function mountCentralConfig(config) { const host = $('[data-page-content]'); if (!host) return; host.insertAdjacentHTML('afterbegin', centralConfigMarkup(config)); }

  const ordersPath = riderId => `delivery_orders?select=id,status,payable,store_name,pickup_address,delivery_address,customer_name,dispatch_status,estimated_arrival_at,dispatch_note,dispatch_updated_at,ordered_at&rider_id=eq.${encodeURIComponent(riderId)}&order=ordered_at.desc&limit=150`;
  const claimableStatuses = Object.freeze([C.contracts.orderStatus.STORE_ACCEPTED, C.contracts.orderStatus.PREPARING]);
  const availableOrdersPath = () => `delivery_orders?select=id,status,payable,store_name,pickup_address,delivery_address,customer_name,dispatch_status,estimated_arrival_at,dispatch_note,dispatch_updated_at,ordered_at&rider_id=is.null&status=in.(${claimableStatuses.map(status => encodeURIComponent(status)).join(',')})&order=ordered_at.asc&limit=100`;

  async function login() {
    try { await M.auth.sessionRestoreReady; const existing = await M.auth.currentUser(); const roles = existing ? await M.auth.rolesFor(existing.id) : []; if (existing && roles.includes('rider')) { location.replace('dashboard.html'); return; } } catch (_) {}
    document.body.innerHTML = `<main class="ap-login-shell"><section class="ap-login-card" data-login-panel="rider"><div class="ap-login-brandline"><span class="ap-login-mark">AS</span><div><strong>AP Service</strong><small>ศูนย์จัดการงานส่งและสถานะ Rider</small></div></div><span class="ap-login-role">Rider Login</span><h1 class="ap-login-title">เข้าสู่ระบบ Rider</h1><p class="ap-login-intro">ใช้บัญชีที่ Admin สร้างและผูกสิทธิ์กับโปรไฟล์ Rider แล้ว</p><form id="login" class="ap-login-form"><label class="ap-login-field"><span>ชื่อผู้ใช้ Rider</span><div class="ap-login-control"><span class="ap-login-icon" aria-hidden="true">${window.APLoginUI?.icon('user') || window.APLoginUI?.icon('mail') || ''}</span><input id="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" aria-label="อีเมล" placeholder="เช่น rider01" required></div></label><label class="ap-login-field"><span>รหัสผ่าน</span><div class="ap-login-control"><span class="ap-login-icon" aria-hidden="true">${window.APLoginUI?.icon('lock') || ''}</span><input id="password" type="password" autocomplete="current-password" aria-label="รหัสผ่าน" placeholder="กรอกรหัสผ่านของคุณ" required><button class="ap-login-password-toggle" type="button" data-password-toggle aria-controls="password" aria-label="แสดงรหัสผ่าน">${window.APLoginUI?.icon('eye') || ''}</button></div></label><button class="ap-login-submit" data-login-submit type="submit">เข้าสู่ระบบ</button><p class="ap-login-status" data-login-status aria-live="polite"></p></form><div class="ap-login-admin-note"><span aria-hidden="true">${window.APLoginUI?.icon('shield') || ''}</span><div><strong>บัญชีนี้สร้างโดย Admin เท่านั้น</strong><p>หากยังไม่มีบัญชี โปรดให้ผู้ดูแลระบบสร้างและผูกสิทธิ์ก่อนเข้าสู่ระบบ</p></div></div><a class="ap-login-back" href="login.html" aria-label="อยู่ที่หน้าเข้าสู่ระบบ Rider">กลับหน้าเข้าสู่ระบบ Rider</a></section></main>`;
    const loginForm = $('#login');
    window.APLoginUI?.enhance(loginForm);
    loginForm.onsubmit = async event => { event.preventDefault(); const username = $('#username').value.trim(), password = $('#password').value; if (!username || !password) { const message = 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน'; window.APLoginUI?.showError(loginForm, message); M.ui.setNotice(message, 'error'); return; } try { await M.auth.signInWithUsername(username, password, 'rider'); await window.APLoginUI?.showSuccess(loginForm); location.assign('dashboard.html'); } catch (error) { const raw = String(error?.message || ''); const message = /missing username|missing identifier|missing password|invalid login|invalid credentials|ชื่อผู้ใช้หรือรหัสผ่าน/i.test(raw) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่' : raw; window.APLoginUI?.showError(loginForm, message); M.ui.setNotice(message || 'เข้าสู่ระบบ Rider ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error'); } };
  }

  async function dashboard() {
    const ctx = await gate('dashboard', `<div class="mpa-page-head"><div><p class="rider-eyebrow">สวัสดีไรเดอร์</p><h1>วันนี้มีอะไรให้ทำบ้าง</h1><p>ดูงานที่ต้องทำก่อน แล้วค่อยเปิดเมนูอื่นเมื่อจำเป็น</p></div><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></div><div id="content" class="rider-dashboard-content">${M.ui.loading('กำลังโหลดงาน…')}</div>`);
    if (!ctx) return;
    $('#out').onclick = () => M.auth.signOut('login.html');
    const scope = pageScope('rider:dashboard'); const path = ordersPath(ctx.rider.id); let lastSignature = '';
    const render = jobs => {
      const signature = JSON.stringify((jobs || []).map(row => [row.id, row.status, row.ordered_at])); if (signature === lastSignature) return; lastSignature = signature;
      const active = jobs.filter(row => !['สำเร็จแล้ว', 'ยกเลิก'].includes(row.status));
      const focusJobs = active.slice(0, 3); const jobPreview = focusJobs.length ? focusJobs.map(job => `<article class="rider-dashboard-job"><div><p class="rider-eyebrow">งานที่ต้องทำ</p><strong>${h(job.store_name || 'งานจัดส่ง')}</strong><small>${h(job.pickup_address || 'ยังไม่ระบุจุดรับ')}</small></div><a class="mpa-button mpa-button-secondary" href="delivery.html?id=${encodeURIComponent(job.id)}">ทำต่อ</a></article>`).join('') : '<div class="rider-dashboard-empty"><strong>ยังไม่มีงานที่ต้องทำ</strong><p class="mpa-muted">ไปที่เมนูงานเพื่อดูงานใหม่ที่พร้อมรับ</p></div>'; $('#content').innerHTML = `<section class="rider-dashboard-status"><div><p class="rider-eyebrow">สถานะตอนนี้</p><h2>${h(ctx.rider.status || 'ยังไม่ระบุสถานะ')}</h2><p>${h(ctx.rider.vehicle || 'ยังไม่ได้ระบุยานพาหนะ')}</p></div><span class="rider-dashboard-status__icon" aria-hidden="true">${active.length ? '!' : '✓'}</span></section><section class="rider-dashboard-focus"><div class="rider-section-heading"><div><p class="rider-eyebrow">โฟกัสวันนี้</p><h2>${active.length ? `${active.length} งานกำลังดำเนินการ` : 'พร้อมรับงานใหม่'}</h2></div><a class="rider-text-link" href="jobs.html">ดูทั้งหมด</a></div><div class="rider-dashboard-job-list">${jobPreview}</div></section><div class="rider-dashboard-shortcuts"><a class="rider-shortcut" href="jobs.html"><span>▣</span><strong>ดูงานจัดส่ง</strong><small>รับงานหรือทำงานต่อ</small></a><a class="rider-shortcut" href="earnings.html"><span>฿</span><strong>ดูรายได้</strong><small>ยอดพร้อมถอน</small></a></div>`;
    };
    try { render(await scope.request(path, { private: true, cacheTtlMs: 10_000, cacheKey: `rider-dashboard-orders:${ctx.rider.id}` })); } catch (err) { if (err.code !== M.network.STALE_RESPONSE) $('#content').innerHTML = M.ui.error('โหลดภาพรวมไม่สำเร็จ', err.message); return; }
    const stop = M.network.startBackgroundSync({ key: `rider-dashboard:${ctx.rider.id}`, intervalMs: 15_000, task: async () => { const jobs = await M.request(path, { private: true, forceFresh: true, cacheKey: `rider-dashboard-orders:${ctx.rider.id}` }); const signature = JSON.stringify((jobs || []).map(row => [row.id, row.status, row.ordered_at])); return { changed: signature !== lastSignature, data: jobs }; }, onData: render, onError: error => M.ui.setNotice(`อัปเดตงานไรเดอร์ไม่สำเร็จ: ${error.message}`, 'error') }); addEventListener('pagehide', stop, { once: true });
  }

  async function jobs() {
    const ctx = await gate('jobs', `<div class="mpa-page-head"><div><h1>งานจัดส่ง</h1><p>รับงานใหม่ที่พร้อมให้บริการ หรือเปิดงานที่รับไว้แล้ว</p></div></div><section id="list" class="mpa-card">${M.ui.loading('กำลังโหลดงานจัดส่ง…')}</section>`);
    if (!ctx) return;
    const scope = pageScope('rider:jobs'); const assignedPath = ordersPath(ctx.rider.id); const availablePath = availableOrdersPath(); let lastSignature = '';
    const read = forceFresh => Promise.all([
      scope.request(assignedPath, { private: true, cacheTtlMs: 10_000, forceFresh, cacheKey: `rider-jobs:${ctx.rider.id}` }),
      scope.request(availablePath, { private: true, cacheTtlMs: 10_000, forceFresh, cacheKey: 'rider-available-jobs' }),
    ]).then(([assigned, available]) => ({ assigned: assigned || [], available: available || [] }));
    const render = ({ assigned, available }) => {
      const signature = JSON.stringify({ assigned: assigned.map(row => [row.id, row.status, row.ordered_at]), available: available.map(row => [row.id, row.status, row.ordered_at]) }); if (signature === lastSignature) return; lastSignature = signature;
      const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'ยังไม่ระบุเวลา' : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
      const formatMoney = value => Number.isFinite(Number(value)) ? `฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'ยังไม่ระบุยอด';
      const jobCard = (row, mode) => {
        const isAvailable = mode === 'available';
        const dispatch = dispatchLabel(row.dispatch_status || (isAvailable ? 'unassigned' : 'assigned'));
        const action = isAvailable ? `<button class="mpa-button rider-job-card__primary-action" data-claim-job="${h(row.id)}">รับงานนี้</button>` : `<a class="mpa-button mpa-button-secondary rider-job-card__primary-action" href="delivery.html?id=${encodeURIComponent(row.id)}">ทำงานต่อ</a>`;
        return `<article class="rider-job-card" data-job-id="${h(row.id)}"><div class="rider-job-card__head"><div><p class="rider-eyebrow">${isAvailable ? 'งานใหม่' : 'งานของฉัน'}</p><h3>${h(row.store_name || 'ยังไม่ระบุร้านค้า')}</h3></div><span class="mpa-badge">${h(row.status || 'ไม่ระบุสถานะ')}</span></div><div class="rider-job-card__quick rider-job-card__dispatch"><div><span>รายได้โดยประมาณ</span><strong>${h(formatMoney(row.payable))}</strong></div><div><span>สถานะเดินทาง</span><strong>${h(dispatch)}</strong></div></div><div class="rider-job-card__route-preview"><span class="rider-route-dot rider-route-dot--pickup"></span><span>${h(row.pickup_address || 'ยังไม่ระบุจุดรับ')}</span><span class="rider-route-arrow" aria-hidden="true">→</span><span class="rider-route-dot rider-route-dot--dropoff"></span><span>${h(row.delivery_address || 'ยังไม่ระบุปลายทาง')}</span></div>${row.estimated_arrival_at ? `<p class="rider-job-card__eta">ถึงโดยประมาณ ${h(formatEta(row.estimated_arrival_at))}</p>` : ''}<details class="rider-job-card__details"><summary>ดูรายละเอียดงาน</summary><div class="rider-job-card__details-body"><div><span>จุดรับ</span><strong>${h(row.pickup_address || 'ยังไม่ระบุจุดรับ')}</strong></div><div><span>ปลายทาง</span><strong>${h(row.delivery_address || 'ยังไม่ระบุปลายทาง')}</strong></div><div><span>สร้างรายการ</span><strong>${h(formatTime(row.ordered_at))}</strong></div>${row.dispatch_note ? `<p class="rider-job-card__note">${h(row.dispatch_note)}</p>` : ''}</div></details>${action}</article>`;
      };
      const assignedCards = assigned.length ? `<div class="rider-job-grid">${assigned.map(row => jobCard(row, 'assigned')).join('')}</div>` : M.ui.empty('ยังไม่มีงานที่รับไว้');
      const availableCards = available.length ? `<div class="rider-job-grid">${available.map(row => jobCard(row, 'available')).join('')}</div>` : M.ui.empty('ยังไม่มีงานใหม่ที่พร้อมรับ');
      $('#list').innerHTML = `<details class="rider-job-group" open><summary><span><strong>งานที่ต้องรับ</strong><small>เลือกงานใหม่ที่พร้อมให้บริการ</small></span><span class="rider-count-chip">${available.length}</span></summary><div class="rider-job-group__body">${availableCards}</div></details><details class="rider-job-group" ${assigned.length ? 'open' : ''}><summary><span><strong>งานของฉัน</strong><small>งานที่รับแล้วและต้องทำต่อ</small></span><span class="rider-count-chip">${assigned.length}</span></summary><div class="rider-job-group__body">${assignedCards}</div></details>`;
      document.querySelectorAll('[data-claim-job]').forEach(button => button.addEventListener('click', async () => {
        const job = available.find(row => row.id === button.dataset.claimJob); if (!job) return;
        const next = C.contracts.orderStatus.RIDER_PICKUP; const transition = C.order.canTransition({ from: job.status, to: next, actor: 'rider' });
        if (!transition.ok) { M.ui.setNotice(transition.reason, 'error'); return; }
        if (!confirm(`รับงานจาก ${job.store_name || 'ร้านค้า'} ใช่หรือไม่?`)) return;
        button.disabled = true; button.textContent = 'กำลังรับงาน…';
        try {
          const claimed = await updateRiderDelivery('claim', job.id, { rider_name: ctx.rider.name });
          if (!claimed?.id) throw new Error('งานนี้ถูกรับหรือเปลี่ยนสถานะโดยไรเดอร์คนอื่นแล้ว');
          M.ui.setNotice('รับงานแล้ว'); location.assign(`delivery.html?id=${encodeURIComponent(job.id)}`);
        } catch (err) { button.disabled = false; button.textContent = 'รับงาน'; M.ui.setNotice(err.message || 'รับงานไม่สำเร็จ', 'error'); }
      }));
    };
    try { render(await read(false)); } catch (err) { if (err.code !== M.network.STALE_RESPONSE) $('#list').innerHTML = M.ui.error('โหลดงานไม่สำเร็จ', err.message); return; }
    const stop = M.network.startBackgroundSync({ key: `rider-jobs:${ctx.rider.id}`, intervalMs: 15_000, task: async () => { const data = await read(true); const signature = JSON.stringify({ assigned: data.assigned.map(row => [row.id, row.status, row.ordered_at]), available: data.available.map(row => [row.id, row.status, row.ordered_at]) }); return { changed: signature !== lastSignature, data }; }, onData: render, onError: error => M.ui.setNotice(`อัปเดตงานจัดส่งไม่สำเร็จ: ${error.message}`, 'error') }); addEventListener('pagehide', stop, { once: true });
  }

  async function delivery() {
    const ctx = await gate('jobs', `<section id="job" class="mpa-card">${M.ui.loading('กำลังโหลดรายละเอียดงาน…')}</section>`);
    if (!ctx) return;
    const id = params.get('id');
    if (!id) { $('#job').innerHTML = M.ui.error('ไม่พบรหัสงาน'); return; }
    const scope = pageScope('rider:delivery');
    try {
      const deliveryPath = `${ordersPath(ctx.rider.id).replace('customer_name,dispatch_status,estimated_arrival_at,dispatch_note,dispatch_updated_at,ordered_at', 'customer_name,dispatch_status,estimated_arrival_at,dispatch_note,dispatch_updated_at,delivery_location,pickup_location,proof_image,ordered_at')}&id=eq.${encodeURIComponent(id)}`;
      let rows = await scope.request(deliveryPath, { private: true, forceFresh: true, cacheTtlMs: 10_000, cacheKey: `rider-delivery:${ctx.rider.id}:${id}` });
      if (!rows?.[0]) {
        for (let attempt = 0; attempt < 3 && !rows?.[0]; attempt += 1) {
          if (attempt) await new Promise(resolve => setTimeout(resolve, 350));
          rows = await M.request(deliveryPath, { private: true, forceFresh: true, cacheTtlMs: 0, cacheKey: `rider-delivery-recovery:${ctx.rider.id}:${id}:${attempt}:${Date.now()}` });
        }
      }
      if (!rows?.[0]) {
        const session = await M.auth.refreshSession(false);
        const response = await fetch(`${M.config.url}/rest/v1/${deliveryPath}`, { headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session?.access_token || ''}` } });
        const directRows = await response.json().catch(() => []);
        if (!response.ok) throw new Error(directRows?.message || `ไม่สามารถโหลดรายละเอียดงานได้ (${response.status})`);
        rows = Array.isArray(directRows) ? directRows : [];
      }
      const job = rows?.[0];
      if (!job) throw new Error('ไม่พบงานหรือบัญชีนี้ไม่มีสิทธิ์');
      const steps = Object.values(C.contracts.orderStatus).filter(next => C.order.canTransition({ from: job.status, to: next, actor: 'rider' }).ok);
      let proofRef = job.proof_image || '';
      const riderSteps = [C.contracts.orderStatus.RIDER_PICKUP, C.contracts.orderStatus.ARRIVED_STORE, C.contracts.orderStatus.COLLECTED, C.contracts.orderStatus.DELIVERING, C.contracts.orderStatus.COMPLETED];
      const statusNames = { [C.contracts.orderStatus.RIDER_PICKUP]: 'เดินทางไปที่ร้าน', [C.contracts.orderStatus.ARRIVED_STORE]: 'ยืนยันถึงร้านค้า', [C.contracts.orderStatus.COLLECTED]: 'ยืนยันรับสินค้าแล้ว', [C.contracts.orderStatus.DELIVERING]: 'เดินทางไปหาลูกค้า', [C.contracts.orderStatus.COMPLETED]: 'ยืนยันส่งสำเร็จ' };
      const currentIndex = riderSteps.indexOf(job.status);
      const activeStepIndex = currentIndex < 0 ? 0 : currentIndex;
      const isComplete = job.status === C.contracts.orderStatus.COMPLETED;
      const nextStep = riderSteps.find(status => C.order.canTransition({ from: job.status, to: status, actor: 'rider' }).ok) || '';
      const waitingForArrival = nextStep === C.contracts.orderStatus.ARRIVED_STORE;
      const showProof = Boolean(proofRef) || [C.contracts.orderStatus.COLLECTED, C.contracts.orderStatus.DELIVERING, C.contracts.orderStatus.COMPLETED].includes(job.status);
      const stepper = riderSteps.map((status, index) => { const done = isComplete || index < activeStepIndex; const current = !isComplete && index === activeStepIndex; const locked = !done && !current; return `<li class="rider-stepper__item ${done ? 'is-done' : current ? 'is-current' : 'is-locked'}" ${locked ? 'aria-disabled="true"' : ''}><span>${done ? '✓' : locked ? '🔒' : index + 1}</span><strong>${h(statusNames[status])}</strong>${current ? '<small>กำลังทำตอนนี้</small>' : locked ? '<small>ทำขั้นก่อนหน้าให้เสร็จก่อน</small>' : ''}</li>`; }).join('');
      $('#job').innerHTML = `<a class="rider-back-link" href="jobs.html">← กลับรายการงาน</a><section class="rider-delivery-hero"><div><p class="rider-eyebrow">กำลังทำงาน</p><h1>${h(job.store_name || 'งานจัดส่ง')}</h1><span class="mpa-badge">${h(job.status)}</span></div><strong class="rider-delivery-amount">${h(Number.isFinite(Number(job.payable)) ? `฿${Number(job.payable).toLocaleString('th-TH')}` : '—')}</strong></section><section class="rider-stepper-card"><div class="rider-section-heading"><div><p class="rider-eyebrow">ภาพรวมงาน</p><h2>มี ${riderSteps.length} ขั้นตอน</h2></div><span class="rider-step-count">${isComplete ? riderSteps.length : activeStepIndex + 1}/${riderSteps.length}</span></div><p class="rider-stepper-help">ระบบเปิดให้ทำทีละขั้น เพื่อลดการกดผิด</p><ol class="rider-stepper">${stepper}</ol></section><section class="rider-next-action"><p class="rider-eyebrow">ทำตอนนี้เท่านั้น</p><h2>${nextStep ? h(statusNames[nextStep] || nextStep) : 'งานนี้เสร็จครบแล้ว'}</h2><p class="mpa-muted">${nextStep ? 'ทำขั้นตอนนี้ให้เสร็จแล้วกดยืนยัน ระบบจะปลดล็อกขั้นตอนถัดไปให้อัตโนมัติ' : 'ไม่ต้องดำเนินการเพิ่มเติมสำหรับงานนี้'}</p>${nextStep ? (waitingForArrival ? '<div class="rider-next-action__actions"><p class="rider-arrival-required">ระบบจะช่วยตรวจ GPS ให้ แต่คุณสามารถยืนยันเองได้หาก GPS หรือแผนที่ค้าง</p><button id="save" class="mpa-button mpa-button-secondary rider-next-action__button">ยืนยันถึงร้านด้วยตนเอง</button></div>' : '<button id="save" class="mpa-button rider-next-action__button">ยืนยันว่าทำขั้นนี้เสร็จแล้ว</button>') : '<p class="rider-complete-state">✓ งานนี้ปิดเรียบร้อยแล้ว</p>'}</section><section class="rider-location-section"><div class="rider-section-heading"><div><p class="rider-eyebrow">เส้นทาง</p><h2>ข้อมูลที่ใช้ตอนเดินทาง</h2></div></div><div class="rider-route-detail"><div><span class="rider-route-dot rider-route-dot--pickup"></span><div><small>จุดรับ</small><strong>${h(job.pickup_address || '-')}</strong></div></div><div><span class="rider-route-dot rider-route-dot--dropoff"></span><div><small>จุดส่ง</small><strong>${h(job.delivery_address || '-')}</strong></div></div></div><div class="rider-dispatch-panel"><div><span>Dispatch</span><strong>${h(dispatchLabel(job.dispatch_status || 'assigned'))}</strong></div><div><span>ETA</span><strong>${job.estimated_arrival_at ? h(formatEta(job.estimated_arrival_at)) : 'ยังไม่กำหนด'}</strong></div>${job.dispatch_note ? `<p class="rider-job-card__note">${h(job.dispatch_note)}</p>` : ''}</div><div id="riderDeliveryLocationHost"></div></section>${showProof ? `<section class="rider-proof-section"><details open><summary><span><strong>หลักฐานการส่งสินค้า</strong><small>${proofRef ? 'มีหลักฐานแล้ว สามารถเปลี่ยนได้' : 'ถ่ายรูปเมื่อวางของถึงปลายทางแล้ว'}</small></span><span class="rider-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rider-proof-section__body"><p class="mpa-muted">ระบบจะบีบอัดรูปก่อนอัปโหลดอย่างปลอดภัย</p><div class="rider-proof-actions"><label class="mpa-button mpa-button-secondary">เลือกจากคลัง<input id="proofLibrary" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><label class="mpa-button mpa-button-secondary">ถ่ายจากกล้อง<input id="proofCamera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden></label></div><p id="proofStatus" class="mpa-muted" aria-live="polite">${proofRef ? 'มีหลักฐานส่งงานแล้ว' : 'ยังไม่มีหลักฐานส่งงาน'}</p></div></details></section>` : '<section class="rider-locked-section"><span aria-hidden="true">▣</span><div><strong>หลักฐานการส่งจะแสดงในขั้นถัดไป</strong><p class="mpa-muted">เมื่อกดบันทึกขั้นตอนปัจจุบันเสร็จแล้ว คุณจะเห็นปุ่มถ่ายรูปหลักฐาน</p></div></section>'}`;
      try { window.APRiderDeliveryLocation?.mount(job, { onArrivalConfirmed: async ({ jobId, distance, accuracy, location, manual }) => { try { const arrivalStatus = C.contracts.orderStatus.ARRIVED_STORE; const transition = C.order.canTransition({ from: job.status, to: arrivalStatus, actor: 'rider' }); if (!transition.ok) throw new Error(transition.reason || 'ยังไม่สามารถยืนยันถึงร้านในขั้นตอนนี้ได้'); await updateRiderDelivery('status', jobId, { status: arrivalStatus, arrival_mode: manual ? 'manual' : 'geofence', arrival_location: location || null, arrival_distance_meters: Math.round(distance || 0), arrival_accuracy_meters: Math.round(accuracy || 0), arrival_confirmed_by: manual ? 'rider-manual-arrival' : 'rider-geofence-assist' }); M.ui.setNotice('ยืนยันถึงร้านแล้ว กำลังเปิดขั้นตอนถัดไป'); setTimeout(() => location.reload(), 350); } catch (error) { M.ui.setNotice(error.message || 'ยืนยันถึงร้านไม่สำเร็จ', 'error'); document.querySelector('#riderConfirmArrival')?.removeAttribute('disabled'); } } }); } catch (error) { M.ui.setNotice('ระบบแผนที่ขัดข้อง แต่ยังสามารถยืนยันขั้นตอนด้วยตนเองได้', 'error'); }
      const uploadProof = async input => {
        const file = input.files?.[0]; if (!file) return; const status = $('#proofStatus');
        try {
          if (!window.APServiceMedia?.uploadPrivateImage) throw new Error('ระบบอัปโหลดหลักฐานยังโหลดไม่พร้อม กรุณารีเฟรชแล้วลองใหม่');
          status.textContent = 'กำลังเตรียมหลักฐาน…'; const session = await M.auth.refreshSession(false);
          if (!session?.access_token || !session?.user?.id) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลด');
          const uploaded = await window.APServiceMedia.uploadPrivateImage(file, { url: M.config.url, publishableKey: M.config.publishableKey, accessToken: session.access_token, actorId: session.user.id, bucket: 'delivery-proofs', scope: job.id, mediaType: 'DELIVERY_PROOF', ownerType: 'rider' });
          proofRef = uploaded.storageRef;
          await updateRiderDelivery('proof', job.id, { proof_image: proofRef });
          status.textContent = 'อัปโหลด ตรวจสอบ และบันทึกหลักฐานส่งงานแล้ว'; M.ui.setNotice('บันทึกหลักฐานส่งงานแล้ว');
        } catch (err) { input.value = ''; status.textContent = err.message || 'อัปโหลดหลักฐานส่งงานไม่สำเร็จ'; M.ui.setNotice(status.textContent, 'error'); }
      };
      $('#proofLibrary')?.addEventListener('change', event => uploadProof(event.target));
      $('#proofCamera')?.addEventListener('change', event => uploadProof(event.target));
      let statusSaveInFlight = false;
      $('#save')?.addEventListener('click', async event => {
        const next = nextStep;
        if (!next || statusSaveInFlight) return;
        const button = event.currentTarget;
        statusSaveInFlight = true;
        if (button) { button.disabled = true; button.dataset.originalLabel = button.textContent; button.textContent = 'กำลังบันทึก…'; }
        try {
          const data = next === C.contracts.orderStatus.ARRIVED_STORE ? { arrival_mode: 'manual', arrival_confirmed_by: 'rider-manual-arrival', arrival_location: null, arrival_distance_meters: null, arrival_accuracy_meters: null } : { proof_image: proofRef };
          await updateRiderDelivery('status', job.id, { status: next, ...data });
          M.ui.setNotice('บันทึกแล้ว กำลังเปิดขั้นตอนถัดไป'); setTimeout(() => location.reload(), 350);
        } catch (err) { statusSaveInFlight = false; if (button) { button.disabled = false; button.textContent = button.dataset.originalLabel || 'ยืนยันด้วยตนเอง'; } M.ui.setNotice(err.message || 'บันทึกขั้นตอนไม่สำเร็จ กรุณาลองใหม่', 'error'); }
      });
    } catch (err) { $('#job').innerHTML = M.ui.error('โหลดรายละเอียดงานไม่สำเร็จ', err.message); }
  }

  async function earnings() {
    const ctx = await gate('earnings', `<div class="mpa-page-head"><div><h1>รายได้และกระเป๋าเงิน</h1><p>แสดงเฉพาะรายได้และยอดถอนของบัญชีไรเดอร์ที่ล็อกอิน</p></div></div><section id="wallet" class="mpa-card rider-wallet-workspace">${M.ui.loading('กำลังโหลดกระเป๋าเงิน…')}</section><section id="list" class="mpa-card">${M.ui.loading('กำลังโหลดรายได้…')}</section>`);
    if (!ctx) return;
    const scope = pageScope('rider:earnings');
    const path = `rider_earnings?select=order_id,rider_id,delivery_fee,rider_share,platform_share,settlement_status,completed_at,delivery_orders(id,store_name,customer_name,service_type,payable)&rider_id=eq.${encodeURIComponent(ctx.rider.id)}&order=completed_at.desc&limit=150`;
    const walletPath = 'rpc/wallet_summary';
    const withdrawalPath = `withdrawal_requests?select=id,amount,status,recipient_note,admin_note,payment_reference,requested_at,reviewed_at,paid_at,proof_available,proof_image_url&rider_id=eq.${encodeURIComponent(ctx.rider.id)}&order=requested_at.desc&limit=60`;
    let statusFilter = 'all'; let lastDataSignature = ''; let lastRenderSignature = ''; let lastWalletSignature = '';
    const formatMoney = value => Number.isFinite(Number(value)) ? `฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'ข้อมูลยอดไม่พร้อม';
    const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'ไม่ระบุเวลาปิดงาน' : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
    const normalizedStatus = value => String(value || '').toLowerCase() === 'settled' ? 'settled' : String(value || '').toLowerCase() === 'reversed' ? 'reversed' : 'unknown';
    const withdrawalStatusLabel = value => ({ requested: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', paid: 'โอนแล้ว', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' }[String(value || '').toLowerCase()] || 'รอสถานะ');
    const privateProofPath = value => String(value || '').split('/').map(encodeURIComponent).join('/');

    const openProof = async (id, fallbackProof) => {
      try {
        const row = (await M.request(`withdrawal_requests?select=id,proof_image_url,proof_available&id=eq.${encodeURIComponent(id)}&limit=1`, { private: true, forceFresh: true, cacheKey: `withdrawal-proof:${id}` }))?.[0];
        const proof = row?.proof_image_url || fallbackProof;
        if (!proof || !row?.proof_available) throw new Error('ยังไม่มีหลักฐานการโอนสำหรับคำขอนี้');
        if (/^data:image\//i.test(proof)) {
          const legacyViewer = window.open(proof, '_blank', 'noopener');
          if (!legacyViewer) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
          return;
        }
        const session = M.auth.getSession();
        const response = await fetch(`${M.config.url}/storage/v1/object/${privateProofPath(proof)}`, { headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session?.access_token || ''}` } });
        if (!response.ok) throw new Error('ไม่สามารถเปิดหลักฐานการโอนได้');
        const viewerUrl = URL.createObjectURL(await response.blob());
        const viewer = window.open(viewerUrl, '_blank', 'noopener');
        if (!viewer) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
        setTimeout(() => URL.revokeObjectURL(viewerUrl), 60_000);
      } catch (error) { M.ui.setNotice(error.message || 'เปิดหลักฐานการโอนไม่สำเร็จ', 'error'); }
    };

    const renderWallet = (wallet, withdrawals) => {
      const safeWallet = wallet || {};
      const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];
      const available = Number(safeWallet.available_amount || 0);
      const requests = safeWithdrawals.length ? `<div class="rider-withdrawal-list"><div class="rider-wallet-section-head"><h3>คำขอถอนล่าสุด</h3><p class="mpa-muted">สถานะและหลักฐานการโอนมาจากคำขอจริงของบัญชีนี้</p></div>${safeWithdrawals.slice(0, 8).map(row => `<article class="rider-withdrawal-card"><div><p class="rider-eyebrow">คำขอเมื่อ ${h(formatTime(row.requested_at))}</p><strong>${h(formatMoney(row.amount))}</strong><p class="mpa-muted">${h(withdrawalStatusLabel(row.status))}${row.payment_reference ? ` · อ้างอิง ${h(row.payment_reference)}` : ''}${row.admin_note ? ` · ${h(row.admin_note)}` : ''}</p></div><div class="rider-withdrawal-card__action"><span class="mpa-badge rider-withdrawal-status-${h(String(row.status || 'unknown').toLowerCase())}">${h(withdrawalStatusLabel(row.status))}</span>${row.status === 'paid' && row.proof_available ? `<button class="mpa-button mpa-button-secondary rider-proof-button" type="button" data-view-proof="${h(row.id)}" data-proof-ref="${h(row.proof_image_url || '')}">ดูหลักฐานการโอน</button>` : ''}</div></article>`).join('')}</div>` : `<div class="rider-wallet-empty"><strong>ยังไม่มีคำขอถอนเงิน</strong><p class="mpa-muted">เมื่อมียอดพร้อมถอน ระบบจะส่งคำขอเต็มยอดที่พร้อมถอนได้ครั้งละหนึ่งคำขอ</p></div>`;
      $('#wallet').innerHTML = `<div class="rider-wallet-header"><div><p class="rider-eyebrow">กระเป๋าเงิน</p><h2>ยอดเงินของฉัน</h2><p class="mpa-muted">ยอดนี้มาจากงานที่ปิดแล้วและคำขอถอนจริงของคุณ</p></div><span class="rider-wallet-icon" aria-hidden="true">฿</span></div><article class="rider-available-balance"><small>ยอดพร้อมถอน</small><strong>${h(formatMoney(safeWallet.available_amount))}</strong><span>กดขอถอนเมื่อพร้อม</span></article><details class="rider-secondary-card rider-wallet-breakdown"><summary><span><strong>ดูสรุปยอดทั้งหมด</strong><small>ยอดกำลังตรวจ ยอดโอนแล้ว และยอดสะสม</small></span><span class="rider-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rider-wallet-grid"><article class="rider-wallet-stat"><small>กำลังดำเนินการ</small><strong>${h(formatMoney(safeWallet.processing_amount))}</strong></article><article class="rider-wallet-stat"><small>รับเงินจริงแล้ว</small><strong>${h(formatMoney(safeWallet.paid_amount))}</strong></article><article class="rider-wallet-stat"><small>รายได้สะสมทั้งหมด</small><strong>${h(formatMoney(safeWallet.total_earned))}</strong></article></div></details><form id="withdrawalForm" class="rider-withdrawal-form"><div><h3>ขอถอนเงิน</h3><p class="mpa-muted">ระบบจะส่งคำขอเต็มยอดพร้อมถอน <strong>${h(formatMoney(available))}</strong></p>${available <= 0 ? '<p class="rider-inline-note" role="status">ยังถอนไม่ได้ เพราะยอดพร้อมถอนเป็น 0 บาทหรือกำลังรอตรวจคำขอเดิม</p>' : ''}</div><label class="mpa-field"><span>หมายเหตุ (ไม่บังคับ)</span><textarea id="withdrawalNote" maxlength="500" rows="2" placeholder="เช่น แจ้งช่องทางรับเงิน"></textarea></label><button id="requestWithdrawal" class="mpa-button" type="submit" ${available > 0 ? '' : 'disabled'}>ส่งคำขอถอน</button></form><details class="rider-secondary-card rider-withdrawal-history"><summary><span><strong>ประวัติคำขอถอน</strong><small>${safeWithdrawals.length ? `${safeWithdrawals.length} รายการล่าสุด` : 'ยังไม่มีคำขอถอน'}</small></span><span class="rider-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rider-secondary-card__body">${requests}</div></details>`;
      $('#withdrawalForm')?.addEventListener('submit', async event => {
        event.preventDefault();
        const button = $('#requestWithdrawal');
        if (!button || button.disabled) return;
        button.disabled = true;
        try {
          await M.request('rpc/request_full_wallet_withdrawal', { method: 'POST', private: true, body: JSON.stringify({ p_recipient_type: 'rider', p_recipient_id: ctx.rider.id, p_recipient_note: $('#withdrawalNote')?.value.trim() || '' }) });
          M.ui.setNotice('ส่งคำขอถอนเงินแล้ว ผู้ดูแลจะตรวจสอบตามลำดับ');
          await loadWallet(true);
        } catch (error) { M.ui.setNotice(error.message || 'ส่งคำขอถอนเงินไม่สำเร็จ', 'error'); button.disabled = false; }
      });
      document.querySelectorAll('[data-view-proof]').forEach(button => button.addEventListener('click', () => openProof(button.dataset.viewProof, button.dataset.proofRef)));
    };

    const loadWallet = async forceFresh => {
      try {
        const [walletRows, withdrawals] = await Promise.all([
          M.request(walletPath, { method: 'POST', private: true, body: JSON.stringify({ p_recipient_type: 'rider', p_recipient_id: ctx.rider.id }), cacheTtlMs: 10_000, forceFresh, cacheKey: `rider-wallet:${ctx.rider.id}` }),
          M.request(withdrawalPath, { private: true, cacheTtlMs: 10_000, forceFresh, cacheKey: `rider-withdrawals:${ctx.rider.id}` })
        ]);
        const wallet = Array.isArray(walletRows) ? walletRows[0] : walletRows || {};
        lastWalletSignature = JSON.stringify([wallet, withdrawals || []]);
        renderWallet(wallet, withdrawals);
      } catch (error) { $('#wallet').innerHTML = M.ui.error('โหลดกระเป๋าเงินไม่สำเร็จ', error.message); }
    };
    const render = rows => {
      const safeRows = Array.isArray(rows) ? rows : [];
      const dataSignature = JSON.stringify(safeRows.map(row => [row.order_id, row.rider_share, row.delivery_fee, row.settlement_status, row.completed_at]));
      const renderSignature = `${statusFilter}:${dataSignature}`;
      if (renderSignature === lastRenderSignature) return;
      lastDataSignature = dataSignature; lastRenderSignature = renderSignature;
      const visible = statusFilter === 'all' ? safeRows : safeRows.filter(row => normalizedStatus(row.settlement_status) === statusFilter);
      const knownShares = visible.map(row => Number(row.rider_share)).filter(Number.isFinite);
      const hasCompleteTotal = visible.length > 0 && knownShares.length === visible.length;
      const settled = safeRows.filter(row => normalizedStatus(row.settlement_status) === 'settled').length;
      const reversed = safeRows.filter(row => normalizedStatus(row.settlement_status) === 'reversed').length;
      const cards = visible.length ? `<div class="rider-earning-list">${visible.map(row => { const order = row.delivery_orders || {}; const status = normalizedStatus(row.settlement_status); const statusLabel = status === 'settled' ? 'ชำระแล้ว' : status === 'reversed' ? 'ย้อนรายการ' : 'รอยืนยันสถานะ'; return `<details class="rider-earning-card"><summary><span><small>รายการ ${h(row.order_id || order.id || 'ไม่ระบุรหัส')}</small><strong>${h(order.store_name || 'ไม่ระบุร้านค้า')}</strong></span><span class="rider-earning-summary"><strong>${h(formatMoney(row.rider_share))}</strong><span class="mpa-badge rider-status-${h(status)}">${h(statusLabel)}</span></span></summary><div class="rider-earning-card__body"><p class="rider-earning-card__customer">ลูกค้า: ${h(order.customer_name || 'ไม่ระบุ')}</p><dl class="rider-money-breakdown"><div><dt>ส่วนแบ่งไรเดอร์</dt><dd>${h(formatMoney(row.rider_share))}</dd></div><div><dt>ค่าจัดส่ง</dt><dd>${h(formatMoney(row.delivery_fee))}</dd></div><div><dt>ยอดจากรายการ</dt><dd>${h(formatMoney(order.payable))}</dd></div></dl><p class="mpa-muted">ปิดงาน: ${h(formatTime(row.completed_at))}</p></div></details>`; }).join('')}</div>` : M.ui.empty(statusFilter === 'all' ? 'ยังไม่มีรายการรายได้' : 'ไม่พบรายการตามสถานะที่เลือก');
      $('#list').innerHTML = `<div class="rider-earnings-summary"><div class="mpa-card mpa-stat"><small>ส่วนแบ่งตามรายการที่แสดง</small><strong class="rider-money-total">${h(hasCompleteTotal ? formatMoney(knownShares.reduce((sum, value) => sum + value, 0)) : visible.length ? 'ข้อมูลยอดไม่พร้อม' : '—')}</strong></div><div class="mpa-card mpa-stat"><small>ชำระแล้ว</small><strong>${settled}</strong></div><div class="mpa-card mpa-stat"><small>ย้อนรายการ</small><strong>${reversed}</strong></div></div><div class="rider-earnings-tools"><label class="mpa-field"><span>กรองสถานะการชำระ</span><select id="earningsFilter" data-earning-filter><option value="all">ทุกรายการ</option><option value="settled">ชำระแล้ว</option><option value="reversed">ย้อนรายการ</option></select></label><p class="mpa-muted">ยอดแสดงจาก <code>rider_earnings</code> โดยตรง ไม่มีการคำนวณยอดคงเหลือหรือยอดถอนจำลอง</p></div>${cards}`;
      $('#earningsFilter').value = statusFilter;
      $('#earningsFilter').addEventListener('change', event => { statusFilter = event.target.value; render(safeRows); });
    };
    const read = forceFresh => scope.request(path, { private: true, cacheTtlMs: 10_000, forceFresh, cacheKey: `rider-earnings:${ctx.rider.id}` });
    try { const [rows] = await Promise.all([read(false), loadWallet(false)]); render(rows); } catch (err) { if (err.code !== M.network.STALE_RESPONSE) $('#list').innerHTML = M.ui.error('โหลดรายได้ไม่สำเร็จ', err.message); return; }
    const stopEarnings = M.network.startBackgroundSync({ key: `rider-earnings:${ctx.rider.id}`, intervalMs: 30_000, task: async () => { const rows = await read(true); const signature = JSON.stringify((rows || []).map(row => [row.order_id, row.rider_share, row.delivery_fee, row.settlement_status, row.completed_at])); return { changed: signature !== lastDataSignature, data: rows || [] }; }, onData: render, onError: error => M.ui.setNotice(`อัปเดตรายได้ไม่สำเร็จ: ${error.message}`, 'error') });
    const stopWallet = M.network.startBackgroundSync({ key: `rider-wallet:${ctx.rider.id}`, intervalMs: 60_000, task: async () => { const [walletRows, withdrawals] = await Promise.all([M.request(walletPath, { method: 'POST', private: true, body: JSON.stringify({ p_recipient_type: 'rider', p_recipient_id: ctx.rider.id }), forceFresh: true, cacheKey: `rider-wallet:${ctx.rider.id}` }), M.request(withdrawalPath, { private: true, forceFresh: true, cacheKey: `rider-withdrawals:${ctx.rider.id}` })]); const wallet = Array.isArray(walletRows) ? walletRows[0] : walletRows || {}; const signature = JSON.stringify([wallet, withdrawals || []]); return { changed: signature !== lastWalletSignature, data: { wallet, withdrawals } }; }, onData: data => { lastWalletSignature = JSON.stringify([data.wallet, data.withdrawals || []]); renderWallet(data.wallet, data.withdrawals); }, onError: error => M.ui.setNotice(`อัปเดตกระเป๋าเงินไม่สำเร็จ: ${error.message}`, 'error') });
    addEventListener('pagehide', () => { stopEarnings(); stopWallet(); }, { once: true });
  }

  async function profile() {
    const ctx = await gate('profile', `<div class="mpa-page-head"><div><h1>โปรไฟล์และสถานะ Rider</h1><p>แก้ไขข้อมูลพื้นฐาน ส่งพิกัดสด และตั้งค่าสถานะพร้อมรับงานผ่านการยืนยันสิทธิ์ฝั่ง server</p></div></div><section id="form" class="mpa-card">${M.ui.loading()}</section>`);
    if (!ctx) return;
    const complianceLabel = { approved: 'ผ่านการอนุมัติ', rejected: 'ต้องแก้ไขเอกสาร', pending: 'รอผู้ดูแลตรวจ' }[String(ctx.rider.compliance_status || '').toLowerCase()] || 'รอผู้ดูแลตรวจ';
    const complianceTone = String(ctx.rider.compliance_status || '').toLowerCase() === 'approved' ? '#16794a' : String(ctx.rider.compliance_status || '').toLowerCase() === 'rejected' ? '#b42318' : '#9a6700';
    $('#form').innerHTML = `<div style="display:grid;gap:18px;max-width:620px"><section class="mpa-card" style="box-shadow:none;border:1px solid var(--ap-line)"><p class="mpa-kicker">COMPLIANCE</p><h2 style="margin:0 0 8px">สถานะเอกสารและสิทธิ์รับงาน</h2><p style="margin:0;color:${complianceTone}"><strong>${h(complianceLabel)}</strong></p><p class="mpa-muted">${h(ctx.rider.compliance_note || 'ตรวจเอกสารยืนยันตัวตน ใบขับขี่ ทะเบียนรถ และประกันกับผู้ดูแลก่อนเปิดรับงาน')}</p><dl><div><dt>ยืนยันตัวตน</dt><dd>${ctx.rider.identity_verified ? 'ครบ' : 'รอตรวจ'}</dd></div><div><dt>ใบขับขี่หมดอายุ</dt><dd>${h(ctx.rider.license_expiry || 'ยังไม่ระบุ')}</dd></div><div><dt>ประกันหมดอายุ</dt><dd>${h(ctx.rider.insurance_expiry || 'ยังไม่ระบุ')}</dd></div></dl></section><form id="riderDocuments" class="mpa-card" style="box-shadow:none;border:1px solid var(--ap-line)"><h2 style="margin:0 0 8px">ส่งเอกสารให้ผู้ดูแลตรวจ</h2><p class="mpa-muted">อัปโหลดเอกสารแบบส่วนตัว ระบบบีบอัดและตรวจไฟล์ไม่เกิน 1 MB การส่งเอกสารใหม่จะปิดรับงานชั่วคราวจนตรวจเสร็จ</p><div class="mpa-grid"><label class="mpa-field">บัตรยืนยันตัวตน<input type="file" accept="image/jpeg,image/png,image/webp" data-rider-document="identity_document_image_url"><span class="mpa-media-preview" data-rider-preview="identity_document_image_url" hidden><img alt="ตัวอย่างบัตรยืนยันตัวตน"><small data-rider-preview-status></small></span></label><label class="mpa-field">ใบขับขี่<input type="file" accept="image/jpeg,image/png,image/webp" data-rider-document="license_image_url"><span class="mpa-media-preview" data-rider-preview="license_image_url" hidden><img alt="ตัวอย่างใบขับขี่"><small data-rider-preview-status></small></span></label><label class="mpa-field">ทะเบียนรถ<input type="file" accept="image/jpeg,image/png,image/webp" data-rider-document="vehicle_registration_image_url"><span class="mpa-media-preview" data-rider-preview="vehicle_registration_image_url" hidden><img alt="ตัวอย่างทะเบียนรถ"><small data-rider-preview-status></small></span></label><label class="mpa-field">ประกันรถ<input type="file" accept="image/jpeg,image/png,image/webp" data-rider-document="insurance_image_url"><span class="mpa-media-preview" data-rider-preview="insurance_image_url" hidden><img alt="ตัวอย่างประกันรถ"><small data-rider-preview-status></small></span></label></div><p id="riderDocumentStatus" class="mpa-muted" aria-live="polite">เลือกเอกสารที่ต้องการส่งตรวจ</p><button class="mpa-button" type="submit">ส่งเอกสารให้ตรวจ</button></form><form id="save"><h2 style="margin:0 0 10px">ข้อมูลพื้นฐาน</h2><div class="mpa-field"><label>ชื่อ</label><input id="name" value="${h(ctx.rider.name)}" required></div><div class="mpa-field"><label>โทรศัพท์</label><input id="phone" inputmode="tel" value="${h(ctx.rider.phone || '')}"></div><div class="mpa-field"><label>ยานพาหนะ</label><input id="vehicle" value="${h(ctx.rider.vehicle || '')}" placeholder="เช่น รถจักรยานยนต์"></div><button class="mpa-button">บันทึกข้อมูลพื้นฐาน</button></form><section style="padding-top:16px;border-top:1px solid var(--ap-line)"><h2 style="margin:0 0 10px">สถานะพร้อมรับงาน</h2><p class="mpa-muted">สถานะพร้อมรับงานจะเปิดได้เฉพาะ Rider ที่ผ่านการอนุมัติจากผู้ดูแลแล้ว</p><div class="mpa-field"><label>สถานะ</label><select id="availability"><option value="true" ${(ctx.rider.ride_available || ctx.rider.status === 'พร้อมรับงาน') ? 'selected' : ''}>พร้อมรับงาน</option><option value="false" ${(!ctx.rider.ride_available && ctx.rider.status !== 'พร้อมรับงาน') ? 'selected' : ''}>ไม่พร้อมรับงาน</option></select></div><button type="button" id="saveAvailability" class="mpa-button mpa-button-secondary">บันทึกสถานะพร้อมรับงาน</button></section><section style="padding-top:16px;border-top:1px solid var(--ap-line)"><h2 style="margin:0 0 10px">ตำแหน่งล่าสุด</h2><p id="riderPresenceLocation" class="mpa-muted">${h(riderLocationLabel(ctx.rider.last_location))}</p><p id="riderPresenceStatus" class="mpa-muted" aria-live="polite">กดปุ่มเพื่อส่งพิกัดปัจจุบันจากอุปกรณ์ของคุณ</p><button type="button" id="captureRiderLocation" class="mpa-button mpa-button-secondary">ส่งพิกัดปัจจุบัน</button><div id="riderManualLocation" hidden style="margin-top:12px;padding:12px;border:1px dashed var(--ap-line);border-radius:12px"><p class="mpa-muted" style="margin-top:0">GPS ใช้งานไม่ได้หรือค้างใช่ไหม กรอกพิกัดแทนได้ทันที ระบบจะบันทึก source และเวลาสำหรับให้ Dispatch ตรวจสอบ</p><div class="mpa-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><label class="mpa-field"><span>Latitude</span><input id="riderManualLat" inputmode="decimal" placeholder="13.756300"></label><label class="mpa-field"><span>Longitude</span><input id="riderManualLng" inputmode="decimal" placeholder="100.501800"></label><label class="mpa-field"><span>ความแม่นยำ (เมตร)</span><input id="riderManualAccuracy" type="number" min="0" step="1" value="0"></label></div><button type="button" id="saveRiderManualLocation" class="mpa-button mpa-button-secondary">บันทึกพิกัดที่กรอก</button><p id="riderManualLocationStatus" class="mpa-muted" aria-live="polite"></p></div></section></div>`;
    const recognitionHost = document.createElement('div');
    recognitionHost.id = 'rider-recognition-host';
    $('#form').prepend(recognitionHost);
    void window.APServiceRiderRecognition?.mount({ host: recognitionHost, user: ctx.user });
    const documentDraft = {};
    const riderPreviewUrls = new Map(); const clearRiderPreview = field => { const url = riderPreviewUrls.get(field); if (url) { URL.revokeObjectURL(url); riderPreviewUrls.delete(field); } const preview = document.querySelector(`[data-rider-preview="${CSS.escape(field)}"]`); if (preview) { preview.hidden = true; preview.querySelector('img').removeAttribute('src'); preview.querySelector('[data-rider-preview-status]').textContent = ''; } }; document.querySelectorAll('[data-rider-document]').forEach(input => input.addEventListener('change', async () => { const file = input.files?.[0], field = input.dataset.riderDocument; const status = $('#riderDocumentStatus'); if (!file || !field) return; clearRiderPreview(field); const preview = document.querySelector(`[data-rider-preview="${CSS.escape(field)}"]`); if (preview) { const localUrl = URL.createObjectURL(file); riderPreviewUrls.set(field, localUrl); preview.hidden = false; preview.querySelector('img').src = localUrl; preview.querySelector('[data-rider-preview-status]').textContent = `${file.name} · ${Math.ceil(file.size / 1024)} KB`; } try { if (!window.APServiceMedia?.uploadPrivateImage) throw new Error('ระบบอัปโหลดเอกสารยังโหลดไม่พร้อม กรุณารีเฟรชแล้วลองใหม่'); const session = await M.auth.refreshSession(false); if (!session?.access_token || !session?.user?.id) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); status.textContent = `กำลังเตรียมและอัปโหลด ${file.name}…`; const uploaded = await window.APServiceMedia.uploadPrivateImage(file, { url: M.config.url, publishableKey: M.config.publishableKey, accessToken: session.access_token, actorId: session.user.id, bucket: 'rider-documents', pathPrefix: `rider-${ctx.rider.id}`, scope: field, mediaType: 'IDENTITY_DOCUMENT', ownerType: 'rider' }); documentDraft[field] = uploaded.path; if (preview) preview.querySelector('[data-rider-preview-status]').textContent = 'อัปโหลดแล้ว · พร้อมส่งให้ผู้ดูแลตรวจ'; status.textContent = 'อัปโหลดเอกสารแล้ว กดส่งเอกสารให้ตรวจเพื่อบันทึก'; } catch (error) { input.value = ''; clearRiderPreview(field); status.textContent = error.message || 'อัปโหลดเอกสารไม่สำเร็จ'; M.ui.setNotice(status.textContent, 'error'); } })); addEventListener('pagehide', () => riderPreviewUrls.forEach(url => URL.revokeObjectURL(url)), { once: true });
    $('#riderDocuments').onsubmit = async event => { event.preventDefault(); const button = $('#riderDocuments button[type="submit"]'); if (!Object.keys(documentDraft).length) return M.ui.setNotice('กรุณาเลือกเอกสารอย่างน้อยหนึ่งรายการ', 'error'); button.disabled = true; try { await updateRiderPresence('documents', documentDraft); M.ui.setNotice('ส่งเอกสารให้ผู้ดูแลตรวจแล้ว'); location.reload(); } catch (error) { M.ui.setNotice(error.message || 'ส่งเอกสารไม่สำเร็จ', 'error'); button.disabled = false; } };
    $('#save').onsubmit = async event => {
      event.preventDefault();
      const button = $('#save'); button.disabled = true;
      try {
        const rider = await updateRiderPresence('profile', { name: $('#name').value.trim(), phone: $('#phone').value.trim(), vehicle: $('#vehicle').value.trim() });
        Object.assign(ctx.rider, rider || {});
        M.ui.setNotice('บันทึกโปรไฟล์แล้ว');
      } catch (err) { M.ui.setNotice(err.message, 'error'); } finally { button.disabled = false; }
    };
    $('#saveAvailability').onclick = async () => {
      const button = $('#saveAvailability'); button.disabled = true;
      try { const rider = await updateRiderPresence('availability', { available: $('#availability').value === 'true' }); Object.assign(ctx.rider, rider || {}); M.ui.setNotice('บันทึกสถานะพร้อมรับงานแล้ว'); }
      catch (err) { M.ui.setNotice(err.message, 'error'); } finally { button.disabled = false; }
    };
    $('#captureRiderLocation').onclick = async () => {
      const button = $('#captureRiderLocation'), status = $('#riderPresenceStatus');
      if (!navigator.geolocation) return M.ui.setNotice('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่งอัตโนมัติ', 'error');
      button.disabled = true; status.textContent = 'กำลังขอพิกัดจากอุปกรณ์…';
      try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }));
        const locationPayload = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), captured_at: M.ui.nowIso(), source: 'rider-geolocation' };
        const rider = await updateRiderPresence('location', { location: locationPayload });
        Object.assign(ctx.rider, normalizeSavedLocation(rider, locationPayload)); $('#riderPresenceLocation').textContent = riderLocationLabel(ctx.rider.last_location); status.textContent = 'บันทึกพิกัดล่าสุดแล้ว'; M.ui.setNotice('ส่งพิกัดปัจจุบันแล้ว');
      } catch (err) { status.textContent = err?.code === 1 ? 'ยังไม่ได้อนุญาตตำแหน่ง กรุณาเปิดสิทธิ์ในเบราว์เซอร์แล้วลองใหม่' : 'ยังระบุตำแหน่งไม่ได้ กรุณาตรวจ GPS และสัญญาณแล้วลองใหม่'; document.querySelector('#riderManualLocation')?.removeAttribute('hidden'); M.ui.setNotice(status.textContent, 'error'); }
      finally { button.disabled = false; }
    };
    $('#saveRiderManualLocation').onclick = async () => { const button = $('#saveRiderManualLocation'), status = $('#riderManualLocationStatus'); const lat = Number($('#riderManualLat')?.value), lng = Number($('#riderManualLng')?.value), accuracy = Math.max(0, Number($('#riderManualAccuracy')?.value || 0)); if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) { status.textContent = 'กรุณากรอก Latitude/Longitude ที่ถูกต้อง'; return M.ui.setNotice(status.textContent, 'error'); } button.disabled = true; status.textContent = 'กำลังบันทึกพิกัดที่กรอก…'; try { const locationPayload = { lat, lng, accuracy, captured_at: M.ui.nowIso(), source: 'manual-coordinate' }; const rider = await updateRiderPresence('location', { location: locationPayload }); Object.assign(ctx.rider, normalizeSavedLocation(rider, locationPayload)); $('#riderPresenceLocation').textContent = riderLocationLabel(ctx.rider.last_location); status.textContent = 'บันทึกพิกัดแบบกรอกเองแล้ว'; M.ui.setNotice('บันทึกพิกัดที่กรอกแล้ว'); } catch (error) { status.textContent = error.message || 'บันทึกพิกัดไม่สำเร็จ'; M.ui.setNotice(status.textContent, 'error'); } finally { button.disabled = false; } };
  }

  async function notifications() {
    const ctx = await gate('notifications', `<div class="mpa-page-head"><div><h1>การแจ้งเตือน</h1><p>ข้อความงานจัดส่ง การมอบหมาย และเวลาถึงโดยประมาณของคุณ</p></div><button id="refreshNotifications" class="mpa-button mpa-button-secondary" type="button">รีเฟรช</button></div><section id="notifications" class="mpa-card">${M.ui.loading('กำลังโหลดการแจ้งเตือน…')}</section>`);
    if (!ctx) return;
    const scope = pageScope('rider:notifications');
    const path = `mobile_notifications?select=id,title,body,data,status,read_at,created_at&recipient_id=eq.${encodeURIComponent(ctx.user.id)}&order=created_at.desc&limit=100`;
    const safeDeepLink = value => { try { const url = new URL(String(value || ''), location.href); return url.origin === location.origin ? url.href : ''; } catch (_) { return ''; } };
    const markRead = async id => { await M.request(`mobile_notifications?id=eq.${encodeURIComponent(id)}&recipient_id=eq.${encodeURIComponent(ctx.user.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ read_at: M.ui.nowIso() }) }); };
    const render = rows => { const host = $('#notifications'); host.innerHTML = rows?.length ? `<div class="rider-notice-list">${rows.map(row => `<article class="rider-notice-card${row.read_at ? '' : ' rider-notice-unread'}" data-notification-id="${h(row.id)}"><div class="rider-notice-card__head"><strong>${h(row.title || 'แจ้งเตือน AP Service')}</strong><span class="mpa-badge">${h(row.status || 'แจ้งเตือน')}</span></div><p>${h(row.body || 'ไม่มีรายละเอียด')}</p><small class="mpa-muted">${row.created_at ? h(new Date(row.created_at).toLocaleString('th-TH')) : '-'}</small><div class="rider-notice-card__actions">${safeDeepLink(row.data?.deep_link) ? `<a class="mpa-button mpa-button-secondary" href="${h(safeDeepLink(row.data.deep_link))}">เปิดปลายทาง</a>` : ''}${row.read_at ? '<span class="mpa-muted">อ่านแล้ว</span>' : `<button type="button" class="mpa-button mpa-button-secondary" data-mark-rider-notification="${h(row.id)}">ทำเครื่องหมายว่าอ่านแล้ว</button>`}</div></article>`).join('')}</div>` : M.ui.empty('ยังไม่มีการแจ้งเตือน'); host.querySelectorAll('[data-mark-rider-notification]').forEach(button => button.onclick = async () => { button.disabled = true; try { await markRead(button.dataset.markRiderNotification); button.closest('[data-notification-id]')?.classList.remove('rider-notice-unread'); button.replaceWith(document.createTextNode('อ่านแล้ว')); } catch (error) { button.disabled = false; M.ui.setNotice(error.message || 'ทำเครื่องหมายอ่านไม่สำเร็จ', 'error'); } }); };
    const load = async forceFresh => { const button = $('#refreshNotifications'); if (button) button.disabled = true; try { const rows = await scope.request(path, { private: true, forceFresh, cacheTtlMs: 15_000, cacheKey: `rider-notifications:${ctx.user.id}` }); render(rows || []); } catch (error) { $('#notifications').innerHTML = M.ui.error('โหลดการแจ้งเตือนไม่สำเร็จ', error.message); } finally { if (button) button.disabled = false; } };
    $('#refreshNotifications').onclick = () => load(true); await load(false);
    const stop = M.network.startBackgroundSync({ key: `rider-notifications:${ctx.user.id}`, intervalMs: 30_000, task: async () => { await load(true); return { changed: true }; }, onError: error => M.ui.setNotice(`อัปเดตการแจ้งเตือนไม่สำเร็จ: ${error.message}`, 'error') }); addEventListener('pagehide', stop, { once: true });
  }

  async function settings() {
    const ctx = await gate('settings', `<section class="mpa-card rider-settings-card"><div><p class="rider-eyebrow">เมนูรอง</p><h1>ตั้งค่าไรเดอร์</h1><p class="mpa-muted">การตั้งค่านี้มีผลเฉพาะบัญชีของคุณ ส่วนกฎธุรกิจกลางดูแลโดย Admin</p></div><div class="rider-settings-list"><a class="rider-settings-link" href="profile.html"><span>◉</span><div><strong>โปรไฟล์และเอกสาร</strong><small>แก้ข้อมูลรถและสถานะรับงาน</small></div><span>›</span></a><a class="rider-settings-link" href="notifications.html"><span>♢</span><div><strong>การแจ้งเตือน</strong><small>ดูข้อความจากระบบและงานส่ง</small></div><span>›</span></a></div><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></section>`);
    if (ctx) $('#out').onclick = () => M.auth.signOut('login.html');
  }

  ({ login, dashboard, jobs, notifications, delivery, earnings, profile, settings }[page] || login)();
})();
