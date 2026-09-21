const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { db, now, requireAuth, assertRole, writeAudit } = require('../lib/admin');
async function finalizeConfirmationHandler(request){
 const auth=requireAuth(request); assertRole(auth,['admin','manager','customer_service']);
 const {confirmationId,customerName,customerPhone,contactMethod,notes='',reason=''}=request.data||{};
 if(!confirmationId||!customerName) throw new HttpsError('invalid-argument','MISSING_CONFIRMATION_DATA');
 const ref=db.doc(`customerConfirmations/${confirmationId}`); const snap=await ref.get(); if(!snap.exists) throw new HttpsError('not-found','CONFIRMATION_NOT_FOUND');
 const before=snap.data(); if(before.status==='CONFIRMED') throw new HttpsError('already-exists','CONFIRMATION_ALREADY_FINAL');
 const after={status:'CONFIRMED',customerName,customerPhone:customerPhone||'',contactMethod:contactMethod||'PHONE',reason,notes,confirmedBy:auth.uid,confirmedAt:now()};
 await ref.update(after);
 await db.doc(`workOrders/${before.workOrderId}`).update({status:'CUSTOMER_CONFIRMED',customerConfirmedAt:now(),updatedAt:now()});
 await writeAudit({auth,action:'CONFIRM_BY_CSKH',module:'confirmations',recordId:confirmationId,description:'Customer confirmation finalized',before,after});
 return {ok:true};
}
module.exports={finalizeConfirmation:onCall({region:'asia-southeast1'},finalizeConfirmationHandler),finalizeConfirmationHandler};
