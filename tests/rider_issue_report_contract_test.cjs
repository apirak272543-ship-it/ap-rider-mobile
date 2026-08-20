const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('rider/delivery.html', 'utf8');
const source = fs.readFileSync('rider/rider-issue-report.js', 'utf8');
assert.match(html, /rider-issue-report\.js/, 'Delivery ต้องโหลด Rider issue report UI');
assert.match(source, /report_rider_delivery_issue/, 'UI ต้องเรียก server-authorized issue action');
assert.match(source, /uploadPrivateImage/, 'รูปหลักฐานต้องใช้ private upload/compression policy');
assert.match(source, /scope: `\$\{orderId\}-issue`/, 'หลักฐานต้องแยก path ตาม order');
assert.match(source, /ยังไม่ย้ายงานหรือเปลี่ยนสถานะออร์เดอร์อัตโนมัติ/, 'รายงานปัญหาต้องไม่เปลี่ยนงานหรือสถานะเอง');
assert.match(source, /รถเสีย \/ ยางรั่ว/, 'ต้องมีประเภทปัญหาตาม operational workflow');

console.log('rider issue report contract: PASS');
