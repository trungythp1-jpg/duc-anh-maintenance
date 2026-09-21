const { onRequest } = require('firebase-functions/v2/https');

require('./lib/admin');

const { bootstrapAdmin } = require('./auth/bootstrap-admin');

exports.bootstrapAdmin = bootstrapAdmin;

exports.health = onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    environment: 'DEV',
    service: 'duc-anh-maintenance-functions',
    version: 'V1.0'
  });
});