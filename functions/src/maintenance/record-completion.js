const { now } = require('../lib/admin');

/**
 * Ghi nhận một lượt bảo trì hợp lệ vào maintenanceAgreement.
 *
 * Hàm này được gọi bên trong Firestore Transaction.
 *
 * Chỉ áp dụng cho Work Order type = MAINTENANCE.
 *
 * Idempotency:
 * - Nếu WO đã có maintenanceVisitRecordedAt
 *   thì không cộng lại.
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
   * Nếu lượt này đã được ghi nhận trước đó,
   * tuyệt đối không cộng lần thứ hai.
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

  const agreementRef = workOrderRef.firestore.doc(
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
   * Cập nhật Agreement.
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
   * Đánh dấu ngay trên WO rằng lượt này
   * đã được ghi nhận.
   *
   * Đây là lớp bảo vệ idempotency thứ hai.
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

      maintenanceVisitCount:
        nextCompleted,

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