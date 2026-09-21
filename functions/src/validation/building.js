const { clean, normalizeText } = require('../lib/utils');
const { assertRequired, validateCoordinates } = require('./common');

function validateBuilding(data) {
  assertRequired(data, ['customerId', 'name', 'address']);

  validateCoordinates(data.latitude, data.longitude);

  const customerId = clean(data.customerId);
  const name = clean(data.name);
  const address = clean(data.address);

  return {
    ...data,
    customerId,
    name,
    nameNormalized: normalizeText(name),
    address,
    addressNormalized: normalizeText(address)
  };
}

module.exports = { validateBuilding };