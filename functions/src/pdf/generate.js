const { db, now } = require('../lib/admin');
const { assertRole } = require('../lib/auth');

async function createDocumentRecord({
  type,
  recordId,
  storagePath,
  url = null,
  auth
}) {
  assertRole(auth, [
    'ADMIN',
    'MANAGER',
    'CUSTOMER_SERVICE'
  ]);

  const ref = db.collection('generatedDocuments').doc();

  await ref.set({
    type,
    recordId,
    storagePath: storagePath || null,
    url,
    createdBy: auth.uid,
    createdAt: now(),
    status: 'READY'
  });

  return ref.id;
}

module.exports = {
  createDocumentRecord
};