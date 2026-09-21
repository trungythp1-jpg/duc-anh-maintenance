const { clean, normalizeText } = require('../lib/utils');
const { assertPhone, assertEmail, assertRequired } = require('./common');
function validateCustomer(data) {
  assertRequired(data, ['name','phone']);
  const name = clean(data.name);
  const phone = assertPhone(data.phone);
  const email = assertEmail(data.email);
  return {...data, name, nameNormalized: normalizeText(name), phone, email};
}
module.exports = { validateCustomer };
