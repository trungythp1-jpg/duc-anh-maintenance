const { db, now } = require('../lib/admin');
async function logNotification({channel,type,recipientId,referenceId,payload}){
 const ref=db.collection('notificationLogs').doc();
 await ref.set({channel,type,recipientId,referenceId,payload:payload||{},status:'PENDING',createdAt:now()});
 return ref.id;
}
module.exports={logNotification};
