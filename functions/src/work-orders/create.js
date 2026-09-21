const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

const { generateWorkOrderCode } = require('../codes/work-order-code');
const { validateWorkOrder } = require('../validation/work-order');
const { findWorkOrderDuplicates } = require('../duplicate/work-order');

async function createWorkOrderHandler(request) {
  const auth = requireAuth(request);

  assertRole(auth, [
    'ADMIN',
    'MANAGER',
    'TECHNICIAN',
    'CUSTOMER_SERVICE',
    'DIRECTOR'
  ]);

  const data = validateWorkOrder(request.data || {});

  const ref = db.collection('workOrders').doc();

  let result;

  await db.runTransaction(async (tx) => {
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

    const code = await generateWorkOrderCode(tx);

    const record = {
      ...data,
      ...code,

      createdBy: auth.uid,
      createdAt: now(),
      updatedAt: now()
    };

    tx.create(ref, record);

    result = {
      id: ref.id,
      ...code
    };
  });

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