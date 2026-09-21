const { clean } = require('../lib/utils');
const { assertRequired } = require('./common');

const TYPES = [
  'MAINTENANCE',
  'BREAKDOWN',
  'REPAIR',
  'INSPECTION'
];

const PRIORITIES = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
];

function validateMaintenancePeriod(data) {
  const year = Number(data.periodYear);
  const month = Number(data.periodMonth);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error('INVALID_MAINTENANCE_PERIOD_YEAR');
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('INVALID_MAINTENANCE_PERIOD_MONTH');
  }

  return {
    periodYear: year,
    periodMonth: month
  };
}

function validateWorkOrder(data) {
  assertRequired(data, [
    'type',
    'customerId',
    'buildingId',
    'elevatorId'
  ]);

  const type = clean(data.type).toUpperCase();

  if (!TYPES.includes(type)) {
    throw new Error('INVALID_WORK_ORDER_TYPE');
  }

  const priority = clean(data.priority || 'NORMAL').toUpperCase();

  if (!PRIORITIES.includes(priority)) {
    throw new Error('INVALID_WORK_ORDER_PRIORITY');
  }

  let periodYear = null;
  let periodMonth = null;

  if (type === 'MAINTENANCE') {
    const period = validateMaintenancePeriod(data);
    periodYear = period.periodYear;
    periodMonth = period.periodMonth;
  }

  return {
    ...data,

    type,

    customerId: clean(data.customerId),
    buildingId: clean(data.buildingId),
    elevatorId: clean(data.elevatorId),

    agreementId: clean(data.agreementId),
    scheduleId: clean(data.scheduleId),

    periodYear,
    periodMonth,

    priority,

    // Status khi tạo mới luôn do server kiểm soát.
    status: 'SCHEDULED',

    description: clean(data.description),
    technicianNote: clean(data.technicianNote),
    result: clean(data.result)
  };
}

module.exports = {
  validateWorkOrder
};