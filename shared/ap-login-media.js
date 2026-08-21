/* AP Login Media — additive runtime, no login blocking. */
(function () {
  'use strict';
  const APP = document.documentElement.dataset.loginApp || document.body?.dataset?.loginApp || 'all';
  const URL = 'https://abtsctwfkgzciseppach.supabase.co';
  const KEY = 'sb_publishable_TyJWnKkbS8vKcQKKAzoqSg_BOguwKRv';
  const SESSION_KEY = 'apservice_mpa_session_v1';
  const cacheKey = `ap_login_media_${APP}`;
  const safe = (value) => String(value || '').replace(/[<>"']/g, '');
  function sessionToken() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.access_token || ''; } catch { return ''; } }
  function valid(row) {
    const now = Date.now();
    return row && row.is_active !== false && (!row.starts_at || Date.parse(row.starts_at) <= now) && (!row.ends_at || Date.parse(row.ends_at) > now) && /^https?:\/\//i.test(row.public_url || '');
  }
  function cached() { try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; } }
  function store(rows) { try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), rows })); } catch {} }
  async function fetchRows() {
    const token = sessionToken();
    if (!token) return [];
    const response = await fetch(`${URL}/rest/v1/rpc/login_resolve_background_media`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_target_app: APP }), signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error(`login media ${response.status}`);
    const rows = await response.json();
    return Array.isArray(rows) ? rows.filter(valid) : [];
  }
  function apply(row) {
    if (!row) return;
    const layer = document.querySelector('[data-login-media-layer]') || (() => { const el = document.createElement('div'); el.dataset.loginMediaLayer = ''; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); return el; })();
    layer.style.setProperty('--login-media-opacity', String(Number(row.overlay_opacity ?? 0.18)));
    layer.style.backgroundImage = `url("${safe(row.public_url)}")`;
    layer.dataset.mediaKind = row.media_kind || 'static_image';
    document.documentElement.classList.add('has-login-media');
  }
  function isLoginContext() {
    return /(^|\/)login\.html$/i.test(location.pathname) || !!document.querySelector('#signin-form,#login-form,#loginForm,#loginEmail,#email[type="email"],input[type="password"]');
  }
  async function init() {
    if (!isLoginContext()) return;
    const previous = cached();
    if (previous?.rows?.length && valid(previous.rows[0])) apply(previous.rows[0]);
    try { const rows = await fetchRows(); store(rows); if (rows[0]) apply(rows[0]); } catch (error) { console.info('[AP Login Media] fallback', error?.message || error); }
  }
  window.APLoginMedia = Object.freeze({ init, apply, cacheKey });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  new MutationObserver(() => { if (isLoginContext() && !document.documentElement.classList.contains('has-login-media')) init(); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* AP Login UI v1 — icons, state feedback and motion; auth remains app-owned. */
(function () {
  'use strict';
  const ICONS = Object.freeze({
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="m4 7 8 6 8-6"></path></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path><path d="M12 14v3"></path></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z"></path><path d="m9 12 2 2 4-4"></path></svg>',
    store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v9h16v-9"></path><path d="M3 10 5 4h14l2 6"></path><path d="M3 10c1.5 1.4 3 1.4 4.5 0 1.5 1.4 3 1.4 4.5 0 1.5 1.4 3 1.4 4.5 0 1.5 1.4 3 1.4 4.5 0"></path><path d="M9 19v-5h6v5"></path></svg>',
    rider: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="17" r="2"></circle><circle cx="18" cy="17" r="2"></circle><path d="M9 17h7l-2-6h-3l-2 3H7"></path><path d="M13 8h3l2 3"></path></svg>',
    retail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4z"></path><path d="M3 10 5 4h14l2 6"></path><path d="M8 14h8"></path><path d="M8 17h5"></path></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.2 3.8"></path><path d="M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 20H3L12 3Z"></path><path d="M12 9v5"></path><path d="M12 17h.01"></path></svg>'
  });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function statusNode(form) { return form?.querySelector('[data-login-status]') || form?.parentElement?.querySelector('[data-login-status]'); }
  function buttonNode(form) { return form?.querySelector('[data-login-submit],button[type="submit"]'); }
  function setStatus(form, message, state = '') { const node = statusNode(form); if (!node) return; node.className = `ap-login-status${state ? ` is-${state}` : ''}`; node.textContent = message || ''; node.setAttribute('role', state === 'error' ? 'alert' : 'status'); }
  function setPanelState(form, state = '') { const panel = form?.closest('[data-login-panel],.ap-login-card,.ap-login-panel,.auth-card'); if (!panel) return; panel.classList.remove('is-error', 'is-success'); if (state) panel.classList.add(`is-${state}`); }
  function recover(form) { const button = buttonNode(form); if (!button) return; button.disabled = false; if (button.dataset.originalLabel) button.textContent = button.dataset.originalLabel; form?.classList.remove('is-submitting'); }
  function showError(form, message) { setPanelState(form, 'error'); setStatus(form, message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่', 'error'); recover(form); window.setTimeout(() => setPanelState(form, ''), 520); }
  async function showSuccess(form, message = 'เข้าสู่ระบบสำเร็จ') { setPanelState(form, 'success'); setStatus(form, message, 'success'); const burst = document.createElement('div'); burst.className = 'ap-login-success-burst'; burst.setAttribute('aria-hidden', 'true'); document.body.append(burst); window.setTimeout(() => burst.remove(), 440); await wait(280); }
  function enhance(form) {
    if (!form || form.dataset.loginEnhanced === 'true') return form;
    form.dataset.loginEnhanced = 'true';
    form.addEventListener('submit', () => { const button = buttonNode(form); if (button) { button.dataset.originalLabel ||= button.textContent; button.disabled = true; button.textContent = 'กำลังตรวจสอบ…'; } setStatus(form, 'กำลังตรวจสอบสิทธิ์บัญชี…', 'loading'); }, true);
    form.querySelectorAll('[data-password-toggle]').forEach(toggle => { const input = form.querySelector(`#${toggle.getAttribute('aria-controls')}`) || toggle.closest('.ap-login-control')?.querySelector('input'); if (!input) return; toggle.addEventListener('click', () => { const visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; toggle.innerHTML = visible ? ICONS.eye : ICONS.eyeOff; toggle.setAttribute('aria-label', visible ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน'); }); });
    return form;
  }
  window.APLoginUI = Object.freeze({ icon: name => ICONS[name] || '', enhance, setStatus, showError, showSuccess, recover });
})();
