const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { db, now, requireAuth, assertRole, writeAudit } = require('../lib/admin');
async function closeWorkOrderHandler(request){
 const auth=requireAuth(request); assertRole(auth,['admin','manager','customer_service']);
 const id=request.data?.workOrderId; if(!id) throw new HttpsError('invalid-argument','MISSING_WORK_ORDER_ID');
 const ref=db.doc(`workOrders/${id}`); const snap=await ref.get(); if(!snap.exists) throw new HttpsError('not-found','WORK_ORDER_NOT_FOUND');
 const before=snap.data(); if(before.status!=='CUSTOMER_CONFIRMED') throw new HttpsError('failed-precondition','CUSTOMER_CONFIRMATION_REQUIRED');
 await ref.update({status:'CLOSED',closedAt:now(),closedBy:auth.uid,updatedAt:now()});
 await writeAudit({auth,action:'CLOSE_WORK_ORDER',module:'workOrders',recordId:id,description:`Closed ${before.workOrderCode}`,before,after:{status:'CLOSED'}});
 return {ok:true};
}
module.exports={closeWorkOrder:onCall({region:'asia-southeast1'},closeWorkOrderHandler),closeWorkOrderHandler};
