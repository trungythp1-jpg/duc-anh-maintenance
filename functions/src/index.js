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

/* =========================
   CSKH MODULE V1
========================= */
const cskh = require('./cskh');

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

/* =========================
   CSKH
========================= */

exports.createCSKHRequest = cskh.createCSKHRequest;
exports.getCSKHRequest = cskh.getCSKHRequest;
exports.getCSKHRequests = cskh.getCSKHRequests;
exports.updateCSKHRequest = cskh.updateCSKHRequest;
exports.submitCSKHRequest = cskh.submitCSKHRequest;

exports.approveCSKHRequest = cskh.approveCSKHRequest;
exports.rejectCSKHRequest = cskh.rejectCSKHRequest;
exports.requestCSKHInfo = cskh.requestCSKHInfo;
