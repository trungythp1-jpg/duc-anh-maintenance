const { clean, normalizeText } = require('../lib/admin');
const { assertRequired } = require('./common');
function validateElevator(data) {
  assertRequired(data, ['buildingId','name']);
  return {...data, buildingId: clean(data.buildingId), name: clean(data.name), nameNormalized: normalizeText(data.name), status: data.status || 'ACTIVE', serviceStatus: data.serviceStatus || 'NOT_MANAGED'};
}
module.exports = { validateElevator };
