# Rider embedded map provider notes

Leaflet Quick Start: https://leafletjs.com/examples/quick-start/

Leaflet 1.9.4 supports mobile-friendly maps, markers, polylines, popups and touch interactions. The map container must have an explicit height. The implementation uses the pinned CDN assets and includes the required Subresource Integrity hashes from the official quick-start example.

OSRM HTTP API: https://project-osrm.org/docs/v5.24.0/api/

The route request uses `route/v1/driving/{longitude},{latitude};{longitude},{latitude}?overview=full&geometries=geojson&steps=true`. The response exposes route geometry, distance, duration and maneuver steps; the UI uses these to draw the in-app route and show the first direction hint. The public OSRM service is treated as best-effort; the UI falls back to a straight dashed line and address information when routing fails.

OpenStreetMap Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/

The tile URL is `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, the map displays visible OpenStreetMap attribution, and the UI does not prefetch or provide offline tile download. The map is loaded only when the Rider is viewing the delivery page.

Arrival assistance policy: GPS starts after the Rider explicitly taps `ใช้ตำแหน่งปัจจุบัน`, then `watchPosition` checks the pickup geofence. The client enables `ยืนยันถึงร้านค้า` within 50 meters and GPS accuracy <= 80 meters; server-side role-access validates the submitted coordinate against `pickup_location` using the same 50-meter radius plus reported accuracy allowance. Manual confirmation remains available inside a collapsed fallback when GPS is unavailable and is recorded as `rider-manual-arrival`.


## Visual QA 2026-09-05

ที่ viewport mobile preview หน้าจอแสดงแผนที่ในแอป, attribution ของ OpenStreetMap, marker จุดรับ/จุดส่ง, arrival assist card, route summary, ปุ่มใช้ GPS และ fallback แบบยุบได้โดยไม่พบ horizontal overflow. การ fetch OSRM จาก browser context ตอบ `code: Ok` พร้อม route geometry, distance และ duration; preview ที่ถูกเปิดก่อนหน้าแสดงเส้นตรง fallback เพราะ route request ระหว่าง render ยังไม่เสร็จทัน screenshot แต่ endpoint ทำงานได้จาก browser.


The preview's initial state intentionally has no current GPS point, so the first step shows the pickup marker and dashed fallback rather than a road route from the Rider. Direct browser fetches to OSRM returned HTTP 200 / `code: Ok`; once a current GPS/manual reference point differs from pickup, the route renderer can draw the road polyline and populate distance/duration.


Mobile preview continued to show no horizontal overflow. The arrival card keeps the primary button disabled until GPS passes the geofence; manual confirmation remains inside a collapsed `GPS ใช้ไม่ได้?` section. The preview click automation did not change the rendered fallback state, so production validation relies on the direct browser OSRM fetch and contract tests in addition to the static visual check.
