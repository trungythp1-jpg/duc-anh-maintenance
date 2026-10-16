import { readFile } from "node:fs/promises";
import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const PROJECT_ID = "demo-duc-anh-rules";
let testEnv;

const createdEvent = {
  action: "CREATED",
  byUid: "cskh-a",
  toStatus: "DRAFT",
  at: "seed",
};

const submittedEvent = {
  action: "SUBMITTED",
  byUid: "cskh-a",
  fromStatus: "DRAFT",
  toStatus: "SUBMITTED",
  at: "seed",
};

const needInfoEvent = {
  action: "NEED_INFO",
  byUid: "admin-a",
  fromStatus: "SUBMITTED",
  toStatus: "NEED_INFO",
  at: "seed",
};

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/cskh-a"), { role: "CSKH" });
    await setDoc(doc(db, "users/admin-a"), { role: "ADMIN" });
    await setDoc(doc(db, "cskhRequests/request-draft"), {
      createdByUid: "cskh-a",
      status: "DRAFT",
      requestSource: "EXTERNAL_CUSTOMER",
      requestType: "CUSTOMER_REGISTRATION",
      assignedAdminUid: "",
      assignedAdminName: "",
      processedAt: null,
      resultNote: "",
      history: [createdEvent],
      description: "Initial description",
      updatedAt: "seed",
    });
    await setDoc(doc(db, "cskhRequests/request-submitted"), {
      createdByUid: "cskh-a",
      status: "SUBMITTED",
      requestSource: "EXTERNAL_CUSTOMER",
      requestType: "CUSTOMER_REGISTRATION",
      assignedAdminUid: "",
      assignedAdminName: "",
      processedAt: null,
      resultNote: "",
      history: [createdEvent, submittedEvent],
      description: "Submitted request",
      updatedAt: "seed",
    });
    await setDoc(doc(db, "cskhRequests/request-need-info"), {
      createdByUid: "cskh-a",
      status: "NEED_INFO",
      requestSource: "EXTERNAL_CUSTOMER",
      requestType: "CUSTOMER_REGISTRATION",
      assignedAdminUid: "admin-a",
      assignedAdminName: "Admin A",
      processedAt: null,
      resultNote: "Please provide more information",
      history: [createdEvent, submittedEvent, needInfoEvent],
      description: "Needs additional information",
      updatedAt: "seed",
    });
  });
}

before(async () => {
  const rules = await readFile("firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBaseData();
});

after(async () => {
  await testEnv?.cleanup();
});

test("CSKH can create an owned DRAFT request with one CREATED event", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertSucceeds(
    setDoc(doc(db, "cskhRequests/request-new"), {
      createdByUid: "cskh-a",
      status: "DRAFT",
      requestSource: "EXTERNAL_CUSTOMER",
      requestType: "CUSTOMER_REGISTRATION",
      assignedAdminUid: "",
      assignedAdminName: "",
      processedAt: null,
      resultNote: "",
      history: [{
        action: "CREATED",
        byUid: "cskh-a",
        toStatus: "DRAFT",
        at: "client-test",
      }],
      description: "New request",
    }),
  );
});

test("CSKH can append one event without changing prior history", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertSucceeds(
    updateDoc(doc(db, "cskhRequests/request-draft"), {
      description: "Updated description",
      history: [
        createdEvent,
        {
          action: "EDITED",
          byUid: "cskh-a",
          toStatus: "DRAFT",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("CSKH cannot rewrite an old history event while appending one", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertFails(
    updateDoc(doc(db, "cskhRequests/request-draft"), {
      description: "Updated description",
      history: [
        { ...createdEvent, byUid: "someone-else" },
        {
          action: "EDITED",
          byUid: "cskh-a",
          toStatus: "DRAFT",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("CSKH cannot remove old history and append a replacement event", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertFails(
    updateDoc(doc(db, "cskhRequests/request-submitted"), {
      description: "Tampered request",
      history: [{
        action: "CREATED",
        byUid: "cskh-a",
        toStatus: "DRAFT",
        at: "forged",
      }, {
        action: "EDITED",
        byUid: "cskh-a",
        toStatus: "SUBMITTED",
        at: "client-test",
      }, {
        action: "EXTRA_REPLACEMENT",
        byUid: "cskh-a",
        toStatus: "SUBMITTED",
        at: "client-test",
      }],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("CSKH cannot reorder existing history entries while appending one", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertFails(
    updateDoc(doc(db, "cskhRequests/request-submitted"), {
      description: "Reordered history",
      history: [
        submittedEvent,
        createdEvent,
        {
          action: "EDITED",
          byUid: "cskh-a",
          toStatus: "SUBMITTED",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("CSKH cannot update request fields without appending one history event", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  await assertFails(
    updateDoc(doc(db, "cskhRequests/request-draft"), {
      description: "Updated without history",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("CSKH can edit a NEED_INFO request and resubmit it to ADMIN", async () => {
  const db = testEnv.authenticatedContext("cskh-a").firestore();
  const requestRef = doc(db, "cskhRequests/request-need-info");

  await assertSucceeds(
    updateDoc(requestRef, {
      description: "Additional details provided",
      history: [
        createdEvent,
        submittedEvent,
        needInfoEvent,
        {
          action: "EDITED",
          byUid: "cskh-a",
          fromStatus: "NEED_INFO",
          toStatus: "NEED_INFO",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );

  await assertSucceeds(
    updateDoc(requestRef, {
      status: "SUBMITTED",
      assignedAdminUid: "",
      assignedAdminName: "",
      history: [
        createdEvent,
        submittedEvent,
        needInfoEvent,
        {
          action: "EDITED",
          byUid: "cskh-a",
          fromStatus: "NEED_INFO",
          toStatus: "NEED_INFO",
          at: "client-test",
        },
        {
          action: "RESUBMITTED",
          byUid: "cskh-a",
          fromStatus: "NEED_INFO",
          toStatus: "SUBMITTED",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("ADMIN can receive a SUBMITTED request and append one event", async () => {
  const db = testEnv.authenticatedContext("admin-a").firestore();
  await assertSucceeds(
    updateDoc(doc(db, "cskhRequests/request-submitted"), {
      status: "ADMIN_REVIEW",
      assignedAdminUid: "admin-a",
      assignedAdminName: "Admin A",
      history: [
        createdEvent,
        submittedEvent,
        {
          action: "ADMIN_RECEIVED",
          byUid: "admin-a",
          fromStatus: "SUBMITTED",
          toStatus: "ADMIN_REVIEW",
          at: "client-test",
        },
      ],
      updatedAt: serverTimestamp(),
    }),
  );
});

test("unauthenticated client cannot read a CSKH request", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "cskhRequests/request-draft")));
});
