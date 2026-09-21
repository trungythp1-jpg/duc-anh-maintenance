const { db, now } = require('../lib/admin');

/**
 * Ghi nhận KPI Activity cho một Work Order
 * đã hoàn thành hợp lệ.
 *
 * Chỉ gọi từ backend và bên trong
 * Firestore Transaction.
 */
async function recordKpiActivity(
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

  const technicianId =
    String(
      workOrder.completedBy || ''
    ).trim();

  if (!technicianId) {
    throw new Error(
      'KPI_COMPLETER_REQUIRED'
    );
  }

  /*
   * Một Work Order chỉ tạo một KPI Activity.
   */
  if (workOrder.kpiActivityId) {
    return {
      recorded: false,
      reason: 'ALREADY_RECORDED',
      kpiActivityId:
        workOrder.kpiActivityId
    };
  }

  /*
   * KPI thuộc kỳ của thời điểm KTV
   * hoàn thành công việc.
   */
  const completedAt =
    workOrder.completedAt;

  if (
    !completedAt ||
    typeof completedAt.toDate !== 'function'
  ) {
    throw new Error(
      'KPI_COMPLETION_DATE_REQUIRED'
    );
  }

  const completedDate =
    completedAt.toDate();

  const year =
    completedDate.getFullYear();

  const month =
    completedDate.getMonth() + 1;

  const periodId =
    `${year}-${String(month).padStart(2, '0')}`;

  const activityRef =
    db.collection('kpiActivities').doc();

  const activity = {
    periodId,

    periodYear:
      year,

    periodMonth:
      month,

    technicianId,

    workOrderId:
      workOrderRef.id,

    workOrderCode:
      workOrder.workOrderCode || '',

    customerId:
      workOrder.customerId || '',

    buildingId:
      workOrder.buildingId || '',

    elevatorId:
      workOrder.elevatorId || '',

    agreementId:
      workOrder.agreementId || '',

    type:
      workOrder.type,

    status:
      'VALID',

    activityType:
      'MAINTENANCE_COMPLETED',

    completedAt,

    createdAt:
      now()
  };

  tx.create(
    activityRef,
    activity
  );

  /*
   * Idempotency marker trên Work Order.
   */
  tx.update(
    workOrderRef,
    {
      kpiActivityId:
        activityRef.id,

      kpiRecordedAt:
        now(),

      kpiRecordedBy:
        technicianId,

      updatedAt:
        now()
    }
  );

  return {
    recorded: true,

    kpiActivityId:
      activityRef.id,

    periodId
  };
}

/**
 * Tính KPI tổng hợp cho một kỹ thuật viên
 * trong một kỳ.
 *
 * Đây là hàm READ.
 * Không thay đổi dữ liệu.
 */
async function getKpiSummary(
  periodId,
  technicianId
) {
  const normalizedPeriod =
    String(periodId || '').trim();

  const normalizedTechnician =
    String(technicianId || '').trim();

  if (!normalizedPeriod) {
    throw new Error(
      'KPI_PERIOD_REQUIRED'
    );
  }

  if (!normalizedTechnician) {
    throw new Error(
      'KPI_TECHNICIAN_REQUIRED'
    );
  }

  /*
   * Lấy Target.
   */
  const targetRef = db.doc(
    `kpiTargets/${normalizedPeriod}_${normalizedTechnician}`
  );

  const targetSnap =
    await targetRef.get();

  const target =
    targetSnap.exists
      ? Math.max(
          0,
          Number(
            targetSnap.data().target || 0
          )
        )
      : 0;

  /*
   * Lấy các Activity hợp lệ.
   */
  const activitySnap = await db
    .collection('kpiActivities')
    .where(
      'periodId',
      '==',
      normalizedPeriod
    )
    .where(
      'technicianId',
      '==',
      normalizedTechnician
    )
    .where(
      'status',
      '==',
      'VALID'
    )
    .get();

  const actual =
    activitySnap.size;

  const remaining =
    Math.max(
      0,
      target - actual
    );

  const achievement =
    target > 0
      ? Number(
          (
            actual /
            target *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    periodId:
      normalizedPeriod,

    technicianId:
      normalizedTechnician,

    target,

    actual,

    remaining,

    achievement,

    activityCount:
      activitySnap.size
  };
}

module.exports = {
  recordKpiActivity,
  getKpiSummary
};