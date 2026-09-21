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

  return {
    ...data,

    type,

    customerId: clean(data.customerId),
    buildingId: clean(data.buildingId),
    elevatorId: clean(data.elevatorId),

    agreementId: clean(data.agreementId),
    scheduleId: clean(data.scheduleId),

    priority,

    // Status khi tạo mới phải do server kiểm soát.
    status: 'SCHEDULED',

    description: clean(data.description),
    technicianNote: clean(data.technicianNote),
    result: clean(data.result)
  };
}

module.exports = {
  validateWorkOrder
};