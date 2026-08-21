const fs = require('fs');
const assert = require('assert');

const page = fs.readFileSync('rider/delivery.html', 'utf8');
const app = fs.readFileSync('rider/rider-app.js', 'utf8');
const location = fs.readFileSync('rider/rider-delivery-location.js', 'utf8');

assert.match(page, /rider-delivery-location\.js/, 'Delivery page ต้องโหลด GPS/map fallback helper');
assert.match(page, /rider-delivery-location\.css/, 'Delivery page ต้องโหลด GPS/map fallback styles');
assert.match(app, /delivery_location,pickup_location,proof_image/, 'Delivery query ต้องอ่านพิกัดออร์เดอร์');
assert.match(app, /AP\s*RiderDeliveryLocation|APServiceRiderDeliveryLocation|APRiderDeliveryLocation/, 'Delivery runtime ต้อง mount location UX');
assert.match(location, /navigator\.geolocation/, 'ต้องมี GPS verification');
assert.match(location, /distanceMeters/, 'ต้องคำนวณระยะ GPS แบบ client UX');
assert.match(location, /50/, 'ต้องคง legacy threshold reference ที่ 50 เมตร');
assert.match(location, /Google Maps/, 'ต้องมี destination map link');
assert.match(location, /OpenStreetMap/, 'ต้องมี destination map fallback');
assert.match(location, /maps\/dir/, 'ต้องมี fallback เปิดเส้นทางครบจุดรับและจุดส่ง');
assert.match(location, /เปิดเส้นทางจุดรับ → จุดส่ง/, 'Rider ต้องเปิดเส้นทางเดียวจากจุดรับไปจุดส่งได้');
assert.match(location, /riderManualLat/, 'ต้องมี manual coordinate fallback สำหรับ route reference');
assert.match(location, /coordinateValue/, 'ต้องแยกการอ่านพิกัดออกจาก Number โดยตรง');
assert.match(location, /String\(value\)\.trim\(\)/, 'ช่องพิกัดว่างต้องถูกปฏิเสธ ไม่แปลงเป็นศูนย์');
assert.doesNotMatch(location, /delivery_location\s*:/, 'Rider UI ต้องไม่เขียนทับพิกัดปลายทางของลูกค้า');
assert.doesNotMatch(location, /method:\s*['"]PATCH/, 'Rider GPS/map helper ต้องไม่แก้ status หรือข้อมูลออร์เดอร์โดยตรง');

console.log('rider delivery location contract: PASS');
