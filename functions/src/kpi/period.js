const { db, now } = require('../lib/admin');

function buildKpiPeriodId(year, month) {
  const y = Number(year);
  const m = Number(month);

  if (
    !Number.isInteger(y) ||
    y < 2020 ||
    y > 2100
  ) {
    throw new Error('INVALID_KPI_PERIOD_YEAR');
  }

  if (
    !Number.isInteger(m) ||
    m < 1 ||
    m > 12
  ) {
    throw new Error('INVALID_KPI_PERIOD_MONTH');
  }

  return `${y}-${String(m).padStart(2, '0')}`;
}

function getPeriodDates(year, month) {
  const start = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  const end = new Date(
    Number(year),
    Number(month),
    0,
    23,
    59,
    59,
    999
  );

  return {
    start,
    end
  };
}

async function ensureKpiPeriod(
  tx,
  year,
  month
) {
  const periodId =
    buildKpiPeriodId(year, month);

  const ref = db.doc(
    `kpiPeriods/${periodId}`
  );

  const snap = await tx.get(ref);

  if (snap.exists) {
    return {
      id: periodId,
      ...snap.data()
    };
  }

  const dates =
    getPeriodDates(year, month);

  const record = {
    periodId,

    year: Number(year),
    month: Number(month),

    startDate:
      dates.start,

    endDate:
      dates.end,

    status:
      'OPEN',

    createdAt:
      now(),

    updatedAt:
      now()
  };

  tx.create(ref, record);

  return {
    id: periodId,
    ...record
  };
}

module.exports = {
  buildKpiPeriodId,
  getPeriodDates,
  ensureKpiPeriod
};