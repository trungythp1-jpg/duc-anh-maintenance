const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { db, now, requireAuth, assertRole, writeAudit } = require('../lib/admin');
async function requestConfirmationHandler(request){
 const auth=requireAuth(request); assertRole(auth,['admin','manager','technician','customer_service']);
 const {workOrderId,method='CUSTOMER_DIGITAL'}=request.data||{}; if(!workOrderId) throw new HttpsError('invalid-argument','MISSING_WORK_ORDER_ID');
 const wo=await db.doc(`workOrders/${workOrderId}`).get(); if(!wo.exists) throw new HttpsError('not-found','WORK_ORDER_NOT_FOUND');
 const existing=await db.collection('customerConfirmations').where('workOrderId','==',workOrderId).where('status','==','PENDING').limit(1).get();
 if(!existing.empty) return {id:existing.docs[0].id,reused:true};
 const ref=db.collection('customerConfirmations').doc();
 await ref.set({workOrderId,customerId:wo.data().customerId,confirmationMethod:method,status:'PENDING',requestedBy:auth.uid,requestedAt:now()});
 await writeAudit({auth,action:'REQUEST_CONFIRMATION',module:'confirmations',recordId:ref.id,description:`Requested confirmation for ${wo.data().workOrderCode}`});
 return {id:ref.id};
}
module.exports={requestConfirmation:onCall({region:'asia-southeast1'},requestConfirmationHandler),requestConfirmationHandler};
