# Rider Embedded Map and Arrival Assistance QA

## Scope

The Rider delivery page now keeps the existing order workflow and transition contract, while presenting the first travel step inside the app. Leaflet renders an embedded mobile map, OpenStreetMap provides visible map attribution, and OSRM provides best-effort road routing when a current location and destination are available.

## Arrival policy

The arrival assist is shown only when the order status is `ไรเดอร์กำลังไปรับ` and the order has a valid `pickup_location`. The Rider explicitly taps `ใช้ตำแหน่งปัจจุบัน` once to grant permission and start the GPS watcher. After that, the system checks the current point repeatedly without requiring repeated manual taps.

The primary `ยืนยันถึงร้านค้า` action is enabled only when the device is within 50 meters of the pickup point and the reported GPS accuracy is no worse than 80 meters. The button does not change the order by itself; it calls the existing server-authorized status transition. A collapsed `GPS ใช้ไม่ได้?` fallback allows a Rider who is physically at the store but has unusable GPS to confirm manually, with the confirmation recorded as `rider-manual-arrival`.

## Server-side protection

The `role-access` Edge Function version 47 validates the arrival transition, validates the submitted coordinate, checks the distance against `pickup_location`, and records `ride_arrived_location`, `delivery_location_accuracy`, and `delivery_location_source`. The frontend cannot bypass the existing order transition rules by changing the URL or sending an unsupported status.

## Validation results

`node --check` passed for `rider-app.js` and `rider-delivery-location.js`. Contract tests passed for embedded map and arrival assist, delivery location, GPS pulse, gated step workflow, active-order lock, atomic available-job claim, Dispatch/ETA, and delivery proof. The mobile preview at approximately 390px showed the map, attribution, arrival card, route summary, fallback details and action buttons without horizontal overflow. Direct browser testing of OSRM returned HTTP 200 with `code: Ok`; when no current GPS point is available, the UI intentionally shows the pickup point and a dashed fallback until the Rider provides a location.

## References

[1]: https://leafletjs.com/examples/quick-start/ "Leaflet Quick Start Guide"

[2]: https://project-osrm.org/docs/v5.24.0/api/ "OSRM HTTP API documentation"

[3]: https://operations.osmfoundation.org/policies/tiles/ "OpenStreetMap Tile Usage Policy"
