export function mapUrl(location) {
  return location?.lat !== undefined && location?.lng !== undefined
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.lat + ',' + location.lng)}`
    : '';
}

export function isValidMapPoint(point) {
  return Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))
    && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

export function formatLocationLabel(location) {
  return location?.lat !== undefined && location?.lng !== undefined
    ? `พิกัด ${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)} · บันทึก ${location.capturedAt || 'แล้ว'}`
    : 'ยังไม่ได้ระบุตำแหน่ง GPS';
}
