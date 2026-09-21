const { onCall, HttpsError } = require('firebase-functions/v2/https');

const { db, now } = require('../lib/admin');
const { requireAuth, assertRole } = require('../lib/auth');
const { writeAudit } = require('../lib/audit');

const {
  recordMaintenanceCompletion
} = require('../maintenance/record-completion');

const {
  recordKpiActivity
} = require('../kpi/calculate');

const ALLOWED_ROLES = [
  'ADMIN',
  'MANAGER',
  'CUSTOMER_SERVICE'
];

const ALLOWED_CONTACT_METHODS = [
  'PHONE',
  'ZALO',
  'IN_PERSON',
  'OTHER'
];

const ALLOWED_REASONS = [
  'CUSTOMER_NOT_PRESENT',
  'CUSTOMER_CANNOT_USE_PHONE',
  'CUSTOMER_REQUESTED_CS_CONFIRMATION',
  'SITE_RESTRICTION',
  'OTHER'
];

async function finalizeConfirmationHandler(request) {
  const auth = requireAuth(request);

  const role = assertRole(
    auth,
    ALLOWED_ROLES
  );

  const {
    confirmationId,
    customerName,
    customerPhone = '',
    contactMethod = 'PHONE',
    notes = '',
    reason = ''
  } = request.data || {};

  if (!confirmationId || !customerName) {
    throw new HttpsError(
      'invalid-argument',
      'MISSING_CONFIRMATION_DATA'
    );
  }

  const normalizedCustomerName =
    String(customerName).trim();

  const normalizedCustomerPhone =
    String(customerPhone || '').trim();

  const normalizedContactMethod =
    String(contactMethod)
      .trim()
      .toUpperCase();

  const normalizedReason =
    String(reason || '')
      .trim()
      .toUpperCase();

  if (!ALLOWED_CONTACT_METHODS.includes(
    normalizedContactMethod
  )) {
    throw new HttpsError(
      'invalid-argument',
      'INVALID_CONTACT_METHOD'
    );
  }

  if (
    normalizedReason &&
    !ALLOWED_REASONS.includes(normalizedReason)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'INVALID_CONFIRMATION_REASON'
    );
  }

  if (
    normalizedReason === 'OTHER' &&
    !String(notes || '').trim()
  ) {
    throw new HttpsError(
      'invalid-argument',
      'CONFIRMATION_REASON_NOTE_REQUIRED'
    );
  }

  const confirmationRef = db.doc(
    `customerConfirmations/${confirmationId}`
  );

  let beforeConfirmation;
  let afterConfirmation;

  let workOrderId;
  let workOrderBefore;
  let workOrderAfter;

  let lockBefore;
  let lockAfter;

  let maintenanceResult = {
    recorded: false,
    reason: 'NOT_MAINTENANCE'
  };

  let kpiResult = {
    recorded: false,
    reason: 'NOT_MAINTENANCE'
  };

  await db.runTransaction(async (tx) => {
    /*
     * ========================================
     * 1. READ CONFIRMATION
     * ========================================
     */
    const confirmationSnap =
      await tx.get(confirmationRef);

    if (!confirmationSnap.exists) {
      throw new HttpsError(
        'not-found',
        'CONFIRMATION_NOT_FOUND'
      );
    }

    beforeConfirmation =
      confirmationSnap.data();

    if (
      beforeConfirmation.status !==
      'PENDING'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'CONFIRMATION_NOT_PENDING',
        {
          status:
            beforeConfirmation.status
        }
      );
    }

    workOrderId =
      String(
        beforeConfirmation.workOrderId || ''
      ).trim();

    if (!workOrderId) {
      throw new HttpsError(
        'failed-precondition',
        'CONFIRMATION_MISSING_WORK_ORDER'
      );
    }

    /*
     * ========================================
     * 2. REFERENCES
     * ========================================
     */
    const workOrderRef = db.doc(
      `workOrders/${workOrderId}`
    );

    const lockRef = db.doc(
      `confirmationLocks/${workOrderId}`
    );

    /*
     * ========================================
     * 3. READ WORK ORDER + LOCK
     * ========================================
     */
    const workOrderSnap =
      await tx.get(workOrderRef);

    const lockSnap =
      await tx.get(lockRef);

    if (!workOrderSnap.exists) {
      throw new HttpsError(
        'not-found',
        'WORK_ORDER_NOT_FOUND'
      );
    }

    workOrderBefore =
      workOrderSnap.data();

    if (
      workOrderBefore.status !==
      'COMPLETED_PENDING_CONFIRMATION'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'WORK_ORDER_NOT_WAITING_FOR_CONFIRMATION',
        {
          status:
            workOrderBefore.status
        }
      );
    }

    /*
     * ========================================
     * 4. CHECK CONFIRMATION LOCK
     * ========================================
     */
    if (!lockSnap.exists) {
      throw new HttpsError(
        'failed-precondition',
        'CONFIRMATION_LOCK_NOT_FOUND'
      );
    }

    lockBefore =
      lockSnap.data();

    if (
      lockBefore.status !== 'PENDING' ||
      lockBefore.confirmationId !==
        confirmationId
    ) {
      throw new HttpsError(
        'failed-precondition',
        'CONFIRMATION_LOCK_MISMATCH'
      );
    }

    /*
     * ========================================
     * 5. CONFIRMATION METHOD
     * ========================================
     */

    if (
      beforeConfirmation.confirmationMethod ===
      'CUSTOMER_DIGITAL'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'CUSTOMER_DIGITAL_REQUIRES_CUSTOMER_ACTION'
      );
    }

    if (
      beforeConfirmation.confirmationMethod ===
        'CSKH_VERIFIED' &&
      ![
        'ADMIN',
        'MANAGER',
        'CUSTOMER_SERVICE'
      ].includes(role)
    ) {
      throw new HttpsError(
        'permission-denied',
        'CSKH_CONFIRMATION_REQUIRED'
      );
    }

    /*
     * ========================================
     * 6. RECORD MAINTENANCE VISIT
     * ========================================
     */
    maintenanceResult =
      await recordMaintenanceCompletion(
        tx,
        workOrderRef,
        workOrderBefore
      );

    /*
     * ========================================
     * 7. RECORD KPI ACTIVITY
     * ========================================
     *
     * KPI chỉ được tạo sau khi:
     * - WO hợp lệ
     * - đang chờ confirmation
     * - confirmation đang PENDING
     *
     * Tất cả vẫn nằm trong transaction.
     */
    kpiResult =
      await recordKpiActivity(
        tx,
        workOrderRef,
        workOrderBefore
      );

    /*
     * ========================================
     * 8. BUILD CONFIRMATION UPDATE
     * ========================================
     */
    afterConfirmation = {
      status: 'CONFIRMED',

      customerName:
        normalizedCustomerName,

      customerPhone:
        normalizedCustomerPhone,

      contactMethod:
        normalizedContactMethod,

      reason:
        normalizedReason,

      notes:
        String(notes || '').trim(),

      confirmedBy:
        auth.uid,

      confirmedAt:
        now(),

      updatedAt:
        now()
    };

    /*
     * ========================================
     * 9. BUILD WORK ORDER UPDATE
     * ========================================
     */
    workOrderAfter = {
      status:
        'CUSTOMER_CONFIRMED',

      customerConfirmedAt:
        now(),

      customerConfirmedBy:
        auth.uid,

      updatedAt:
        now()
    };

    /*
     * ========================================
     * 10. BUILD LOCK UPDATE
     * ========================================
     */
    lockAfter = {
      status:
        'CONFIRMED',

      confirmedAt:
        now(),

      confirmedBy:
        auth.uid,

      updatedAt:
        now()
    };

    /*
     * ========================================
     * 11. WRITE CONFIRMATION
     * ========================================
     */
    tx.update(
      confirmationRef,
      afterConfirmation
    );

    /*
     * ========================================
     * 12. WRITE WORK ORDER
     * ========================================
     */
    tx.update(
      workOrderRef,
      workOrderAfter
    );

    /*
     * ========================================
     * 13. WRITE CONFIRMATION LOCK
     * ========================================
     */
    tx.update(
      lockRef,
      lockAfter
    );
  });

  /*
   * ========================================
   * 14. AUDIT
   * ========================================
   */
  await writeAudit({
    auth,

    action:
      'CONFIRM_BY_CSKH',

    module:
      'confirmations',

    recordId:
      confirmationId,

    description:
      `Customer confirmation finalized for ${workOrderId}`,

    before: {
      confirmation:
        beforeConfirmation,

      workOrder:
        workOrderBefore,

      lock:
        lockBefore
    },

    after: {
      confirmation:
        afterConfirmation,

      workOrder:
        workOrderAfter,

      lock:
        lockAfter,

      maintenance:
        maintenanceResult,

      kpi:
        kpiResult
    }
  });

  return {
    ok: true,

    confirmationId,

    workOrderId,

    status:
      'CONFIRMED',

    workOrderStatus:
      'CUSTOMER_CONFIRMED',

    maintenanceVisitRecorded:
      maintenanceResult.recorded,

    completedVisits:
      maintenanceResult.completedVisits ||
      null,

    kpiRecorded:
      kpiResult.recorded,

    kpiActivityId:
      kpiResult.kpiActivityId ||
      null,

    kpiPeriod:
      kpiResult.periodId ||
      null
  };
}

module.exports = {
  finalizeConfirmation: onCall(
    {
      region: 'asia-southeast1'
    },
    finalizeConfirmationHandler
  ),

  finalizeConfirmationHandler
};