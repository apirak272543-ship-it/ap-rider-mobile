export function getRuntime(root = globalThis) {
  return root;
}

export function requireLegacyValue(name, root = globalThis) {
  const value = root?.[name];
  if (value === undefined || value === null) {
    throw new Error(`ไม่พบ legacy runtime: ${name}`);
  }
  return value;
}

export function optionalLegacyValue(name, root = globalThis) {
  return root?.[name] ?? null;
}
