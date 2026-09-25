const { db, now } = require('../lib/admin');
const { logNotification } = require('../notifications/engine');
const { createExternalMasterData, verifyExistingChain } = require('./adapter');
const { historyEntry, appendHistory } = require('./history');
const { requireRole, clean } = require('./requests');

async function notifyUser(type, requestId, recipientId, payload) {
  if (!recipientId) return;
  await logNotification({
    channel:'IN_APP',type,recipientId,referenceId:requestId,payload
  });
}

async function loadRequest(requestId) {
  const ref=db.collection('cskhRequests').doc(requestId);
  const snap=await ref.get();
  if(!snap.exists) throw new Error('Không tìm thấy phiếu CSKH.');
  return {ref,data:snap.data()||{}};
}

async function claimForAdminReview(requestId,admin){
  const ref=db.collection('cskhRequests').doc(requestId);
  return db.runTransaction(async transaction=>{
    const snap=await transaction.get(ref);
    if(!snap.exists) throw new Error('Không tìm thấy phiếu CSKH.');
    const current=snap.data()||{};
    const status=clean(current.status);
    const assignedAdminUid=clean(current.assignedAdminUid);

    if(!['SUBMITTED','ADMIN_REVIEW','NEED_INFO'].includes(status)){
      throw new Error('Phiếu không ở trạng thái có thể duyệt.');
    }
    if(status==='ADMIN_REVIEW'&&assignedAdminUid&&assignedAdminUid!==admin.uid){
      throw new Error('Phiếu CSKH đang được Admin khác xử lý.');
    }

    transaction.update(ref,{
      status:'ADMIN_REVIEW',
      assignedAdminUid:admin.uid,
      assignedAdminName:admin.name,
      updatedAt:now(),
      history:appendHistory(current,historyEntry({
        action:'ADMIN_REVIEW',byUid:admin.uid,byName:admin.name,
        fromStatus:status,toStatus:'ADMIN_REVIEW'
      }))
    });

    return {ref,data:current};
  });
}

async function approveCSKHRequest(request){
  const admin=await requireRole(request,['admin']);
  const requestId=clean(request.data?.requestId);
  if(!requestId) throw new Error('requestId là bắt buộc.');

  const claimed=await claimForAdminReview(requestId,admin);
  const loaded=claimed;
  const reviewData={
    ...claimed.data,status:'ADMIN_REVIEW',
    assignedAdminUid:admin.uid,assignedAdminName:admin.name
  };

  try{
    let result;

    if(reviewData.requestSource==='EXTERNAL_CUSTOMER'){
      result=await createExternalMasterData(reviewData,{
        requestRef:loaded.ref,admin
      });
    }else{
      const chain=await verifyExistingChain(reviewData);
      result={
        ok:true,
        customerId:chain.customer.id,
        buildingId:chain.building.id,
        elevatorId:chain.elevator.id,
        contractId:clean(reviewData.contractId),
        elevatorCode:chain.elevator.elevatorCode||'',
        displayCode:chain.elevator.displayCode||'',
        warnings:[]
      };
    }

    if(!result.ok){
      const nextStatus=result.status||'DUPLICATE';
      const latestSnap=await loaded.ref.get();
      const latest=latestSnap.data()||{};
      await loaded.ref.update({
        status:nextStatus,
        processedAt:now(),
        resultNote:'Phát hiện dữ liệu trùng trong quá trình duyệt.',
        duplicateStage:result.duplicateStage||'',
        duplicateResults:result.duplicates||[],
        updatedAt:now(),
        history:appendHistory(latest,historyEntry({
          action:'DUPLICATE',byUid:admin.uid,byName:admin.name,
          fromStatus:'ADMIN_REVIEW',toStatus:nextStatus,
          note:result.duplicateStage||''
        }))
      });

      await notifyUser('CSKH_REQUEST_DUPLICATE',requestId,reviewData.createdByUid,{
        stage:result.duplicateStage,duplicates:result.duplicates||[]
      });

      return {id:requestId,status:nextStatus,...result};
    }

    if(reviewData.requestSource!=='EXTERNAL_CUSTOMER'){
      const finalSnap=await loaded.ref.get();
      const finalData=finalSnap.data()||{};
      await loaded.ref.update({
        status:'CREATED',
        customerId:result.customerId,
        buildingId:result.buildingId,
        elevatorId:result.elevatorId,
        processedAt:now(),
        resultNote:'Đã xác minh Customer → Building → Elevator.',
        duplicateResults:result.warnings||[],
        updatedAt:now(),
        history:appendHistory(finalData,historyEntry({
          action:'CREATED',byUid:admin.uid,byName:admin.name,
          fromStatus:'ADMIN_REVIEW',toStatus:'CREATED',
          metadata:{
            customerId:result.customerId,
            buildingId:result.buildingId,
            elevatorId:result.elevatorId,
            displayCode:result.displayCode||''
          }
        }))
      });
    }

    const payload={
      customerId:result.customerId,
      buildingId:result.buildingId,
      elevatorId:result.elevatorId,
      contractId:result.contractId||'',
      displayCode:result.displayCode||''
    };

    try{
      await notifyUser('CSKH_REQUEST_CREATED',requestId,reviewData.createdByUid,payload);
    }catch(notificationError){
      console.error('CSKH created notification failed',notificationError);
    }

    return {
      id:requestId,status:'CREATED',
      customerId:result.customerId,
      buildingId:result.buildingId,
      elevatorId:result.elevatorId,
      contractId:result.contractId||'',
      displayCode:result.displayCode||'',
      warnings:result.warnings||[]
    };
  }catch(error){
    const latestSnap=await loaded.ref.get();
    const latest=latestSnap.data()||{};
    if(latest.status!=='CREATED'){
      await loaded.ref.update({
        status:'NEED_INFO',
        processedAt:null,
        resultNote:clean(error.message||'Không thể xử lý phiếu.'),
        updatedAt:now(),
        history:appendHistory(latest,historyEntry({
          action:'NEED_INFO',byUid:admin.uid,byName:admin.name,
          fromStatus:'ADMIN_REVIEW',toStatus:'NEED_INFO',
          note:clean(error.message)
        }))
      });
    }
    throw error;
  }
}

async function rejectCSKHRequest(request){
  const admin=await requireRole(request,['admin']);
  const requestId=clean(request.data?.requestId);
  const reason=clean(request.data?.reason);
  if(!requestId) throw new Error('requestId là bắt buộc.');
  if(!reason) throw new Error('Lý do từ chối là bắt buộc.');

  const loaded=await loadRequest(requestId);
  const current=loaded.data;
  if(!['SUBMITTED','ADMIN_REVIEW','NEED_INFO','DUPLICATE'].includes(current.status)){
    throw new Error('Phiếu không thể từ chối ở trạng thái hiện tại.');
  }

  await loaded.ref.update({
    status:'REJECTED',processedAt:now(),resultNote:reason,updatedAt:now(),
    history:appendHistory(current,historyEntry({
      action:'REJECTED',byUid:admin.uid,byName:admin.name,
      fromStatus:current.status,toStatus:'REJECTED',note:reason
    }))
  });

  await notifyUser('CSKH_REQUEST_REJECTED',requestId,current.createdByUid,{reason});
  return {id:requestId,status:'REJECTED',reason};
}

async function requestCSKHInfo(request){
  const admin=await requireRole(request,['admin']);
  const requestId=clean(request.data?.requestId);
  const note=clean(request.data?.note);
  if(!requestId) throw new Error('requestId là bắt buộc.');
  if(!note) throw new Error('Nội dung yêu cầu bổ sung là bắt buộc.');

  const loaded=await loadRequest(requestId);
  const current=loaded.data;
  if(!['SUBMITTED','ADMIN_REVIEW'].includes(current.status)){
    throw new Error('Phiếu không thể yêu cầu bổ sung ở trạng thái hiện tại.');
  }

  await loaded.ref.update({
    status:'NEED_INFO',resultNote:note,
    assignedAdminUid:admin.uid,assignedAdminName:admin.name,
    updatedAt:now(),
    history:appendHistory(current,historyEntry({
      action:'NEED_INFO',byUid:admin.uid,byName:admin.name,
      fromStatus:current.status,toStatus:'NEED_INFO',note
    }))
  });

  await notifyUser('CSKH_REQUEST_NEED_INFO',requestId,current.createdByUid,{note});
  return {id:requestId,status:'NEED_INFO',note};
}

module.exports={approveCSKHRequest,rejectCSKHRequest,requestCSKHInfo};
