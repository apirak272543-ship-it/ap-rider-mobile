import { requireLegacyValue } from '../core/runtime.js';

const PUBLIC_READ_PATH = /^(catalog_|store_categories|menu_categories|menu_option_groups|menu_option_values|marketplace_listings|platform_configs)/;

export function getSupabaseSync(root = globalThis) {
  return requireLegacyValue('SupabaseSync', root);
}

export function getSupabaseAdminSync(root = globalThis) {
  return requireLegacyValue('SupabaseAdminSync', root);
}

function isPublicRead(path, options = {}) {
  return String(options.method || 'GET').toUpperCase() === 'GET' && PUBLIC_READ_PATH.test(String(path));
}

function publicHeaders(client, options = {}) {
  const config = client.config();
  const headers = { apikey: config.publishableKey, ...(options.headers || {}) };
  delete headers.Authorization;
  delete headers.authorization;
  return headers;
}

export async function performSupabaseRequest(path, options = {}, root = globalThis) {
  const client = getSupabaseSync(root);
  const config = client.config();
  if (!config.url || !config.publishableKey) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const send = (headers = { ...client.headers(options.body !== undefined), ...(options.headers || {}) }) => root.fetch(config.url + '/rest/v1/' + path, {
    ...options,
    headers,
  });
  let response = await send();
  if (response.status === 401 && isPublicRead(path, options)) {
    response = await send(publicHeaders(client, options));
  } else if (response.status === 401) {
    await client.refreshSession(true);
    response = await send();
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.hint || 'Supabase HTTP ' + response.status);
  return data;
}

export function requestSupabase(path, options, root = globalThis) {
  return performSupabaseRequest(path, options, root);
}
