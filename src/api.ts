import * as SecureStore from "expo-secure-store";

const URL = "https://abtsctwfkgzciseppach.supabase.co";
const KEY = "sb_publishable_TyJWnKkbS8vKcQKKAzoqSg_BOguwKRv";
const SESSION_KEY = "ap_rider_session";

export type Session = { access_token: string; refresh_token?: string; user: { id: string; email?: string } };
export type LocationPayload = { lat: number; lng: number; accuracy?: number | null; captured_at: string };
export type Rider = { id: string; user_id: string; name: string; phone: string; vehicle: string; status: string; last_location?: LocationPayload | null };
export type Order = { id: string; customer_name: string; customer_email: string; store_name: string; service_type?: string; rider_id?: string | null; rider_name?: string | null; status: string; total: number; payable: number; delivery_fee?: number; pickup_address: string; pickup_location?: LocationPayload | null; delivery_address: string; delivery_location?: LocationPayload | null; note: string; ordered_at: string; accepted_at?: string | null; delivery_started_at?: string | null; completed_at?: string | null };
export type RiderEarning = { order_id: string; rider_id: string; delivery_fee: number; rider_share: number; platform_share: number; settlement_status: "settled" | "reversed"; completed_at: string; delivery_orders?: { id: string; store_name: string; customer_name: string; service_type?: string; payable: number } | null };

export const isAvailableRiderJob = (order: Pick<Order, "rider_id" | "status">) => !order.rider_id && !["สำเร็จแล้ว", "ยกเลิก"].includes(order.status);

export async function loadSession() { const raw = await SecureStore.getItemAsync(SESSION_KEY); return raw ? JSON.parse(raw) as Session : null; }
export async function clearSession() { await SecureStore.deleteItemAsync(SESSION_KEY); }

async function request<T>(path: string, init: RequestInit = {}, session?: Session | null): Promise<T> {
  const response = await fetch(`${URL}${path}`, { ...init, headers: { apikey: KEY, "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...(init.headers || {}) } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.message || body?.error_description || `ไม่สามารถเชื่อมต่อระบบได้ (${response.status})`);
  return body as T;
}

export async function signIn(identifier: string, password: string) {
  const result = await request<{ session: Session }>("/functions/v1/role-access", { method: "POST", body: JSON.stringify({ action: "login", role: "rider", identifier, password }) });
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(result.session));
  return result.session;
}

export const rest = <T>(path: string, session: Session, init?: RequestInit) => request<T>(`/rest/v1/${path}`, init, session);
export async function ensureRider(session: Session) {
  const roles = await rest<{ role: string }[]>(`user_roles?select=role&user_id=eq.${session.user.id}`, session);
  if (!roles.some((r) => r.role === "rider" || r.role === "admin")) throw new Error("บัญชีนี้ไม่มีสิทธิ์ใช้งาน Rider Application");
  const riders = await rest<Rider[]>(`riders?select=*&user_id=eq.${session.user.id}&limit=1`, session);
  if (!riders[0]) throw new Error("บัญชีนี้ยังไม่ได้เชื่อมกับโปรไฟล์ไรเดอร์ โปรดติดต่อแอดมิน");
  return riders[0];
}

export async function listJobs(session: Session, rider: Rider) {
  const [all, mine] = await Promise.all([rest<Order[]>("delivery_orders?select=*&order=ordered_at.desc&limit=100", session), rest<Order[]>(`delivery_orders?select=*&rider_id=eq.${encodeURIComponent(rider.id)}&order=ordered_at.desc&limit=100`, session)]);
  return { available: all.filter(isAvailableRiderJob), mine };
}

/** จำนวนงานที่ Rider Console เห็นเองและยังไม่มีใครรับงาน */
export async function countAvailableRiderJobs(session: Session) {
  const orders = await rest<Pick<Order, "id" | "rider_id" | "status">[]>("delivery_orders?select=id,rider_id,status&order=ordered_at.desc&limit=100", session);
  return orders.filter(isAvailableRiderJob).length;
}

export async function acceptJob(session: Session, rider: Rider, order: Order) {
  const at = new Date().toISOString();
  const updated = await rest<Order[]>(`delivery_orders?id=eq.${encodeURIComponent(order.id)}&rider_id=is.null`, session, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ rider_id: rider.id, rider_name: rider.name, status: "ไรเดอร์กำลังไปรับ", accepted_at: at }) });
  if (!updated.length) throw new Error("งานนี้ถูกไรเดอร์รายอื่นรับไปแล้ว โปรดรีเฟรชรายการงาน");
  await addEvent(session, order.id, "ไรเดอร์กำลังไปรับ", `ไรเดอร์: ${rider.name}`);
}

export async function setOrderStatus(session: Session, rider: Rider, order: Order, status: "กำลังจัดส่ง" | "สำเร็จแล้ว") {
  const at = new Date().toISOString();
  const payload = status === "กำลังจัดส่ง" ? { status, delivery_started_at: at } : { status, completed_at: at };
  await rest(`delivery_orders?id=eq.${encodeURIComponent(order.id)}&rider_id=eq.${encodeURIComponent(rider.id)}`, session, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
  await addEvent(session, order.id, status, `ไรเดอร์: ${rider.name}`);
}

export async function fetchEarnings(session: Session, rider: Rider) { return rest<RiderEarning[]>(`rider_earnings?select=order_id,rider_id,delivery_fee,rider_share,platform_share,settlement_status,completed_at,delivery_orders(id,store_name,customer_name,service_type,payable)&rider_id=eq.${encodeURIComponent(rider.id)}&order=completed_at.desc&limit=100`, session); }
export async function updateRiderLocation(session: Session, rider: Rider, location: LocationPayload) { await rest(`riders?id=eq.${encodeURIComponent(rider.id)}`, session, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_location: location, updated_at: new Date().toISOString() }) }); }
export async function updateRiderStatus(session: Session, rider: Rider, status: string) { await rest(`riders?id=eq.${encodeURIComponent(rider.id)}`, session, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) }); }
export async function registerPushToken(session: Session, token: string, preferences: { tone: "ap_chime" | "ap_urgent" | "ap_priority"; enabled: boolean }) { await rest("mobile_device_tokens?on_conflict=expo_push_token", session, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: session.user.id, app_role: "rider", expo_push_token: token, notification_tone: preferences.tone, notifications_enabled: preferences.enabled, updated_at: new Date().toISOString() }) }); }
async function addEvent(session: Session, orderId: string, status: string, label: string) { await rest("order_status_events", session, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ order_id: orderId, status, actor_id: session.user.id, actor_label: label }) }); }
