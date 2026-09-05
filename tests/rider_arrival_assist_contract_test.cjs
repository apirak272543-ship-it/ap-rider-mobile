const assert = require('assert');
const fs = require('fs');

const page = fs.readFileSync('rider/delivery.html', 'utf8');
const app = fs.readFileSync('rider/rider-app.js', 'utf8');
const location = fs.readFileSync('rider/rider-delivery-location.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');
const css = fs.readFileSync('rider/rider-ui-polish.css', 'utf8');

assert.match(page, /leaflet@1\.9\.4\/dist\/leaflet\.css/, 'delivery ต้องโหลด Leaflet CSS แบบ pinned');
assert.match(page, /leaflet@1\.9\.4\/dist\/leaflet\.js/, 'delivery ต้องโหลด Leaflet JS แบบ pinned');
assert.match(location, /riderInAppMap/, 'location widget ต้องมี embedded map host');
assert.match(location, /tile\.openstreetmap\.org/, 'map ต้องใช้ HTTPS OpenStreetMap tile endpoint');
assert.match(location, /router\.project-osrm\.org\/route\/v1\/driving/, 'map ต้องขอ route จาก OSRM');
assert.match(location, /watchPosition/, 'arrival assist ต้องติดตาม GPS อัตโนมัติหลังผู้ใช้เริ่มใช้ตำแหน่ง');
assert.match(location, /ARRIVAL_RADIUS_METERS = 50/, 'arrival assist ต้องใช้ geofence 50 เมตร');
assert.match(location, /MAX_ARRIVAL_ACCURACY_METERS = 80/, 'arrival assist ต้องตรวจ GPS accuracy ก่อนเปิดปุ่ม');
assert.match(location, /riderConfirmArrival/, 'ต้องมีปุ่มยืนยันถึงร้าน');
assert.match(location, /riderManualArrival/, 'ต้องมี manual fallback แบบยุบไว้');
assert.match(location, /if \(confirmArrivalButton\) confirmArrivalButton\.onclick/, 'arrival button ต้อง bind event แบบมี null guard');
assert.match(location, /if \(manualArrivalButton\) manualArrivalButton\.onclick/, 'manual arrival button ต้อง bind event แบบมี null guard');
assert.match(location, /if \(manualMapButton\) manualMapButton\.onclick/, 'manual map button ต้อง bind event แบบมี null guard');
assert.match(app, /arrival_mode: manual \? 'manual' : 'geofence'/, 'frontend ต้องส่งโหมด arrival ไป server');
assert.match(app, /arrival_location: location \|\| null/, 'frontend ต้องส่งพิกัด arrival ไป server');
assert.match(edge, /ORDER_STATUS\.ARRIVED_STORE/, 'server ต้องตรวจเฉพาะ transition ถึงร้าน');
assert.match(edge, /distanceMeters\(arrivalLocation, order\.pickup_location\)/, 'server ต้องตรวจระยะจากพิกัดจริง');
assert.match(edge, /ride_arrived_location/, 'server ต้องบันทึกพิกัดหรือ manual evidence');
assert.match(edge, /delivery_location_source/, 'server ต้องบันทึกแหล่งที่มาของ arrival');
assert.match(css, /rider-in-app-map/, 'canonical rider stylesheet ต้องมี map style');
assert.match(css, /rider-arrival-assist/, 'canonical rider stylesheet ต้องมี arrival assist style');

console.log('rider arrival assist contract: PASS');
