const { clean, normalizePhone } = require('../lib/utils');

const VN_PHONE = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!VN_PHONE.test(normalized)) throw new Error('INVALID_PHONE');
  return normalized;
}
function assertEmail(email) {
  const value = clean(email);
  if (value && !EMAIL.test(value)) throw new Error('INVALID_EMAIL');
  return value;
}
function assertDateRange(startDate, endDate) {
  if (!startDate || !endDate) throw new Error('INVALID_DATE_RANGE');
  if (new Date(startDate) > new Date(endDate)) throw new Error('INVALID_DATE_RANGE');
}
function assertRequired(obj, fields) {
  for (const field of fields) if (!clean(obj[field])) throw new Error(`MISSING_${field.toUpperCase()}`);
}
function validateCoordinates(latitude, longitude) {
  if (latitude == null && longitude == null) return;
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) throw new Error('INVALID_LATITUDE');
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) throw new Error('INVALID_LONGITUDE');
}
module.exports = { assertPhone, assertEmail, assertDateRange, assertRequired, validateCoordinates };
