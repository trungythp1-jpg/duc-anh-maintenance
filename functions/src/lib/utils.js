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

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

module.exports = {
  clean,
  normalizePhone,
  normalizeText
};