export function renderAdminRiders(root = globalThis, ...args) {
  const renderer = root.APServiceLegacyPages?.renderAdminRiders;
  if (typeof renderer !== 'function') throw new Error('ไม่พบ legacy page renderer: renderAdminRiders');
  return renderer(...args);
}
