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

/*
 * ĐỨC ANH MAINTENANCE
 * FIRESTORE DATA LAYER
 *
 * Nguyên tắc:
 * - Mã thang máy là định danh tài sản lâu dài.
 * - 1 hợp đồng chỉ gắn với 1 thang máy và 1 tòa nhà.
 * - Customer -> Building -> Elevator là quan hệ chính.
 * - Không xóa cứng dữ liệu vận hành; ưu tiên status/active.
 * - Các module tương lai đã được khai báo collection từ đầu
 *   để hạn chế phải đổi cấu trúc Firebase về sau.
 */

export const COLLECTIONS = {
  CUSTOMERS: "customers",
  BUILDINGS: "buildings",
  ELEVATORS: "elevators",
  ELEVATOR_RELATIONSHIPS: "elevatorRelationships",

  CONTRACTS: "contracts",
  MAINTENANCE: "maintenance",
  WORK_ORDERS: "workOrders",
  TECHNICIANS: "technicians",
  KPI: "kpi",
  DOCUMENTS: "documents",
  AUDIT_LOGS: "auditLogs",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications"
};

function requireValue(value, fieldName) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${fieldName} là bắt buộc.`);
  }
}

function normalizeLocation(location) {
  if (!location) return null;

  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Vị trí ghim không hợp lệ.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Tọa độ vị trí không hợp lệ.");
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(location.accuracy))
      ? Number(location.accuracy)
      : null,
    source: location.source || "map"
  };
}

/* =========================
   CUSTOMERS
========================= */

export async function createCustomer(data) {
  requireValue(data.name, "Tên khách hàng");

  const customer = {
    name: data.name.trim(),
    type: data.type || "business",
    phone: data.phone || "",
    email: data.email || "",
    taxCode: data.taxCode || "",
    address: data.address || "",
    contactPerson: data.contactPerson || { name: "", phone: "" },
    status: data.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), customer);
  return { id: ref.id, ...customer };
}

export async function getCustomer(customerId) {
  requireValue(customerId, "customerId");

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.CUSTOMERS, customerId)
  );

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() };
}

export async function getCustomers() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function updateCustomer(customerId, data) {
  requireValue(customerId, "customerId");

  await updateDoc(
    doc(db, COLLECTIONS.CUSTOMERS, customerId),
    {
      ...data,
      updatedAt: serverTimestamp()
    }
  );

  return getCustomer(customerId);
}

/* =========================
   BUILDINGS
========================= */

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
    location: normalizeLocation(data.location),
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

  return { id: ref.id, ...building };
}

export async function getBuilding(buildingId) {
  requireValue(buildingId, "buildingId");

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.BUILDINGS, buildingId)
  );

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() };
}

export async function getBuildings() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.BUILDINGS)
  );

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function getBuildingsByCustomer(customerId) {
  requireValue(customerId, "customerId");

  const q = query(
    collection(db, COLLECTIONS.BUILDINGS),
    where("customerId", "==", customerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function updateBuilding(buildingId, data) {
  requireValue(buildingId, "buildingId");

  const payload = {
    ...data,
    updatedAt: serverTimestamp()
  };

  if (Object.prototype.hasOwnProperty.call(data, "location")) {
    payload.location = normalizeLocation(data.location);
  }

  await updateDoc(
    doc(db, COLLECTIONS.BUILDINGS, buildingId),
    payload
  );

  return getBuilding(buildingId);
}

/* =========================
   ELEVATORS
========================= */

export async function createElevator(data) {
  requireValue(data.name, "Tên thang máy");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.customerId, "customerId");

  const building = await getBuilding(data.buildingId);

  if (!building) {
    throw new Error("Không tìm thấy tòa nhà.");
  }

  if (building.customerId !== data.customerId) {
    throw new Error(
      "customerId của thang máy không khớp với customerId của tòa nhà."
    );
  }

  const elevator = {
    name: data.name.trim(),
    buildingId: data.buildingId,
    customerId: data.customerId,

    /* Mã tài sản lâu dài */
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

  return { id: ref.id, ...elevator };
}

export async function getElevator(elevatorId) {
  requireValue(elevatorId, "elevatorId");

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.ELEVATORS, elevatorId)
  );

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() };
}

export async function getElevators() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.ELEVATORS)
  );

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function getElevatorsByBuilding(buildingId) {
  requireValue(buildingId, "buildingId");

  const q = query(
    collection(db, COLLECTIONS.ELEVATORS),
    where("buildingId", "==", buildingId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => ({
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

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function updateElevator(elevatorId, data) {
  requireValue(elevatorId, "elevatorId");

  await updateDoc(
    doc(db, COLLECTIONS.ELEVATORS, elevatorId),
    {
      ...data,
      updatedAt: serverTimestamp()
    }
  );

  return getElevator(elevatorId);
}

/* =========================
   ELEVATOR RELATIONSHIPS
========================= */

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
    collection(db, COLLECTIONS.ELEVATOR_RELATIONSHIPS),
    relationship
  );

  return { id: ref.id, ...relationship };
}

export async function getElevatorRelationships(elevatorId) {
  requireValue(elevatorId, "elevatorId");

  const q = query(
    collection(db, COLLECTIONS.ELEVATOR_RELATIONSHIPS),
    where("elevatorId", "==", elevatorId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

/* =========================
   GENERIC HELPERS
   DÙNG CHO MODULE TƯƠNG LAI
========================= */

export async function createRecord(collectionName, data) {
  requireValue(collectionName, "collectionName");

  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(db, collectionName),
    payload
  );

  return {
    id: ref.id,
    ...payload
  };
}

export async function getRecord(collectionName, recordId) {
  requireValue(collectionName, "collectionName");
  requireValue(recordId, "recordId");

  const snapshot = await getDoc(
    doc(db, collectionName, recordId)
  );

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getRecords(collectionName) {
  requireValue(collectionName, "collectionName");

  const snapshot = await getDocs(
    collection(db, collectionName)
  );

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function updateRecord(
  collectionName,
  recordId,
  data
) {
  requireValue(collectionName, "collectionName");
  requireValue(recordId, "recordId");

  await updateDoc(
    doc(db, collectionName, recordId),
    {
      ...data,
      updatedAt: serverTimestamp()
    }
  );

  return getRecord(collectionName, recordId);
}

/* =========================
   CONTRACTS
========================= */

export async function createContract(data) {
  requireValue(data.code, "Mã hợp đồng");
  requireValue(data.name, "Tên hợp đồng");
  requireValue(data.customerId, "Khách hàng");
  requireValue(data.buildingId, "Tòa nhà");
  requireValue(data.elevatorId, "Thang máy");

  const [building, elevator] = await Promise.all([
    getBuilding(data.buildingId),
    getElevator(data.elevatorId)
  ]);

  if (!building) {
    throw new Error("Không tìm thấy tòa nhà.");
  }

  if (!elevator) {
    throw new Error("Không tìm thấy thang máy.");
  }

  if (String(building.customerId) !== String(data.customerId)) {
    throw new Error("Tòa nhà không thuộc khách hàng đã chọn.");
  }

  if (String(elevator.buildingId) !== String(data.buildingId)) {
    throw new Error("Thang máy không thuộc tòa nhà đã chọn.");
  }

  const contract = {
    code: data.code.trim(),
    name: data.name.trim(),

    customerId: String(data.customerId),
    customerName: data.customerName || "",

    buildingId: String(data.buildingId),
    buildingName: data.buildingName || "",

    elevatorId: String(data.elevatorId),
    elevatorName: data.elevatorName || "",

    status: data.status || "active",

    signedDate: data.signedDate || "",
    startDate: data.startDate || "",
    contractDurationMonths: [12, 24, 36].includes(
      Number(data.contractDurationMonths)
    )
      ? Number(data.contractDurationMonths)
      : 0,
    endDate: data.endDate || "",

    contractValue: Number(data.contractValue || 0),

    warrantyEnabled: data.warrantyEnabled || "yes",
    warrantyPeriod: data.warrantyPeriod || "",
    warrantyStart: data.warrantyStart || "",
    warrantyEnd: data.warrantyEnd || "",
    warrantyNote: data.warrantyNote || "",

    maintenanceEnabled: data.maintenanceEnabled || "yes",
    maintenanceType: data.maintenanceType || "paid",
    maintenanceCycle: data.maintenanceCycle || "monthly",
    maintenanceOwner: data.maintenanceOwner || "",
    maintenanceTotal: Math.max(
      0,
      Number(data.maintenanceTotal || 0)
    ),
    maintenanceCompleted: Math.max(
      0,
      Number(data.maintenanceCompleted || 0)
    ),
    maintenanceRemaining: Math.max(
      0,
      Number(data.maintenanceRemaining || 0)
    ),

    paidValue: Number(data.paidValue || 0),
    paymentDue: data.paymentDue || "",
    note: data.note || ""
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.CONTRACTS),
    {
      ...contract,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );

  return {
    id: ref.id,
    ...contract
  };
}

export async function getContract(contractId) {
  requireValue(contractId, "contractId");

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.CONTRACTS, contractId)
  );

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getContracts() {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.CONTRACTS)
  );

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function updateContract(contractId, data) {
  requireValue(contractId, "contractId");
  requireValue(data.code, "Mã hợp đồng");
  requireValue(data.name, "Tên hợp đồng");
  requireValue(data.customerId, "Khách hàng");
  requireValue(data.buildingId, "Tòa nhà");
  requireValue(data.elevatorId, "Thang máy");

  const [building, elevator] = await Promise.all([
    getBuilding(data.buildingId),
    getElevator(data.elevatorId)
  ]);

  if (!building) {
    throw new Error("Không tìm thấy tòa nhà.");
  }

  if (!elevator) {
    throw new Error("Không tìm thấy thang máy.");
  }

  if (String(building.customerId) !== String(data.customerId)) {
    throw new Error("Tòa nhà không thuộc khách hàng đã chọn.");
  }

  if (String(elevator.buildingId) !== String(data.buildingId)) {
    throw new Error("Thang máy không thuộc tòa nhà đã chọn.");
  }

  const payload = {
    code: data.code.trim(),
    name: data.name.trim(),
    customerId: String(data.customerId),
    customerName: data.customerName || "",
    buildingId: String(data.buildingId),
    buildingName: data.buildingName || "",
    elevatorId: String(data.elevatorId),
    elevatorName: data.elevatorName || "",
    status: data.status || "active",
    signedDate: data.signedDate || "",
    startDate: data.startDate || "",
    contractDurationMonths: [12, 24, 36].includes(
      Number(data.contractDurationMonths)
    )
      ? Number(data.contractDurationMonths)
      : 0,
    endDate: data.endDate || "",
    contractValue: Number(data.contractValue || 0),
    warrantyEnabled: data.warrantyEnabled || "yes",
    warrantyPeriod: data.warrantyPeriod || "",
    warrantyStart: data.warrantyStart || "",
    warrantyEnd: data.warrantyEnd || "",
    warrantyNote: data.warrantyNote || "",
    maintenanceEnabled: data.maintenanceEnabled || "yes",
    maintenanceType: data.maintenanceType || "paid",
    maintenanceCycle: data.maintenanceCycle || "monthly",
    maintenanceOwner: data.maintenanceOwner || "",
    maintenanceTotal: Math.max(0, Number(data.maintenanceTotal || 0)),
    maintenanceCompleted: Math.max(0, Number(data.maintenanceCompleted || 0)),
    maintenanceRemaining: Math.max(0, Number(data.maintenanceRemaining || 0)),
    paidValue: Number(data.paidValue || 0),
    paymentDue: data.paymentDue || "",
    note: data.note || "",
    updatedAt: serverTimestamp()
  };

  await updateDoc(
    doc(db, COLLECTIONS.CONTRACTS, contractId),
    payload
  );

  return getContract(contractId);
}
