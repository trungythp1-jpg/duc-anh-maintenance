const { db, now } = require('../lib/admin');
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

function assertSource(value){
  if(!SOURCES.includes(value)) throw new Error('requestSource không hợp lệ.');
}

function assertType(value){
  if(!REQUEST_TYPES.includes(value)) throw new Error('requestType không hợp lệ.');
}

function getUser(request){
  if(!request.auth?.uid) throw new Error('UNAUTHENTICATED');
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
  if(!allowed.includes(role)) throw new Error('PERMISSION_DENIED');
  return {...user,role};
}

function validateExternalPayload(data){
  const customer=data.externalCustomer||{};
  const building=data.externalBuilding||{};
  const elevator=data.externalElevator||{};

  if(!clean(customer.name)) throw new Error('Tên khách hàng là bắt buộc.');
  if(!clean(customer.phone)) throw new Error('Số điện thoại khách hàng là bắt buộc.');
  if(!clean(building.name)) throw new Error('Tên tòa nhà là bắt buộc.');
  if(!clean(building.address?.detail||building.address)){
    throw new Error('Địa chỉ tòa nhà là bắt buộc.');
  }
  if(!clean(elevator.name)) throw new Error('Tên thang máy là bắt buộc.');

  if(clean(data.requestType)==='CONTRACT_REQUEST'){
    const contract=data.externalContract||{};
    if(!clean(contract.code)) throw new Error('Mã hợp đồng là bắt buộc.');
    if(!clean(contract.name)) throw new Error('Tên hợp đồng là bắt buộc.');
    if(!clean(contract.startDate)) throw new Error('Ngày hiệu lực hợp đồng là bắt buộc.');
    if(![12,24,36].includes(Number(contract.durationMonths))){
      throw new Error('Thời hạn hợp đồng phải là 12, 24 hoặc 36 tháng.');
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

  if(!clean(data.customerId)||!clean(data.buildingId)||!clean(data.elevatorId)){
    throw new Error('Yêu cầu EXISTING_CUSTOMER phải có customerId, buildingId và elevatorId.');
  }
}

async function notifyAdmins(type,requestId,payload){
  const snap=await db.collection('users')
    .where('role','in',['admin','ADMIN'])
    .limit(50).get();
  for(const user of snap.docs){
    await logNotification({
      channel:'IN_APP',type,recipientId:user.id,referenceId:requestId,payload
    });
  }
}

function buildEditablePatch(patch){
  const source=patch&&typeof patch==='object'?patch:{};
  const allowed=[
    'requestSource','requestType','customerId','buildingId','elevatorId',
    'externalCustomer','externalBuilding','externalElevator','externalContract',
    'description','note'
  ];
  const result={};
  for(const field of allowed){
    if(Object.prototype.hasOwnProperty.call(source,field)) result[field]=source[field];
  }
  return result;
}

async function createCSKHRequest(request){
  const user=await requireRole(request,['customer_service','cskh','admin']);
  const data=request.data||{};
  await validateRequestPayload(data);

  const ref=db.collection('cskhRequests').doc();
  const timestamp=now();
  const entry=historyEntry({
    action:'CREATED',byUid:user.uid,byName:user.name,fromStatus:'',toStatus:'DRAFT'
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
  return {id:ref.id,...payload};
}

async function getCSKHRequest(request){
  const user=await requireRole(request,['customer_service','cskh','admin','manager']);
  const id=clean(request.data?.requestId);
  if(!id) throw new Error('requestId là bắt buộc.');

  const snap=await db.collection('cskhRequests').doc(id).get();
  if(!snap.exists) throw new Error('Không tìm thấy phiếu CSKH.');
  const data=snap.data()||{};

  if(!['admin','manager'].includes(user.role)&&data.createdByUid!==user.uid){
    throw new Error('PERMISSION_DENIED');
  }
  return {id:snap.id,...data};
}

async function getCSKHRequests(request){
  const user=await requireRole(request,['customer_service','cskh','admin','manager']);
  if(['admin','manager'].includes(user.role)){
    const snap=await db.collection('cskhRequests').orderBy('createdAt','desc').limit(100).get();
    return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
  }
  const snap=await db.collection('cskhRequests')
    .where('createdByUid','==',user.uid).limit(100).get();
  return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
}

async function submitCSKHRequest(request){
  const user=await requireRole(request,['customer_service','cskh','admin']);
  const id=clean(request.data?.requestId);
  if(!id) throw new Error('requestId là bắt buộc.');

  const ref=db.collection('cskhRequests').doc(id);
  const snap=await ref.get();
  if(!snap.exists) throw new Error('Không tìm thấy phiếu CSKH.');
  const current=snap.data()||{};

  if(current.createdByUid!==user.uid&&user.role!=='admin'){
    throw new Error('PERMISSION_DENIED');
  }
  if(!['DRAFT','NEED_INFO'].includes(current.status)){
    throw new Error('Phiếu không thể gửi ở trạng thái hiện tại.');
  }

  await validateRequestPayload(current);
  const history=appendHistory(current,historyEntry({
    action:'SUBMITTED',byUid:user.uid,byName:user.name,
    fromStatus:current.status,toStatus:'SUBMITTED'
  }));

  await ref.update({
    status:'SUBMITTED',assignedAdminUid:'',assignedAdminName:'',
    updatedAt:now(),history
  });

  try{
    await notifyAdmins('CSKH_REQUEST_SUBMITTED',id,{
      requestType:current.requestType,
      requestSource:current.requestSource,
      createdByName:current.createdByName
    });
  }catch(error){
    console.error('CSKH submit notification failed',error);
  }

  return getCSKHRequest({
    auth:{uid:user.uid,token:{role:user.role,name:user.name}},
    data:{requestId:id}
  });
}

async function updateCSKHRequest(request){
  const user=await requireRole(request,['customer_service','cskh','admin']);
  const id=clean(request.data?.requestId);
  if(!id) throw new Error('requestId là bắt buộc.');

  const ref=db.collection('cskhRequests').doc(id);
  const snap=await ref.get();
  if(!snap.exists) throw new Error('Không tìm thấy phiếu CSKH.');
  const current=snap.data()||{};

  if(current.createdByUid!==user.uid&&user.role!=='admin'){
    throw new Error('PERMISSION_DENIED');
  }
  if(!['DRAFT','NEED_INFO'].includes(current.status)){
    throw new Error('Chỉ có thể sửa phiếu Nháp hoặc Cần bổ sung.');
  }

  const patch=buildEditablePatch(request.data?.patch);
  const next={...current,...patch};
  await validateRequestPayload(next);

  const history=appendHistory(current,historyEntry({
    action:'UPDATED',byUid:user.uid,byName:user.name,
    fromStatus:current.status,toStatus:current.status
  }));

  await ref.update({...patch,history,updatedAt:now()});

  return getCSKHRequest({
    auth:{uid:user.uid,token:{role:user.role,name:user.name}},
    data:{requestId:id}
  });
}

module.exports={
  STATUSES,SOURCES,REQUEST_TYPES,
  createCSKHRequest,getCSKHRequest,getCSKHRequests,
  submitCSKHRequest,updateCSKHRequest,getRole,requireRole,notifyAdmins,clean
};
