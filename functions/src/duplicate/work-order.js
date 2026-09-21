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

async function findWorkOrderDuplicates(data, transaction = null) {
  const elevatorId = String(data.elevatorId || '').trim();

  if (!elevatorId) {
    return {
      active: [],
      maintenancePeriod: [],
      cooldown: []
    };
  }

  const query = db
    .collection('workOrders')
    .where('elevatorId', '==', elevatorId)
    .limit(100);

  const snapshot = transaction
    ? await transaction.get(query)
    : await query.get();

  const nowMs = Date.now();

  const periodYear = Number(data.periodYear) || null;
  const periodMonth = Number(data.periodMonth) || null;

  const active = [];
  const maintenancePeriod = [];
  const cooldown = [];

  for (const doc of snapshot.docs) {
    const x = doc.data();

    if (ACTIVE_STATUSES.includes(x.status)) {
      active.push({
        id: doc.id,
        code: x.workOrderCode || '',
        status: x.status || ''
      });
    }

    if (
      data.type === 'MAINTENANCE' &&
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
      nowMs >= createdMs &&
      nowMs - createdMs < 20 * 60 * 1000
    ) {
      cooldown.push({
        id: doc.id,
        code: x.workOrderCode || '',
        status: x.status || ''
      });
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