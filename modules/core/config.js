import { optionalLegacyValue } from './runtime.js';

export const DEFAULT_MODULE_CONFIG = Object.freeze({
  moduleVersion: 'compatibility-first-v1',
  storagePrefix: 'apcx_',
});

export function getLegacyConfig(root = globalThis) {
  return optionalLegacyValue('AppState', root)?.config ?? null;
}

export function getSupabaseConfig(root = globalThis) {
  return getLegacyConfig(root)?.supabase ?? null;
}
