const { db } = require('../lib/admin');
const { normalizeText, normalizePhone } = require('../lib/utils');

async function findCustomerDuplicates(data) {
  const phone = normalizePhone(data.phone);
  const nameNormalized = normalizeText(data.name);
  const addressNormalized = normalizeText(data.address);

  const [byPhone, byName] = await Promise.all([
    phone
      ? db.collection('customers')
          .where('phone', '==', phone)
          .limit(10)
          .get()
      : { docs: [] },

    nameNormalized
      ? db.collection('customers')
          .where('nameNormalized', '==', nameNormalized)
          .limit(10)
          .get()
      : { docs: [] }
  ]);

  const candidates = new Map();

  for (const doc of [...byPhone.docs, ...byName.docs]) {
    candidates.set(doc.id, {
      id: doc.id,
      ...doc.data()
    });
  }

  const results = [];

  for (const customer of candidates.values()) {
    const samePhone =
      phone &&
      normalizePhone(customer.phone) === phone;

    const sameName =
      nameNormalized &&
      normalizeText(customer.name) === nameNormalized;

    const sameAddress =
      addressNormalized &&
      normalizeText(customer.address) === addressNormalized;

    if (samePhone && sameName && sameAddress) {
      results.push({
        id: customer.id,
        reason: 'CUSTOMER_MATCH',
        severity: 'BLOCK'
      });
      continue;
    }

    if (samePhone && sameName) {
      results.push({
        id: customer.id,
        reason: 'PHONE_AND_NAME_MATCH',
        severity: 'BLOCK'
      });
      continue;
    }

    if (samePhone) {
      results.push({
        id: customer.id,
        reason: 'PHONE_MATCH',
        severity: 'WARN'
      });
      continue;
    }

    if (sameName && sameAddress) {
      results.push({
        id: customer.id,
        reason: 'NAME_AND_ADDRESS_MATCH',
        severity: 'WARN'
      });
      continue;
    }

    if (sameName) {
      results.push({
        id: customer.id,
        reason: 'NAME_MATCH',
        severity: 'WARN'
      });
    }
  }

  return results;
}

module.exports = { findCustomerDuplicates };