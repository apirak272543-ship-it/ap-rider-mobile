import { requireLegacyValue } from '../core/runtime.js';

export function getAppState(root = globalThis) {
  return requireLegacyValue('AppState', root);
}

export function mutateAppState(mutator, root = globalThis) {
  const state = getAppState(root);
  const result = mutator(state);
  return result ?? state;
}

export function getCurrentUser(root = globalThis) {
  return getAppState(root).user ?? null;
}
