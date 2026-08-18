function renderLegacyPage(name, root, args) {
  const renderer = root.APServiceLegacyPages?.[name];
  if (typeof renderer !== 'function') throw new Error(`ไม่พบ legacy page renderer: ${name}`);
  return renderer(...args);
}

export function renderFinance(root = globalThis, ...args) {
  return renderLegacyPage('renderFinance', root, args);
}

export function renderWithdrawals(root = globalThis, ...args) {
  return renderLegacyPage('renderWithdrawals', root, args);
}
