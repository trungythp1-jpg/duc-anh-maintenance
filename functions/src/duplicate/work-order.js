const { db } = require('../lib/admin');

const ACTIVE_STATUSES = [
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_SITE',
  'CHECKING',
  'INCIDENT',
  'REPAIRING',
  'COMPLETED_PENDING_CONFIRMATION',
  'CUSTOMER_REJECTED'
];

async function findWorkOrderDuplicates(data) {
  const elevatorId = String(data.elevatorId || '').trim();

  if (!elevatorId) {
    return {
      active: [],
      maintenancePeriod: [],
      cooldown: []
    };
  }

  const snapshot = await db
    .collection('workOrders')
    .where('elevatorId', '==', elevatorId)
    .where('status', 'in', ACTIVE_STATUSES)
    .limit(100)
    .get();

  const nowMs = Date.now();

  const periodYear =
    Number(data.periodYear) ||
    (data.plannedDate
      ? new Date(data.plannedDate).getFullYear()
      : null);

  const periodMonth =
    Number(data.periodMonth) ||
    (data.plannedDate
      ? new Date(data.plannedDate).getMonth() + 1
      : null);

  const active = [];
  const maintenancePeriod = [];
  const cooldown = [];

  for (const doc of snapshot.docs) {
    const x = doc.data();

    active.push({
      id: doc.id,
      code: x.workOrderCode || '',
      status: x.status || ''
    });

    if (
      x.type === 'MAINTENANCE' &&
      periodYear &&
      periodMonth &&
      Number(x.periodYear) === periodYear &&
      Number(x.periodMonth) === periodMonth
    ) {
      maintenancePeriod.push({
        id: doc.id,
        code: x.workOrderCode || '',
        status: x.status || '',
        periodYear: Number(x.periodYear),
        periodMonth: Number(x.periodMonth)
      });
    }

    const createdMs = x.createdAt?.toMillis?.() || 0;

    if (
      createdMs &&
      nowMs - createdMs >= 0 &&
      nowMs - createdMs < 20 * 60 * 1000
    ) {
      cooldown.push(doc.id);
    }
  }

  return {
    active,
    maintenancePeriod,
    cooldown
  };
}

module.exports = {
  findWorkOrderDuplicates
};