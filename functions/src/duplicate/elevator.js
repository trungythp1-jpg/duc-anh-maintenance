const { db, normalizeText } = require('../lib/admin');
async function findElevatorDuplicates(data) {
  const snap = await db.collection('elevators').where('buildingId','==',data.buildingId).limit(100).get();
  return snap.docs.filter(d=>{
    const x=d.data();
    return (data.serialNumber && x.serialNumber && data.serialNumber===x.serialNumber) || normalizeText(x.name)===normalizeText(data.name);
  }).map(d=>({id:d.id,reason:'ELEVATOR_MATCH'}));
}
module.exports = { findElevatorDuplicates };
