const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('rider/rider-app.js', 'utf8');

assert.match(source, /compliance_note/, 'Rider profile ต้องโหลดหมายเหตุจากผล compliance');
assert.match(source, /สถานะเอกสารและสิทธิ์รับงาน/, 'Rider ต้องเห็นสถานะ compliance ในโปรไฟล์');
assert.match(source, /ใบขับขี่หมดอายุ/, 'Rider ต้องเห็นข้อมูลวันหมดอายุใบขับขี่');
assert.match(source, /ประกันหมดอายุ/, 'Rider ต้องเห็นข้อมูลวันหมดอายุประกัน');
assert.match(source, /updateRiderPresence\('availability'/, 'กฎเปิดรับงานเดิมต้องยังสั่งผ่าน server');
console.log('rider compliance profile contract: PASS');
