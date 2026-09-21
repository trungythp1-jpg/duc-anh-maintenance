const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');

async function processImportHandler(request) {
  const auth = requireAuth(request);

  assertRole(auth, ['ADMIN', 'MANAGER']);

  const { importJobId } = request.data || {};

  if (!importJobId) {
    throw new HttpsError(
      'invalid-argument',
      'MISSING_IMPORT_JOB_ID'
    );
  }

  const ref = db.doc(`importJobs/${importJobId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError(
      'not-found',
      'IMPORT_JOB_NOT_FOUND'
    );
  }

  await ref.update({
    status: 'VALIDATING',
    updatedAt: now(),
    processedBy: auth.uid
  });

  return {
    ok: true,
    status: 'VALIDATING'
  };
}

module.exports = {
  processImport: onCall(
    { region: 'asia-southeast1' },
    processImportHandler
  ),
  processImportHandler
};