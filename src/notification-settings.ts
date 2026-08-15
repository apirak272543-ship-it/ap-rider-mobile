import * as SecureStore from "expo-secure-store";

export type NotificationTone = "ap_chime" | "ap_urgent" | "ap_priority";
export type NotificationPreferences = { enabled: boolean; tone: NotificationTone };

const KEY = "ap_rider_notification_preferences_v1";
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { enabled: true, tone: "ap_urgent" };

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<NotificationPreferences>;
    return {
      enabled: parsed.enabled !== false,
      tone: parsed.tone === "ap_chime" || parsed.tone === "ap_priority" || parsed.tone === "ap_urgent" ? parsed.tone : "ap_urgent",
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(next: NotificationPreferences) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}
