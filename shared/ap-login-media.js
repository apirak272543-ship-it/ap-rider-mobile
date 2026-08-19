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
