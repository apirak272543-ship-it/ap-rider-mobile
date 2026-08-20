const fs = require('fs');
const assert = require('assert');

const pulse = fs.readFileSync('rider/rider-gps-pulse.js', 'utf8');
for (const route of ['rider/dashboard.html', 'rider/delivery.html']) assert.match(fs.readFileSync(route, 'utf8'), /rider-gps-pulse\.js/, `${route} ต้องโหลด GPS pulse`);
assert.match(pulse, /navigator\.geolocation/, 'GPS pulse ต้องใช้ geolocation เมื่อผู้ใช้กด');
assert.match(pulse, /update_rider_presence/, 'GPS pulse ต้องใช้ server-authorized rider presence action');
assert.match(pulse, /ฟื้นฟู GPS/, 'GPS pulse ต้องมีปุ่ม recovery เมื่อสัญญาณผิดพลาด');
assert.match(pulse, /enableHighAccuracy: true/, 'GPS pulse ต้องขอความแม่นยำสูงเมื่อตรวจตามคำสั่งผู้ใช้');
assert.match(pulse, /button\.addEventListener\('click'/, 'GPS pulse ต้องไม่ขอ location ก่อนผู้ใช้กด');

console.log('rider gps pulse contract: PASS');
