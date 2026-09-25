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

module.exports = {
  createCSKHRequest,
  getCSKHRequest,
  getCSKHRequests,
  updateCSKHRequest,
  submitCSKHRequest,

  approveCSKHRequest,
  rejectCSKHRequest,
  requestCSKHInfo
};
