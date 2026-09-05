const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rider', 'rider-app.js'), 'utf8');
const checks = [
  ['queries unassigned jobs', source.includes('rider_id=is.null')],
  ['limits available jobs to contract-eligible statuses', source.includes('claimableStatuses') && source.includes('STORE_ACCEPTED') && source.includes('PREPARING')],
  ['uses server-side atomic claim operation to prevent a double claim', source.includes("updateRiderDelivery('claim'") && source.includes("action: 'update_rider_delivery'")],
  ['sets rider identity during claim', source.includes('rider_name: ctx.rider.name')],
  ['moves claimed work to rider pickup according to shared contract', source.includes('C.contracts.orderStatus.RIDER_PICKUP') && source.includes("actor: 'rider'")],
  ['checks server claim returned an order row', source.includes('!claimed?.id')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
  failed ||= !passed;
}
if (failed) process.exit(1);
console.log('Rider available-job claim contract: PASS');
