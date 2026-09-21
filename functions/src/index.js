const { onRequest } = require('firebase-functions/v2/https');

require('./lib/admin');

const { bootstrapAdmin } = require('./auth/bootstrap-admin');
const {
  createWorkOrder,
  completeWorkOrder,
  closeWorkOrder
} = require('./work-orders');

const {
  requestConfirmation,
  finalizeConfirmation
} = require('./confirmations');

const { processImport } = require('./imports');

exports.health = onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    environment: 'DEV',
    service: 'duc-anh-maintenance-functions',
    version: 'V1.0'
  });
});

exports.bootstrapAdmin = bootstrapAdmin;

exports.createWorkOrder = createWorkOrder;
exports.completeWorkOrder = completeWorkOrder;
exports.closeWorkOrder = closeWorkOrder;

exports.requestConfirmation = requestConfirmation;
exports.finalizeConfirmation = finalizeConfirmation;

exports.processImport = processImport;