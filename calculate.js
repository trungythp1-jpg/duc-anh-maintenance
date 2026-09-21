const { db } = require('../lib/admin');
async function calculateKpi({technicianId,periodYear,periodMonth}){
 const start=new Date(Date.UTC(periodYear,periodMonth-1,1)); const end=new Date(Date.UTC(periodYear,periodMonth,1));
 const snap=await db.collection('workOrders').where('completedBy','==',technicianId).where('status','in',['CUSTOMER_CONFIRMED','CLOSED']).get();
 const activities=snap.docs.filter(d=>{const t=d.data().completedAt?.toDate?.();return t&&t>=start&&t<end;});
 const unique=new Set(activities.map(d=>d.data().elevatorId));
 return {technicianId,periodYear,periodMonth,completedWorkOrders:activities.length,uniqueElevatorsServiced:unique.size,workOrderIds:activities.map(d=>d.id)};
}
module.exports={calculateKpi};
