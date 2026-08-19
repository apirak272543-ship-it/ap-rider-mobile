(() => {
  'use strict';
  const M = window.APServiceMPA;
  const C = window.APServiceCore;
  const $ = selector => document.querySelector(selector);
  const h = M.ui.escapeHtml;
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const pageScope = name => { const scope = M.network.createScope(name); addEventListener('pagehide', () => scope.dispose(), { once: true }); return scope; };
  const links = [['dashboard', 'ภาพรวม'], ['jobs', 'งานจัดส่ง'], ['earnings', 'รายได้'], ['profile', 'โปรไฟล์'], ['settings', 'ตั้งค่า']];

  const app = (active, content) => {
    const nav = links.map(([key, label]) => `<a class="${active === key ? 'active' : ''}" href="${key}.html">${label}</a>`).join('');
    document.body.innerHTML = `<header class="mpa-topbar"><a class="mpa-brand" href="dashboard.html">AP Service · Rider</a><nav class="mpa-nav">${nav}<a href="../rider.html">Fallback</a></nav></header><main class="mpa-shell" data-page-content>${content}</main>`;
  };

  async function ownRider(user) {
    const rows = await M.request(`riders?select=id,name,phone,vehicle,status,user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, cacheTtlMs: 10_000, cacheKey: `rider-profile:${user.id}` });
    return rows?.[0] || null;
  }

  async function gate(active, content) {
    app(active, content);
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
    const config = await readCentralConfig(access.user.id);
    mountCentralConfig(config);
    return { ...access, rider, control, config };
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
    return `<section class="mpa-card" data-central-config-card style="margin-bottom:18px;overflow:hidden;padding:0"><div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:${background ? `linear-gradient(90deg,rgba(16,43,73,.78),rgba(16,43,73,.2)),url('${h(background)}') center/cover` : 'linear-gradient(135deg,#eaf6ff,#fff)'};color:${background ? '#fff' : 'inherit'}"><div style="width:52px;height:52px;border-radius:15px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.78);font-size:25px;flex:0 0 auto">${logo ? `<img src="${h(logo)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '🛵'}</div><div><strong>${h(name)}</strong><div style="font-size:11px;opacity:.85">ค่ากลางจาก Admin · ช่องทางชำระเงิน: ${h(provider)}</div></div></div>${banner ? `<img src="${h(banner)}" alt="แบนเนอร์จาก Admin" loading="lazy" style="display:block;width:100%;max-height:150px;object-fit:cover">` : ''}<div style="padding:12px 16px"><strong style="font-size:12px">โปรโมชันที่เผยแพร่</strong>${promotions.length ? `<div style="display:grid;gap:8px;margin-top:9px">${promotions.slice(0, 4).map(item => `<div style="display:flex;gap:9px;align-items:center"><div style="width:38px;height:38px;border-radius:10px;overflow:hidden;background:#eaf6ff;display:grid;place-items:center;flex:0 0 auto">${safeAsset(item.image_url) ? `<img src="${h(safeAsset(item.image_url))}" alt="" style="width:100%;height:100%;object-fit:cover">` : '✦'}</div><div><strong style="font-size:11px">${h(item.badge ? `${item.badge} · ` : '')}${h(item.title || 'โปรโมชัน')}</strong><div class="mpa-muted">${h(item.description || '')}</div></div></div>`).join('')}</div>` : '<p class="mpa-muted" style="margin:8px 0 0">ยังไม่มีโปรโมชันที่เปิดเผย</p>'}<p class="mpa-muted" style="margin:10px 0 0">กฎธุรกิจส่วนกลางไม่ถูกเปิดให้อ่านจากบทบาทไรเดอร์ตาม RLS ปัจจุบัน</p></div></section>`;
  }
  function mountCentralConfig(config) { const host = $('[data-page-content]'); if (!host) return; host.insertAdjacentHTML('afterbegin', centralConfigMarkup(config)); }

  const ordersPath = riderId => `delivery_orders?select=id,status,payable,store_name,pickup_address,delivery_address,customer_name,ordered_at&rider_id=eq.${encodeURIComponent(riderId)}&order=ordered_at.desc&limit=150`;
  const claimableStatuses = Object.freeze([C.contracts.orderStatus.STORE_ACCEPTED, C.contracts.orderStatus.PREPARING]);
  const availableOrdersPath = () => `delivery_orders?select=id,status,payable,store_name,pickup_address,delivery_address,customer_name,ordered_at&rider_id=is.null&status=in.(${claimableStatuses.map(status => encodeURIComponent(status)).join(',')})&order=ordered_at.asc&limit=100`;

  async function login() {
    document.body.innerHTML = `<main class="mpa-shell" style="min-height:100vh;display:grid;place-items:center"><section class="mpa-card" style="width:min(430px,100%)"><h1>เข้าสู่ระบบไรเดอร์</h1><p class="mpa-muted">ใช้บัญชีไรเดอร์ที่ได้รับสิทธิ์ใน AP Service</p><form id="login"><div class="mpa-field"><label>อีเมล</label><input id="email" type="email" required></div><div class="mpa-field"><label>รหัสผ่าน</label><input id="password" type="password" required></div><button class="mpa-button" style="width:100%">เข้าสู่ระบบไรเดอร์</button></form><p class="mpa-muted"><a href="../rider.html">เปิด Rider fallback เดิม</a></p></section></main>`;
    $('#login').onsubmit = async event => {
      event.preventDefault();
      try {
        const session = await M.auth.signIn($('#email').value.trim(), $('#password').value);
        if (!(await M.auth.rolesFor(session.user.id)).includes('rider')) {
          M.auth.signOut('login.html');
          throw new Error('บัญชีนี้ไม่มีสิทธิ์ไรเดอร์');
        }
        location.assign('dashboard.html');
      } catch (err) { M.ui.setNotice(err.message, 'error'); }
    };
  }

  async function dashboard() {
    const ctx = await gate('dashboard', `<div class="mpa-page-head"><div><h1>ภาพรวมงานไรเดอร์</h1><p>แสดงงานที่ได้รับมอบหมายและสถานะการพร้อมรับงาน</p></div><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></div><div id="content">${M.ui.loading('กำลังโหลดงาน…')}</div>`);
    if (!ctx) return;
    $('#out').onclick = () => M.auth.signOut('login.html');
    const scope = pageScope('rider:dashboard'); const path = ordersPath(ctx.rider.id); let lastSignature = '';
    const render = jobs => {
      const signature = JSON.stringify((jobs || []).map(row => [row.id, row.status, row.ordered_at])); if (signature === lastSignature) return; lastSignature = signature;
      const active = jobs.filter(row => !['สำเร็จแล้ว', 'ยกเลิก'].includes(row.status));
      $('#content').innerHTML = `<div class="mpa-grid stats"><div class="mpa-card mpa-stat"><small>งานที่กำลังดำเนินการ</small><strong>${active.length}</strong></div><div class="mpa-card mpa-stat"><small>สถานะรับงาน</small><strong>${h(ctx.rider.status || '-')}</strong></div><div class="mpa-card mpa-stat"><small>งานทั้งหมด</small><strong>${jobs.length}</strong></div><div class="mpa-card mpa-stat"><small>ยานพาหนะ</small><strong style="font-size:18px">${h(ctx.rider.vehicle || '-')}</strong></div></div><section class="mpa-card" style="margin-top:18px"><a class="mpa-button" href="jobs.html">ดูงานจัดส่ง</a></section>`;
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
      const jobCard = (row, mode) => `<article class="rider-job-card" data-job-id="${h(row.id)}"><div class="rider-job-card__head"><div><p class="rider-eyebrow">${mode === 'available' ? 'งานใหม่สำหรับคุณ' : 'งานที่รับไว้'}</p><h3>${h(row.store_name || 'ยังไม่ระบุร้านค้า')}</h3></div><span class="mpa-badge">${h(row.status || 'ไม่ระบุสถานะ')}</span></div><div class="rider-job-card__route"><div><span>จุดรับ</span><strong>${h(row.pickup_address || 'ยังไม่ระบุจุดรับ')}</strong></div><div><span>ปลายทาง</span><strong>${h(row.delivery_address || 'ยังไม่ระบุปลายทาง')}</strong></div></div><div class="rider-job-card__foot"><span>สร้างรายการ ${h(formatTime(row.ordered_at))}</span><strong>${h(formatMoney(row.payable))}</strong></div>${mode === 'available' ? `<button class="mpa-button" data-claim-job="${h(row.id)}">รับงานนี้</button>` : `<a class="mpa-button mpa-button-secondary" href="delivery.html?id=${encodeURIComponent(row.id)}">เปิดรายละเอียดงาน</a>`}</article>`;
      const assignedCards = assigned.length ? `<div class="rider-job-grid">${assigned.map(row => jobCard(row, 'assigned')).join('')}</div>` : M.ui.empty('ยังไม่มีงานที่รับไว้');
      const availableCards = available.length ? `<div class="rider-job-grid">${available.map(row => jobCard(row, 'available')).join('')}</div>` : M.ui.empty('ยังไม่มีงานใหม่ที่พร้อมรับ');
      $('#list').innerHTML = `<section><div class="mpa-page-head"><div><h2 style="margin:0">งานใหม่ที่พร้อมรับ</h2><p class="mpa-muted">เมื่อกดรับงาน ระบบจะผูกงานกับบัญชีของคุณและเปลี่ยนเป็น “${h(C.contracts.orderStatus.RIDER_PICKUP)}” เพียงครั้งเดียว</p></div><span class="rider-count-chip">${available.length} งาน</span></div>${availableCards}</section><section class="rider-job-section"><div class="mpa-page-head"><div><h2 style="margin:0">งานที่รับไว้แล้ว</h2><p class="mpa-muted">เปิดรายละเอียดเพื่ออัปเดตสถานะและบันทึกหลักฐานการส่งงาน</p></div><span class="rider-count-chip">${assigned.length} งาน</span></div>${assignedCards}</section>`;
      document.querySelectorAll('[data-claim-job]').forEach(button => button.addEventListener('click', async () => {
        const job = available.find(row => row.id === button.dataset.claimJob); if (!job) return;
        const next = C.contracts.orderStatus.RIDER_PICKUP; const transition = C.order.canTransition({ from: job.status, to: next, actor: 'rider' });
        if (!transition.ok) { M.ui.setNotice(transition.reason, 'error'); return; }
        if (!confirm(`รับงานจาก ${job.store_name || 'ร้านค้า'} ใช่หรือไม่?`)) return;
        button.disabled = true; button.textContent = 'กำลังรับงาน…';
        try {
          const claimed = await M.request(`delivery_orders?id=eq.${encodeURIComponent(job.id)}&rider_id=is.null&status=eq.${encodeURIComponent(job.status)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=representation' }, body: JSON.stringify({ rider_id: ctx.rider.id, rider_name: ctx.rider.name, status: next, accepted_at: M.ui.nowIso(), updated_at: M.ui.nowIso() }) });
          if (!Array.isArray(claimed) || !claimed.length) throw new Error('งานนี้ถูกรับหรือเปลี่ยนสถานะโดยไรเดอร์คนอื่นแล้ว');
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
      const rows = await scope.request(`${ordersPath(ctx.rider.id).replace('customer_name,ordered_at', 'customer_name,ordered_at,proof_image')}&id=eq.${encodeURIComponent(id)}`, { private: true, cacheTtlMs: 10_000, cacheKey: `rider-delivery:${ctx.rider.id}:${id}` });
      const job = rows?.[0];
      if (!job) throw new Error('ไม่พบงานหรือบัญชีนี้ไม่มีสิทธิ์');
      const steps = Object.values(C.contracts.orderStatus).filter(next => C.order.canTransition({ from: job.status, to: next, actor: 'rider' }).ok);
      let proofRef = job.proof_image || '';
      $('#job').innerHTML = `<a class="mpa-muted" href="jobs.html">← กลับรายการงาน</a><h1>${h(job.store_name || 'งานจัดส่ง')}</h1><p><span class="mpa-badge">${h(job.status)}</span></p><p><b>จุดรับ:</b> ${h(job.pickup_address || '-')}</p><p><b>จุดส่ง:</b> ${h(job.delivery_address || '-')}</p><p><b>ลูกค้า:</b> ${h(job.customer_name || '-')}</p><section style="margin:18px 0;padding:16px;border:1px solid var(--ap-line);border-radius:14px"><h2 style="margin:0 0 6px">หลักฐานการส่งสินค้า</h2><p class="mpa-muted">เลือกจากคลังหรือถ่ายจากกล้องเท่านั้น ระบบจะบีบอัดเป็น JPEG quality 0.82 ความยาวด้านสูงสุด 1200px (ไม่เกิน 1 MB) ก่อนอัปโหลดในพื้นที่ส่วนตัว</p><label class="mpa-button mpa-button-secondary" style="display:inline-block">เลือกจากคลัง<input id="proofLibrary" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><label class="mpa-button mpa-button-secondary" style="display:inline-block;margin-left:8px">ถ่ายจากกล้อง<input id="proofCamera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden></label><p id="proofStatus" class="mpa-muted" aria-live="polite">${proofRef ? 'มีหลักฐานส่งงานแล้ว สามารถอัปโหลดใหม่เพื่อแทนที่ได้' : 'ยังไม่มีหลักฐานส่งงาน'}</p></section>${steps.length ? `<div class="mpa-field"><label>อัปเดตสถานะงาน</label><select id="next"><option value="">เลือกสถานะ…</option>${steps.map(status => `<option>${h(status)}</option>`).join('')}</select></div><button id="save" class="mpa-button">บันทึกสถานะ</button>` : '<p class="mpa-muted">ไม่มีสถานะถัดไปที่บทบาทไรเดอร์เปลี่ยนได้</p>'}`;
      const uploadProof = async input => {
        const file = input.files?.[0]; if (!file) return; const status = $('#proofStatus');
        try {
          if (!window.APServiceMedia?.uploadPrivateImage) throw new Error('ระบบอัปโหลดหลักฐานยังโหลดไม่พร้อม กรุณารีเฟรชแล้วลองใหม่');
          status.textContent = 'กำลังเตรียมหลักฐาน…'; const session = await M.auth.refreshSession(false);
          if (!session?.access_token || !session?.user?.id) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลด');
          const uploaded = await window.APServiceMedia.uploadPrivateImage(file, { url: M.config.url, publishableKey: M.config.publishableKey, accessToken: session.access_token, actorId: session.user.id, bucket: 'delivery-proofs', scope: job.id, mediaType: 'DELIVERY_PROOF', ownerType: 'rider' });
          proofRef = uploaded.storageRef;
          await M.request(`delivery_orders?id=eq.${encodeURIComponent(job.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ proof_image: proofRef, updated_at: M.ui.nowIso() }) });
          status.textContent = 'อัปโหลด ตรวจสอบ และบันทึกหลักฐานส่งงานแล้ว'; M.ui.setNotice('บันทึกหลักฐานส่งงานแล้ว');
        } catch (err) { input.value = ''; status.textContent = err.message || 'อัปโหลดหลักฐานส่งงานไม่สำเร็จ'; M.ui.setNotice(status.textContent, 'error'); }
      };
      $('#proofLibrary')?.addEventListener('change', event => uploadProof(event.target));
      $('#proofCamera')?.addEventListener('change', event => uploadProof(event.target));
      $('#save')?.addEventListener('click', async () => {
        const next = $('#next').value;
        if (!next) return;
        try {
          await M.request(`delivery_orders?id=eq.${encodeURIComponent(job.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: next, proof_image: proofRef, updated_at: M.ui.nowIso() }) });
          M.ui.setNotice('อัปเดตสถานะงานแล้ว'); setTimeout(() => location.reload(), 350);
        } catch (err) { M.ui.setNotice(err.message, 'error'); }
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
      $('#wallet').innerHTML = `<div class="rider-wallet-workspace__head"><div><p class="rider-eyebrow">กระเป๋าเงินไรเดอร์</p><h2>ยอดเงินและการถอน</h2><p class="mpa-muted">ยอดทั้งหมดคำนวณโดย Supabase จากงานที่ปิดแล้วและคำขอถอนจริง ไม่มีตัวเลขจำลอง</p></div></div><div class="rider-wallet-grid"><article class="rider-wallet-stat rider-wallet-stat--available"><small>พร้อมถอน</small><strong>${h(formatMoney(safeWallet.available_amount))}</strong><span>ยอดที่ยังไม่ถูกผูกกับรอบจ่าย</span></article><article class="rider-wallet-stat"><small>กำลังดำเนินการ</small><strong>${h(formatMoney(safeWallet.processing_amount))}</strong><span>คำขอที่รอตรวจหรืออนุมัติ</span></article><article class="rider-wallet-stat"><small>รับเงินจริงแล้ว</small><strong>${h(formatMoney(safeWallet.paid_amount))}</strong><span>ยอดที่ผู้ดูแลบันทึกว่าโอนแล้ว</span></article><article class="rider-wallet-stat"><small>รายได้สะสมทั้งหมด</small><strong>${h(formatMoney(safeWallet.total_earned))}</strong><span>รวมยอดในกระเป๋าทุกสถานะ</span></article></div><form id="withdrawalForm" class="rider-withdrawal-form"><div><h3>ขอถอนยอดพร้อมถอน</h3><p class="mpa-muted">ระบบจะส่งคำขอเฉพาะยอด <strong>${h(formatMoney(available))}</strong> ที่พร้อมถอน ณ ขณะนี้ และป้องกันการส่งคำขอซ้ำระหว่างรอตรวจ</p></div><label class="mpa-field"><span>หมายเหตุสำหรับผู้ดูแล (ไม่บังคับ)</span><textarea id="withdrawalNote" maxlength="500" rows="2" placeholder="เช่น ช่องทางรับเงินหรือหมายเหตุที่ต้องการแจ้ง"></textarea></label><button id="requestWithdrawal" class="mpa-button" type="submit" ${available > 0 ? '' : 'disabled'}>ส่งคำขอถอนยอดพร้อมถอน</button></form>${requests}`;
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
      const cards = visible.length ? `<div class="rider-earning-grid">${visible.map(row => { const order = row.delivery_orders || {}; const status = normalizedStatus(row.settlement_status); const statusLabel = status === 'settled' ? 'ชำระแล้ว' : status === 'reversed' ? 'ย้อนรายการ' : 'รอยืนยันสถานะ'; return `<article class="rider-earning-card"><div class="rider-earning-card__head"><div><p class="rider-eyebrow">รายการ ${h(row.order_id || order.id || 'ไม่ระบุรหัส')}</p><h3>${h(order.store_name || 'ไม่ระบุร้านค้า')}</h3></div><span class="mpa-badge rider-status-${h(status)}">${h(statusLabel)}</span></div><p class="rider-earning-card__customer">ลูกค้า: ${h(order.customer_name || 'ไม่ระบุ')}</p><dl class="rider-money-breakdown"><div><dt>ส่วนแบ่งไรเดอร์</dt><dd>${h(formatMoney(row.rider_share))}</dd></div><div><dt>ค่าจัดส่ง</dt><dd>${h(formatMoney(row.delivery_fee))}</dd></div><div><dt>ยอดจากรายการ</dt><dd>${h(formatMoney(order.payable))}</dd></div></dl><p class="mpa-muted">ปิดงาน: ${h(formatTime(row.completed_at))}</p></article>`; }).join('')}</div>` : M.ui.empty(statusFilter === 'all' ? 'ยังไม่มีรายการรายได้' : 'ไม่พบรายการตามสถานะที่เลือก');
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
    const ctx = await gate('profile', `<div class="mpa-page-head"><div><h1>โปรไฟล์ไรเดอร์</h1><p>ตั้งค่าสถานะพร้อมรับงานของบัญชีนี้</p></div></div><section id="form" class="mpa-card">${M.ui.loading()}</section>`);
    if (!ctx) return;
    $('#form').innerHTML = `<form id="save" style="max-width:520px"><div class="mpa-field"><label>ชื่อ</label><input id="name" value="${h(ctx.rider.name)}" required></div><div class="mpa-field"><label>โทรศัพท์</label><input id="phone" value="${h(ctx.rider.phone || '')}"></div><div class="mpa-field"><label>สถานะ</label><select id="status"><option ${ctx.rider.status === 'พร้อมรับงาน' ? 'selected' : ''}>พร้อมรับงาน</option><option ${ctx.rider.status === 'ไม่พร้อมรับงาน' ? 'selected' : ''}>ไม่พร้อมรับงาน</option></select></div><button class="mpa-button">บันทึกโปรไฟล์</button></form>`;
    $('#save').onsubmit = async event => {
      event.preventDefault();
      try {
        await M.request(`riders?id=eq.${encodeURIComponent(ctx.rider.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: $('#name').value.trim(), phone: $('#phone').value.trim(), status: $('#status').value, updated_at: M.ui.nowIso() }) });
        M.ui.setNotice('บันทึกโปรไฟล์แล้ว');
      } catch (err) { M.ui.setNotice(err.message, 'error'); }
    };
  }

  async function settings() {
    const ctx = await gate('settings', `<section class="mpa-card"><h1>ตั้งค่าไรเดอร์</h1><p class="mpa-muted">การตั้งค่าหน้านี้มีผลเฉพาะบัญชีของคุณ กฎธุรกิจกลางอยู่ใน Admin Control Plane</p><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></section>`);
    if (ctx) $('#out').onclick = () => M.auth.signOut('login.html');
  }

  ({ login, dashboard, jobs, delivery, earnings, profile, settings }[page] || login)();
})();
