const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
assert.match(source, /function confirmSignOut/, 'ต้องมีหน้าต่างยืนยันก่อน logout');
assert.match(source, /ยืนยันการออกจากระบบ/, 'ข้อความยืนยันต้องเป็นภาษาไทย');
assert.match(source, /installLogoutConfirmation/, 'ปุ่ม logout ทุกหน้าต้องถูกดักเพื่อขอยืนยัน');
assert.match(source, /location\.replace\(loginUrl\)/, 'ผู้ไม่มีสิทธิ์ต้องถูกส่งกลับหน้า login');
assert.doesNotMatch(source, /container\.innerHTML = error\('บัญชีนี้ไม่มีสิทธิ์เข้าสู่หน้านี้'/, 'ไม่ต้องค้างหน้าข้อความไม่มีสิทธิ์');
console.log('logout guard contract: PASS');
