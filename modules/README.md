# AP Service Modules

โฟลเดอร์นี้เป็นโครงสร้างเป้าหมายสำหรับ refactor แบบ compatibility-first. หน้า HTML เดิมและ global handlers จะยังคงทำงานระหว่างย้ายโค้ด เพื่อป้องกันการกระทบ Customer/Admin, Rider, Store และ Android WebView wrappers.

| กลุ่ม | ความรับผิดชอบ | กติกา compatibility |
|---|---|---|
| `core/` | runtime, config และ storage adapter | อ่าน runtime เดิมผ่าน facade ไม่เปลี่ยน key หรือ credential |
| `state/` | AppState และ mutation boundary | รักษา object identity ของ `window.AppState` |
| `api/` | Supabase client facades | คง REST paths, headers และ Edge Function payloads |
| `services/` | store, marketplace, support chat, delivery, category workflows | เรียก service เดิมก่อนจนกว่าจะย้าย implementation พร้อม test |
| `utils/` | money, media, location และ UI helpers | เป็นจุดเริ่มต้นการย้ายโค้ดแบบไม่มี side effect |
| `components/` | DOM component helpers | ห้ามเปลี่ยน id, class หรือ inline event contract โดยพลการ |
| `pages/` | render boundary ของแต่ละหน้าและ admin tabs | คง view IDs และ history behavior เดิม |

`legacy-bridge.js` เป็นจุดเดียวที่ module ใหม่ publish API เพิ่มเติมและช่วยตรวจ public handlers เดิม. เมื่อย้าย action ใดจาก inline script ไป module จะต้องใช้ `publishLegacyAction()` เพื่อคง `window.<action>` ชื่อเดิมสำหรับ markup ที่มี `onclick`.

> ห้ามลบ implementation เดิมในไฟล์ HTML จนกว่า action ที่ย้ายจะผ่าน regression contract, browser check และได้รับอนุญาตอย่างชัดเจน.
