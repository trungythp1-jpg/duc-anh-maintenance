const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

const ALLOWED_ROLES = [
  'ADMIN',
  'MANAGER',
  'TECHNICIAN',
  'CUSTOMER_SERVICE'
];

const ALLOWED_METHODS = [
  'CUSTOMER_DIGITAL',
  'PAPER',
  'CSKH_VERIFIED'
];

const CSKH_METHOD_ROLES = [
  'ADMIN',
  'MANAGER',
  'CUSTOMER_SERVICE'
];

async function requestConfirmationHandler(request) {
  const auth = requireAuth(request);

  const role = assertRole(
    auth,
    ALLOWED_ROLES
  );

  const {
    workOrderId,
    method = 'CUSTOMER_DIGITAL'
  } = request.data || {};

  const normalizedWorkOrderId =
    String(workOrderId || '').trim();

  const confirmationMethod =
    String(method || '')
      .trim()
      .toUpperCase();

  if (!normalizedWorkOrderId) {
    throw new HttpsError(
      'invalid-argument',
      'MISSING_WORK_ORDER_ID'
    );
  }

  if (!ALLOWED_METHODS.includes(
    confirmationMethod
  )) {
    throw new HttpsError(
      'invalid-argument',
      'INVALID_CONFIRMATION_METHOD'
    );
  }

  /*
   * CSKH_VERIFIED chỉ dành cho
   * Admin / Manager / CSKH.
   */
  if (
    confirmationMethod === 'CSKH_VERIFIED' &&
    !CSKH_METHOD_ROLES.includes(role)
  ) {
    throw new HttpsError(
      'permission-denied',
      'CSKH_CONFIRMATION_REQUIRED'
    );
  }

  const workOrderRef = db.doc(
    `workOrders/${normalizedWorkOrderId}`
  );

  /*
   * Lock cố định theo Work Order.
   *
   * Một Work Order chỉ có một confirmation
   * đang được xử lý tại một thời điểm.
   */
  const lockRef = db.doc(
    `confirmationLocks/${normalizedWorkOrderId}`
  );

  let result;
  let auditAfter;

  await db.runTransaction(async (tx) => {
    const workOrderSnap =
      await tx.get(workOrderRef);

    if (!workOrderSnap.exists) {
      throw new HttpsError(
        'not-found',
        'WORK_ORDER_NOT_FOUND'
      );
    }

    const workOrder =
      workOrderSnap.data();

    /*
     * Chỉ WO đã hoàn thành kỹ thuật nhưng
     * đang chờ khách xác nhận mới được request.
     */
    if (
      workOrder.status !==
      'COMPLETED_PENDING_CONFIRMATION'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'WORK_ORDER_NOT_WAITING_FOR_CONFIRMATION',
        {
          status: workOrder.status
        }
      );
    }

    /*
     * Đọc lock trong transaction.
     */
    const lockSnap =
      await tx.get(lockRef);

    if (lockSnap.exists) {
      const lock =
        lockSnap.data();

      /*
       * Nếu lock đang giữ một confirmation
       * PENDING thì trả lại confirmation đó.
       */
      if (
        lock.status === 'PENDING' &&
        lock.confirmationId
      ) {
        result = {
          id: lock.confirmationId,
          workOrderId:
            normalizedWorkOrderId,
          workOrderCode:
            workOrder.workOrderCode || '',
          status: 'PENDING',
          confirmationMethod:
            lock.confirmationMethod || '',
          reused: true
        };

        return;
      }

      /*
       * Nếu lock đã CONFIRMED thì không tạo
       * confirmation mới.
       */
      if (lock.status === 'CONFIRMED') {
        throw new HttpsError(
          'already-exists',
          'CONFIRMATION_ALREADY_FINAL'
        );
      }
    }

    /*
     * Tạo confirmation mới.
     */
    const confirmationRef =
      db.collection(
        'customerConfirmations'
      ).doc();

    let customerName = '';
    let customerPhone = '';

    if (workOrder.customerId) {
      const customerRef = db.doc(
        `customers/${workOrder.customerId}`
      );

      const customerSnap =
        await tx.get(customerRef);

      if (customerSnap.exists) {
        const customer =
          customerSnap.data();

        customerName =
          String(customer.name || '').trim();

        customerPhone =
          String(customer.phone || '').trim();
      }
    }

    const record = {
      workOrderId:
        normalizedWorkOrderId,

      workOrderCode:
        workOrder.workOrderCode || '',

      customerId:
        workOrder.customerId || '',

      customerName,
      customerPhone,

      confirmationMethod,

      status: 'PENDING',

      requestedBy:
        auth.uid,

      requestedAt:
        now(),

      createdAt:
        now(),

      updatedAt:
        now()
    };

    /*
     * Tạo confirmation và lock trong cùng
     * transaction.
     */
    tx.create(
      confirmationRef,
      record
    );

    tx.set(
      lockRef,
      {
        workOrderId:
          normalizedWorkOrderId,

        confirmationId:
          confirmationRef.id,

        confirmationMethod,

        status: 'PENDING',

        createdBy:
          auth.uid,

        createdAt:
          now(),

        updatedAt:
          now()
      },
      {
        merge: true
      }
    );

    result = {
      id: confirmationRef.id,
      workOrderId:
        normalizedWorkOrderId,
      workOrderCode:
        workOrder.workOrderCode || '',
      status: 'PENDING',
      confirmationMethod,
      reused: false
    };

    auditAfter = {
      workOrderId:
        normalizedWorkOrderId,

      workOrderCode:
        workOrder.workOrderCode || '',

      confirmationMethod,

      status: 'PENDING'
    };
  });

  /*
   * Nếu transaction trả lại confirmation
   * đang tồn tại thì không ghi audit CREATE
   * lần nữa.
   */
  if (!result.reused) {
    await writeAudit({
      auth,
      action: 'REQUEST_CONFIRMATION',
      module: 'confirmations',
      recordId: result.id,
      description:
        `Requested confirmation for ${result.workOrderCode}`,
      after: auditAfter
    });
  }

  return result;
}

module.exports = {
  requestConfirmation: onCall(
    {
      region: 'asia-southeast1'
    },
    requestConfirmationHandler
  ),

  requestConfirmationHandler
};