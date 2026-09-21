const { db, now } = require('../lib/admin');

async function generateWorkOrderCode(transaction) {
  const ref = db.doc('systemCounters/workOrderCode');
  const snap = await transaction.get(ref);
  const current = snap.exists ? Number(snap.data().value || 0) : 0;
  const next = current + 1;
  transaction.set(ref, { value: next, updatedAt: now() }, { merge: true });
  const sequence = String(next).padStart(6, '0');
  return { sequence: next, workOrderCode: `WO-${sequence}` };
}
module.exports = { generateWorkOrderCode };
