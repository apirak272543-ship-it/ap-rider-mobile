const fs = require('fs');
const assert = require('assert');

const page = fs.readFileSync('rider/delivery.html', 'utf8');
const app = fs.readFileSync('rider/rider-app.js', 'utf8');
const media = fs.readFileSync('shared/ap-service-media.js', 'utf8');

assert.match(page, /ap-service-media\.js/, 'Rider delivery route ต้องโหลด Shared Media Service');
assert.match(app, /proofLibrary/, 'Rider ต้องเลือกหลักฐานจากคลังได้');
assert.match(app, /proofCamera/, 'Rider ต้องถ่ายหลักฐานจากกล้องได้');
assert.match(app, /uploadPrivateImage/, 'Rider proof ต้องใช้ private upload API');
assert.match(app, /bucket: 'delivery-proofs'/, 'Rider proof ต้องเก็บใน private bucket ที่ถูกต้อง');
assert.match(app, /proof_image: proofRef/, 'Rider proof ต้องบันทึก reference ระยะยาว ไม่บันทึก signed URL ที่หมดอายุ');
assert.match(media, /createSignedImageUrl/, 'Shared Media ต้องสร้าง signed URL เพื่อตรวจ private upload');
assert.match(media, /storageRef/, 'Shared Media ต้องคืน private storage reference');
assert.match(media, /DEFAULT_MAX_DIMENSION = 1200/, 'Rider media ต้องจำกัดขนาดรูปสูงสุดที่ 1200px');
assert.match(media, /DELIVERY_PROOF: Object\.freeze\(\{ maxDimension: 1200/, 'Rider proof ต้องใช้ media profile 1200px');
assert.match(media, /let quality = 0\.82/, 'Rider media ต้องเริ่มบีบอัดที่ JPEG quality 0.82');
assert.match(media, /const type = 'image\/jpeg'/, 'Rider media ต้องเข้ารหัส output เป็น JPEG เสมอ');

console.log('rider delivery proof contract: PASS');
