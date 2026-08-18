export function renderOperationsOrders(root = globalThis, ...args) {
  const renderer = root.APServiceLegacyPages?.renderOperationsOrders;
  if (typeof renderer !== 'function') throw new Error('ไม่พบ legacy page renderer: renderOperationsOrders');
  return renderer(...args);
}
