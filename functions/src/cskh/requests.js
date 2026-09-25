const { db, now } = require('../lib/admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { logNotification } = require('../notifications/engine');
const { historyEntry, appendHistory } = require('./history');

const STATUSES = Object.freeze([
  'DRAFT',
  'SUBMITTED',
  'ADMIN_REVIEW',
  'NEED_INFO',
  'APPROVED',
  'CREATED',
  'DUPLICATE',
  'REJECTED',
  'CANCELLED'
]);

const SOURCES = Object.freeze([
  'EXISTING_CUSTOMER',
  'EXTERNAL_CUSTOMER'
]);

const REQUEST_TYPES = Object.freeze([
  'MAINTENANCE_REQUEST',
  'SERVICE_REQUEST',
  'CUSTOMER_REGISTRATION',
  'OTHER'
]);

function clean(value) {
  return String(value ?? '').trim();
}

/*
 * CSKH DEBUG V1
 * Convert internal business errors into explicit Firebase callable errors.
 * This keeps the existing workflow/schema unchanged while making frontend
 * errors diagnosable instead of showing only "internal".
 */
function cskhError(code, message, details = undefined) {
  const safeCode = [
    'unauthenticated',
    'permission-denied',
    'invalid-argument',
    'not-found',
    'failed-precondition',
    'already-exists',
    'aborted',
    'internal'
  ].includes(code) ? code : 'internal';

  return new HttpsError(
    safeCode,
    String(message || 'Lỗi CSKH.'),
    details
  );
}

function debugContext(request, user = null) {
  return {
    uid: request?.auth?.uid || user?.uid || '',
    role: user?.role || '',
    function: 'CSKH',
    requestId: clean(request?.data?.requestId)
  };
}

function assertSource(value) {
  if (!SOURCES.includes(value)) {
    throw cskhError('invalid-argument', 'requestSource không hợp lệ.');
  }
}

function assertType(value) {
  if (!REQUEST_TYPES.includes(value)) {
    throw cskhError('invalid-argument', 'requestType không hợp lệ.');
  }
}

function getUser(request) {
  if (!request.auth?.uid) {
    throw cskhError(
      'unauthenticated',
      'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
    );
  }

  const token = request.auth.token || {};

  return {
    uid: request.auth.uid,
    name: clean(
      token.name ||
      token.displayName ||
      token.email ||
      request.auth.uid
    )
  };
}

async function getRole(uid) {
  const snap = await db.collection('users').doc(uid).get();

  if (!snap.exists) return '';

  return clean(snap.data()?.role).toLowerCase();
}

async function requireRole(request, allowed) {
  const user = getUser(request);
  const role = await getRole(user.uid);

  if (!allowed.includes(role)) {
    console.error('[CSKH][PERMISSION_DENIED]', {
      ...debugContext(request, { ...user, role }),
      allowedRoles: allowed
    });

    throw cskhError(
      'permission-denied',
      `Tài khoản không có quyền CSKH. Role hiện tại: ${role || '(trống)'}.`,
      {
        currentRole: role || '',
        allowedRoles: allowed
      }
    );
  }

  return {
    ...user,
    role
  };
}

function validateExternalPayload(data) {
  const customer = data.externalCustomer || {};
  const building = data.externalBuilding || {};
  const elevator = data.externalElevator || {};

  if (!clean(customer.name)) {
    throw cskhError('invalid-argument', 'Tên khách hàng là bắt buộc.');
  }

  if (!clean(customer.phone)) {
    throw cskhError('invalid-argument', 'Số điện thoại khách hàng là bắt buộc.');
  }

  if (!clean(building.name)) {
    throw cskhError('invalid-argument', 'Tên tòa nhà là bắt buộc.');
  }

  if (!clean(building.address?.detail || building.address)) {
    throw cskhError('invalid-argument', 'Địa chỉ tòa nhà là bắt buộc.');
  }

  if (!clean(elevator.name)) {
    throw cskhError('invalid-argument', 'Tên thang máy là bắt buộc.');
  }
}

async function validateRequestPayload(data) {
  const requestSource = clean(data.requestSource);
  const requestType = clean(
    data.requestType || 'MAINTENANCE_REQUEST'
  );

  assertSource(requestSource);
  assertType(requestType);

  if (requestSource === 'EXTERNAL_CUSTOMER') {
    validateExternalPayload(data);
    return;
  }

  if (
    !clean(data.customerId) ||
    !clean(data.buildingId) ||
    !clean(data.elevatorId)
  ) {
    throw cskhError(
      'invalid-argument',
      'Yêu cầu EXISTING_CUSTOMER phải có customerId, buildingId và elevatorId.'
    );
  }
}

async function notifyAdmins(type, requestId, payload) {
  const snap = await db.collection('users')
    .where('role', 'in', ['admin', 'ADMIN'])
    .limit(50)
    .get();

  for (const user of snap.docs) {
    await logNotification({
      channel: 'IN_APP',
      type,
      recipientId: user.id,
      referenceId: requestId,
      payload
    });
  }
}

function buildEditablePatch(patch) {
  const source = patch && typeof patch === 'object'
    ? patch
    : {};

  /*
   * Never allow CSKH/Admin updateCSKHRequest() to overwrite system fields
   * such as status, ownership, linked master IDs, history or timestamps.
   *
   * Only these business-input fields are editable while the request is
   * DRAFT / NEED_INFO.
   */
  const allowed = [
    'requestSource',
    'requestType',
    'customerId',
    'buildingId',
    'elevatorId',
    'externalCustomer',
    'externalBuilding',
    'externalElevator',
    'description',
    'note'
  ];

  const result = {};

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }

  return result;
}

async function createCSKHRequest(request) {
  const user = await requireRole(
    request,
    ['customer_service', 'cskh', 'admin']
  );

  const data = request.data || {};

  await validateRequestPayload(data);

  const ref = db.collection('cskhRequests').doc();
  const timestamp = now();

  const entry = historyEntry({
    action: 'CREATED',
    byUid: user.uid,
    byName: user.name,
    fromStatus: '',
    toStatus: 'DRAFT'
  });

  const payload = {
    requestSource: clean(data.requestSource),
    requestType: clean(
      data.requestType || 'MAINTENANCE_REQUEST'
    ),

    status: 'DRAFT',

    customerId: clean(data.customerId),
    buildingId: clean(data.buildingId),
    elevatorId: clean(data.elevatorId),

    externalCustomer: data.externalCustomer || null,
    externalBuilding: data.externalBuilding || null,
    externalElevator: data.externalElevator || null,

    description: clean(data.description),
    note: clean(data.note),

    createdByUid: user.uid,
    createdByName: user.name,
    createdAt: timestamp,
    updatedAt: timestamp,

    assignedAdminUid: '',
    assignedAdminName: '',

    processedAt: null,
    resultNote: '',

    history: [entry]
  };

  await ref.set(payload);

  console.log('[CSKH][CREATE][OK]', {
    uid: user.uid,
    role: user.role,
    requestId: ref.id,
    requestSource: payload.requestSource,
    requestType: payload.requestType
  });

  return {
    id: ref.id,
    ...payload
  };
}

async function getCSKHRequest(request) {
  try {
    const user = await requireRole(
      request,
      ['customer_service', 'cskh', 'admin', 'manager']
    );

    const id = clean(request.data?.requestId);

    if (!id) {
      throw cskhError('invalid-argument', 'requestId là bắt buộc.');
    }

    console.log('[CSKH][GET_ONE][START]', debugContext(request, user));

    const snap = await db.collection('cskhRequests').doc(id).get();

    if (!snap.exists) {
      throw cskhError('not-found', 'Không tìm thấy phiếu CSKH.');
    }

    const data = snap.data() || {};

    if (
      !['admin', 'manager'].includes(user.role) &&
      data.createdByUid !== user.uid
    ) {
      throw cskhError(
        'permission-denied',
        'Bạn không có quyền xem phiếu CSKH này.'
      );
    }

    console.log('[CSKH][GET_ONE][OK]', {
      ...debugContext(request, user),
      status: data.status || '',
      requestSource: data.requestSource || ''
    });

    return {
      id: snap.id,
      ...data
    };
  } catch (error) {
    console.error('[CSKH][GET_ONE][ERROR]', {
      ...debugContext(request),
      code: error?.code || 'internal',
      message: error?.message || String(error)
    });

    if (error instanceof HttpsError) throw error;

    throw cskhError(
      'internal',
      'Không thể tải phiếu CSKH. Xem Firebase Functions Logs để biết chi tiết.',
      {
        originalCode: error?.code || '',
        originalMessage: error?.message || String(error)
      }
    );
  }
}

async function getCSKHRequests(request) {
  try {
    const user = await requireRole(
      request,
      ['customer_service', 'cskh', 'admin', 'manager']
    );

    console.log('[CSKH][GET_LIST][START]', debugContext(request, user));

    let snap;

    if (['admin', 'manager'].includes(user.role)) {
      snap = await db.collection('cskhRequests')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
    } else {
      snap = await db.collection('cskhRequests')
        .where('createdByUid', '==', user.uid)
        .limit(100)
        .get();
    }

    const result = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('[CSKH][GET_LIST][OK]', {
      ...debugContext(request, user),
      count: result.length,
      scope: ['admin', 'manager'].includes(user.role)
        ? 'ALL'
        : 'OWN'
    });

    return result;
  } catch (error) {
    console.error('[CSKH][GET_LIST][ERROR]', {
      ...debugContext(request),
      code: error?.code || 'internal',
      message: error?.message || String(error),
      stack: error?.stack || ''
    });

    if (error instanceof HttpsError) throw error;

    throw cskhError(
      'internal',
      'Không thể tải danh sách CSKH. Firebase Functions đã ghi log lỗi chi tiết.',
      {
        originalCode: error?.code || '',
        originalMessage: error?.message || String(error)
      }
    );
  }
}

async function submitCSKHRequest(request) {
  const user = await requireRole(
    request,
    ['customer_service', 'cskh', 'admin']
  );

  const id = clean(request.data?.requestId);

  if (!id) {
    throw cskhError('invalid-argument', 'requestId là bắt buộc.');
  }

  const ref = db.collection('cskhRequests').doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw cskhError('not-found', 'Không tìm thấy phiếu CSKH.');
  }

  const current = snap.data() || {};

  if (
    current.createdByUid !== user.uid &&
    user.role !== 'admin'
  ) {
    throw cskhError('permission-denied', 'Bạn không có quyền thao tác phiếu CSKH này.');
  }

  if (!['DRAFT', 'NEED_INFO'].includes(current.status)) {
    throw cskhError(
      'failed-precondition',
      'Phiếu không thể gửi ở trạng thái hiện tại.'
    );
  }

  await validateRequestPayload(current);

  const history = appendHistory(
    current,
    historyEntry({
      action: 'SUBMITTED',
      byUid: user.uid,
      byName: user.name,
      fromStatus: current.status,
      toStatus: 'SUBMITTED'
    })
  );

  await ref.update({
    status: 'SUBMITTED',
    assignedAdminUid: '',
    assignedAdminName: '',
    updatedAt: now(),
    history
  });

  /*
   * Notification failure must not undo the submitted request.
   * The request has already reached the authoritative SUBMITTED state.
   */
  try {
    await notifyAdmins(
      'CSKH_REQUEST_SUBMITTED',
      id,
      {
        requestType: current.requestType,
        requestSource: current.requestSource,
        createdByName: current.createdByName
      }
    );
  } catch (notificationError) {
    console.error(
      'CSKH submit notification failed',
      notificationError
    );
  }

  console.log('[CSKH][SUBMIT][OK]', {
    uid: user.uid,
    role: user.role,
    requestId: id
  });

  return getCSKHRequest({
    auth: {
      uid: user.uid,
      token: {
        role: user.role,
        name: user.name
      }
    },
    data: {
      requestId: id
    }
  });
}

async function updateCSKHRequest(request) {
  const user = await requireRole(
    request,
    ['customer_service', 'cskh', 'admin']
  );

  const id = clean(request.data?.requestId);

  if (!id) {
    throw cskhError('invalid-argument', 'requestId là bắt buộc.');
  }

  const ref = db.collection('cskhRequests').doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw cskhError('not-found', 'Không tìm thấy phiếu CSKH.');
  }

  const current = snap.data() || {};

  if (
    current.createdByUid !== user.uid &&
    user.role !== 'admin'
  ) {
    throw cskhError('permission-denied', 'Bạn không có quyền thao tác phiếu CSKH này.');
  }

  if (!['DRAFT', 'NEED_INFO'].includes(current.status)) {
    throw cskhError(
      'failed-precondition',
      'Chỉ có thể sửa phiếu Nháp hoặc Cần bổ sung.'
    );
  }

  const patch = buildEditablePatch(request.data?.patch);

  const next = {
    ...current,
    ...patch
  };

  await validateRequestPayload(next);

  const history = appendHistory(
    current,
    historyEntry({
      action: 'UPDATED',
      byUid: user.uid,
      byName: user.name,
      fromStatus: current.status,
      toStatus: current.status
    })
  );

  await ref.update({
    ...patch,
    history,
    updatedAt: now()
  });

  console.log('[CSKH][UPDATE][OK]', {
    uid: user.uid,
    role: user.role,
    requestId: id,
    fields: Object.keys(patch)
  });

  return getCSKHRequest({
    auth: {
      uid: user.uid,
      token: {
        role: user.role,
        name: user.name
      }
    },
    data: {
      requestId: id
    }
  });
}

module.exports = {
  STATUSES,
  SOURCES,
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
