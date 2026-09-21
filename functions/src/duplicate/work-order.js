const { db } = require('../lib/admin');
async function findWorkOrderDuplicates(data) {
  const active = await db.collection('workOrders').where('elevatorId','==',data.elevatorId).where('status','in',['SCHEDULED','ASSIGNED','IN_PROGRESS','ON_SITE','CHECKING','INCIDENT','REPAIRING','COMPLETED_PENDING_CONFIRMATION','CUSTOMER_REJECTED']).limit(20).get();
  const nowMs=Date.now();
  const cooldown=active.docs.filter(d=>{
    const x=d.data(); const created=x.createdAt?.toMillis?.() || 0;
    return created && nowMs-created < 20*60*1000;
  });
  return { active: active.docs.map(d=>({id:d.id,code:d.data().workOrderCode,status:d.data().status})), cooldown: cooldown.map(d=>d.id) };
}
module.exports = { findWorkOrderDuplicates };
