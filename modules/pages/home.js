function renderLegacyPage(name, root, args) {
  const renderer = root.APServiceLegacyPages?.[name];
  if (typeof renderer !== 'function') throw new Error(`ไม่พบ legacy page renderer: ${name}`);
  return renderer(...args);
}

export function renderHome(root = globalThis, ...args) {
  return renderLegacyPage('renderHome', root, args);
}

export function renderStores(root = globalThis, ...args) {
  return renderLegacyPage('renderStores', root, args);
}

export function renderPromotions(root = globalThis, ...args) {
  return renderLegacyPage('renderPromotions', root, args);
}
