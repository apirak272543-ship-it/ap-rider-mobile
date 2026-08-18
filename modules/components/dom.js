export function query(selector, root = document) {
  return root.querySelector(selector);
}

export function queryAll(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function requireElement(selector, root = document) {
  const element = query(selector, root);
  if (!element) throw new Error(`ไม่พบ DOM element: ${selector}`);
  return element;
}
