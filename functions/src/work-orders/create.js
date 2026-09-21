const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

const { generateWorkOrderCode } = require('../codes/work-order-code');
const { validateWorkOrder } = require('../validation/work-order');
const { findWorkOrderDuplicates } = require('../duplicate/work-order');

const ALLOWED_ROLES = [
  'ADMIN',
  'MANAGER',
  'TECHNICIAN',
  'CUSTOMER_SERVICE',
  'DIRECTOR'
];

function buildMaintenanceLockId(data) {
  return [
    String(data.elevatorId).trim(),
    Number(data.periodYear),
    String(Number(data.periodMonth)).padStart(2, '0')
  ].join('_');
}

async function createWorkOrderHandler(request) {
  const auth = requireAuth(request);

  assertRole(auth, ALLOWED_ROLES);

  const data = validateWorkOrder(request.data || {});

  const ref = db.collection('workOrders').doc();

  let result;

  try {
    await db.runTransaction(async (tx) => {
      /*
       * 1. Kiểm tra các WO hiện có trong transaction.
       */
      const dup = await findWorkOrderDuplicates(data, tx);

      if (dup.active.length) {
        throw new HttpsError(
          'already-exists',
          'ELEVATOR_HAS_ACTIVE_WORK_ORDER',
          {
            active: dup.active
          }
        );
      }

      if (dup.maintenancePeriod.length) {
        throw new HttpsError(
          'already-exists',
          'MAINTENANCE_PERIOD_ALREADY_HAS_WORK_ORDER',
          {
            existing: dup.maintenancePeriod
          }
        );
      }

      if (dup.cooldown.length) {
        throw new HttpsError(
          'resource-exhausted',
          'WORK_ORDER_COOLDOWN',
          {
            existing: dup.cooldown
          }
        );
      }

      /*
       * 2. Khóa duy nhất cho:
       * Elevator + Maintenance Year + Maintenance Month.
       *
       * transaction.create() sẽ thất bại nếu một request khác
       * đã tạo khóa này trước đó.
       */
      let maintenanceLockRef = null;

      if (data.type === 'MAINTENANCE') {
        const lockId = buildMaintenanceLockId(data);

        maintenanceLockRef = db
          .collection('workOrderMaintenanceLocks')
          .doc(lockId);

        tx.create(maintenanceLockRef, {
          elevatorId: data.elevatorId,
          periodYear: data.periodYear,
          periodMonth: data.periodMonth,
          workOrderId: ref.id,
          createdAt: now(),
          createdBy: auth.uid
        });
      }

      /*
       * 3. Chỉ sau khi validation + duplicate + lock PASS
       * mới cấp mã Work Order.
       */
      const code = await generateWorkOrderCode(tx);

      const record = {
        ...data,
        ...code,

        createdBy: auth.uid,
        createdAt: now(),
        updatedAt: now()
      };

      /*
       * 4. Tạo Work Order.
       */
      tx.create(ref, record);

      result = {
        id: ref.id,
        ...code
      };
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    /*
     * Transaction.create(lock) có thể thất bại nếu
     * maintenance lock đã tồn tại.
     */
    if (
      error?.code === 6 ||
      error?.code === 'already-exists'
    ) {
      throw new HttpsError(
        'already-exists',
        'MAINTENANCE_PERIOD_ALREADY_HAS_WORK_ORDER'
      );
    }

    throw new HttpsError(
      'internal',
      'WORK_ORDER_CREATION_FAILED'
    );
  }

  /*
   * Audit sau khi transaction tạo WO thành công.
   */
  await writeAudit({
    auth,
    action: 'CREATE_WORK_ORDER',
    module: 'workOrders',
    recordId: ref.id,
    description: `Created ${result.workOrderCode}`,
    after: result
  });

  return result;
}

module.exports = {
  createWorkOrder: onCall(
    {
      region: 'asia-southeast1'
    },
    createWorkOrderHandler
  ),

  createWorkOrderHandler
};