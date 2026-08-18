# AP Service — Rider

Repository นี้เป็น **Rider Application เท่านั้น** ของ AP Service โดยมีทั้ง Expo mobile shell และ Rider web console แบบ Multi-Page Architecture

| Path | หน้าที่ |
|---|---|
| `App.tsx`, `src/` | Mobile shell, notification, OTA และ session bridge สำหรับ Rider |
| `rider/` | Rider MPA: dashboard, jobs, delivery, earnings, profile และ settings |
| `rider.html` | Legacy Rider Console fallback |
| `shared/` | Shared Core, MPA runtime และ Shared Media Service |

Repository นี้ใช้ Supabase, Auth, RLS และ data contracts ร่วมกับ Customer, Admin และ Merchant แต่ไม่รวม application entry point ของบทบาทอื่น
