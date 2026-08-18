/* Rider payout proof viewer: fetches a small metadata list and opens private proof files only on demand. */
(() => {
  'use strict';
  const esc = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pathEncode = value => String(value || '').split('/').map(encodeURIComponent).join('/');
  RiderWallet.load = async function loadWithdrawalMetadata(riderId) {
    if (!riderId) return;
    try {
      const [summary, requests] = await Promise.all([
        Cloud.request('rpc/wallet_summary', { method: 'POST', body: JSON.stringify({ p_recipient_type: 'rider', p_recipient_id: riderId }) }),
        Cloud.request(`withdrawal_requests?select=id,amount,status,recipient_note,admin_note,payment_reference,requested_at,reviewed_at,paid_at,proof_available&rider_id=eq.${encodeURIComponent(riderId)}&order=requested_at.desc&limit=60`)
      ]);
      State.wallet = Array.isArray(summary) ? summary[0] : summary || {};
      State.withdrawals = Array.isArray(requests) ? requests : [];
      write('apcx_rider_wallet', State.wallet); write('apcx_rider_withdrawals', State.withdrawals);
    } catch (error) { console.warn('ไม่สามารถโหลดกระเป๋า Rider', error); }
  };

  RiderWallet.render = function renderWalletWithPrivateProofs() {
    const target = $('#riderWalletSummary'), wallet = State.wallet || {}, requests = State.withdrawals || [];
    if (!target) return;
    const available = Number(wallet.available_amount || 0), processing = Number(wallet.processing_amount || 0), paid = Number(wallet.paid_amount || 0), total = Number(wallet.total_earned || 0);
    $('#walletBalance').textContent = money(available + processing);
    const label = { requested: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', paid: 'โอนแล้ว', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' };
    const list = requests.length ? `<div style="margin-top:12px">${requests.slice(0, 5).map(row => `<div class="job" style="margin-bottom:8px;padding:12px"><div class="job-top"><div><b>คำขอถอน ${money(row.amount)}</b><small>${esc(new Date(row.requested_at).toLocaleString('th-TH'))}${row.admin_note ? ` · ${esc(row.admin_note)}` : ''}${row.payment_reference ? ` · อ้างอิง ${esc(row.payment_reference)}` : ''}</small></div><span class="status ${row.status === 'paid' ? 'done' : row.status === 'rejected' ? '' : 'wait'}">${label[row.status] || esc(row.status)}</span></div>${row.status === 'paid' && row.proof_available ? `<button class="map" type="button" onclick="viewRiderWithdrawalProof('${esc(row.id)}')">ดูหลักฐานการโอน</button>` : ''}</div>`).join('')}</div>` : '<small style="display:block;margin-top:12px;color:var(--muted)">ยังไม่มีคำขอถอนเงิน คุณสามารถกดร้องขอเมื่อมียอดพร้อมถอน</small>';
    target.innerHTML = `<div class="card"><div class="section-head" style="margin:0 0 10px"><div><h3 style="margin:0;font-size:15px">กระเป๋าเงิน Rider</h3><p>ยอดสะสมจะคงอยู่ข้ามวันจนกว่าจะได้รับเงินจริงหรือส่งคำขอถอน</p></div><button class="btn btn-main btn-sm" type="button" onclick="requestRiderWithdrawal()" ${available > 0 ? '' : 'disabled'}>ร้องขอถอนเงิน</button></div><div class="stats"><div class="stat"><small>รายได้สะสมทั้งหมด</small><b>${money(total)}</b><small>รวมงานที่ผ่านมา</small></div><div class="stat"><small>พร้อมถอน</small><b>${money(available)}</b><small>ยังไม่ผูกกับรอบจ่าย</small></div><div class="stat"><small>กำลังดำเนินการ</small><b>${money(processing)}</b><small>รอผู้ดูแลโอนหรืออนุมัติ</small></div><div class="stat"><small>รับเงินจริงแล้ว</small><b>${money(paid)}</b><small>ดูหลักฐานได้จากรายการด้านล่าง</small></div></div>${list}</div>`;
  };

  window.viewRiderWithdrawalProof = async id => {
    try {
      const rows = await Cloud.request(`withdrawal_requests?select=id,proof_image_url,proof_available&id=eq.${encodeURIComponent(id)}&limit=1`);
      const proof = rows?.[0]?.proof_image_url;
      if (!proof || !rows?.[0]?.proof_available) throw new Error('ยังไม่มีหลักฐานการโอนสำหรับคำขอนี้');
      if (/^data:image\//i.test(proof)) {
        const legacy = window.open(proof, '_blank', 'noopener');
        if (!legacy) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
        return;
      }
      const session = Cloud.session();
      const response = await fetch(`${Cloud.url}/storage/v1/object/${pathEncode(proof)}`, { headers: { apikey: Cloud.key, Authorization: `Bearer ${session?.access_token || ''}` } });
      if (!response.ok) throw new Error('ไม่สามารถเปิดหลักฐานการโอนได้');
      const url = URL.createObjectURL(await response.blob()), viewer = window.open(url, '_blank', 'noopener');
      if (!viewer) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { toast(error.message || 'เปิดหลักฐานการโอนไม่สำเร็จ', 'error'); }
  };
})();
