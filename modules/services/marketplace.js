import { requireLegacyValue } from '../core/runtime.js';

export function getMarketplace(root = globalThis) {
  return requireLegacyValue('Marketplace', root);
}
