const { db, normalizeText, normalizePhone } = require('../lib/admin');
async function findCustomerDuplicates(data) {
  const [byPhone, byName] = await Promise.all([
    db.collection('customers').where('phone','==',normalizePhone(data.phone)).limit(5).get(),
    db.collection('customers').where('nameNormalized','==',normalizeText(data.name)).limit(5).get()
  ]);
  const ids = new Set([...byPhone.docs, ...byName.docs].map(d=>d.id));
  return [...ids].map(id=>({id, reason:'CUSTOMER_MATCH'}));
}
module.exports = { findCustomerDuplicates };
