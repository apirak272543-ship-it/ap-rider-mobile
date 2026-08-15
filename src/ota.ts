import * as Updates from "expo-updates";

export type OtaResult =
  | { state: "not-configured"; message: string }
  | { state: "up-to-date"; message: string }
  | { state: "ready"; message: string }
  | { state: "failed"; message: string };

export async function downloadOtaUpdate(): Promise<OtaResult> {
  if (!Updates.isEnabled) {
    return { state: "not-configured", message: "OTA จะพร้อมใช้งานหลังติดตั้ง APK รุ่นที่ตั้งค่าช่องอัปเดตแล้ว" };
  }
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { state: "up-to-date", message: "แอปของคุณเป็นเวอร์ชันล่าสุดแล้ว" };
    await Updates.fetchUpdateAsync();
    return { state: "ready", message: "ดาวน์โหลดอัปเดตแล้ว เลือกเริ่มใช้งานเพื่อเปิดแอปรุ่นใหม่" };
  } catch {
    return { state: "failed", message: "ตรวจอัปเดตไม่สำเร็จ โปรดตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง" };
  }
}

export async function applyOtaUpdate() {
  if (Updates.isEnabled) await Updates.reloadAsync();
}
