const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'rider', 'rider-app.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'rider', 'earnings.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'rider', 'rider-finance.css'), 'utf8');

assert.match(app, /rpc\/wallet_summary/);
assert.match(app, /rpc\/request_full_wallet_withdrawal/);
assert.match(app, /p_recipient_type:\s*'rider'/);
assert.match(app, /p_recipient_id:\s*ctx\.rider\.id/);
assert.match(app, /available_amount/);
assert.match(app, /processing_amount/);
assert.match(app, /paid_amount/);
assert.match(app, /total_earned/);
assert.match(app, /withdrawal_requests\?select=id,amount,status,recipient_note,admin_note,payment_reference/);
assert.match(app, /requested:\s*'รอตรวจสอบ'/);
assert.match(app, /approved:\s*'อนุมัติแล้ว'/);
assert.match(app, /paid:\s*'โอนแล้ว'/);
assert.match(app, /data-view-proof/);
assert.match(app, /storage\/v1\/object/);
assert.match(app, /intervalMs:\s*60_000/);
assert.match(app, /ไม่มีตัวเลขจำลอง/);
assert.match(page, /rider-finance\.css\?v=rider-finance-v1/);
assert.match(page, /rider-app\.js\?v=rider-finance-v1/);
assert.match(css, /rider-wallet-workspace/);
assert.match(css, /@media \(max-width: 560px\)/);

console.log('Rider Finance withdrawal contract: PASS');

