import { requireLegacyValue } from '../core/runtime.js';

export function getCategoryUX(root = globalThis) {
  return requireLegacyValue('CategoryUX', root);
}
