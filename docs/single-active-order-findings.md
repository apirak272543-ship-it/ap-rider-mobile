# Single-active-order findings

## Supabase project

The active project is `abtsctwfkgzciseppach` (name: Apservice, region: ap-southeast-1, status ACTIVE_HEALTHY).

## Relevant schema

The `public.riders` table has primary key `id`, a unique `user_id`, and rider profile/status fields. The `public.delivery_orders` table has primary key `id`, nullable `rider_id` (text), `status`, `completed_at`, `updated_at`, `assigned_at`, and dispatch-related fields. RLS is enabled on both tables according to the Supabase schema inspection.

## Current frontend behavior

`rider/rider-app.js` reads assigned orders with `ordersPath(riderId)` and available orders with `rider_id=is.null` plus claimable statuses `ร้านค้ารับออร์เดอร์` and `กำลังเตรียมสินค้า`. The claim action currently performs a conditional PATCH on the selected order using `rider_id=is.null` and the current order status. The UI therefore separates assigned and available work but does not yet enforce the business rule that one Rider can hold only one active order.

## Required business rule

An order counts as active unless its status is `สำเร็จแล้ว` or `ยกเลิก`. A Rider with one active assigned order must not see available orders, must not be able to claim another order through the UI, and must still be rejected by a server-side/atomic guard if two devices or two clicks race. The UI should explain that the Rider is at capacity and provide one primary action to continue the current order.
