const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'rider', 'rider-app.js'), 'utf8');

assert.match(app, /action: 'update_rider_presence'/, 'Rider MPA must use the server-owned presence action');
assert.match(app, /operation, data/, 'Rider MPA presence helper must forward constrained operations and data');
assert.match(app, /navigator\.geolocation/, 'Rider profile must support live device location');
assert.match(app, /saveAvailability/, 'Rider profile must expose a readiness control');
assert.match(app, /captureRiderLocation/, 'Rider profile must expose a live location control');
assert.doesNotMatch(app, /M\.request\(`riders\?[^`]+`, \{ method: 'PATCH'/, 'Rider MPA must not direct-patch its profile or presence');
console.log('rider presence server action contract: PASS');
