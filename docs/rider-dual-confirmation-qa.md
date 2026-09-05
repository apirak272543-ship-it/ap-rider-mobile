# Rider Dual-Confirmation QA

ระบบยืนยันสถานะของ Rider ทำงานแบบสองทาง โดย automation ช่วยตรวจตำแหน่งและเปิดปุ่มเมื่อเข้าเงื่อนไข แต่ไม่บังคับให้ Rider ต้องพึ่ง GPS หรือแผนที่เพียงทางเดียว

## พฤติกรรมที่ส่งมอบ

| สถานการณ์ | ปุ่มและผลลัพธ์ |
|---|---|
| ขั้นเดินทางไปร้าน | ระบบติดตาม GPS ได้เมื่อ Rider กดเริ่มใช้ตำแหน่ง และเปิดปุ่มยืนยันอัตโนมัติเมื่อเข้า geofence |
| GPS ค้างหรือแผนที่ไม่โหลด | ปุ่ม `ยืนยันถึงร้านด้วยตนเอง` อยู่ในส่วนขั้นปัจจุบันและกดได้โดยไม่ต้องรอระบบอัตโนมัติ |
| ขั้นอื่นของ order | มีปุ่มยืนยันขั้นปัจจุบันตาม workflow เดิม ไม่เปิดปุ่มของขั้นอนาคต |
| กดซ้ำระหว่างบันทึก | ปุ่มถูก disable ทันทีและมี `statusSaveInFlight` กัน request ซ้ำจากการแตะหลายครั้ง |
| แอปค้างหลัง server บันทึกสำเร็จ | การ retry สถานะเดิมคืน `{ idempotent: true }` จาก `role-access` แทนการแจ้งว่า transition ผิด |
| ระบบแผนที่ throw error | delivery page จับ error แยกไว้ และยังให้ปุ่มยืนยันขั้นตอนด้วยตนเองทำงานต่อได้ |

## Server deployment

`role-access` Edge Function version 49 ถูก deploy ด้วย `verify_jwt=true` และ source-of-truth อยู่ที่ `supabase/functions/role-access/index.ts`

## Validation

ผ่าน syntax checks และ contract tests สำหรับ arrival assist, delivery location, step workflow, active-order lock และ atomic job claim โดยเพิ่ม assertions สำหรับ manual button, in-flight guard, null guard และ idempotent retry response
