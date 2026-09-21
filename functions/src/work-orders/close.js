const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

async function closeWorkOrderHandler(request) {
  const auth = requireAuth(request);

  assertRole(auth, [
    'ADMIN',
    'MANAGER',
    'CUSTOMER_SERVICE'
  ]);

  const workOrderId = String(
    request.data?.workOrderId || ''
  ).trim();

  if (!workOrderId) {
    throw new HttpsError(
      'invalid-argument',
      'MISSING_WORK_ORDER_ID'
    );
  }

  const ref = db.doc(`workOrders/${workOrderId}`);

  let before;
  let after;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      throw new HttpsError(
        'not-found',
        'WORK_ORDER_NOT_FOUND'
      );
    }

    before = snap.data();

    if (before.status !== 'CUSTOMER_CONFIRMED') {
      throw new HttpsError(
        'failed-precondition',
        'CUSTOMER_CONFIRMATION_REQUIRED',
        {
          status: before.status
        }
      );
    }

    after = {
      status: 'CLOSED',
      closedAt: now(),
      closedBy: auth.uid,
      updatedAt: now()
    };

    tx.update(ref, after);
  });

  await writeAudit({
    auth,
    action: 'CLOSE_WORK_ORDER',
    module: 'workOrders',
    recordId: workOrderId,
    description: `Closed ${before.workOrderCode}`,
    before,
    after
  });

  return {
    ok: true,
    id: workOrderId,
    workOrderCode: before.workOrderCode,
    status: 'CLOSED'
  };
}

module.exports = {
  closeWorkOrder: onCall(
    {
      region: 'asia-southeast1'
    },
    closeWorkOrderHandler
  ),

  closeWorkOrderHandler
};