const { clean, normalizeText } = require('../lib/admin');
const { assertRequired, validateCoordinates } = require('./common');
function validateBuilding(data) {
  assertRequired(data, ['customerId','name','address']);
  validateCoordinates(data.latitude, data.longitude);
  return {...data, customerId: clean(data.customerId), name: clean(data.name), nameNormalized: normalizeText(data.name), address: clean(data.address)};
}
module.exports = { validateBuilding };
