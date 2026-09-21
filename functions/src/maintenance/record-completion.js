const { db, now } = require('../lib/admin');

/**
 * Ghi nhận một lượt bảo trì hợp lệ.
 *
 * Hàm này CHỈ được gọi bên trong Firestore Transaction.
 *
 * Không export thành onCall Function.
 */
async function recordMaintenanceCompletion(
  tx,
  workOrderRef,
  workOrder
) {
  if (workOrder.type !== 'MAINTENANCE') {
    return {
      recorded: false,
      reason: 'NOT_MAINTENANCE'
    };
  }

  /*
   * Idempotency:
   * WO này đã được ghi nhận lượt bảo trì
   * thì không được cộng lại.
   */
  if (workOrder.maintenanceVisitRecordedAt) {
    return {
      recorded: false,
      reason: 'ALREADY_RECORDED'
    };
  }

  const agreementId =
    String(workOrder.agreementId || '').trim();

  if (!agreementId) {
    throw new Error(
      'MAINTENANCE_AGREEMENT_REQUIRED'
    );
  }

  const agreementRef = db.doc(
    `maintenanceAgreements/${agreementId}`
  );

  const agreementSnap =
    await tx.get(agreementRef);

  if (!agreementSnap.exists) {
    throw new Error(
      'MAINTENANCE_AGREEMENT_NOT_FOUND'
    );
  }

  const agreement =
    agreementSnap.data();

  const currentCompleted =
    Math.max(
      0,
      Number(
        agreement.completedVisits || 0
      )
    );

  const nextCompleted =
    currentCompleted + 1;

  /*
   * Agreement:
   * completedVisits được server quản lý.
   */
  tx.update(
    agreementRef,
    {
      completedVisits:
        nextCompleted,

      updatedAt:
        now()
    }
  );

  /*
   * Work Order:
   * đánh dấu lượt đã được ghi nhận.
   */
  tx.update(
    workOrderRef,
    {
      maintenanceVisitRecordedAt:
        now(),

      maintenanceVisitRecordedBy:
        workOrder.customerConfirmedBy ||
        workOrder.completedBy ||
        null,

      updatedAt:
        now()
    }
  );

  return {
    recorded: true,
    completedVisits:
      nextCompleted
  };
}

module.exports = {
  recordMaintenanceCompletion
};