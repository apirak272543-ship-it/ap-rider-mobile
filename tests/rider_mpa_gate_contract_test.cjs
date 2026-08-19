const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('rider/rider-app.js', 'utf8');
assert.match(source, /requireRole\('rider', \{ loginUrl: 'login\.html', container: \$\('\[data-page-content\]'\), renderLoading: false \}\)/, 'Rider gate must retain page DOM while checking role access');
console.log('rider_mpa_gate_contract_test: PASS');
