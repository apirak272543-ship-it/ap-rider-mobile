import { requireLegacyValue } from '../core/runtime.js';

export function getSupportChat(root = globalThis) {
  return requireLegacyValue('SupportChat', root);
}
