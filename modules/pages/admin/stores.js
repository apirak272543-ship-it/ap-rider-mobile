export function renderAdminStores(root = globalThis, ...args) {
  const renderer = root.APServiceLegacyPages?.renderAdminStores;
  if (typeof renderer !== 'function') throw new Error('ไม่พบ legacy page renderer: renderAdminStores');
  return renderer(...args);
}
