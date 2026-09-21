const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { db, now, requireAuth, assertRole, writeAudit } = require('../lib/admin');
const { generateWorkOrderCode } = require('../codes/work-order-code');
const { validateWorkOrder } = require('../validation/work-order');
const { findWorkOrderDuplicates } = require('../duplicate/work-order');

async function createWorkOrderHandler(request) {
  const auth=requireAuth(request);
  assertRole(auth,['admin','manager','technician','customer_service','director']);
  const data=validateWorkOrder(request.data||{});
  const dup=await findWorkOrderDuplicates(data);
  if (dup.active.length) throw new HttpsError('already-exists','ELEVATOR_HAS_ACTIVE_WORK_ORDER',{active:dup.active});
  if (dup.cooldown.length) throw new HttpsError('resource-exhausted','WORK_ORDER_COOLDOWN');

  const ref=db.collection('workOrders').doc();
  let code;
  await db.runTransaction(async tx=>{
    code=await generateWorkOrderCode(tx);
    tx.set(ref,{...data,...code,createdBy:auth.uid,createdAt:now(),updatedAt:now()});
  });
  await writeAudit({auth,action:'CREATE_WORK_ORDER',module:'workOrders',recordId:ref.id,description:`Created ${code.workOrderCode}`,after:{...data,...code}});
  return {id:ref.id,...code};
}
module.exports = { createWorkOrder: onCall({region:'asia-southeast1'}, createWorkOrderHandler), createWorkOrderHandler };
