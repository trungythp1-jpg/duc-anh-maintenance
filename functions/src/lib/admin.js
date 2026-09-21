const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

function now() {
  return FieldValue.serverTimestamp();
}

module.exports = {
  db,
  now
};