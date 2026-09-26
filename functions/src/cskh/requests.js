const { db, now } = require('../lib/admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { logNotification } = require('../notifications/engine');
const { historyEntry, appendHistory } = require('./history');

const STATUSES = Object.freeze([
  'DRAFT','SUBMITTED','ADMIN_REVIEW','NEED_INFO','APPROVED',
  'CREATED','DUPLICATE','REJECTED','CANCELLED'
]);

const SOURCES = Object.freeze([
  'EXISTING_CUSTOMER','EXTERNAL_CUSTOMER'
]);

const REQUEST_TYPES = Object.freeze([
  'MAINTENANCE_REQUEST',
  'SERVICE_REQUEST',
  'CUSTOMER_REGISTRATION',
  'CONTRACT_REQUEST',
  'OTHER'
]);

function clean(value){ return String(value ?? '').trim(); }

function cskhError(code,message,details){
  const allowed=[
    'invalid-argument','unauthenticated','permission-denied',
    'not-found','failed-precondition','already-exists','aborted','internal'
  ];
  return new HttpsError(
    allowed.includes(code) ? code : 'internal',
    String(message || 'Lỗi CSKH.'),
    details
  );
}

function assertSource(value){
  if(!SOURCES.includes(value)){
    throw cskhError('invalid-argument','requestSource không hợp lệ.');
  }
}

function assertType(value){
  if(!REQUEST_TYPES.includes(value)){
    throw cskhError(
      'invalid-argument',
      `requestType không hợp lệ: ${value || '(trống)'}.`
    );
  }
}

function getUser(request){
  if(!request.auth?.uid){
    throw cskhError(
      'unauthenticated',
      'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
    );
  }

  const token=request.auth.token||{};

  return {
    uid:request.auth.uid,
    name:clean(token.name||token.displayName||token.email||request.auth.uid)
  };
}

async function getRole(uid){
  const snap=await db.collection('users').doc(uid).get();
  if(!snap.exists) return '';
  return clean(snap.data()?.role).toLowerCase();
}

async function requireRole(request,allowed){
  const user=getUser(request);
  const role=await getRole(user.uid);

  if(!allowed.includes(role)){
    console.error('[CSKH][PERMISSION_DENIED]',{
      uid:user.uid,
      role,
      allowed
    });

    throw cskhError(
      'permission-denied',
      `Tài khoản không có quyền thao tác. Role hiện tại: ${role || '(trống)'}.`,
      {currentRole:role||'',allowedRoles:allowed}
    );
  }

  return {...user,role};
}

function validateExternalPayload(data){
  const customer=data.externalCustomer||{};
  const building=data.externalBuilding||{};
  const elevator=data.externalElevator||{};

  if(!clean(customer.name)){
    throw cskhError('invalid-argument','Tên khách hàng là bắt buộc.');
  }

  if(!clean(customer.phone)){
    throw cskhError('invalid-argument','Số điện thoại khách hàng là bắt buộc.');
  }

  if(!clean(building.name)){
    throw cskhError('invalid-argument','Tên tòa nhà là bắt buộc.');
  }

  if(!clean(building.address?.detail||building.address)){
    throw cskhError('invalid-argument','Địa chỉ tòa nhà là bắt buộc.');
  }

  if(!clean(elevator.name)){
    throw cskhError('invalid-argument','Tên thang máy là bắt buộc.');
  }

  if(clean(data.requestType)==='CONTRACT_REQUEST'){
    const contract=data.externalContract||{};

    if(!clean(contract.code)){
      throw cskhError('invalid-argument','Mã hợp đồng là bắt buộc.');
    }

    if(!clean(contract.name)){
      throw cskhError('invalid-argument','Tên hợp đồng là bắt buộc.');
    }

    if(!clean(contract.startDate)){
      throw cskhError('invalid-argument','Ngày hiệu lực hợp đồng là bắt buộc.');
    }

    if(![12,24,36].includes(Number(contract.durationMonths))){
      throw cskhError(
        'invalid-argument',
        'Thời hạn hợp đồng phải là 12, 24 hoặc 36 tháng.'
      );
    }
  }
}

async function validateRequestPayload(data){
  const requestSource=clean(data.requestSource);
  const requestType=clean(data.requestType||'MAINTENANCE_REQUEST');

  assertSource(requestSource);
  assertType(requestType);

  if(requestSource==='EXTERNAL_CUSTOMER'){
    validateExternalPayload(data);
    return;
  }

  if(
    !clean(data.customerId) ||
    !clean(data.buildingId) ||
    !clean(data.elevatorId)
  ){
    throw cskhError(
      'invalid-argument',
      'Yêu cầu EXISTING_CUSTOMER phải có customerId, buildingId và elevatorId.'
    );
  }
}

async function notifyAdmins(type,requestId,payload){
  try{
    const snap=await db.collection('users')
      .where('role','in',['admin','ADMIN'])
      .limit(50)
      .get();

    for(const user of snap.docs){
      await logNotification({
        channel:'IN_APP',
        type,
        recipientId:user.id,
        referenceId:requestId,
        payload
      });
    }
  }catch(error){
    console.error('[CSKH][NOTIFICATION_ERROR]',{
      requestId,
      code:error?.code||'',
      message:error?.message||String(error)
    });
  }
}

function buildEditablePatch(patch){
  const source=patch&&typeof patch==='object'?patch:{};

  const allowed=[
    'requestSource',
    'requestType',
    'customerId',
    'buildingId',
    'elevatorId',
    'externalCustomer',
    'externalBuilding',
    'externalElevator',
    'externalContract',
    'description',
    'note'
  ];

  const result={};

  for(const field of allowed){
    if(Object.prototype.hasOwnProperty.call(source,field)){
      result[field]=source[field];
    }
  }

  return result;
}

/*
 * IMPORTANT:
 * Callable responses must contain only plain JSON-safe data.
 * Do NOT return Firestore Timestamp objects or serverTimestamp
 * sentinels from these functions.
 */
function responseSummary(id,data){
  return {
    id:String(id||''),
    status:clean(data?.status),
    requestSource:clean(data?.requestSource),
    requestType:clean(data?.requestType)
  };
}

async function createCSKHRequest(request){
  try{
    const user=await requireRole(
      request,
      ['customer_service','cskh','admin']
    );

    const data=request.data||{};

    await validateRequestPayload(data);

    const ref=db.collection('cskhRequests').doc();
    const timestamp=now();

    const entry=historyEntry({
      action:'CREATED',
      byUid:user.uid,
      byName:user.name,
      fromStatus:'',
      toStatus:'DRAFT'
    });

    const payload={
      requestSource:clean(data.requestSource),
      requestType:clean(data.requestType||'MAINTENANCE_REQUEST'),
      status:'DRAFT',

      customerId:clean(data.customerId),
      buildingId:clean(data.buildingId),
      elevatorId:clean(data.elevatorId),

      externalCustomer:data.externalCustomer||null,
      externalBuilding:data.externalBuilding||null,
      externalElevator:data.externalElevator||null,
      externalContract:data.externalContract||null,

      description:clean(data.description),
      note:clean(data.note),

      createdByUid:user.uid,
      createdByName:user.name,
      createdAt:timestamp,
      updatedAt:timestamp,

      assignedAdminUid:'',
      assignedAdminName:'',

      processedAt:null,
      resultNote:'',

      history:[entry]
    };

    await ref.set(payload);

    console.log('[CSKH][CREATE][OK]',{
      uid:user.uid,
      role:user.role,
      requestId:ref.id,
      requestSource:payload.requestSource,
      requestType:payload.requestType
    });

    /*
     * Only return JSON-safe summary.
     * The full Firestore document remains in cskhRequests.
     */
    return responseSummary(ref.id,payload);

  }catch(error){
    console.error('[CSKH][CREATE][ERROR]',{
      uid:request?.auth?.uid||'',
      code:error?.code||'internal',
      message:error?.message||String(error),
      stack:error?.stack||''
    });

    if(error instanceof HttpsError) throw error;

    throw cskhError(
      'internal',
      `Không thể tạo phiếu CSKH: ${error?.message||String(error)}`
    );
  }
}

async function getCSKHRequest(request){
  const user=await requireRole(
    request,
    ['customer_service','cskh','admin','manager']
  );

  const id=clean(request.data?.requestId);

  if(!id){
    throw cskhError('invalid-argument','requestId là bắt buộc.');
  }

  const snap=await db.collection('cskhRequests').doc(id).get();

  if(!snap.exists){
    throw cskhError('not-found','Không tìm thấy phiếu CSKH.');
  }

  const data=snap.data()||{};

  if(
    !['admin','manager'].includes(user.role) &&
    data.createdByUid!==user.uid
  ){
    throw cskhError(
      'permission-denied',
      'Bạn không có quyền xem phiếu CSKH này.'
    );
  }

  return responseSummary(snap.id,data);
}

async function getCSKHRequests(request){
  const user=await requireRole(
    request,
    ['customer_service','cskh','admin','manager']
  );

  let snap;

  if(['admin','manager'].includes(user.role)){
    snap=await db.collection('cskhRequests')
      .orderBy('createdAt','desc')
      .limit(100)
      .get();
  }else{
    snap=await db.collection('cskhRequests')
      .where('createdByUid','==',user.uid)
      .limit(100)
      .get();
  }

  /*
   * Do not return raw Firestore documents with Timestamp fields.
   */
  return snap.docs.map(doc=>{
    const data=doc.data()||{};

    return {
      id:doc.id,
      requestSource:clean(data.requestSource),
      requestType:clean(data.requestType),
      status:clean(data.status),
      customerId:clean(data.customerId),
      buildingId:clean(data.buildingId),
      elevatorId:clean(data.elevatorId),
      externalCustomer:data.externalCustomer||null,
      externalBuilding:data.externalBuilding||null,
      externalElevator:data.externalElevator||null,
      externalContract:data.externalContract||null,
      description:clean(data.description),
      note:clean(data.note),
      createdByUid:clean(data.createdByUid),
      createdByName:clean(data.createdByName),
      assignedAdminUid:clean(data.assignedAdminUid),
      assignedAdminName:clean(data.assignedAdminName),
      resultNote:clean(data.resultNote)
    };
  });
}

async function submitCSKHRequest(request){
  try{
    const user=await requireRole(
      request,
      ['customer_service','cskh','admin']
    );

    const id=clean(request.data?.requestId);

    if(!id){
      throw cskhError('invalid-argument','requestId là bắt buộc.');
    }

    const ref=db.collection('cskhRequests').doc(id);
    const snap=await ref.get();

    if(!snap.exists){
      throw cskhError('not-found','Không tìm thấy phiếu CSKH.');
    }

    const current=snap.data()||{};

    if(
      current.createdByUid!==user.uid &&
      user.role!=='admin'
    ){
      throw cskhError(
        'permission-denied',
        'Bạn không có quyền gửi phiếu CSKH này.'
      );
    }

    if(!['DRAFT','NEED_INFO'].includes(current.status)){
      throw cskhError(
        'failed-precondition',
        `Phiếu không thể gửi ở trạng thái ${current.status||'(trống)'}.`
      );
    }

    await validateRequestPayload(current);

    const history=appendHistory(
      current,
      historyEntry({
        action:'SUBMITTED',
        byUid:user.uid,
        byName:user.name,
        fromStatus:current.status,
        toStatus:'SUBMITTED'
      })
    );

    await ref.update({
      status:'SUBMITTED',
      assignedAdminUid:'',
      assignedAdminName:'',
      updatedAt:now(),
      history
    });

    await notifyAdmins(
      'CSKH_REQUEST_SUBMITTED',
      id,
      {
        requestType:current.requestType,
        requestSource:current.requestSource,
        createdByName:current.createdByName
      }
    );

    console.log('[CSKH][SUBMIT][OK]',{
      uid:user.uid,
      role:user.role,
      requestId:id
    });

    /*
     * Do not call getCSKHRequest() here.
     * It used to return Firestore Timestamp objects through
     * the callable response and could turn a successful write
     * into an "internal" frontend error.
     */
    return {
      id,
      status:'SUBMITTED',
      requestSource:clean(current.requestSource),
      requestType:clean(current.requestType)
    };

  }catch(error){
    console.error('[CSKH][SUBMIT][ERROR]',{
      uid:request?.auth?.uid||'',
      requestId:clean(request?.data?.requestId),
      code:error?.code||'internal',
      message:error?.message||String(error),
      stack:error?.stack||''
    });

    if(error instanceof HttpsError) throw error;

    throw cskhError(
      'internal',
      `Không thể gửi phiếu CSKH: ${error?.message||String(error)}`
    );
  }
}

async function updateCSKHRequest(request){
  const user=await requireRole(
    request,
    ['customer_service','cskh','admin']
  );

  const id=clean(request.data?.requestId);

  if(!id){
    throw cskhError('invalid-argument','requestId là bắt buộc.');
  }

  const ref=db.collection('cskhRequests').doc(id);
  const snap=await ref.get();

  if(!snap.exists){
    throw cskhError('not-found','Không tìm thấy phiếu CSKH.');
  }

  const current=snap.data()||{};

  if(
    current.createdByUid!==user.uid &&
    user.role!=='admin'
  ){
    throw cskhError(
      'permission-denied',
      'Bạn không có quyền sửa phiếu CSKH này.'
    );
  }

  if(!['DRAFT','NEED_INFO'].includes(current.status)){
    throw cskhError(
      'failed-precondition',
      'Chỉ có thể sửa phiếu Nháp hoặc Cần bổ sung.'
    );
  }

  const patch=buildEditablePatch(request.data?.patch);
  const next={...current,...patch};

  await validateRequestPayload(next);

  const history=appendHistory(
    current,
    historyEntry({
      action:'UPDATED',
      byUid:user.uid,
      byName:user.name,
      fromStatus:current.status,
      toStatus:current.status
    })
  );

  await ref.update({
    ...patch,
    history,
    updatedAt:now()
  });

  return responseSummary(id,{
    ...current,
    ...patch
  });
}

module.exports={
  STATUSES,
  SOURCES,
  REQUEST_TYPES,
  createCSKHRequest,
  getCSKHRequest,
  getCSKHRequests,
  submitCSKHRequest,
  updateCSKHRequest,
  getRole,
  requireRole,
  notifyAdmins,
  clean
};
