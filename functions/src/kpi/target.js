const { db, now } = require('../lib/admin');

function buildKpiTargetId(
  periodId,
  technicianId
) {
  const period =
    String(periodId || '').trim();

  const technician =
    String(technicianId || '').trim();

  if (!period) {
    throw new Error(
      'KPI_PERIOD_REQUIRED'
    );
  }

  if (!technician) {
    throw new Error(
      'KPI_TECHNICIAN_REQUIRED'
    );
  }

  return `${period}_${technician}`;
}

async function getKpiTarget(
  periodId,
  technicianId
) {
  const targetId =
    buildKpiTargetId(
      periodId,
      technicianId
    );

  const ref = db.doc(
    `kpiTargets/${targetId}`
  );

  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: targetId,
    ...snap.data()
  };
}

async function setKpiTarget(
  tx,
  {
    periodId,
    technicianId,
    target,
    reason = '',
    updatedBy
  }
) {
  const targetId =
    buildKpiTargetId(
      periodId,
      technicianId
    );

  const value =
    Number(target);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1000
  ) {
    throw new Error(
      'INVALID_KPI_TARGET'
    );
  }

  const ref = db.doc(
    `kpiTargets/${targetId}`
  );

  const snap = await tx.get(ref);

  const record = {
    periodId,
    technicianId,

    target: value,

    reason:
      String(reason || '').trim(),

    updatedBy,

    updatedAt:
      now()
  };

  if (snap.exists) {
    tx.update(ref, record);
  } else {
    tx.create(ref, {
      ...record,
      createdAt: now()
    });
  }

  return {
    id: targetId,
    ...record
  };
}

module.exports = {
  buildKpiTargetId,
  getKpiTarget,
  setKpiTarget
};