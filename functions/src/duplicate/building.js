const { db } = require('../lib/admin');
const { normalizeText } = require('../lib/utils');

function coordinatesAreClose(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    return false;
  }

  const latDiff = Math.abs(lat1 - lat2);
  const lonDiff = Math.abs(lon1 - lon2);

  // Approx. within ~100m at Vietnamese latitudes.
  return latDiff <= 0.001 && lonDiff <= 0.001;
}

async function findBuildingDuplicates(data) {
  const customerId = String(data.customerId || '').trim();

  if (!customerId) {
    return [];
  }

  const nameNormalized = normalizeText(data.name);
  const addressNormalized = normalizeText(data.address);

  const snap = await db
    .collection('buildings')
    .where('customerId', '==', customerId)
    .limit(100)
    .get();

  const results = [];

  for (const doc of snap.docs) {
    const existing = doc.data();

    const sameName =
      nameNormalized &&
      normalizeText(existing.name) === nameNormalized;

    const sameAddress =
      addressNormalized &&
      (
        existing.addressNormalized
          ? existing.addressNormalized === addressNormalized
          : normalizeText(existing.address) === addressNormalized
      );

    const sameGps = coordinatesAreClose(
      data.latitude,
      data.longitude,
      existing.latitude,
      existing.longitude
    );

    if (sameName && sameAddress) {
      results.push({
        id: doc.id,
        reason: 'NAME_AND_ADDRESS_MATCH',
        severity: 'BLOCK'
      });
      continue;
    }

    if (sameAddress && sameGps) {
      results.push({
        id: doc.id,
        reason: 'ADDRESS_AND_GPS_MATCH',
        severity: 'BLOCK'
      });
      continue;
    }

    if (sameName && sameGps) {
      results.push({
        id: doc.id,
        reason: 'NAME_AND_GPS_MATCH',
        severity: 'WARN'
      });
      continue;
    }

    if (sameAddress) {
      results.push({
        id: doc.id,
        reason: 'ADDRESS_MATCH',
        severity: 'WARN'
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
  findBuildingDuplicates
};