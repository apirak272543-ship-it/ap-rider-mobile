import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { acceptJob, clearSession, ensureRider, fetchEarnings, listJobs, loadSession, Order, Rider, RiderEarning, Session, setOrderStatus, signIn, updateRiderLocation, updateRiderStatus, registerPushToken } from "./src/api";
import { DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, NotificationPreferences, NotificationTone, saveNotificationPreferences } from "./src/notification-settings";
import { notificationToneLabel, notifyNewJob, playRiderNotificationPreview, setupRiderNotifications } from "./src/notifications";
import { applyOtaUpdate, downloadOtaUpdate, OtaResult } from "./src/ota";

type Tab = "งาน" | "รายได้" | "โปรไฟล์";
const TONES: NotificationTone[] = ["ap_chime", "ap_urgent", "ap_priority"];
const money = (value: number) => `฿${Number(value || 0).toLocaleString("th-TH")}`;
const maps = (location?: { lat: number; lng: number } | null) => location ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}` : "";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState<RiderEarning[]>([]);
  const [tab, setTab] = useState<Tab>("งาน");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [seenJobs, setSeenJobs] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [otaLoading, setOtaLoading] = useState(false);
  const [otaResult, setOtaResult] = useState<OtaResult | null>(null);

  const active = mine.filter((order) => !["สำเร็จแล้ว", "ยกเลิก"].includes(order.status));
  const todayKey = new Date().toISOString().slice(0, 10);
  const settledEarnings = earnings.filter((earning) => earning.settlement_status === "settled");
  const todayEarnings = settledEarnings.filter((earning) => earning.completed_at.slice(0, 10) === todayKey);
  const todayRiderShare = todayEarnings.reduce((sum, earning) => sum + Number(earning.rider_share || 0), 0);
  const walletBalance = settledEarnings.reduce((sum, earning) => sum + Number(earning.rider_share || 0), 0);
  const todayCod = mine.filter((order) => order.status === "สำเร็จแล้ว" && order.completed_at?.slice(0, 10) === todayKey).reduce((sum, order) => sum + Number(order.payable || order.total || 0), 0);

  const refresh = async (activeSession = session, activeRider = rider, withNotice = true) => {
    if (!activeSession || !activeRider) return;
    setRefreshing(true);
    try {
      const [jobs, income] = await Promise.all([listJobs(activeSession, activeRider), fetchEarnings(activeSession, activeRider)]);
      const newOnes = jobs.available.filter((job) => !seenJobs.has(job.id));
      if (seenJobs.size && newOnes.length) await notifyNewJob(`${newOnes.length} งานรอรับใกล้คุณ`, preferences);
      setSeenJobs(new Set(jobs.available.map((job) => job.id)));
      setAvailable(jobs.available);
      setMine(jobs.mine);
      setEarnings(income);
      if (withNotice) Alert.alert("อัปเดตแล้ว", "รายการงานและรายได้เป็นข้อมูลล่าสุด");
    } catch (error) {
      Alert.alert("รีเฟรชไม่สำเร็จ", error instanceof Error ? error.message : "ตรวจสอบอินเทอร์เน็ต");
    } finally {
      setRefreshing(false);
    }
  };

  const boot = async (saved?: Session | null) => {
    const next = saved || await loadSession();
    if (!next) {
      setLoading(false);
      return;
    }
    try {
      const [profile, savedPreferences] = await Promise.all([ensureRider(next), loadNotificationPreferences()]);
      setSession(next);
      setRider(profile);
      setPreferences(savedPreferences);
      await refresh(next, profile, false);
      const token = await setupRiderNotifications();
      if (token) {
        setPushToken(token);
        await registerPushToken(next, token, savedPreferences);
      }
    } catch (error) {
      await clearSession();
      Alert.alert("ไม่สามารถเข้าสู่ระบบไรเดอร์", error instanceof Error ? error.message : "โปรดลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void boot(); }, []);
  useEffect(() => {
    if (!session || !rider) return;
    const timer = setInterval(() => { void refresh(session, rider, false); }, 15000);
    return () => clearInterval(timer);
  }, [session, rider, preferences, seenJobs]);

  const login = async () => {
    setLoading(true);
    try {
      await boot(await signIn(identifier.trim(), password));
    } catch (error) {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error instanceof Error ? error.message : "โปรดตรวจสอบ Login ID/อีเมล และรหัสผ่าน");
      setLoading(false);
    }
  };

  const updatePreferences = async (next: NotificationPreferences) => {
    setPreferences(next);
    await saveNotificationPreferences(next);
    if (session && pushToken) await registerPushToken(session, pushToken, next);
  };

  const previewTone = async () => {
    try {
      await playRiderNotificationPreview(preferences);
    } catch {
      Alert.alert("ยังไม่สามารถเล่นตัวอย่าง", "โปรดอนุญาตการแจ้งเตือนในการตั้งค่าโทรศัพท์ก่อน");
    }
  };

  const checkOta = async () => {
    setOtaLoading(true);
    const result = await downloadOtaUpdate();
    setOtaResult(result);
    setOtaLoading(false);
    if (result.state === "ready") {
      Alert.alert("อัปเดตพร้อมแล้ว", result.message, [
        { text: "ภายหลัง", style: "cancel" },
        { text: "เริ่มใช้ตอนนี้", onPress: () => { void applyOtaUpdate(); } },
      ]);
      return;
    }
    Alert.alert(result.state === "up-to-date" ? "อัปเดตแอป" : "สถานะ OTA", result.message);
  };

  const take = (order: Order) => {
    if (!session || !rider) return;
    Alert.alert("ยืนยันรับงาน", `รับงาน ${order.id} จาก ${order.store_name}\nประเภท: ${order.service_type || "บริการจัดส่ง"}\nยอด COD: ${money(order.payable || order.total)}\nรายได้ค่าส่งของคุณหลังส่งสำเร็จ: ${money(Number(order.delivery_fee || 0) * 0.8)} หรือไม่`, [
      { text: "กลับ", style: "cancel" },
      { text: "ยืนยันรับงาน", onPress: async () => { try { await acceptJob(session, rider, order); await refresh(session, rider, false); } catch (error) { Alert.alert("รับงานไม่สำเร็จ", error instanceof Error ? error.message : "โปรดลองอีกครั้ง"); } } },
    ]);
  };

  const updateOrder = (order: Order, status: "กำลังจัดส่ง" | "สำเร็จแล้ว") => {
    if (!session || !rider) return;
    const label = status === "กำลังจัดส่ง" ? "ยืนยันว่าได้รับสินค้าและเริ่มจัดส่ง" : "ยืนยันส่งสำเร็จและเก็บเงินปลายทางแล้ว";
    Alert.alert("ยืนยันอัปเดตสถานะ", `${label}\n\nออร์เดอร์: ${order.id}\nลูกค้า: ${order.customer_name}\nยอด COD: ${money(order.payable || order.total)}`, [
      { text: "กลับ", style: "cancel" },
      { text: "ยืนยัน", onPress: async () => { try { await setOrderStatus(session, rider, order, status); await refresh(session, rider, false); } catch (error) { Alert.alert("อัปเดตไม่สำเร็จ", error instanceof Error ? error.message : "โปรดลองอีกครั้ง"); } } },
    ]);
  };

  const sendLocationNow = async () => {
    if (!session || !rider) return;
    if (!await Location.hasServicesEnabledAsync()) return Alert.alert("กรุณาเปิด GPS", "เปิดบริการตำแหน่งของโทรศัพท์ก่อน");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return Alert.alert("ยังไม่ได้อนุญาตตำแหน่ง", "อนุญาตตำแหน่งเพื่อส่งสถานะไรเดอร์");
    const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const location = { lat: point.coords.latitude, lng: point.coords.longitude, accuracy: point.coords.accuracy, captured_at: new Date().toISOString() };
    await updateRiderLocation(session, rider, location);
    setRider({ ...rider, last_location: location });
    Alert.alert("อัปเดตตำแหน่งแล้ว");
  };

  const changeAvailability = () => {
    if (!session || !rider) return;
    const next = rider.status === "ออฟไลน์" ? "พร้อมรับงาน" : "ออฟไลน์";
    Alert.alert("ยืนยันเปลี่ยนสถานะ", `เปลี่ยนสถานะเป็น “${next}” หรือไม่`, [
      { text: "กลับ", style: "cancel" },
      { text: "ยืนยัน", onPress: async () => { try { await updateRiderStatus(session, rider, next); setRider({ ...rider, status: next }); } catch (error) { Alert.alert("เปลี่ยนสถานะไม่สำเร็จ", error instanceof Error ? error.message : "โปรดลองอีกครั้ง"); } } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0F4C81" /></View>;
  if (!session || !rider) return <SafeAreaView style={styles.auth}><Text style={styles.brand}>AP Rider</Text><Text style={styles.subtitle}>เข้าสู่ระบบสำหรับรับงานและอัปเดตการจัดส่ง</Text><TextInput style={styles.input} placeholder="อีเมล หรือ Login ID ที่แอดมินออกให้" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} /><TextInput style={styles.input} placeholder="รหัสผ่าน" secureTextEntry value={password} onChangeText={setPassword} /><Pressable style={styles.primary} onPress={login}><Text style={styles.primaryText}>เข้าสู่ระบบไรเดอร์</Text></Pressable><Text style={styles.help}>บัญชีต้องถูกสร้างและผูกกับโปรไฟล์ไรเดอร์โดยผู้ดูแลก่อน จึงจะเห็นเฉพาะงานของตนได้</Text></SafeAreaView>;

  const orderCard = (order: Order, isAvailable = false) => <View style={styles.card} key={order.id}><View style={styles.cardHead}><View><Text style={styles.orderId}>{order.id}</Text><Text style={styles.muted}>{order.store_name} · {order.service_type || "บริการจัดส่ง"}</Text></View><Text style={styles.pill}>{order.status}</Text></View><View style={styles.feeRow}><Text style={styles.muted}>ยอด COD {money(order.payable || order.total)}</Text><Text style={styles.feeText}>ค่าส่ง {money(order.delivery_fee || 0)} · คุณได้ {money(Number(order.delivery_fee || 0) * 0.8)}</Text></View><Text style={styles.route}>รับ: {order.pickup_address || order.store_name}</Text><Text style={styles.route}>ส่ง: {order.delivery_address}</Text>{order.note ? <Text style={styles.note}>หมายเหตุ: {order.note}</Text> : null}<View style={styles.actions}>{isAvailable ? <Pressable style={styles.primarySmall} onPress={() => take(order)}><Text style={styles.primaryText}>รับงาน</Text></Pressable> : <>{order.status === "ไรเดอร์กำลังไปรับ" ? <Pressable style={styles.primarySmall} onPress={() => updateOrder(order, "กำลังจัดส่ง")}><Text style={styles.primaryText}>รับสินค้าแล้ว</Text></Pressable> : null}{order.status === "กำลังจัดส่ง" ? <Pressable style={styles.primarySmall} onPress={() => updateOrder(order, "สำเร็จแล้ว")}><Text style={styles.primaryText}>ส่งสำเร็จ / เก็บเงินแล้ว</Text></Pressable> : null}<Pressable style={styles.outline} onPress={() => { const url = maps(order.delivery_location); url ? void Linking.openURL(url) : Alert.alert("ยังไม่มีพิกัดจุดส่ง"); }}><Text style={styles.outlineText}>นำทาง</Text></Pressable></>}</View></View>;

  return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content" /><View style={styles.header}><View><Text style={styles.kicker}>RIDER WORKSPACE</Text><Text style={styles.title}>สวัสดี {rider.name}</Text></View><Pressable style={styles.refresh} onPress={() => void refresh()}><Text>↻</Text></Pressable></View><View style={styles.status}><Text style={styles.statusLabel}>สถานะรับงาน</Text><Text style={styles.statusValue}>{rider.status}</Text><Pressable onPress={changeAvailability}><Text style={styles.link}>{rider.status === "ออฟไลน์" ? "เปิดรับงาน" : "พักงาน"}</Text></Pressable></View>{tab === "งาน" ? <ScrollView contentContainerStyle={styles.scroll}><View style={styles.stats}><Stat label="งานใหม่" value={available.length} /><Stat label="งานของฉัน" value={active.length} /><Stat label="ส่งแล้ว" value={settledEarnings.length} /></View><View style={styles.locationBox}><Text style={styles.locationTitle}>ตำแหน่งไรเดอร์</Text><Text style={styles.muted}>{rider.last_location ? `${rider.last_location.lat.toFixed(5)}, ${rider.last_location.lng.toFixed(5)}` : "ยังไม่ได้อัปเดตตำแหน่ง"}</Text><Pressable style={styles.outline} onPress={() => void sendLocationNow()}><Text style={styles.outlineText}>ส่งพิกัดปัจจุบัน</Text></Pressable></View><Text style={styles.section}>งานใหม่รอรับทุกประเภท</Text>{available.length ? available.map((order) => orderCard(order, true)) : <Empty text="ไม่มีงานใหม่ในขณะนี้" />}<Text style={styles.section}>งานของฉัน</Text>{active.length ? active.map((order) => orderCard(order)) : <Empty text="ยังไม่มีงานที่กำลังดำเนินการ" />}</ScrollView> : tab === "รายได้" ? <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.section}>รายได้ของวันนี้</Text><View style={styles.incomeHero}><Text style={styles.incomeCaption}>ส่วนแบ่ง Rider 80%</Text><Text style={styles.incomeValue}>{money(todayRiderShare)}</Text><Text style={styles.incomeNote}>จาก {todayEarnings.length} งานที่ส่งสำเร็จวันนี้</Text></View><View style={styles.incomeStats}><Stat label="ยอด COD วันนี้" value={todayCod} money /><Stat label="รายได้แพลตฟอร์ม 20%" value={todayEarnings.reduce((sum, earning) => sum + Number(earning.platform_share || 0), 0)} money /></View><Text style={styles.section}>ประวัติรายได้</Text>{settledEarnings.length ? settledEarnings.map((earning) => <View key={earning.order_id} style={styles.card}><Text style={styles.orderId}>{earning.order_id}</Text><Text style={styles.muted}>{earning.delivery_orders?.store_name || "บริการจัดส่ง"} · {new Date(earning.completed_at).toLocaleString("th-TH")}</Text><View style={styles.feeRow}><Text style={styles.muted}>ค่าส่ง {money(earning.delivery_fee)}</Text><Text style={styles.feeText}>รับสุทธิ {money(earning.rider_share)}</Text></View></View>) : <Empty text="ยังไม่มีรายได้จากงานที่ปิดสำเร็จ" />}</ScrollView> : <ScrollView contentContainerStyle={styles.scroll}><View style={styles.panel}><Text style={styles.section}>บัญชีไรเดอร์</Text><Text style={styles.profile}>{rider.name}</Text><Text style={styles.muted}>{rider.vehicle} · {rider.phone || "ยังไม่ระบุเบอร์"}</Text><View style={styles.walletBox}><Text style={styles.incomeCaption}>กระเป๋ารายได้สะสม</Text><Text style={styles.walletValue}>{money(walletBalance)}</Text><Text style={styles.muted}>รวมส่วนแบ่ง Rider จากงานที่ส่งสำเร็จ รอปิดยอดตามรอบผู้ดูแล</Text></View><View style={styles.settingsCard}><View style={styles.settingsRow}><View style={{ flex: 1 }}><Text style={styles.settingsTitle}>แจ้งเตือนงานและข้อความใหม่</Text><Text style={styles.muted}>เปิดเสียงเตือนเมื่อมีงานใหม่หรือข้อความจากระบบ</Text></View><Switch value={preferences.enabled} trackColor={{ true: "#0F4C81" }} onValueChange={(enabled) => void updatePreferences({ ...preferences, enabled })} /></View><Text style={styles.settingsTitle}>เลือกเสียงแจ้งเตือน</Text><View style={styles.toneList}>{TONES.map((tone) => <Pressable key={tone} style={[styles.toneButton, preferences.tone === tone && styles.toneButtonActive]} onPress={() => void updatePreferences({ ...preferences, tone })}><Text style={[styles.toneText, preferences.tone === tone && styles.toneTextActive]}>{notificationToneLabel(tone)}</Text></Pressable>)}</View><Pressable style={styles.outline} onPress={() => void previewTone()}><Text style={styles.outlineText}>ทดสอบเสียงที่เลือก</Text></Pressable></View><View style={styles.otaCard}><Text style={styles.settingsTitle}>อัปเดตภายในแอป</Text><Text style={styles.muted}>ตรวจและดาวน์โหลดการแก้ไขหน้าจอหรือฟังก์ชันใหม่โดยไม่ต้องติดตั้ง APK ซ้ำ</Text>{otaResult ? <Text style={styles.otaStatus}>{otaResult.message}</Text> : null}<Pressable style={styles.primarySmall} onPress={() => void checkOta()} disabled={otaLoading}><Text style={styles.primaryText}>{otaLoading ? "กำลังตรวจสอบ..." : "ตรวจสอบการอัปเดต"}</Text></Pressable><Text style={styles.help}>หากเป็นการเพิ่มสิทธิ์โทรศัพท์ เสียงใหม่ หรือส่วน native ระบบจะแจ้งให้ติดตั้ง APK รุ่นใหม่</Text></View><Pressable style={[styles.outline, { marginTop: 24 }]} onPress={() => Alert.alert("ยืนยันออกจากระบบ", "ต้องการออกจากบัญชีไรเดอร์นี้หรือไม่", [{ text: "กลับ", style: "cancel" }, { text: "ออกจากระบบ", style: "destructive", onPress: async () => { await clearSession(); setSession(null); setRider(null); setEarnings([]); } }])}><Text style={styles.outlineText}>ออกจากระบบ</Text></Pressable></View></ScrollView>}<View style={styles.nav}>{(["งาน", "รายได้", "โปรไฟล์"] as Tab[]).map((item) => <Pressable key={item} style={styles.navItem} onPress={() => setTab(item)}><Text style={[styles.navText, tab === item && styles.navActive]}>{item === "งาน" ? "งาน" : item === "รายได้" ? "รายได้" : "โปรไฟล์"}</Text></Pressable>)}</View></SafeAreaView>;
}

const Stat = ({ label, value, money: isMoney = false }: { label: string; value: number; money?: boolean }) => <View style={styles.stat}><Text style={styles.muted}>{label}</Text><Text style={styles.statValue}>{isMoney ? money(value) : value}</Text></View>;
const Empty = ({ text }: { text: string }) => <View style={styles.empty}><Text style={styles.muted}>{text}</Text></View>;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F6F8FB" }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, auth: { flex: 1, justifyContent: "center", backgroundColor: "#F6F8FB", padding: 24 }, brand: { color: "#0F4C81", fontWeight: "900", fontSize: 34 }, subtitle: { color: "#566274", marginTop: 8, marginBottom: 24, lineHeight: 21 }, input: { borderWidth: 1, borderColor: "#D8E1EC", backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 12, fontSize: 16 }, primary: { backgroundColor: "#0F4C81", padding: 15, borderRadius: 14, alignItems: "center" }, primarySmall: { backgroundColor: "#0F4C81", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignSelf: "flex-start", marginTop: 12 }, primaryText: { color: "#FFF", fontWeight: "800" }, help: { color: "#687586", fontSize: 12, marginTop: 12, lineHeight: 18 }, header: { padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF" }, kicker: { color: "#0F4C81", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, title: { fontSize: 23, color: "#152238", fontWeight: "900", marginTop: 4 }, refresh: { backgroundColor: "#E7F1F9", padding: 12, borderRadius: 14 }, status: { backgroundColor: "#EAF7F2", margin: 16, padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10 }, statusLabel: { color: "#4E6A61", fontSize: 12 }, statusValue: { color: "#008C72", fontWeight: "800", flex: 1 }, link: { color: "#0F4C81", fontWeight: "800", fontSize: 12 }, scroll: { padding: 16, paddingBottom: 100 }, stats: { flexDirection: "row", gap: 10 }, stat: { flex: 1, backgroundColor: "#FFF", padding: 14, borderRadius: 16 }, statValue: { color: "#0F4C81", fontSize: 18, fontWeight: "900", marginTop: 7 }, locationBox: { backgroundColor: "#E9F5FB", marginTop: 14, borderRadius: 16, padding: 14, gap: 7 }, locationTitle: { color: "#0F4C81", fontWeight: "800" }, section: { color: "#152238", fontWeight: "900", fontSize: 18, marginTop: 12, marginBottom: 10 }, card: { backgroundColor: "#FFF", borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E1E7EF" }, cardHead: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, orderId: { color: "#152238", fontWeight: "900" }, muted: { color: "#687586", fontSize: 12, lineHeight: 18 }, pill: { color: "#0F4C81", fontSize: 11, fontWeight: "800", backgroundColor: "#E7F1F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, maxWidth: 130 }, route: { color: "#334155", marginTop: 8, fontSize: 13 }, note: { color: "#B45309", marginTop: 8, fontSize: 12 }, feeRow: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 10 }, feeText: { color: "#008C72", fontSize: 12, fontWeight: "800" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 }, outline: { borderWidth: 1, borderColor: "#B8C7D8", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, alignSelf: "flex-start", marginTop: 10 }, outlineText: { color: "#0F4C81", fontWeight: "800", fontSize: 12 }, empty: { backgroundColor: "#FFF", padding: 24, alignItems: "center", borderRadius: 16 }, panel: { flex: 1, backgroundColor: "#FFF", borderRadius: 20, padding: 18 }, incomeHero: { backgroundColor: "#0F4C81", borderRadius: 20, padding: 20 }, incomeCaption: { color: "#BDE4FF", fontSize: 12, fontWeight: "800" }, incomeValue: { color: "#FFF", fontSize: 35, fontWeight: "900", marginVertical: 6 }, incomeNote: { color: "#D7ECFA", fontSize: 12 }, incomeStats: { flexDirection: "row", gap: 10, marginTop: 10 }, walletBox: { backgroundColor: "#EAF7F2", borderRadius: 16, padding: 16, marginTop: 22 }, walletValue: { color: "#008C72", fontSize: 30, fontWeight: "900", marginVertical: 8 }, profile: { color: "#152238", fontSize: 21, fontWeight: "900", marginBottom: 6 }, settingsCard: { backgroundColor: "#F4F8FC", borderRadius: 16, padding: 14, marginTop: 18 }, settingsRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 14 }, settingsTitle: { color: "#152238", fontSize: 14, fontWeight: "900", marginBottom: 5 }, toneList: { gap: 8, marginTop: 5 }, toneButton: { borderWidth: 1, borderColor: "#C6D6E5", padding: 10, borderRadius: 10 }, toneButtonActive: { backgroundColor: "#0F4C81", borderColor: "#0F4C81" }, toneText: { color: "#0F4C81", fontWeight: "700", fontSize: 12 }, toneTextActive: { color: "#FFF" }, otaCard: { backgroundColor: "#FFF7E7", borderRadius: 16, padding: 14, marginTop: 14 }, otaStatus: { color: "#9A6400", fontSize: 12, lineHeight: 18, marginTop: 8 }, nav: { flexDirection: "row", backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5EAF0", paddingVertical: 12 }, navItem: { flex: 1, alignItems: "center" }, navText: { color: "#758196", fontSize: 12 }, navActive: { color: "#0F4C81", fontWeight: "900" },
});
