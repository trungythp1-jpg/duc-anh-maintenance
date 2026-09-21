// ============================================
// ĐỨC ANH MAINTENANCE
// Firestore V1 Data Layer
// ============================================

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";


// ============================================
// COLLECTIONS
// ============================================

export const COLLECTIONS = {
  CUSTOMERS: "customers",
  BUILDINGS: "buildings",
  ELEVATORS: "elevators",
  ELEVATOR_RELATIONSHIPS: "elevatorRelationships"
};


// ============================================
// COMMON HELPERS
// ============================================

function requireValue(value, fieldName) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${fieldName} là bắt buộc.`);
  }
}


// ============================================
// CUSTOMERS
// ============================================

export async function createCustomer(data) {
  requireValue(data.name, "Tên khách hàng");

  const customer = {
    name: data.name.trim(),
    type: data.type || "business",
    phone: data.phone || "",
    email: data.email || "",
    taxCode: data.taxCode || "",
    address: data.address || "",
    contactPerson: data.contactPerson || {
      name: "",
      phone: ""
    },
    status: data.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.CUSTOMERS),
    customer
  );

  return {
    id: ref.id,
    ...customer
  };
}


export async function getCustomer(customerId) {
  requireValue(customerId, "customerId");

  const ref = doc(
    db,
    COLLECTIONS.CUSTOMERS,
    customerId
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


export async function getCustomers() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.CUSTOMERS)
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function updateCustomer(customerId, data) {
  requireValue(customerId, "customerId");

  const ref = doc(
    db,
    COLLECTIONS.CUSTOMERS,
    customerId
  );

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });

  return getCustomer(customerId);
}


// ============================================
// BUILDINGS
// ============================================

export async function createBuilding(data) {
  requireValue(data.name, "Tên tòa nhà");
  requireValue(data.customerId, "customerId");

  const building = {
    name: data.name.trim(),
    customerId: data.customerId,
    address: data.address || {
      province: "",
      district: "",
      detail: ""
    },
    type: data.type || "other",
    manager: data.manager || {
      name: "",
      phone: ""
    },
    status: data.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.BUILDINGS),
    building
  );

  return {
    id: ref.id,
    ...building
  };
}


export async function getBuilding(buildingId) {
  requireValue(buildingId, "buildingId");

  const ref = doc(
    db,
    COLLECTIONS.BUILDINGS,
    buildingId
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


export async function getBuildingsByCustomer(customerId) {
  requireValue(customerId, "customerId");

  const q = query(
    collection(db, COLLECTIONS.BUILDINGS),
    where("customerId", "==", customerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function getBuildings() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.BUILDINGS)
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function updateBuilding(buildingId, data) {
  requireValue(buildingId, "buildingId");

  const ref = doc(
    db,
    COLLECTIONS.BUILDINGS,
    buildingId
  );

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });

  return getBuilding(buildingId);
}


// ============================================
// ELEVATORS
// ============================================

export async function createElevator(data) {
  requireValue(data.name, "Tên thang máy");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.customerId, "customerId");

  // Kiểm tra Building tồn tại
  const building = await getBuilding(data.buildingId);

  if (!building) {
    throw new Error("Không tìm thấy tòa nhà.");
  }

  // Kiểm tra Customer của Elevator
  // phải khớp Customer của Building
  if (building.customerId !== data.customerId) {
    throw new Error(
      "customerId của thang máy không khớp với customerId của tòa nhà."
    );
  }

  const elevator = {
    name: data.name.trim(),

    buildingId: data.buildingId,

    customerId: data.customerId,

    // Mã nghiệp vụ, KHÔNG phải Firebase Document ID
    assetCode: data.assetCode || "",

    status: data.status || "active",

    technical: {
      capacityKg: data.technical?.capacityKg || null,
      speed: data.technical?.speed || null,
      stops: data.technical?.stops || null,

      machine: {
        brand: data.technical?.machine?.brand || "",
        model: data.technical?.machine?.model || ""
      },

      controller: {
        brand: data.technical?.controller?.brand || "",
        model: data.technical?.controller?.model || ""
      },

      installationYear:
        data.technical?.installationYear || null
    },

    service: {
      maintenanceStatus:
        data.service?.maintenanceStatus || "active"
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.ELEVATORS),
    elevator
  );

  return {
    id: ref.id,
    ...elevator
  };
}


export async function getElevator(elevatorId) {
  requireValue(elevatorId, "elevatorId");

  const ref = doc(
    db,
    COLLECTIONS.ELEVATORS,
    elevatorId
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


export async function getElevatorsByBuilding(buildingId) {
  requireValue(buildingId, "buildingId");

  const q = query(
    collection(db, COLLECTIONS.ELEVATORS),
    where("buildingId", "==", buildingId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function getElevatorsByCustomer(customerId) {
  requireValue(customerId, "customerId");

  const q = query(
    collection(db, COLLECTIONS.ELEVATORS),
    where("customerId", "==", customerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function getElevators() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.ELEVATORS)
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


export async function updateElevator(elevatorId, data) {
  requireValue(elevatorId, "elevatorId");

  const ref = doc(
    db,
    COLLECTIONS.ELEVATORS,
    elevatorId
  );

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });

  return getElevator(elevatorId);
}


// ============================================
// ELEVATOR RELATIONSHIPS
// ============================================

export async function createElevatorRelationship(data) {
  requireValue(data.elevatorId, "elevatorId");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.customerId, "customerId");
  requireValue(data.relationType, "relationType");

  const relationship = {
    elevatorId: data.elevatorId,
    buildingId: data.buildingId,
    customerId: data.customerId,

    relationType: data.relationType,

    startAt: data.startAt || null,
    endAt: data.endAt || null,

    isCurrent:
      typeof data.isCurrent === "boolean"
        ? data.isCurrent
        : true,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(
      db,
      COLLECTIONS.ELEVATOR_RELATIONSHIPS
    ),
    relationship
  );

  return {
    id: ref.id,
    ...relationship
  };
}


export async function getElevatorRelationships(elevatorId) {
  requireValue(elevatorId, "elevatorId");

  const q = query(
    collection(
      db,
      COLLECTIONS.ELEVATOR_RELATIONSHIPS
    ),
    where("elevatorId", "==", elevatorId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


// ============================================
// END
// ============================================
