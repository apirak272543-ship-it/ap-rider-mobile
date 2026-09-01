# AP Service — Rider Application

รีโพสิตอรีนี้เป็น **Rider Application เท่านั้น** ของ AP Service โดยมี Rider web console แบบ Multi-Page Architecture และองค์ประกอบ runtime สำหรับการใช้งานบนอุปกรณ์เคลื่อนที่ตามแผนการส่งมอบของโปรเจกต์

| Path | หน้าที่ |
|---|---|
| `rider/` | Rider MPA: login, dashboard, งานจัดส่ง, delivery detail, รายได้, โปรไฟล์, แจ้งเตือน และ settings |
| `rider/rider-app.js` | Runtime หลักของ Rider web console: role/compliance gate, งาน, สถานะจัดส่ง, หลักฐาน, wallet และ withdrawal |
| `shared/` | Shared Core, MPA runtime, Supabase client, login UI และ Shared Media Service |
| `tests/` | Rider contract tests สำหรับ auth, งาน, location, proof, finance, notifications และ presence |
| `rider.html` | Legacy Rider Console fallback ที่ถูกอ้างอิงจากเส้นทางเดิม หากมีไฟล์นี้ใน deployment |

แอพไรเดอร์ใช้ Supabase Authentication, RLS, data contracts และ Shared Media Service ร่วมกับ Customer, Admin และ Merchant แต่ไม่รวม application entry point หรือ source code ของบทบาทอื่น

## ขอบเขตฟังก์ชัน

ไรเดอร์สามารถเข้าสู่ระบบด้วยบัญชีที่ Admin สร้างและผูกสิทธิ์ไว้ ตรวจสถานะบัญชีและ compliance ดูงานที่รับมอบหมายหรือรับงานที่พร้อมให้บริการ อัปเดตลำดับสถานะจัดส่ง บันทึกพิกัดและ ETA แนบหลักฐานการส่งสินค้า ดูรายได้และยอดคงเหลือ ขอถอนเงิน ตรวจสอบหลักฐานการโอน จัดการโปรไฟล์ เอกสาร และสถานะพร้อมรับงานได้ โดยการเปลี่ยนแปลงสำคัญส่งผ่าน server action และ RLS ที่กำหนดขอบเขต

## การตรวจสอบ

รีโพสิตอรีนี้เป็น static/Multi-Page codebase ที่มีไฟล์ HTML, JavaScript และ CSS เป็นหลัก ใช้ contract tests ใน `tests/` เป็นหลักฐานการตรวจสอบ ไม่ควรสรุปว่าเป็น Expo project ที่มี `App.tsx` จาก README เพียงอย่างเดียวจนกว่าจะมีไฟล์ mobile shell เพิ่มเข้ามาใน branch ที่ใช้งานจริง
