(() => {
  'use strict';
  const root = window;
  if (root.APServiceSupabaseAuth) return;

  const SUPABASE_URL = 'https://abtsctwfkgzciseppach.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_TyJWnKkbS8vKcQKKAzoqSg_BOguwKRv';
  const LEGACY_KEYS = ['apservice_mpa_session_v1', 'apservice_mpa_session_backup_v1'];
  const path = String(location.pathname || '').toLowerCase();
  // Callback parsing is explicit in ap-service-mpa.js; disabling implicit URL parsing avoids double exchange/verify races.
  const detectSessionInUrl = false;
  const status = { phase: 'INITIALIZING', event: 'INITIAL_SESSION', session: null, error: null };
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const notify = (event, session, error = null) => {
    status.phase = error ? 'ERROR' : event === 'SIGNED_OUT' ? 'UNAUTHENTICATED' : session ? 'AUTHENTICATED' : event === 'INITIAL_SESSION' ? 'UNAUTHENTICATED' : status.phase;
    status.event = event;
    status.session = session || null;
    status.error = error || null;
    root.dispatchEvent(new CustomEvent('apservice:auth-state', { detail: { event, session: status.session, error: status.error } }));
    if (event === 'INITIAL_SESSION' && !error) resolveReady(status.session);
  };
  const parseLegacy = key => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value?.access_token && value?.refresh_token ? value : null; } catch (_) { return null; } };
  const clearLegacy = () => LEGACY_KEYS.forEach(key => { try { localStorage.removeItem(key); } catch (_) {} });

  if (!root.supabase?.createClient) {
    const error = new Error('ไม่พบ Supabase Auth Client');
    status.phase = 'ERROR'; status.error = error; rejectReady(error);
    root.APServiceSupabaseAuth = Object.freeze({ client: null, ready, status });
    return;
  }

  const client = root.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl },
  });
  root.APServiceSupabaseAuth = Object.freeze({ client, ready, status });

  const bootstrap = async () => {
    try {
      const legacy = parseLegacy(LEGACY_KEYS[0]) || parseLegacy(LEGACY_KEYS[1]);
      if (legacy) {
        const { error } = await client.auth.setSession({ access_token: legacy.access_token, refresh_token: legacy.refresh_token });
        if (!error) clearLegacy();
      }
      client.auth.onAuthStateChange((event, session) => notify(event, session));
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (status.event !== 'INITIAL_SESSION') notify('INITIAL_SESSION', data.session);
      else { status.session = data.session || null; status.phase = data.session ? 'AUTHENTICATED' : 'UNAUTHENTICATED'; resolveReady(status.session); }
      return data.session || null;
    } catch (error) {
      status.phase = 'ERROR'; status.error = error; rejectReady(error); throw error;
    }
  };
  void bootstrap();
})();
