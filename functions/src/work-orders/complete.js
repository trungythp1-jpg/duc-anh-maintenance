const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

const COMPLETABLE_STATUSES = [
  'IN_PROGRESS',
  'ON_SITE',
  'CHECKING',
  'REPAIRING',
  'RESOLVED'
];

const MANAGEMENT_ROLES = [
  'ADMIN',
  'MANAGER',
  'DIRECTOR'
];

async function completeWorkOrderHandler(request) {
  const auth = requireAuth(request);

  const role = assertRole(auth, [
    'ADMIN',
    'MANAGER',
    'TECHNICIAN',
    'DIRECTOR'
  ]);

  const {
    workOrderId,
    result,
    technicianNote,
    photos = []
  } = request.data || {};

  if (!workOrderId) {
    throw new HttpsError(
      'invalid-argument',
      'MISSING_WORK_ORDER_ID'
    );
  }

  if (!Array.isArray(photos)) {
    throw new HttpsError(
      'invalid-argument',
      'INVALID_PHOTOS'
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

    if (!COMPLETABLE_STATUSES.includes(before.status)) {
      throw new HttpsError(
        'failed-precondition',
        'WORK_ORDER_NOT_READY_TO_COMPLETE',
        {
          status: before.status
        }
      );
    }

    if (!MANAGEMENT_ROLES.includes(role)) {
      const assigned = Array.isArray(
        before.assignedTechnicianIds
      )
        ? before.assignedTechnicianIds
        : [];

      if (!assigned.includes(auth.uid)) {
        throw new HttpsError(
          'permission-denied',
          'TECHNICIAN_NOT_ASSIGNED_TO_WORK_ORDER'
        );
      }
    }

    after = {
      status: 'COMPLETED_PENDING_CONFIRMATION',
      result: String(result || '').trim(),
      technicianNote: String(
        technicianNote || ''
      ).trim(),
      photos,
      completedAt: now(),
      updatedAt: now(),
      completedBy: auth.uid
    };

    tx.update(ref, after);
  });

  await writeAudit({
    auth,
    action: 'COMPLETE_WORK_ORDER',
    module: 'workOrders',
    recordId: workOrderId,
    description: `Completed ${before.workOrderCode}`,
    before,
    after
  });

  return {
    ok: true,
    id: workOrderId,
    workOrderCode: before.workOrderCode,
    status: after.status
  };
}

module.exports = {
  completeWorkOrder: onCall(
    {
      region: 'asia-southeast1'
    },
    completeWorkOrderHandler
  ),

  completeWorkOrderHandler
};