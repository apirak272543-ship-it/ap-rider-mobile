// Inline Base64 adds roughly 33% overhead; 720 KB raw stays below the 1 MB database limit.
export const IMAGE_UPLOAD_MAX_BYTES = 720000;
export const IMAGE_UPLOAD_MAX_DIMENSION = 1600;

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(blob);
  });
}

export function loadImageForCompression(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่ใช้งานได้')); };
    image.src = url;
  });
}

export async function compressImageForUpload(file, {
  maxBytes = IMAGE_UPLOAD_MAX_BYTES,
  maxDimension = IMAGE_UPLOAD_MAX_DIMENSION,
} = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
  if (file.size <= maxBytes) return { dataUrl: await blobToDataUrl(file), bytes: file.size, originalBytes: file.size, compressed: false };
  if (file.size > 40 * 1000000) throw new Error('รูปภาพมีขนาดเกิน 40 MB กรุณาเลือกรูปที่เล็กลง');
  const image = await loadImageForCompression(file);
  let bound = Math.min(maxDimension, Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  let quality = 0.88;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ratio = Math.min(1, bound / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true });
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (blob && blob.size <= maxBytes) return { dataUrl: await blobToDataUrl(blob), bytes: blob.size, originalBytes: file.size, compressed: true, width, height };
    if (quality > 0.5) quality = Math.max(0.48, quality - 0.1);
    else { bound = Math.max(480, Math.round(bound * 0.78)); quality = 0.82; }
  }
  throw new Error('ไม่สามารถบีบอัดรูปให้อยู่ในขนาดปลอดภัยก่อนแปลงเป็นข้อมูลในระบบได้ กรุณาเลือกรูปที่เล็กลง');
}
