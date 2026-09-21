const { clean, normalizeText } = require('../lib/utils');
const { assertRequired } = require('./common');

function validateElevator(data) {
  assertRequired(data, ['buildingId', 'name']);

  const buildingId = clean(data.buildingId);
  const name = clean(data.name);
  const serialNumber = clean(data.serialNumber);

  return {
    ...data,
    buildingId,
    name,
    nameNormalized: normalizeText(name),

    serialNumber,
    serialNumberNormalized: serialNumber
      ? normalizeText(serialNumber)
      : '',

    manufacturer: clean(data.manufacturer),
    machineBrand: clean(data.machineBrand),
    machineModel: clean(data.machineModel),
    controllerBrand: clean(data.controllerBrand),
    controllerModel: clean(data.controllerModel),

    status: data.status || 'ACTIVE',
    serviceStatus: data.serviceStatus || 'NOT_MANAGED'
  };
}

module.exports = { validateElevator };