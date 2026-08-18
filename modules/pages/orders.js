export function renderOrders(root = globalThis, ...args) {
  const renderer = root.APServiceLegacyPages?.renderOrders;
  if (typeof renderer !== 'function') throw new Error('ไม่พบ legacy page renderer: renderOrders');
  return renderer(...args);
}
