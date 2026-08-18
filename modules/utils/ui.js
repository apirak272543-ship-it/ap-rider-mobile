import { requireLegacyValue } from '../core/runtime.js';

let toastTimer = null;

export function renderToast(text, tone = '', root = globalThis) {
  const element = root.document?.querySelector('#toast');
  const message = String(text || '').trim() || 'ดำเนินการเรียบร้อยแล้ว';
  const lower = message.toLowerCase();
  const resolved = tone || (/ไม่สำเร็จ|ไม่สามารถ|ขัดข้อง|ผิดพลาด|ถูกปฏิเสธ|ล้มเหลว|หมดอายุ/.test(lower)
    ? 'error'
    : /กรุณา|คำเตือน|ยังไม่ได้|ไม่พบ|รออนุมัติ/.test(lower) ? 'warning' : 'success');
  if (!element) return;
  element.textContent = message;
  element.className = `toast show is-${resolved}`;
  if (toastTimer) root.clearTimeout(toastTimer);
  toastTimer = root.setTimeout(() => element.classList.remove('show'), 5000);
}

export function createFormDraftUX(root = globalThis) {
  return {
    key: 'apcx_customer_form_drafts_v1',
    read() {
      try { return JSON.parse(root.sessionStorage.getItem(this.key) || '{}'); } catch { return {}; }
    },
    write(value) {
      try { root.sessionStorage.setItem(this.key, JSON.stringify(value)); } catch {}
    },
    save() {
      const value = {};
      root.document.querySelectorAll('input,textarea,select').forEach((field) => {
        if (!field.id || field.type === 'password' || field.type === 'file') return;
        value[field.id] = field.type === 'checkbox' ? field.checked : field.value;
      });
      this.write(value);
    },
    restore() {
      const value = this.read();
      Object.entries(value).forEach(([id, saved]) => {
        const field = root.document.querySelector(`#${id}`);
        if (!field || field.type === 'password' || field.type === 'file') return;
        if (field.type === 'checkbox') field.checked = !!saved;
        else field.value = saved;
      });
    },
    init() {
      this.restore();
      root.document.addEventListener('input', () => this.save(), true);
      root.document.addEventListener('change', () => this.save(), true);
    },
  };
}

export function getUI(root = globalThis) {
  return requireLegacyValue('UI', root);
}

export function toast(text, tone, root = globalThis) {
  return renderToast(text, tone, root);
}

export function showView(name, options, root = globalThis) {
  return getUI(root).showView(name, options);
}
