const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('rider/rider-app.js', 'utf8');
const media = fs.readFileSync('shared/ap-service-media.js', 'utf8');
const profileHtml = fs.readFileSync('rider/profile.html', 'utf8');

assert.match(source, /compliance_note/, 'Rider profile ต้องโหลดหมายเหตุจากผล compliance');
assert.match(source, /สถานะเอกสารและสิทธิ์รับงาน/, 'Rider ต้องเห็นสถานะ compliance ในโปรไฟล์');
assert.match(source, /ใบขับขี่หมดอายุ/, 'Rider ต้องเห็นข้อมูลวันหมดอายุใบขับขี่');
assert.match(source, /ประกันหมดอายุ/, 'Rider ต้องเห็นข้อมูลวันหมดอายุประกัน');
assert.match(source, /updateRiderPresence\('availability'/, 'กฎเปิดรับงานเดิมต้องยังสั่งผ่าน server');
assert.match(media, /pathPrefix = ''/, 'private media helper ต้องรองรับ owner-specific path แบบ opt-in');
assert.match(source, /pathPrefix: `rider-\$\{ctx\.rider\.id\}`/, 'Rider documents ต้องใช้ path prefix ที่ edge function ตรวจได้');
assert.match(source, /documentDraft\[field\] = uploaded\.path/, 'Rider ต้องส่ง path ที่ไม่มี bucket prefix ให้ role-access');
assert.match(profileHtml, /shared-media-v6/, 'Rider profile ต้องโหลด media helper version ล่าสุด');
console.log('rider compliance profile contract: PASS');
