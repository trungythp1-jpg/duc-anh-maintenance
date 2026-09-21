const { clean } = require('../lib/admin');
const { assertRequired } = require('./common');
const TYPES = ['MAINTENANCE','BREAKDOWN','REPAIR','INSPECTION'];
function validateWorkOrder(data) {
  assertRequired(data, ['type','customerId','buildingId','elevatorId']);
  if (!TYPES.includes(data.type)) throw new Error('INVALID_WORK_ORDER_TYPE');
  return {...data, type: data.type, priority: data.priority || 'NORMAL', status: data.status || 'SCHEDULED', description: clean(data.description)};
}
module.exports = { validateWorkOrder };
