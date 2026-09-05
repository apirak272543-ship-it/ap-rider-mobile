-- Enforce the rider capacity rule at the database boundary.
-- Existing duplicate active assignments are not rewritten automatically; the trigger blocks new assignments
-- while allowing each existing active order to finish normally.

CREATE OR REPLACE FUNCTION public.prevent_rider_multiple_active_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicting_order_id text;
BEGIN
  IF NEW.rider_id IS NULL OR NEW.status IN ('สำเร็จแล้ว', 'ยกเลิก') THEN
    RETURN NEW;
  END IF;

  -- A status/proof update on the same active order does not consume another slot.
  IF TG_OP = 'UPDATE'
     AND OLD.rider_id = NEW.rider_id
     AND OLD.status NOT IN ('สำเร็จแล้ว', 'ยกเลิก') THEN
    RETURN NEW;
  END IF;

  -- Serialize claims for the same rider so two concurrent requests cannot both pass the check.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.rider_id, 0));

  SELECT id
    INTO conflicting_order_id
    FROM public.delivery_orders
   WHERE rider_id = NEW.rider_id
     AND id IS DISTINCT FROM NEW.id
     AND status NOT IN ('สำเร็จแล้ว', 'ยกเลิก')
   ORDER BY updated_at DESC NULLS LAST, ordered_at DESC NULLS LAST
   LIMIT 1;

  IF conflicting_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Rider มีงานที่ยังไม่ปิดอยู่แล้ว ไม่สามารถรับงานซ้อนเพิ่มได้'
      USING ERRCODE = '23514',
            DETAIL = conflicting_order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_orders_single_active_rider ON public.delivery_orders;
CREATE TRIGGER delivery_orders_single_active_rider
BEFORE INSERT OR UPDATE OF rider_id, status ON public.delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_rider_multiple_active_orders();

CREATE OR REPLACE FUNCTION public.claim_delivery_order(
  p_order_id text,
  p_rider_id text,
  p_rider_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.delivery_orders%ROWTYPE;
  active_order_id text;
BEGIN
  IF coalesce(p_order_id, '') = '' OR coalesce(p_rider_id, '') = '' THEN
    RAISE EXCEPTION 'ข้อมูลการรับงานไม่ครบถ้วน' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_rider_id, 0));

  SELECT * INTO target
    FROM public.delivery_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบงานที่ต้องการรับ' USING ERRCODE = 'P0002';
  END IF;

  IF target.rider_id IS NOT NULL THEN
    RAISE EXCEPTION 'งานนี้ถูกรับไปแล้ว กรุณาเลือกงานอื่น' USING ERRCODE = '23505';
  END IF;

  IF target.status NOT IN ('ร้านค้ารับออร์เดอร์', 'กำลังเตรียมสินค้า') THEN
    RAISE EXCEPTION 'งานนี้ยังไม่พร้อมให้ Rider รับ' USING ERRCODE = 'P0001';
  END IF;

  SELECT id
    INTO active_order_id
    FROM public.delivery_orders
   WHERE rider_id = p_rider_id
     AND status NOT IN ('สำเร็จแล้ว', 'ยกเลิก')
   ORDER BY updated_at DESC NULLS LAST, ordered_at DESC NULLS LAST
   LIMIT 1;

  IF active_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'คุณมีงานที่ยังไม่ปิดอยู่แล้ว กรุณาปิดงานปัจจุบันก่อนรับงานใหม่'
      USING ERRCODE = '23514',
            DETAIL = active_order_id;
  END IF;

  UPDATE public.delivery_orders
     SET rider_id = p_rider_id,
         rider_name = coalesce(nullif(trim(p_rider_name), ''), rider_name),
         status = 'ไรเดอร์กำลังไปรับ',
         accepted_at = coalesce(accepted_at, now()),
         updated_at = now()
   WHERE id = p_order_id
     AND rider_id IS NULL
     AND status = target.status
  RETURNING * INTO target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'งานนี้ถูกรับหรือเปลี่ยนสถานะไปแล้ว กรุณารีเฟรชรายการงาน' USING ERRCODE = '40001';
  END IF;

  RETURN to_jsonb(target);
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_rider_multiple_active_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_delivery_order(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_delivery_order(text, text, text) TO service_role;
