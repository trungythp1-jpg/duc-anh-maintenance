function clean(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizePhone(phone) {
  const value = clean(phone).replace(/[^\d+]/g, '');

  if (value.startsWith('+84')) {
    return `0${value.slice(3)}`;
  }

  if (value.startsWith('84')) {
    return `0${value.slice(2)}`;
  }

  return value;
}

module.exports = {
  clean,
  normalizePhone
};