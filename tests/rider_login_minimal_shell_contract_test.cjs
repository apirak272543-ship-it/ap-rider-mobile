const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('rider/rider-app.js', 'utf8');
assert.match(source, /async function login\(\)/, 'Rider ต้องมี login flow');
assert.match(source, /aria-label="อีเมล"/, 'Rider login ต้องคง label สำหรับ accessibility');
assert.match(source, /aria-label="รหัสผ่าน"/, 'Rider login ต้องคง label สำหรับ accessibility');
assert.doesNotMatch(source, /ใช้บัญชีไรเดอร์ที่ได้รับสิทธิ์ใน AP Service/, 'Rider login ต้องไม่มีข้อความระบบ');
assert.doesNotMatch(source, /เปิด Rider fallback เดิม/, 'Rider login ต้องไม่มีข้อความ fallback ที่ไม่จำเป็น');
console.log('rider login minimal shell contract: PASS');
