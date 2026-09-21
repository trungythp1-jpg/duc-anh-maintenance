const { db, now, requireAuth, assertRole } = require('../lib/admin');
async function createDocumentRecord({type,recordId,storagePath,url=null,auth}){
 assertRole(auth,['admin','manager','customer_service']);
 const ref=db.collection('generatedDocuments').doc();
 await ref.set({type,recordId,storagePath:storagePath||null,url,createdBy:auth.uid,createdAt:now(),status:'READY'});
 return ref.id;
}
module.exports={createDocumentRecord};
