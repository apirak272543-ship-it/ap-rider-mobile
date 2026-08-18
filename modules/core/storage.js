import { requireLegacyValue } from './runtime.js';
import { compressImageForUpload } from '../utils/media.js';

export const WEB_STORAGE_KEYS = Object.freeze([
  'apcx_user', 'apcx_cart', 'apcx_stores', 'apcx_orders', 'apcx_config',
  'apcx_target', 'apcx_mappings', 'apcx_admins', 'apcx_riders',
  'apcx_customers', 'apcx_transactions', 'apcx_cash_ledger',
  'apcx_draft_locations', 'apcx_supabase_session', 'apcx_oauth_after',
  'apcx_customer_form_drafts_v1', 'apcx_location_notice_',
  'apcx_rider_session', 'apcx_rider_supabase_session', 'apcx_rider_wallet',
  'apcx_rider_earnings', 'apcx_rider_payouts', 'apcx_rider_withdrawals',
  'apcx_rider_form_drafts_v1', 'apcx_store_session',
  'apcx_store_supabase_session', 'apcx_store_wallet',
  'apcx_store_settlements', 'apcx_store_withdrawals', 'apcx_store_form_drafts_v1',
]);

const INLINE_IMAGE_RE = /^data:image\//i;
const cacheByStorage = new WeakMap();
const mediaCompactionByStorage = new WeakMap();
const STORE_CACHE_MEDIA_MAX_CHARS = 900000;
const STORE_CACHE_IMAGE_MAX_BYTES = 120000;
const STORE_CACHE_IMAGE_MAX_DIMENSION = 960;

export function isInlineImage(value) {
  return typeof value === 'string' && INLINE_IMAGE_RE.test(value.trim());
}

/**
 * Legacy helper retained for callers that explicitly need a media-free copy.
 * The persistence path no longer calls this helper: UI media must remain visible.
 */
export function stripInlineImages(value, seen = new WeakSet()) {
  if (isInlineImage(value)) return '';
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => stripInlineImages(item, seen));
  const copy = {};
  Object.entries(value).forEach(([key, item]) => {
    copy[key] = stripInlineImages(item, seen);
  });
  return copy;
}

/**
 * Build a small media-safe revision key without copying or stringifying image
 * bytes. This lets repeated saves skip work when the cached slice is unchanged,
 * while the first save keeps the runtime value untouched and an asynchronous
 * cache pass later stores compressed copies of inline UI media.
 */
export function cacheRevision(value, seen = new WeakSet()) {
  if (isInlineImage(value)) {
    const text = value.trim();
    return `inline-image:${text.length}:${text.slice(0, 24)}:${text.slice(-24)}`;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return `${typeof value}:${String(value)}`;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return `[${value.map(item => cacheRevision(item, seen)).join('|')}]`;
  return `{${Object.keys(value).sort().map(key => `${key}:${cacheRevision(value[key], seen)}`).join('|')}}`;
}

export function isQuotaError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return name.includes('quota') || message.includes('quota') || message.includes('exceeded the quota');
}

async function compactMediaForCache(value, seen = new WeakMap()) {
  if (isInlineImage(value)) {
    try {
      if (typeof fetch !== 'function' || typeof File !== 'function') return value;
      const response = await fetch(value);
      const blob = await response.blob();
      const file = new File([blob], 'apservice-cache-image', { type: blob.type || 'image/jpeg' });
      const reduced = await compressImageForUpload(file, {
        maxBytes: STORE_CACHE_IMAGE_MAX_BYTES,
        maxDimension: STORE_CACHE_IMAGE_MAX_DIMENSION,
      });
      return reduced?.dataUrl || value;
    } catch (error) {
      console.warn('AP Service cache image compression skipped', error);
      return value;
    }
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const item of value) copy.push(await compactMediaForCache(item, seen));
    return copy;
  }
  const copy = {};
  seen.set(value, copy);
  for (const [key, item] of Object.entries(value)) copy[key] = await compactMediaForCache(item, seen);
  return copy;
}

export function persistMediaCache(state, localStore = globalThis.localStorage) {
  if (!state || !localStore || !Array.isArray(state.stores)) return Promise.resolve({ ok: false, skipped: true });
  const active = mediaCompactionByStorage.get(localStore);
  if (active) {
    active.state = state;
    return active.promise;
  }
  const job = { state, promise: null };
  job.promise = (async () => {
    try {
      while (job.state) {
        const nextState = job.state;
        job.state = null;
        const compactedStores = await compactMediaForCache(nextState.stores);
        safeSetItem('apcx_stores', compactedStores, localStore, { cache: true });
        if (nextState.config && typeof nextState.config === 'object') {
          const compactedConfig = await compactMediaForCache(nextState.config);
          safeSetItem('apcx_config', compactedConfig, localStore, { cache: true });
        }
      }
      return { ok: true, skipped: false };
    } finally {
      mediaCompactionByStorage.delete(localStore);
    }
  })();
  mediaCompactionByStorage.set(localStore, job);
  return job.promise;
}

function getCache(localStore) {
  if (!localStore || (typeof localStore !== 'object' && typeof localStore !== 'function')) return null;
  let cache = cacheByStorage.get(localStore);
  if (!cache) {
    cache = new Map();
    cacheByStorage.set(localStore, cache);
  }
  return cache;
}

export function safeSetItem(key, value, localStore = globalThis.localStorage, options = {}) {
  const isMediaState = key === 'apcx_stores' || key === 'apcx_config';
  const cache = options.cache ? getCache(localStore) : null;
  const revision = cache ? cacheRevision(value) : null;
  const previous = cache?.get(key);
  if (cache && previous?.revision === revision) return { ok: true, sanitized: false, skipped: true };

  // Preserve compressed media in the cache. Image upload code is responsible for
  // compression before persistence; storage must not blank a valid UI asset.
  const serialized = JSON.stringify(value);
  try {
    localStore.setItem(key, serialized);
    if (cache) cache.set(key, { revision, serialized });
    return { ok: true, sanitized: false, skipped: false, preservedMedia: isMediaState };
  } catch (error) {
    if (!isQuotaError(error)) {
      console.warn(`AP Service storage skipped ${key}`, error);
      return { ok: false, sanitized: false, error };
    }
    // Do not remove existing media on quota pressure. Keeping the previous
    // image-bearing value is safer for the UI than replacing it with blanks.
    try {
      if (cache) cache.set(key, { revision, serialized: null, quotaBlocked: true });
    } catch (cacheError) {
      console.warn(`AP Service could not record storage quota for ${key}`, cacheError);
    }
    console.warn(`AP Service storage quota reached for ${key}; preserving existing media`);
    return { ok: false, sanitized: false, preservedMedia: isMediaState, quota: true, error };
  }
}

export function persistAppState(state, localStore = globalThis.localStorage) {
  const entries = [
    ['apcx_user', state.user],
    ['apcx_cart', state.cart],
    ['apcx_stores', state.stores],
    ['apcx_orders', state.orders],
    ['apcx_config', state.config],
    ['apcx_target', state.storageTarget],
    ['apcx_mappings', state.mappings],
    ['apcx_admins', state.admins],
    ['apcx_riders', state.riders],
    ['apcx_customers', state.customers],
    ['apcx_transactions', state.transactions],
    ['apcx_cash_ledger', state.cashLedger],
    ['apcx_draft_locations', state.draftLocations],
  ];
  const report = {};
  entries.forEach(([key, value]) => { report[key] = safeSetItem(key, value, localStore, { cache: true }); });
  report.apcx_stores_media = persistMediaCache(state, localStore);
  return report;
}

export function clearPersistCache(localStore = globalThis.localStorage) {
  getCache(localStore)?.clear();
}

export function isAdminState(state) {
  return state.admins.includes(state.user?.email?.toLowerCase());
}

export function getStorage(root = globalThis) {
  return requireLegacyValue('Storage', root);
}

export function saveLegacyState(root = globalThis) {
  return getStorage(root).save();
}

export function isLegacyAdmin(root = globalThis) {
  return getStorage(root).isAdmin();
}
