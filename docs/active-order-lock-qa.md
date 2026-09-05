# Active-order lock mobile QA

ทดสอบ fixture ที่ viewport 390 x 844 px

ผลการตรวจ: header แสดงร้านและสถานะกำลังทำงาน, focus banner แสดงว่าเมนูอื่นถูกพักและมีลิงก์กลับไปทำงาน, card งานปัจจุบันแสดง action หลักเต็มความกว้าง, ข้อความอธิบาย lock อ่านได้โดยไม่ล้นจอ และ bottom navigation เหลือเพียงงานปัจจุบันกับเมนูถูกล็อก

หลักการที่ตรวจ: ระหว่างมี order active ไม่แสดงทางลัดไป earnings/profile/settings/งานใหม่; primary action เดียวคือทำขั้นตอนถัดไป; การออกจากระบบยังอยู่ในเมนูรองเพื่อไม่บังคับให้ผู้ใช้ค้างอยู่ใน session หากอุปกรณ์ถูกส่งต่อ

## Production guard

The Supabase migration `20260905085000_single_active_rider_order.sql` was applied to project `abtsctwfkgzciseppach`. It creates `prevent_rider_multiple_active_orders()` and `claim_delivery_order(...)`, using a per-rider advisory transaction lock. The `role-access` Edge Function was deployed as version 46 with `claim` support and `verify_jwt=true`.

The active-order policy allows only the current delivery flow while an order is active. The Rider may use the delivery detail, step progression, route/location widget, delivery proof, issue reporting, and sign out. Dashboard, available jobs, earnings, notifications, profile, settings, and legacy navigation are disabled until the order reaches `สำเร็จแล้ว` or `ยกเลิก`.

## Gated workflow mobile QA

ทดสอบ fixture ที่ viewport 390 x 844 px หลังเปลี่ยน delivery detail เป็นทีละขั้น ผลคือภาพรวมแสดง `1/5` และชื่อครบ 5 ขั้นเพื่อให้ Rider รู้บริบท แต่มีเพียง `เดินทางไปที่ร้าน` ที่มีสีเด่น ข้อความ `กำลังทำตอนนี้` และปุ่มยืนยันเต็มความกว้าง ส่วนสี่ขั้นถัดไปใช้ไอคอนล็อกพร้อมข้อความ `ทำขั้นก่อนหน้าให้เสร็จก่อน` ทำให้ไม่ชวนให้กดข้ามขั้นและไม่เกิด horizontal overflow
