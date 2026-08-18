export function renderContent(root = globalThis, ...args) {
  const renderer = root.APServiceLegacyPages?.renderContent;
  if (typeof renderer !== 'function') throw new Error('ไม่พบ legacy page renderer: renderContent');
  return renderer(...args);
}
