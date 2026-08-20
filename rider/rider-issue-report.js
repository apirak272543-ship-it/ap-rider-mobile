(() => {
  'use strict';
  if (document.body?.dataset?.page !== 'delivery') return;
  const M = window.APServiceMPA;
  const orderId = new URLSearchParams(location.search).get('id');
  const issueOptions = [
    ['vehicle_breakdown', 'รถเสีย / ยางรั่ว'],
    ['customer_unreachable', 'ติดต่อลูกค้าไม่ได้เกิน 5 นาที'],
    ['accident', 'เกิดอุบัติเหตุ'],
    ['incorrect_pin', 'ลูกค้าปักพิกัดผิด'],
    ['severe_weather', 'สภาพอากาศเลวร้าย'],
    ['other', 'อื่น ๆ (ระบุรายละเอียด)'],
  ];
  const callIssueReport = async payload => {
    const session = await M.auth.refreshSession(false);
    if (!session?.access_token || !session?.user?.id) throw new Error('เซสชัน Rider หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response = await fetch(`${M.config.url}/functions/v1/role-access`, { method: 'POST', headers: { apikey: M.config.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report_rider_delivery_issue', order_id: orderId, ...payload }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'ส่งรายงานปัญหาไม่สำเร็จ');
    return { issue: result?.issue, userId: session.user.id };
  };
  const mount = () => {
    const host = document.getElementById('job');
    if (!host || !orderId || document.getElementById('riderIssueReport')) return;
    const section = document.createElement('section');
    section.id = 'riderIssueReport';
    section.className = 'mpa-card';
    section.style.cssText = 'margin:18px 0 0;border-color:#f1b6b0;background:#fff8f7';
    section.innerHTML = '<h2 style="margin:0 0 6px;color:#9f1f16">แจ้งปัญหาระหว่างส่ง</h2><p class="mpa-muted">ส่งสัญญาณให้ทีม Dispatch ตรวจสอบงานนี้ทันที โดยยังไม่ย้ายงานหรือเปลี่ยนสถานะออร์เดอร์อัตโนมัติ</p><button class="mpa-button" type="button" data-open-issue style="background:#b42318">แจ้งปัญหาระหว่างส่ง</button>';
    host.append(section);
    section.querySelector('[data-open-issue]').addEventListener('click', () => {
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'border:0;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.3);width:min(92vw,460px);padding:0';
      dialog.innerHTML = `<form method="dialog" style="padding:20px"><h2 style="margin:0 0 8px">แจ้งปัญหาระหว่างส่ง</h2><p class="mpa-muted">ทีม Dispatch จะเห็นรายงานนี้ทันที เลือกเหตุผลแบบสั้นเพื่อช่วยดำเนินการเร็วขึ้น</p><label class="mpa-field"><span>ประเภทปัญหา</span><select name="issue_type" required>${issueOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label class="mpa-field"><span>รายละเอียดเพิ่มเติม</span><textarea name="detail" rows="3" maxlength="500" placeholder="จำเป็นเมื่อเลือกอื่น ๆ"></textarea></label><label class="mpa-field"><span>รูปหลักฐาน (ไม่บังคับ)</span><input name="evidence" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><p data-issue-status class="mpa-muted" aria-live="polite">รูปจะถูกบีบอัดเป็นไฟล์ private ไม่เกิน 1 MB ก่อนส่ง</p><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button type="button" data-close class="mpa-button mpa-button-secondary">ยกเลิก</button><button type="submit" class="mpa-button" style="background:#b42318">ส่งรายงาน</button></div></form>`;
      document.body.append(dialog); dialog.showModal();
      dialog.querySelector('[data-close]').onclick = () => { dialog.close(); dialog.remove(); };
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      dialog.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget, button = form.querySelector('[type="submit"]'), status = form.querySelector('[data-issue-status]');
        const issueType = form.elements.issue_type.value, detail = form.elements.detail.value.trim(), file = form.elements.evidence.files?.[0];
        if (issueType === 'other' && detail.length < 3) { status.textContent = 'กรุณาระบุรายละเอียดอย่างน้อย 3 ตัวอักษรเมื่อเลือก “อื่น ๆ”'; return; }
        button.disabled = true;
        try {
          let evidence_path = '';
          if (file) {
            status.textContent = 'กำลังบีบอัดและอัปโหลดหลักฐาน…';
            const session = await M.auth.refreshSession(false);
            const uploaded = await window.APServiceMedia.uploadPrivateImage(file, { url: M.config.url, publishableKey: M.config.publishableKey, accessToken: session?.access_token, actorId: session?.user?.id, bucket: 'delivery-proofs', scope: `${orderId}-issue`, mediaType: 'DELIVERY_PROOF', ownerType: 'rider' });
            evidence_path = uploaded.storageRef;
          }
          await callIssueReport({ issue_type: issueType, detail, evidence_path });
          M.ui.setNotice('ส่งรายงานให้ทีม Dispatch แล้ว งานยังคงอยู่กับคุณจนกว่าจะมีคำสั่งใหม่');
          dialog.close();
        } catch (error) { button.disabled = false; status.textContent = error.message || 'ส่งรายงานปัญหาไม่สำเร็จ'; }
      });
    });
  };
  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  mount();
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
