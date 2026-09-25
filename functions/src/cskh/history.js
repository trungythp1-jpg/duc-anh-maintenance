const { now } = require('../lib/admin');

function historyEntry({ action, byUid, byName, fromStatus, toStatus, note, metadata }) {
  return {
    action: String(action || '').trim(),
    byUid: String(byUid || '').trim(),
    byName: String(byName || '').trim(),
    fromStatus: String(fromStatus || '').trim(),
    toStatus: String(toStatus || '').trim(),
    note: String(note || '').trim(),
    metadata: metadata || {},
    createdAt: now()
  };
}

function appendHistory(existing, entry) {
  const history = Array.isArray(existing?.history) ? existing.history.slice() : [];
  history.push(entry);
  return history;
}

module.exports = {
  historyEntry,
  appendHistory
};
