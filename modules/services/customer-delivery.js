import { requireLegacyValue } from '../core/runtime.js';

export function getCustomerDelivery(root = globalThis) {
  return requireLegacyValue('CustomerDelivery', root);
}
