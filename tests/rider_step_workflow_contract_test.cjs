const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'rider/rider-app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'rider/rider-ui-polish.css'), 'utf8');

assert.match(app, /const riderSteps = \[C\.contracts\.orderStatus\.RIDER_PICKUP, C\.contracts\.orderStatus\.ARRIVED_STORE, C\.contracts\.orderStatus\.COLLECTED, C\.contracts\.orderStatus\.DELIVERING, C\.contracts\.orderStatus\.COMPLETED\]/, 'Rider workflow order must remain unchanged');
assert.match(app, /const activeStepIndex = currentIndex < 0 \? 0 : currentIndex/, 'The UI must identify one current step');
assert.match(app, /const nextStep = riderSteps\.find\(status => C\.order\.canTransition\(\{ from: job\.status, to: status, actor: 'rider' \}\)\.ok\)/, 'Next step must be selected from the Rider transition sequence');
assert.match(app, /is-locked/, 'Future steps must be rendered as locked');
assert.match(app, /ยืนยันว่าทำขั้นนี้เสร็จแล้ว/, 'The primary action must confirm only the current step');
assert.match(app, /const next = nextStep/, 'The button must not accept an arbitrary future status');
assert.doesNotMatch(app, /id="next"/, 'The UI must not expose a selectable future status');
assert.match(css, /rider-stepper__item\.is-locked/, 'Locked steps need a distinct visual state');
console.log('rider step workflow contract: PASS');
