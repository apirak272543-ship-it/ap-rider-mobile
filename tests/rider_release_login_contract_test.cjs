const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '../rider/rider-app.js'), 'utf8');

assert.ok(app.includes('กรุณากรอกอีเมลและรหัสผ่านให้ครบ'), 'Rider Login ต้องตรวจข้อมูลก่อน sign-in');
assert.ok(app.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่'), 'Rider Login ต้อง map credential error เป็นภาษาไทย');
assert.ok(app.includes('เข้าสู่ระบบ Rider ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'), 'Rider Login ต้องมีข้อความ fallback ปลอดภัย');
assert.ok(!app.includes('ตาม RLS ปัจจุบัน'), 'หน้าสำหรับไรเดอร์ต้องไม่แสดงศัพท์ implementation');

console.log('Rider release-login contract: PASS');
