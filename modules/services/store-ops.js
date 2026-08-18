import { requireLegacyValue } from '../core/runtime.js';

export function bangkokMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (kind) => Number(parts.find((part) => part.type === kind)?.value || 0);
  return get('hour') * 60 + get('minute');
}

export function timeToMinutes(value) {
  const [hour, minute] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

export function calculateStoreState(store) {
  if (!store?.active) return { open: false, label: 'ปิดร้านชั่วคราว' };
  if (store.emergencyClosed) return { open: false, label: store.emergencyNote || 'ปิดร้านฉุกเฉิน' };
  const open = timeToMinutes(store.openTime || store.open_time || '00:00');
  const close = timeToMinutes(store.closeTime || store.close_time || '23:59');
  const cutoff = Math.max(0, Number(store.cutoffMinutes ?? store.order_cutoff_minutes ?? 30));
  const now = bangkokMinutes();
  if (close <= open) return { open: false, label: 'ยังไม่ได้ตั้งเวลาเปิด–ปิดร้าน' };
  if (now < open) return { open: false, label: `เปิดรับเวลา ${String(store.openTime || store.open_time).slice(0, 5)}` };
  if (now >= close - cutoff) return { open: false, label: `หยุดรับแล้วเพื่อเตรียมปิดร้าน ${String(store.closeTime || store.close_time).slice(0, 5)}` };
  return { open: true, label: `เปิดรับถึง ${String(store.closeTime || store.close_time).slice(0, 5)} (ตัดรับก่อน ${cutoff} นาที)` };
}

export function getStoreOps(root = globalThis) {
  return requireLegacyValue('StoreOps', root);
}

export function getStoreState(store, root = globalThis) {
  return calculateStoreState(store) || getStoreOps(root).state(store);
}
