import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";

/*
 * ĐỨC ANH MAINTENANCE
 * FIRESTORE DATA LAYER
 *
 * CONTRACT MODULE — FIXED BASELINE
 *
 * NGUYÊN TẮC KHÓA:
 *
 * - Mã thang máy là định danh tài sản lâu dài, tối thiểu 10 năm.
 * - Mã thang không thay đổi theo hợp đồng, khách hàng hoặc đơn vị bảo trì.
 * - 1 hợp đồng gắn với 1 khách hàng, 1 tòa nhà và 1 thang máy.
 * - Quan hệ chính: Customer -> Building -> Elevator.
 * - Hết bảo hành/bảo trì miễn phí, khách hàng có thể không tiếp tục
 *   ký với Đức Anh và chuyển sang đơn vị khác.
 * - Đức Anh có thể tiếp nhận bảo trì thang máy do đơn vị khác lắp đặt.
 * - Không xóa cứng dữ liệu vận hành.
 * - Contracts lưu trực tiếp Firestore collection "contracts".
 * - Không dùng localStorage làm nguồn dữ liệu hợp đồng.
 */

export const COLLECTIONS = {
  CUSTOMERS: "customers",
  BUILDINGS: "buildings",
  ELEVATORS: "elevators",
  ELEVATOR_RELATIONSHIPS: "elevatorRelationships",

  /*
   * QUAN TRỌNG:
   * contracts.html đang dùng collection này.
   * Không đổi thành serviceContracts hoặc maintenanceAgreements.
   */
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
   CONTRACTS
========================= */

async function validateContractReferences(data) {
  requireValue(data.customerId, "customerId");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.elevatorId, "elevatorId");

  const [customer, building, elevator] = await Promise.all([
    getCustomer(data.customerId),
    getBuilding(data.buildingId),
    getElevator(data.elevatorId)
  ]);

  if (!customer) {
    throw new Error("Không tìm thấy khách hàng.");
  }

  if (!building) {
    throw new Error("Không tìm thấy tòa nhà.");
  }

  if (!elevator) {
    throw new Error("Không tìm thấy thang máy.");
  }

  if (String(building.customerId) !== String(customer.id)) {
    throw new Error(
      "Tòa nhà không thuộc khách hàng đã chọn."
    );
  }

  if (String(elevator.buildingId) !== String(building.id)) {
    throw new Error(
      "Thang máy không thuộc tòa nhà đã chọn."
    );
  }

  /*
   * KHÔNG kiểm tra elevator.customerId ở đây.
   *
   * Lý do:
   * Thang máy là tài sản lâu dài.
   * Khách hàng / đơn vị dịch vụ có thể thay đổi theo thời gian.
   * Quan hệ lịch sử phải được quản lý bằng elevatorRelationships.
   *
   * Hợp đồng hiện tại vẫn bắt buộc:
   * Customer -> Building -> Elevator.
   */

  return {
    customer,
    building,
    elevator
  };
}

function normalizeContractData(data, references) {
  const { customer, building, elevator } = references;

  requireValue(data.code, "Mã hợp đồng");
  requireValue(data.name, "Tên hợp đồng");

  return {
    code: String(data.code).trim(),
    name: String(data.name).trim(),

    customerId: customer.id,
    customerName:
      data.customerName ||
      customer.name ||
      "",

    buildingId: building.id,
    buildingName:
      data.buildingName ||
      building.name ||
      "",

    elevatorId: elevator.id,
    elevatorName:
      data.elevatorName ||
      elevator.name ||
      "",

    status: data.status || "active",

    signedDate: data.signedDate || "",
    startDate: data.startDate || "",
    endDate: data.endDate || "",

    contractValue:
      data.contractValue ?? "",

    warrantyEnabled:
      data.warrantyEnabled || "yes",

    warrantyPeriod:
      data.warrantyPeriod || "",

    warrantyStart:
      data.warrantyStart || "",

    warrantyEnd:
      data.warrantyEnd || "",

    warrantyNote:
      data.warrantyNote || "",

    maintenanceEnabled:
      data.maintenanceEnabled || "yes",

    maintenanceType:
      data.maintenanceType || "paid",

    maintenanceCycle:
      data.maintenanceCycle || "monthly",

    maintenanceOwner:
      data.maintenanceOwner || "",

    paidValue:
      data.paidValue ?? "",

    paymentDue:
      data.paymentDue || "",

    note:
      data.note || ""
  };
}

export async function createContract(data) {
  const references = await validateContractReferences(data);

  const contract = {
    ...normalizeContractData(data, references),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.CONTRACTS),
    contract
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

  const existing = await getContract(contractId);

  if (!existing) {
    throw new Error("Không tìm thấy hợp đồng.");
  }

  const references = await validateContractReferences(data);

  const payload = {
    ...normalizeContractData(data, references),
    updatedAt: serverTimestamp()
  };

  await updateDoc(
    doc(db, COLLECTIONS.CONTRACTS, contractId),
    payload
  );

  return getContract(contractId);
}

/* =========================
   MAINTENANCE / PHIẾU BẢO TRÌ
========================= */

const MAINTENANCE_COUNTER_ID = "maintenanceTicket";

function normalizeMaintenanceStatus(value){
  const allowed = ["draft","assigned","in_progress","completed","cancelled"];
  return allowed.includes(value) ? value : "draft";
}

async function validateMaintenanceReferences(data){
  requireValue(data.customerId, "customerId");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.elevatorId, "elevatorId");
  requireValue(data.contractId, "contractId");

  const [customer, building, elevator, contract] = await Promise.all([
    getCustomer(data.customerId),
    getBuilding(data.buildingId),
    getElevator(data.elevatorId),
    getContract(data.contractId)
  ]);

  if(!customer) throw new Error("Không tìm thấy khách hàng.");
  if(!building) throw new Error("Không tìm thấy tòa nhà.");
  if(!elevator) throw new Error("Không tìm thấy thang máy.");
  if(!contract) throw new Error("Không tìm thấy hợp đồng.");

  if(String(building.customerId) !== String(customer.id)){
    throw new Error("Tòa nhà không thuộc khách hàng đã chọn.");
  }
  if(String(elevator.buildingId) !== String(building.id)){
    throw new Error("Thang máy không thuộc tòa nhà đã chọn.");
  }
  if(String(contract.customerId) !== String(customer.id) ||
     String(contract.buildingId) !== String(building.id) ||
     String(contract.elevatorId) !== String(elevator.id)){
    throw new Error("Hợp đồng không thuộc đúng Customer → Building → Elevator đã chọn.");
  }
  if(!(contract.maintenanceEnabled === "yes" || contract.maintenanceEnabled === true || contract.maintenanceEnabled === "true")){
    throw new Error("Hợp đồng này không áp dụng bảo trì.");
  }

  return { customer, building, elevator, contract };
}

async function allocateMaintenanceTicketNo(){
  const counterRef = doc(db, COLLECTIONS.SETTINGS, MAINTENANCE_COUNTER_ID);

  const nextNumber = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists() ? Number(snapshot.data().lastNumber || 0) : 0;
    const next = current + 1;

    transaction.set(counterRef, {
      lastNumber: next,
      prefix: "PBM-",
      updatedAt: serverTimestamp()
    }, { merge: true });

    return next;
  });

  return `PBM-${String(nextNumber).padStart(6, "0")}`;
}

export async function getMaintenance(maintenanceId){
  requireValue(maintenanceId, "maintenanceId");
  const snapshot = await getDoc(doc(db, COLLECTIONS.MAINTENANCE, maintenanceId));
  if(!snapshot.exists()) return null;
  return { id:snapshot.id, ...snapshot.data() };
}

export async function getMaintenances(){
  const snapshot = await getDocs(collection(db, COLLECTIONS.MAINTENANCE));
  return snapshot.docs.map(item => ({ id:item.id, ...item.data() }));
}

export async function getMaintenancesByElevator(elevatorId){
  requireValue(elevatorId, "elevatorId");
  const q = query(collection(db, COLLECTIONS.MAINTENANCE), where("elevatorId", "==", elevatorId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => ({ id:item.id, ...item.data() }));
}

export async function createMaintenance(data){
  const references = await validateMaintenanceReferences(data);
  const ticketNo = await allocateMaintenanceTicketNo();
  const status = normalizeMaintenanceStatus(data.status);

  const maintenance = {
    ticketNo,
    customerId: references.customer.id,
    customerName: references.customer.name || "",
    buildingId: references.building.id,
    buildingName: references.building.name || "",
    elevatorId: references.elevator.id,
    elevatorName: references.elevator.name || "",
    elevatorAssetCode: references.elevator.assetCode || "",
    contractId: references.contract.id,
    contractCode: references.contract.code || "",
    periodNumber: Number(data.periodNumber || 0) || null,
    scheduledDate: data.scheduledDate || "",
    completedDate: status === "completed" ? (data.completedDate || new Date().toISOString().slice(0,10)) : (data.completedDate || ""),
    status,
    technicianId: data.technicianId || "",
    technicianName: data.technicianName || "",
    checklist: Array.isArray(data.checklist) ? data.checklist : [],
    condition: data.condition || "",
    result: data.result || "",
    issueFound: Boolean(data.issueFound),
    note: data.note || "",
    source: data.source || "maintenance_module",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, COLLECTIONS.MAINTENANCE), maintenance);
  return { id:ref.id, ...maintenance };
}

export async function updateMaintenance(maintenanceId, data){
  requireValue(maintenanceId, "maintenanceId");
  const existing = await getMaintenance(maintenanceId);
  if(!existing) throw new Error("Không tìm thấy phiếu bảo trì.");

  const references = await validateMaintenanceReferences(data);
  const status = normalizeMaintenanceStatus(data.status);
  const payload = {
    customerId: references.customer.id,
    customerName: references.customer.name || "",
    buildingId: references.building.id,
    buildingName: references.building.name || "",
    elevatorId: references.elevator.id,
    elevatorName: references.elevator.name || "",
    elevatorAssetCode: references.elevator.assetCode || "",
    contractId: references.contract.id,
    contractCode: references.contract.code || "",
    periodNumber: Number(data.periodNumber || existing.periodNumber || 0) || null,
    scheduledDate: data.scheduledDate || "",
    completedDate: status === "completed" ? (data.completedDate || existing.completedDate || new Date().toISOString().slice(0,10)) : (data.completedDate || ""),
    status,
    technicianId: data.technicianId || "",
    technicianName: data.technicianName || "",
    checklist: Array.isArray(data.checklist) ? data.checklist : (existing.checklist || []),
    condition: data.condition || "",
    result: data.result || "",
    issueFound: Boolean(data.issueFound),
    note: data.note || "",
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, COLLECTIONS.MAINTENANCE, maintenanceId), payload);
  return getMaintenance(maintenanceId);
}

/* =========================
   GENERIC HELPERS
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
