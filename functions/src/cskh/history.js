const { Timestamp } = require('firebase-admin/firestore');

function historyEntry({
  action,
  byUid,
  byName,
  fromStatus,
  toStatus,
  note,
  metadata
}) {
  /*
   * KHÔNG dùng FieldValue.serverTimestamp() ở đây.
   * Firestore không chấp nhận serverTimestamp sentinel nằm
   * bên trong phần tử của array history.
   */
  return {
    action: String(action || '').trim(),
    byUid: String(byUid || '').trim(),
    byName: String(byName || '').trim(),
    fromStatus: String(fromStatus || '').trim(),
    toStatus: String(toStatus || '').trim(),
    note: String(note || '').trim(),
    metadata: metadata || {},
    createdAt: Timestamp.now()
  };
}

function appendHistory(existing, entry) {
  const history = Array.isArray(existing?.history)
    ? existing.history.slice()
    : [];

  history.push(entry);

  return history;
}

module.exports = {
  historyEntry,
  appendHistory
};
