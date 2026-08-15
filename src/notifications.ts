import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import type { NotificationPreferences, NotificationTone } from "./notification-settings";

const toneLabels: Record<NotificationTone, string> = {
  ap_chime: "เสียงกริ่งชัดเจน",
  ap_urgent: "เสียงเร่งด่วน",
  ap_priority: "เสียงสำคัญมาก",
};

export const notificationToneLabel = (tone: NotificationTone) => toneLabels[tone];
export const riderChannelId = (tone: NotificationTone) => `rider-${tone}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

async function createRiderChannels() {
  if (Platform.OS !== "android") return;
  const tones: NotificationTone[] = ["ap_chime", "ap_urgent", "ap_priority"];
  await Promise.all(tones.map((tone) => Notifications.setNotificationChannelAsync(riderChannelId(tone), {
    name: `งานไรเดอร์ · ${toneLabels[tone]}`,
    description: "ใช้สำหรับงานใหม่และสถานะงานของไรเดอร์",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: tone === "ap_priority" ? [0, 350, 160, 350, 160, 350] : [0, 250, 180, 250],
    sound: `${tone}.wav`,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })));
}

export async function setupRiderNotifications() {
  await createRiderChannels();
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;
  try {
    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    return projectId ? (await Notifications.getExpoPushTokenAsync({ projectId })).data : (await Notifications.getExpoPushTokenAsync()).data;
  } catch {
    return null;
  }
}

export async function notifyNewJob(title: string, preferences: NotificationPreferences) {
  if (!preferences.enabled) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: "มีงานใหม่สำหรับคุณ", body: title, sound: `${preferences.tone}.wav`, data: { screen: "jobs", kind: "job" } },
    trigger: Platform.OS === "android" ? { channelId: riderChannelId(preferences.tone) } : null,
  });
}

export async function notifyNewMessage(body: string, preferences: NotificationPreferences) {
  if (!preferences.enabled) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: "มีข้อความใหม่", body, sound: `${preferences.tone}.wav`, data: { screen: "jobs", kind: "message" } },
    trigger: Platform.OS === "android" ? { channelId: riderChannelId(preferences.tone) } : null,
  });
}

export async function playRiderNotificationPreview(preferences: NotificationPreferences) {
  await notifyNewJob("นี่คือตัวอย่างเสียงแจ้งงานใหม่", preferences);
}
