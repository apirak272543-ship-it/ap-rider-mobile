import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, BackHandler, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { countAvailableRiderJobs, registerPushToken, Session } from "./src/api";
import { DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, NotificationPreferences, NotificationTone, saveNotificationPreferences } from "./src/notification-settings";
import { notificationToneLabel, notifyNewJob, playRiderNotificationPreview, setupRiderNotifications } from "./src/notifications";
import { applyOtaUpdate, downloadOtaUpdate, OtaResult } from "./src/ota";

const CONSOLE_URL = "https://apirak272543-ship-it.github.io/Apservice-/rider.html";
const SESSION_STORAGE_KEY = "apcx_rider_supabase_session";
const TONES: NotificationTone[] = ["ap_chime", "ap_urgent", "ap_priority"];

const sessionBridge = `
  (function () {
    var key = ${JSON.stringify(SESSION_STORAGE_KEY)};
    function sendSession() {
      try {
        var raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
        if (!raw || !window.ReactNativeWebView) return;
        var parsed = JSON.parse(raw);
        var session = parsed && (parsed.currentSession || parsed);
        if (!session || !session.access_token || !session.user || !session.user.id) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ap-service-session", session: { access_token: session.access_token, refresh_token: session.refresh_token, user: { id: session.user.id, email: session.user.email } } }));
      } catch (_) {}
    }
    sendSession();
    window.addEventListener("load", sendSession);
    window.setInterval(sendSession, 2500);
    true;
  })();
`;

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const pushIssueRef = useRef<string | null>(null);
  const availableJobCountRef = useRef<number | null>(null);
  const preferencesRef = useRef<NotificationPreferences>(preferences);
  const [otaLoading, setOtaLoading] = useState(false);
  const [otaResult, setOtaResult] = useState<OtaResult | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await loadNotificationPreferences();
      let token: string | null = null;
      try { token = await setupRiderNotifications(); }
      catch (error) {
        const message = error instanceof Error ? error.message : "ไม่สามารถตั้งค่าการแจ้งเตือนได้";
        pushIssueRef.current = message;
        Alert.alert("ยังเปิดแจ้งเตือนไม่สำเร็จ", message);
      }
      if (!active) return;
      setPreferences(saved);
      setPushToken(token);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session || !pushToken) return;
    void registerPushToken(session, pushToken, preferences).then(() => { pushIssueRef.current = null; }).catch((error) => {
      const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกอุปกรณ์สำหรับแจ้งเตือนได้";
      if (pushIssueRef.current !== message) { pushIssueRef.current = message; Alert.alert("ยังเชื่อมการแจ้งเตือนไม่สำเร็จ", message); }
    });
  }, [session, pushToken, preferences]);

  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);

  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let polling = false;
    const pollAvailableJobs = async () => {
      if (disposed || polling || AppState.currentState !== "active") return;
      polling = true;
      try {
        const currentCount = await countAvailableRiderJobs(session);
        const previousCount = availableJobCountRef.current;
        availableJobCountRef.current = currentCount;
        if (previousCount !== null && currentCount > previousCount) {
          void notifyNewJob(`งานรอรับเพิ่ม ${currentCount - previousCount} งาน · ขณะนี้มี ${currentCount} งาน`, preferencesRef.current);
        }
      } catch {
        // การตรวจเสียงเป็นงานเสริม จึงไม่ขัดขวาง Rider Console เมื่อเครือข่ายสะดุด
      } finally { polling = false; }
    };
    availableJobCountRef.current = null;
    void pollAvailableJobs();
    const interval = setInterval(() => { void pollAvailableJobs(); }, 5000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") { availableJobCountRef.current = null; void pollAvailableJobs(); }
    });
    return () => { disposed = true; clearInterval(interval); appStateSubscription.remove(); };
  }, [session]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const updatePreferences = async (next: NotificationPreferences) => {
    setPreferences(next);
    await saveNotificationPreferences(next);
    if (session && pushToken) await registerPushToken(session, pushToken, next);
  };

  const checkOta = async () => {
    setOtaLoading(true);
    const result = await downloadOtaUpdate();
    setOtaResult(result);
    setOtaLoading(false);
    if (result.state === "ready") {
      Alert.alert("อัปเดตพร้อมแล้ว", result.message, [{ text: "ภายหลัง", style: "cancel" }, { text: "เริ่มใช้ตอนนี้", onPress: () => { void applyOtaUpdate(); } }]);
      return;
    }
    Alert.alert(result.state === "up-to-date" ? "อัปเดตแอป" : "สถานะ OTA", result.message);
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "ap-service-session" && payload.session?.access_token && payload.session?.user?.id) setSession(payload.session as Session);
    } catch {
      // ข้อความจากหน้าเว็บที่ไม่ใช่ bridge จะไม่กระทบคอนโซล
    }
  };

  if (loadError) return <SafeAreaView style={styles.errorPage}><Text style={styles.errorTitle}>เชื่อม Rider Console ไม่สำเร็จ</Text><Text style={styles.errorText}>ตรวจสอบอินเทอร์เน็ต แล้วลองเชื่อมใหม่อีกครั้ง</Text><Pressable style={styles.primaryButton} onPress={() => { setLoadError(false); webRef.current?.reload(); }}><Text style={styles.primaryText}>ลองใหม่</Text></Pressable></SafeAreaView>;

  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <View style={styles.nativeHeader}><View><Text style={styles.brand}>AP Rider</Text><Text style={styles.caption}>Rider Console · ข้อมูลจริงจาก AP Service</Text></View><View style={styles.headerActions}><Pressable accessibilityLabel="รีเฟรชข้อมูลไรเดอร์" style={styles.iconButton} onPress={() => webRef.current?.reload()}><Text style={styles.iconText}>↻</Text></Pressable><Pressable accessibilityLabel="ตั้งค่าการแจ้งเตือน" style={styles.settingsButton} onPress={() => setSettingsOpen(true)}><Text style={styles.settingsButtonText}>เสียงแจ้งเตือน</Text></Pressable></View></View>
    <View style={styles.webShell}><WebView ref={webRef} source={{ uri: CONSOLE_URL }} originWhitelist={["https://*", "http://*"]} injectedJavaScriptBeforeContentLoaded={sessionBridge} injectedJavaScript={sessionBridge} onMessage={handleMessage} onLoadStart={() => { setIsLoading(true); setLoadError(false); }} onLoadEnd={() => setIsLoading(false)} onError={() => setLoadError(true)} onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)} javaScriptEnabled domStorageEnabled cacheEnabled thirdPartyCookiesEnabled sharedCookiesEnabled pullToRefreshEnabled allowsBackForwardNavigationGestures />{isLoading ? <View style={styles.loadingOverlay}><ActivityIndicator color="#1457D9" /><Text style={styles.loadingText}>กำลังเปิด Rider Console…</Text></View> : null}</View>
    <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>การแจ้งเตือน AP Rider</Text><Text style={styles.sheetSubtitle}>คอนโซลยังใช้ข้อมูลและสิทธิ์เดียวกับเว็บไซต์</Text></View><Pressable style={styles.closeButton} onPress={() => setSettingsOpen(false)}><Text style={styles.closeText}>ปิด</Text></Pressable></View><View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>แจ้งเตือนงานและข้อความใหม่</Text><Text style={styles.settingBody}>เมื่อแอปเปิดอยู่ จะร้องทันทีเมื่อจำนวนงานรอรับใน Rider Console เพิ่มขึ้น</Text></View><Switch value={preferences.enabled} trackColor={{ true: "#1457D9" }} onValueChange={(enabled) => { void updatePreferences({ ...preferences, enabled }); }} /></View><Text style={styles.settingTitle}>เลือกเสียงแจ้งเตือน</Text><View style={styles.toneList}>{TONES.map((tone) => <Pressable key={tone} style={[styles.tone, preferences.tone === tone && styles.toneActive]} onPress={() => { void updatePreferences({ ...preferences, tone }); }}><Text style={[styles.toneText, preferences.tone === tone && styles.toneTextActive]}>{notificationToneLabel(tone)}</Text></Pressable>)}</View><Pressable style={styles.secondaryButton} onPress={() => { void playRiderNotificationPreview(preferences); }}><Text style={styles.secondaryText}>ทดสอบเสียงที่เลือก</Text></Pressable><View style={styles.otaCard}><Text style={styles.settingTitle}>อัปเดตภายในแอป</Text><Text style={styles.settingBody}>ใช้สำหรับแก้ไขหน้าจอและฟังก์ชันที่ไม่เปลี่ยนส่วนระบบ Android</Text>{otaResult ? <Text style={styles.otaText}>{otaResult.message}</Text> : null}<Pressable style={styles.primaryButton} disabled={otaLoading} onPress={() => { void checkOta(); }}><Text style={styles.primaryText}>{otaLoading ? "กำลังตรวจสอบ…" : "ตรวจสอบการอัปเดต"}</Text></Pressable></View></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" }, nativeHeader: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E5E9F3", backgroundColor: "#FFFFFF" }, brand: { color: "#173A78", fontSize: 18, fontWeight: "900" }, caption: { color: "#66748C", fontSize: 10, marginTop: 2 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 8 }, iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF0FF" }, iconText: { color: "#1457D9", fontSize: 20, fontWeight: "800" }, settingsButton: { backgroundColor: "#1457D9", paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11 }, settingsButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 }, webShell: { flex: 1, backgroundColor: "#F7F9FF" }, loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 10 }, loadingText: { color: "#66748C", fontSize: 13 }, errorPage: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "#F7F9FF" }, errorTitle: { color: "#173A78", fontSize: 21, fontWeight: "900", textAlign: "center" }, errorText: { color: "#66748C", textAlign: "center", marginTop: 8, lineHeight: 20 }, primaryButton: { marginTop: 14, backgroundColor: "#1457D9", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" }, primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(9, 18, 40, .35)" }, sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }, sheetTitle: { color: "#173A78", fontSize: 20, fontWeight: "900" }, sheetSubtitle: { color: "#66748C", fontSize: 11, marginTop: 3 }, closeButton: { backgroundColor: "#EAF0FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }, closeText: { color: "#1457D9", fontWeight: "800", fontSize: 12 }, settingRow: { flexDirection: "row", gap: 14, alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#E8ECF5", borderBottomWidth: 1, borderBottomColor: "#E8ECF5", marginBottom: 16 }, settingCopy: { flex: 1 }, settingTitle: { color: "#173A78", fontSize: 14, fontWeight: "900" }, settingBody: { color: "#66748C", fontSize: 11, lineHeight: 17, marginTop: 4 }, toneList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, tone: { borderWidth: 1, borderColor: "#C7D2EE", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 }, toneActive: { borderColor: "#1457D9", backgroundColor: "#1457D9" }, toneText: { color: "#1457D9", fontWeight: "800", fontSize: 11 }, toneTextActive: { color: "#FFFFFF" }, secondaryButton: { borderWidth: 1, borderColor: "#1457D9", marginTop: 12, borderRadius: 12, paddingVertical: 11, alignItems: "center" }, secondaryText: { color: "#1457D9", fontWeight: "900", fontSize: 12 }, otaCard: { backgroundColor: "#F1F5FF", borderRadius: 14, padding: 14, marginTop: 18 }, otaText: { color: "#795800", fontSize: 11, lineHeight: 16, marginTop: 7 },
});
