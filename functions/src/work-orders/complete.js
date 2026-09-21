const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { db, now, requireAuth, assertRole, writeAudit } = require('../lib/admin');
async function completeWorkOrderHandler(request){
  const auth=requireAuth(request); assertRole(auth,['admin','manager','technician']);
  const {workOrderId,result,technicianNote,photos=[]}=request.data||{};
  if(!workOrderId) throw new HttpsError('invalid-argument','MISSING_WORK_ORDER_ID');
  const ref=db.doc(`workOrders/${workOrderId}`); const snap=await ref.get();
  if(!snap.exists) throw new HttpsError('not-found','WORK_ORDER_NOT_FOUND');
  const before=snap.data();
  if(['CANCELLED','VOID','CLOSED'].includes(before.status)) throw new HttpsError('failed-precondition','WORK_ORDER_NOT_EDITABLE');
  const after={status:'COMPLETED_PENDING_CONFIRMATION',result:result||'',technicianNote:technicianNote||'',photos:Array.isArray(photos)?photos:[],completedAt:now(),updatedAt:now(),completedBy:auth.uid};
  await ref.update(after);
  await writeAudit({auth,action:'COMPLETE_WORK_ORDER',module:'workOrders',recordId:workOrderId,description:`Completed ${before.workOrderCode}`,before,after});
  return {ok:true,status:after.status};
}
module.exports={completeWorkOrder:onCall({region:'asia-southeast1'},completeWorkOrderHandler),completeWorkOrderHandler};
