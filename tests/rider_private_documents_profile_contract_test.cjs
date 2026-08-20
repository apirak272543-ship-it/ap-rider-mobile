const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('rider/rider-app.js', 'utf8');

assert.match(source, /riderDocuments/, 'Rider profile ต้องมี form ส่งเอกสาร');
assert.match(source, /uploadPrivateImage/, 'เอกสาร Rider ต้องอัปโหลดผ่าน Shared Media Service private');
assert.match(source, /bucket: 'rider-documents'/, 'Rider ต้องส่งเข้า private bucket ที่ถูกต้อง');
assert.match(source, /updateRiderPresence\('documents'/, 'Rider ต้องบันทึกเอกสารผ่าน server action');
assert.match(source, /ไม่เกิน 1 MB/, 'UI ต้องบอกข้อจำกัดขนาดเอกสาร');
console.log('rider private documents profile contract: PASS');
