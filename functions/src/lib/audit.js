const { db, now } = require('./admin');

async function writeAudit({
  auth,
  action,
  module,
  recordId,
  description,
  before = null,
  after = null
}) {
  const token = auth?.token || {};

  await db.collection('activityLogs').add({
    userId: auth?.uid || null,
    userName: token.name || token.email || auth?.uid || 'UNKNOWN',
    action,
    module,
    recordId,
    description: description || '',
    before,
    after,
    timestamp: now()
  });
}

module.exports = {
  writeAudit
};