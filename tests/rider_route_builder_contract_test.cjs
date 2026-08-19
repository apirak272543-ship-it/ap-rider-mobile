const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('rider/rider-delivery-location.js', 'utf8');
const sandbox = {
  window: { APServiceMPA: { ui: { nowIso: () => '2026-08-19T00:00:00.000Z' } } },
  document: { querySelector: () => null },
  navigator: {},
};
vm.runInNewContext(source, sandbox);

const { route } = sandbox.window.APRiderDeliveryLocation;
const url = route({ lat: 13.7563, lng: 100.5018 }, { lat: 13.7367, lng: 100.5231 });

assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/, 'ต้องสร้าง Google Maps directions URL');
assert.match(url, /origin=13\.7563%2C100\.5018/, 'ต้องใส่พิกัดจุดรับเป็น origin');
assert.match(url, /destination=13\.7367%2C100\.5231/, 'ต้องใส่พิกัดจุดส่งเป็น destination');
assert.match(url, /travelmode=driving/, 'ต้องใช้โหมดขับขี่สำหรับ Rider');
assert.equal(route({ lat: 999, lng: 100 }, { lat: 13, lng: 100 }), '', 'พิกัดจุดรับไม่ถูกต้องต้องไม่สร้าง URL');
assert.equal(route({ lat: 13, lng: 100 }, null), '', 'ไม่มีจุดส่งต้องไม่สร้าง URL');

console.log('rider route builder contract: PASS');
