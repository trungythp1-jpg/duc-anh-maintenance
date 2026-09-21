const { db, now } = require('../lib/admin');

async function generateContractCode(transaction, { year, prefix='DA-BT' }={}) {
  const ref = db.doc('systemCounters/contractCode');
  const snap = await transaction.get(ref);
  const current = snap.exists ? Number(snap.data().value || 0) : 0;
  const next = current + 1;
  transaction.set(ref, { value: next, updatedAt: now() }, { merge: true });
  const sequence = String(next).padStart(6, '0');
  return { sequence: next, contractCode: `${prefix}-${year || new Date().getFullYear()}-${sequence}` };
}
module.exports = { generateContractCode };
