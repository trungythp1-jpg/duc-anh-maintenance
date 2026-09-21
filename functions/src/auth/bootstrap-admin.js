const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');

require('../lib/admin');

const BOOTSTRAP_ADMIN_UID = 'gd0Mcd5soEMGnmkB0wZaFBGJBI22';

exports.bootstrapAdmin = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        'unauthenticated',
        'AUTHENTICATION_REQUIRED'
      );
    }

    if (request.auth.uid !== BOOTSTRAP_ADMIN_UID) {
      throw new HttpsError(
        'permission-denied',
        'BOOTSTRAP_ADMIN_NOT_ALLOWED'
      );
    }

    await getAuth().setCustomUserClaims(
      BOOTSTRAP_ADMIN_UID,
      {
        role: 'ADMIN',
        admin: true
      }
    );

    return {
      ok: true,
      uid: BOOTSTRAP_ADMIN_UID,
      role: 'ADMIN'
    };
  }
);