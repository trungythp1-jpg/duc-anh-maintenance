const { db, now } = require('../lib/admin');

/**
 * Ghi nhận KPI Activity cho một Work Order
 * đã hoàn thành hợp lệ.
 *
 * Hàm này chỉ nên được gọi từ backend,
 * không expose trực tiếp thành onCall.
 */
async function recordKpiActivity(
  tx,
  workOrderRef,
  workOrder
) {
  /*
   * Chỉ tính các Work Order bảo trì.
   */
  if (workOrder.type !== 'MAINTENANCE') {
    return {
      recorded: false,
      reason: 'NOT_MAINTENANCE'
    };
  }

  /*
   * Chưa có người hoàn thành thì
   * không thể xác định KPI.
   */
  const technicianId =
    String(
      workOrder.completedBy ||
      ''
    ).trim();

  if (!technicianId) {
    throw new Error(
      'KPI_COMPLETER_REQUIRED'
    );
  }

  /*
   * Một WO chỉ được tạo một KPI Activity.
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
   * Xác định kỳ KPI theo thời điểm
   * hoàn thành Work Order.
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

  /*
   * Snapshot dữ liệu quan trọng vào KPI Activity.
   *
   * Không phụ thuộc việc Work Order sau này
   * có thay đổi thông tin hiển thị.
   */
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

    completedAt:
      completedAt,

    createdAt:
      now()
  };

  tx.create(
    activityRef,
    activity
  );

  /*
   * Gắn activity ID vào Work Order.
   * Đây là idempotency marker.
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

module.exports = {
  recordKpiActivity
};