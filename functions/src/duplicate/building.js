const { db, normalizeText } = require('../lib/admin');
async function findBuildingDuplicates(data) {
  const snap = await db.collection('buildings').where('customerId','==',data.customerId).limit(50).get();
  return snap.docs.filter(d=>d.data().nameNormalized===normalizeText(data.name) || d.data().address===data.address).map(d=>({id:d.id,reason:'BUILDING_MATCH'}));
}
module.exports = { findBuildingDuplicates };
