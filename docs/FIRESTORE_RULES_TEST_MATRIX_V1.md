# Firestore Rules Test Matrix — V1

## Purpose and constraints

This document is a test plan for the client-side Firestore security rules. It does not change production rules and does not claim that any test has been executed.

- Keep Firebase on the Spark plan; do not deploy Cloud Functions or depend on Blaze-only services.
- Run tests against the Firebase Local Emulator Suite before merging any Rules change.
- Seed test users and documents through the Admin SDK in the test setup, not through the client under test.
- Use separate authenticated contexts for ADMIN, MANAGER, DIRECTOR, CSKH, TECHNICIAN, a second CSKH account, and unauthenticated access.
- Treat each expected result below as a required assertion. Any mismatch blocks merge.

## Status legend

- **PASS expected**: the operation should be allowed by the proposed rule set.
- **DENY expected**: the operation must be rejected.
- **KNOWN GAP**: the current main-branch rule may allow the operation; do not mark as passing until a fix is implemented and tested.

## 1. CSKH requests — `cskhRequests/{requestId}`

| ID | Role / setup | Operation | Expected |
| --- | --- | --- | --- |
| CR-01 | CSKH-A | Create own request in `DRAFT`, with an allowed `requestSource` and `requestType`, own `createdByUid`, empty assignment fields, null `processedAt`, empty `resultNote` | PASS expected |
| CR-02 | CSKH-A | Create request with `createdByUid` set to CSKH-B UID | DENY expected |
| CR-03 | CSKH-A | Get own request | PASS expected |
| CR-04 | CSKH-B | Get CSKH-A request | DENY expected |
| CR-05 | CSKH-A | List requests using `where('createdByUid', '==', auth.uid)` | PASS expected after PR #3 |
| CR-06 | CSKH-A | List without a `createdByUid` constraint | DENY expected after PR #3; Firestore Rules are not query filters |
| CR-07 | CSKH-A | Edit permitted business fields in `DRAFT` or `NEED_INFO` and append exactly one history event | PASS expected |
| CR-08 | CSKH-A | Change status from `DRAFT` directly to `CREATED` | DENY expected |
| CR-09 | CSKH-A | Update business fields without appending one history event | DENY expected |
| CR-10 | CSKH-A | Append two history events in one ordinary edit | DENY expected |
| CR-11 | CSKH-A | Append one event but also rewrite/remove/reorder an existing history entry | DENY expected on PR #6 branch; Emulator regression test still required |
| CR-12 | CSKH-A | Change `createdByUid`, assigned-admin fields, processed fields, or linked master IDs through the CSKH edit path | DENY expected |
| CR-13 | ADMIN | Move an unassigned `SUBMITTED` request to `ADMIN_REVIEW`, set assignment UID to own UID, append one event | PASS expected |
| CR-14 | ADMIN | Receive the same already-assigned request again | DENY expected |
| CR-15 | ADMIN | Move `ADMIN_REVIEW` to `CREATED` with non-empty customer/building/elevator IDs and one history event | PASS expected only when all required transition fields are valid |
| CR-16 | MANAGER | Perform ADMIN-only request transitions | DENY expected unless a separate explicit manager rule is approved |
| CR-17 | Any client | Delete a request | DENY expected |

**History integrity note:** `main` still has size-only checks. PR #6 proposes comparing the old history to the prefix of the new list using the Firestore Rules list range operator and list equality. The syntax is documented by Firebase, but the proposed rule has not yet been compiled or exercised in the Emulator. Test legacy documents with missing/invalid `history` before adoption.

## 2. Audit logs — `auditLogs/{logId}` (PR #4)

| ID | Role / setup | Operation | Expected |
| --- | --- | --- | --- |
| AL-01 | ADMIN | Create assignment log with `performedByUid == auth.uid`, allowed action/entity type, non-empty `entityId`, and `createdAt: serverTimestamp()` | PASS expected |
| AL-02 | MANAGER | Same valid assignment log | PASS expected |
| AL-03 | TECHNICIAN or CSKH | Create any audit log | DENY expected |
| AL-04 | ADMIN | Create log where `performedByUid` is another UID or blank | DENY expected |
| AL-05 | ADMIN | Create unsupported `action` or `entityType` | DENY expected |
| AL-06 | ADMIN | Create log with empty/non-string `entityId` | DENY expected |
| AL-07 | ADMIN | Create log with client-supplied timestamp instead of server timestamp | DENY expected |
| AL-08 | Any client | Update or delete an existing audit log | DENY expected |
| AL-09 | ADMIN / MANAGER / DIRECTOR | Read audit logs | PASS expected |
| AL-10 | CSKH / TECHNICIAN | Read audit logs | DENY expected |

## 3. Work-order technician completion — PR #2

| ID | Role / setup | Operation | Expected |
| --- | --- | --- | --- |
| WO-01 | Assigned TECHNICIAN | Report an allowed in-progress status on own assigned work order | PASS expected |
| WO-02 | Assigned TECHNICIAN | Report completion using the exported `reportWorkOrderByTechnician(id, 'completed')` path | PASS expected if the document satisfies all current Rules constraints |
| WO-03 | TECHNICIAN not assigned to work order | Report status/completion | DENY expected |
| WO-04 | TECHNICIAN | Change protected customer/building/elevator or assignment fields while reporting completion | DENY expected |
| WO-05 | Any client | Delete work order | DENY expected |

## 4. User records — `users/{uid}`

| ID | Role / setup | Operation | Expected |
| --- | --- | --- | --- |
| US-01 | Authenticated user | Read own user profile | PASS expected |
| US-02 | TECHNICIAN / CSKH | Read another user's profile | DENY expected unless explicitly granted by current rule |
| US-03 | TECHNICIAN / CSKH | Update only permitted self-profile fields (`name`, `displayName`, `phone`, `photoUrl`, `updatedAt`) | PASS expected |
| US-04 | Non-admin | Change own `role` or `technicianId` | DENY expected |
| US-05 | Non-management user | List all users | DENY expected |
| US-06 | Any client | Delete user | DENY expected |

## 5. Maintenance technician scope — `maintenance/{maintenanceId}`

| ID | Role / setup | Operation | Expected |
| --- | --- | --- | --- |
| MT-01 | Assigned TECHNICIAN | Read/list only documents matching the technician scope required by Rules | PASS expected |
| MT-02 | TECHNICIAN | Read or update another technician's maintenance record | DENY expected |
| MT-03 | Assigned TECHNICIAN | Report completion with the required completion fields and permitted status transition | PASS expected |
| MT-04 | TECHNICIAN | Modify protected customer/building/elevator/contract identity fields | DENY expected |
| MT-05 | CSKH | Confirm a valid pending customer confirmation before its deadline with required confirmation fields | PASS expected |
| MT-06 | CSKH | Confirm an expired or non-pending record | DENY expected |
| MT-07 | Any client | Delete maintenance record | DENY expected |

## 6. Notifications — `notifications/{notificationId}`

The current rule grants all service staff read, create, and update access. The UI module appears to be a scaffold, so usage must be verified before changing access.

| ID | Role / setup | Operation | Expected / action |
| --- | --- | --- | --- |
| NT-01 | Each service role | Read/create/update notification | **Review required** — establish intended ownership/recipient model before deciding the expected result |
| NT-02 | Any client | Delete notification | DENY expected |

## 7. Test execution checklist

- [ ] Install/use the Firebase Emulator Suite locally; do not deploy.
- [ ] Run tests against the exact proposed `firestore.rules` file for each PR branch, not only `main`.
- [ ] Assert both allowed and denied operations with `@firebase/rules-unit-testing`.
- [ ] Include query tests; a query that could return unauthorized documents must be denied.
- [ ] Include the history-tampering regression case CR-11 against both `main` and PR #6; expect the current `main` to expose the gap and PR #6 to deny the tampered write.
- [ ] Confirm PR #2, #3, and #4 individually and together do not break legitimate flows.
- [ ] Record the command, emulator version, test count, and pass/fail result in the PR before merge.
- [ ] Do not merge or deploy as part of this audit.

## Current validation status

No Firestore Emulator tests are recorded as run by this audit. This document is a planned test matrix, not evidence of a passing test suite.
