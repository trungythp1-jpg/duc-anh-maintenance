const { onCall } = require('firebase-functions/v2/https');

const {
  createCSKHRequest,
  getCSKHRequest,
  getCSKHRequests,
  updateCSKHRequest,
  submitCSKHRequest
} = require('./requests');

const {
  approveCSKHRequest,
  rejectCSKHRequest,
  requestCSKHInfo
} = require('./approval');

exports.createCSKHRequest = onCall(async (request) => {
  return createCSKHRequest(request);
});

exports.getCSKHRequest = onCall(async (request) => {
  return getCSKHRequest(request);
});

exports.getCSKHRequests = onCall(async (request) => {
  return getCSKHRequests(request);
});

exports.updateCSKHRequest = onCall(async (request) => {
  return updateCSKHRequest(request);
});

exports.submitCSKHRequest = onCall(async (request) => {
  return submitCSKHRequest(request);
});

exports.approveCSKHRequest = onCall(async (request) => {
  return approveCSKHRequest(request);
});

exports.rejectCSKHRequest = onCall(async (request) => {
  return rejectCSKHRequest(request);
});

exports.requestCSKHInfo = onCall(async (request) => {
  return requestCSKHInfo(request);
});
