const { db } = require('../lib/admin');
const { normalizeText } = require('../lib/utils');

async function findElevatorDuplicates(data) {
  const buildingId = String(data.buildingId || '').trim();

  if (!buildingId) {
    return [];
  }

  const serialNumberNormalized = normalizeText(data.serialNumber);
  const nameNormalized = normalizeText(data.name);

  const snap = await db
    .collection('elevators')
    .where('buildingId', '==', buildingId)
    .limit(100)
    .get();

  const results = [];

  for (const doc of snap.docs) {
    const existing = doc.data();

    const existingSerial =
      existing.serialNumberNormalized ||
      normalizeText(existing.serialNumber);

    const existingName =
      existing.nameNormalized ||
      normalizeText(existing.name);

    const sameSerial =
      serialNumberNormalized &&
      existingSerial &&
      serialNumberNormalized === existingSerial;

    const sameName =
      nameNormalized &&
      existingName &&
      nameNormalized === existingName;

    if (sameSerial) {
      results.push({
        id: doc.id,
        reason: 'SERIAL_NUMBER_MATCH',
        severity: 'BLOCK'
      });
      continue;
    }

    if (sameName) {
      results.push({
        id: doc.id,
        reason: 'NAME_MATCH',
        severity: 'WARN'
      });
    }
  }

  return results;
}

module.exports = {
  findElevatorDuplicates
};