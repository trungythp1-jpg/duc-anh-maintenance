const { HttpsError } = require('firebase-functions/v2/https');

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'AUTHENTICATION_REQUIRED'
    );
  }

  return request.auth;
}

function assertRole(auth, allowedRoles = []) {
  const role =
    auth.token?.role ||
    auth.token?.roles?.[0] ||
    null;

  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  return role;
}

module.exports = {
  requireAuth,
  assertRole
};