const { db, now } = require('../lib/admin');

async function generateElevatorCode(transaction) {
  const ref = db.doc('systemCounters/elevatorCode');
  const snap = await transaction.get(ref);
  const current = snap.exists ? Number(snap.data().value || 0) : 0;
  const next = current + 1;
  transaction.set(ref, { value: next, updatedAt: now() }, { merge: true });
  const sequence = String(next).padStart(6, '0');
  return { sequence: next, elevatorCode: sequence, displayCode: `ELV-${sequence}` };
}
module.exports = { generateElevatorCode };
