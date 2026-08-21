const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('rider/rider-app.js', 'utf8');
const jobs = fs.readFileSync('rider/jobs.html', 'utf8');
const earnings = fs.readFileSync('rider/earnings.html', 'utf8');
const delivery = fs.readFileSync('rider/delivery.html', 'utf8');

assert.match(app, /rider-job-card/, 'Jobs ต้อง render เป็น card UI แทน raw table');
assert.match(app, /data-claim-job/, 'Jobs card ต้องรักษา action รับงานเดิม');
assert.match(app, /delivery\.html\?id=/, 'Jobs card ต้องรักษา route เปิดรายละเอียดงาน');
assert.match(app, /C\.order\.canTransition/, 'Jobs ต้องรักษา canonical transition guard');
assert.match(app, /rider_earnings\?select=order_id,rider_id,delivery_fee,rider_share,platform_share,settlement_status,completed_at,delivery_orders/, 'Earnings ต้องใช้ projection ที่ยืนยันจาก central backend');
assert.match(app, /data-earning-filter/, 'Earnings ต้องมี UI กรองสถานะ');
assert.match(app, /ข้อมูลยอดไม่พร้อม/, 'Earnings ต้องแสดง unavailable state เมื่อยอดจริงไม่พร้อม');
assert.doesNotMatch(app, /JSON\.stringify\(rows, null, 2\)/, 'Earnings ต้องไม่แสดง raw JSON');
assert.match(app, /rider-earnings:\$\{ctx\.rider\.id\}/, 'Earnings background refresh ต้องมี cache key แยกตามไรเดอร์');
assert.match(jobs, /rider-app\.js\?v=rider-ui-v2/, 'Jobs route ต้อง cache-bust application asset ใหม่');
assert.match(earnings, /rider-app\.js\?v=rider-finance-v1/, 'Earnings route ต้อง cache-bust application asset เวอร์ชัน Finance ใหม่');
assert.match(delivery, /ap-service-media\.js\?v=shared-media-v5/, 'Delivery route ต้อง cache-bust media asset ใหม่');
assert.match(app, /forceFresh: true, cacheTtlMs: 10_000, cacheKey: `rider-delivery:/, 'Delivery detail ต้อง forceFresh เพื่อไม่ใช้ cache ก่อน assignment');
assert.match(app, /if \(!rows\?\.\[0\]\) \{\s*for \(let attempt = 0; attempt < 3/, 'Delivery detail ต้องมี server-read recovery retry เมื่อ page scope ได้ข้อมูลว่าง');

console.log('rider jobs and earnings contract: PASS');
