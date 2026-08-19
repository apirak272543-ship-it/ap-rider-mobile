const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('rider/rider-app.js', 'utf8');
assert.match(app, /AP Service · ไรเดอร์/, 'Rider brand label must be Thai-first');
assert.match(app, /href="\.\.\/rider\.html" aria-label="เปิดระบบไรเดอร์เดิม">ระบบเดิม</, 'Rider must retain the legacy route with a Thai-first label');
assert.doesNotMatch(app, /href="\.\.\/rider\.html">Fallback</, 'Rider navigation must not expose the raw technical fallback label');
console.log('rider thai-first navigation contract: PASS');
