# Mobile visual QA

ทดสอบด้วย viewport กว้าง 390px และตรวจหน้า login กับ fixture ของ UI หลัก ได้แก่ dashboard, jobs, delivery stepper และ earnings

ผลที่ยืนยันได้คือ header มี brand ขนาดกะทัดรัด ไม่ล้นจอ, dashboard เริ่มจากสถานะและงานที่ต้องทำ, order card แสดงรายได้/สถานะ/เส้นทางแบบย่อ, รายละเอียดรองอยู่หลัง disclosure, delivery แสดง stepper แนวตั้งที่อ่านตามลำดับได้, และ bottom navigation อยู่ด้านล่างในระยะนิ้วโป้งพร้อม safe-area padding

การจัดวางไม่มี horizontal overflow ใน screenshot ที่ตรวจ โดย card ยึดความกว้างคอนเทนเนอร์, ปุ่ม action หลักเต็มความกว้างบนมือถือ และข้อมูลรองของ earnings ไม่แย่งพื้นที่กับยอดพร้อมถอน

ไฟล์หลักฐาน: `docs/rider-login-mobile.png` และ `docs/rider-ui-mobile-preview.png`
