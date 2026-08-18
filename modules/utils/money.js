export function money(value) {
  return '฿' + Number(value || 0).toLocaleString('th-TH');
}

export function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[char]));
}

export function nowLabel() {
  return new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function bytesLabel(bytes) {
  return bytes < 1000 ? `${bytes} B` : bytes < 1000000 ? `${(bytes / 1000).toFixed(0)} KB` : `${(bytes / 1000000).toFixed(2)} MB`;
}
