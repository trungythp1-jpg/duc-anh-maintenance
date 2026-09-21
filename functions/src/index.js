const { onRequest } = require('firebase-functions/v2/https');

require('./lib/admin');

exports.health = onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    environment: 'DEV',
    service: 'duc-anh-maintenance-functions',
    version: 'V1.0'
  });
});