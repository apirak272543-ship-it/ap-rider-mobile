# AP Rider UX findings

## หลักการจาก Google Material 3

1. Navigation bar เหมาะกับหน้าจอ compact และควรมีปลายทางหลัก 3–5 รายการที่มีความสำคัญใกล้เคียงกัน โดยปลายทางควรคงที่ข้ามหน้าจอ [https://m3.material.io/components/navigation-bar](https://m3.material.io/components/navigation-bar)
2. Bottom sheet ใช้สำหรับเนื้อหารองหรือข้อมูลเพิ่มเติม ไม่ควรแย่งความสนใจจากเนื้อหาหลัก และ modal bottom sheet ใช้เมื่อจำเป็นต้องยืนยันหรือทำ action ให้เสร็จก่อน [https://m3.material.io/components/bottom-sheets](https://m3.material.io/components/bottom-sheets)
3. Material Design 3 เน้นระบบที่ใช้งานได้ อ่านง่าย และปรับตามขนาดหน้าจอ โดยมี expressive components เช่น toolbars และ progress indicators ที่ช่วยสื่อสถานะของกระบวนการ [https://m3.material.io/](https://m3.material.io/)

## ข้อกำหนด mobile-first ของผู้ใช้

- มือถือเป็นอุปกรณ์หลัก ต้องออกแบบที่ความกว้างประมาณ 320–430px ก่อน แล้วค่อยขยายไป tablet/desktop
- ต้องรองรับการใช้งานมือเดียว ปุ่ม action หลักอยู่ใกล้ thumb zone และมีพื้นที่กดที่ชัดเจน
- เมนูหลักควรเหลือ 4–5 รายการ เช่น ภาพรวม, งาน, รายได้, แจ้งเตือน และเมนูเพิ่มเติม ส่วนโปรไฟล์/ตั้งค่า/ระบบเดิมอยู่ในเมนูรอง
- รายการ order ใช้ summary card ที่เห็นเฉพาะร้าน สถานะ ยอด และ action หลัก ส่วนที่อยู่เต็ม, dispatch note, ETA และรายละเอียดรองอยู่ใน disclosure
- หน้า detail ใช้ stepper: แสดง action ถัดไปเพียงขั้นตอนเดียว; ขั้นตอนถัดไปจะปรากฏเมื่อขั้นตอนก่อนหน้าสำเร็จ
- หน้า earnings แสดงยอดพร้อมถอนและ action ถอนเป็น primary content; ประวัติคำขอถอนและ breakdown รายการอยู่ในส่วนรอง/expandable
- การแก้ไขต้องทำที่ source of truth ไม่เพิ่ม CSS/JS override layer ซ้อนบนของเดิม
