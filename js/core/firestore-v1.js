/* MAINTENANCE DATA LAYER V4 */
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
  const allowed = [
    "draft",
    "assigned",
    "in_progress",
    "waiting_confirmation",
    "completed",
    "cancelled"
  ];
  return allowed.includes(value) ? value : "draft";
}

const MAINTENANCE_CONFIRMATION_HOURS = 18;
const MAINTENANCE_CONFIRMATION_MS =
  MAINTENANCE_CONFIRMATION_HOURS * 60 * 60 * 1000;

function addHoursToDate(date, hours){
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toIsoDate(value){
  const d = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function assertMaintenanceCompletionReportable(existing){
  if(!existing){
    throw new Error("Không tìm thấy phiếu bảo trì.");
  }

  if(existing.status === "completed"){
    throw new Error("Phiếu bảo trì đã hoàn thành.");
  }

  if(existing.status === "cancelled"){
    throw new Error("Phiếu bảo trì đã hủy.");
  }

  if(existing.status === "waiting_confirmation"){
    throw new Error("Phiếu bảo trì đã được báo hoàn thành và đang chờ xác nhận.");
  }
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

function maintenanceKey(contractId, periodNumber){
  return `contract_${encodeURIComponent(String(contractId))}_period_${Number(periodNumber)}`;
}

async function findMaintenanceDuplicate(contractId, periodNumber, excludeId = ""){
  const normalizedContractId = String(contractId || "").trim();
  const normalizedPeriod = Number(periodNumber || 0);

  const q = query(
    collection(db, COLLECTIONS.MAINTENANCE),
    where("contractId", "==", normalizedContractId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.find(item =>
    item.id !== excludeId &&
    Number(item.data()?.periodNumber || 0) === normalizedPeriod
  ) || null;
}

async function assertMaintenancePeriodAvailable(contractId, periodNumber, excludeId = ""){
  const duplicate = await findMaintenanceDuplicate(contractId, periodNumber, excludeId);

  if(duplicate){
    const data = duplicate.data() || {};
    const ticketNo = data.ticketNo || duplicate.id;
    const storedPeriod = Number(data.periodNumber || 0);
    throw new Error(
      `Kỳ bảo trì ${Number(periodNumber)} đã có phiếu ${ticketNo} ` +
      `(Kỳ lưu trong Firestore: ${storedPeriod}). Không thể tạo phiếu trùng.`
    );
  }
}

export async function getMaintenance(maintenanceId){
  requireValue(maintenanceId, "maintenanceId");
  const snapshot = await getDoc(doc(db, COLLECTIONS.MAINTENANCE, maintenanceId));
  if(!snapshot.exists()) return null;
  return { id:snapshot.id, ...snapshot.data() };
}

export async function getMaintenances(options = {}) {
  const technicianId = String(options?.technicianId || "").trim();
  const source = technicianId
    ? query(collection(db, COLLECTIONS.MAINTENANCE), where("technicianId", "==", technicianId))
    : collection(db, COLLECTIONS.MAINTENANCE);
  const snapshot = await getDocs(source);
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
  const periodNumber = Number(data.periodNumber || 0) || null;
  if(!periodNumber){
    throw new Error("Kỳ bảo trì là bắt buộc. Phiếu bảo trì phải gắn với một kỳ trong lịch.");
  }

  // Chặn trùng với dữ liệu cũ trước khi ghi.
  await assertMaintenancePeriodAvailable(references.contract.id, periodNumber);

  const status = normalizeMaintenanceStatus(data.status);
  const maintenance = {
    customerId: references.customer.id,
    customerName: references.customer.name || "",
    buildingId: references.building.id,
    buildingName: references.building.name || "",
    elevatorId: references.elevator.id,
    elevatorName: references.elevator.name || "",
    elevatorAssetCode: references.elevator.assetCode || "",
    contractId: references.contract.id,
    contractCode: references.contract.code || "",
    periodNumber,
    scheduledDate: data.scheduledDate || "",
    completedDate: status === "completed" ? (data.completedDate || new Date().toISOString().slice(0,10)) : (data.completedDate || ""),
    status,
    technicianId: data.technicianId || "",
    technicianName: data.technicianName || "",
    completedByTechnicianId: data.completedByTechnicianId || "",
    completedByTechnicianName: data.completedByTechnicianName || "",
    completionReportedAt: data.completionReportedAt || null,
    customerConfirmationStatus: data.customerConfirmationStatus || "not_started",
    customerConfirmationDeadline: data.customerConfirmationDeadline || null,
    customerConfirmedBy: data.customerConfirmedBy || "",
    customerConfirmedAt: data.customerConfirmedAt || null,
    customerConfirmationNote: data.customerConfirmationNote || "",
    confirmationEscalatedBy: data.confirmationEscalatedBy || "",
    confirmationEscalatedAt: data.confirmationEscalatedAt || null,
    checklist: Array.isArray(data.checklist) ? data.checklist : [],
    condition: data.condition || "",
    result: data.result || "",
    issueFound: Boolean(data.issueFound),
    note: data.note || "",
    source: data.source || "maintenance_module",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Dùng document ID xác định theo Contract + Kỳ để chống trùng ngay cả khi
  // hai người dùng cùng lúc tạo phiếu cho cùng một kỳ. Transaction khóa
  // document này trước khi tăng bộ đếm mã PBM.
  const maintenanceId = maintenanceKey(references.contract.id, periodNumber);
  const maintenanceRef = doc(db, COLLECTIONS.MAINTENANCE, maintenanceId);
  const counterRef = doc(db, COLLECTIONS.SETTINGS, MAINTENANCE_COUNTER_ID);

  const saved = await runTransaction(db, async transaction => {
    const existing = await transaction.get(maintenanceRef);
    if(existing.exists()){
      const existingTicket = existing.data()?.ticketNo || maintenanceId;
      throw new Error(`Kỳ bảo trì này đã có phiếu bảo trì (${existingTicket}). Không thể tạo phiếu trùng.`);
    }

    const counterSnapshot = await transaction.get(counterRef);
    const current = counterSnapshot.exists()
      ? Number(counterSnapshot.data().lastNumber || 0)
      : 0;
    const nextNumber = current + 1;
    const ticketNo = `PBM-${String(nextNumber).padStart(6, "0")}`;

    transaction.set(counterRef, {
      lastNumber: nextNumber,
      prefix: "PBM-",
      updatedAt: serverTimestamp()
    }, { merge: true });

    transaction.set(maintenanceRef, {
      ...maintenance,
      ticketNo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: maintenanceId, ticketNo };
  });

  return { id:saved.id, ...maintenance, periodNumber, ticketNo:saved.ticketNo };
}

export async function updateMaintenance(maintenanceId, data){
  requireValue(maintenanceId, "maintenanceId");
  const existing = await getMaintenance(maintenanceId);
  if(!existing) throw new Error("Không tìm thấy phiếu bảo trì.");

  const references = await validateMaintenanceReferences(data);
  const periodNumber = Number(data.periodNumber || existing.periodNumber || 0) || null;
  if(!periodNumber){
    throw new Error("Kỳ bảo trì là bắt buộc.");
  }

  await assertMaintenancePeriodAvailable(references.contract.id, periodNumber, maintenanceId);

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
    periodNumber,
    scheduledDate: data.scheduledDate || "",
    completedDate: status === "completed" ? (data.completedDate || existing.completedDate || new Date().toISOString().slice(0,10)) : (data.completedDate || ""),
    status,
    technicianId: data.technicianId || "",
    technicianName: data.technicianName || "",
    completedByTechnicianId:
      data.completedByTechnicianId ?? existing.completedByTechnicianId ?? "",
    completedByTechnicianName:
      data.completedByTechnicianName ?? existing.completedByTechnicianName ?? "",
    completionReportedAt:
      data.completionReportedAt ?? existing.completionReportedAt ?? null,
    customerConfirmationStatus:
      data.customerConfirmationStatus ?? existing.customerConfirmationStatus ?? "not_started",
    customerConfirmationDeadline:
      data.customerConfirmationDeadline ?? existing.customerConfirmationDeadline ?? null,
    customerConfirmedBy:
      data.customerConfirmedBy ?? existing.customerConfirmedBy ?? "",
    customerConfirmedAt:
      data.customerConfirmedAt ?? existing.customerConfirmedAt ?? null,
    customerConfirmationNote:
      data.customerConfirmationNote ?? existing.customerConfirmationNote ?? "",
    confirmationEscalatedBy:
      data.confirmationEscalatedBy ?? existing.confirmationEscalatedBy ?? "",
    confirmationEscalatedAt:
      data.confirmationEscalatedAt ?? existing.confirmationEscalatedAt ?? null,
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
   MAINTENANCE COMPLETION CONFIRMATION WORKFLOW
========================= */

/*
 * KTV chỉ báo đã hoàn thành công việc.
 * KTV không được tự chuyển phiếu sang "completed".
 *
 * completionReportedAt là thời điểm bắt đầu cửa sổ xác nhận 18 giờ.
 * customerConfirmationDeadline = completionReportedAt + 18 giờ.
 */
export async function reportMaintenanceCompletion(maintenanceId, data = {}){
  requireValue(maintenanceId, "maintenanceId");

  const existing = await getMaintenance(maintenanceId);
  assertMaintenanceCompletionReportable(existing);

  const reportedAt = new Date();
  const deadline = addHoursToDate(
    reportedAt,
    MAINTENANCE_CONFIRMATION_HOURS
  );

  const completedDate =
    String(data.completedDate || "").trim() ||
    toIsoDate(reportedAt);

  const payload = {
    status: "waiting_confirmation",
    completedDate,
    completedByTechnicianId:
      String(data.completedByTechnicianId || existing.technicianId || "").trim(),
    completedByTechnicianName:
      String(data.completedByTechnicianName || existing.technicianName || "").trim(),
    completionReportedAt: serverTimestamp(),
    customerConfirmationStatus: "pending",
    customerConfirmationDeadline: deadline,
    customerConfirmedBy: "",
    customerConfirmedAt: null,
    customerConfirmationNote: "",
    confirmationEscalatedBy: "",
    confirmationEscalatedAt: null,
    updatedAt: serverTimestamp()
  };

  await updateDoc(
    doc(db, COLLECTIONS.MAINTENANCE, maintenanceId),
    payload
  );

  return getMaintenance(maintenanceId);
}

/*
 * CSKH xác nhận trong thời hạn 18 giờ.
 * Hàm này không tự bỏ qua quyền Firestore Rules.
 * Rules là lớp bảo mật cuối cùng.
 */
export async function confirmMaintenanceByCSKH(
  maintenanceId,
  data = {}
){
  requireValue(maintenanceId, "maintenanceId");

  const existing = await getMaintenance(maintenanceId);

  if(!existing){
    throw new Error("Không tìm thấy phiếu bảo trì.");
  }

  if(existing.status !== "waiting_confirmation"){
    throw new Error("Phiếu không ở trạng thái chờ CSKH xác nhận.");
  }

  if(existing.customerConfirmationStatus !== "pending"){
    throw new Error("Phiếu không còn ở trạng thái chờ xác nhận.");
  }

  if(
    existing.customerConfirmationDeadline &&
    typeof existing.customerConfirmationDeadline.toDate === "function" &&
    Date.now() > existing.customerConfirmationDeadline.toDate().getTime()
  ){
    throw new Error("Đã quá 18 giờ. Phiếu này phải do cấp quản lý xác nhận.");
  }

  const confirmedBy =
    String(data.confirmedBy || data.confirmedByName || "").trim();

  if(!confirmedBy){
    throw new Error("Người xác nhận CSKH là bắt buộc.");
  }

  await updateDoc(
    doc(db, COLLECTIONS.MAINTENANCE, maintenanceId),
    {
      status: "completed",
      customerConfirmationStatus: "confirmed",
      customerConfirmedBy: confirmedBy,
      customerConfirmedAt: serverTimestamp(),
      customerConfirmationNote:
        String(data.note || "").trim(),
      updatedAt: serverTimestamp()
    }
  );

  return getMaintenance(maintenanceId);
}

/*
 * Sau 18 giờ, chỉ cấp quản lý được xác nhận.
 * CSKH không sử dụng API này.
 */
export async function confirmMaintenanceAfterExpiry(
  maintenanceId,
  data = {}
){
  requireValue(maintenanceId, "maintenanceId");

  const existing = await getMaintenance(maintenanceId);

  if(!existing){
    throw new Error("Không tìm thấy phiếu bảo trì.");
  }

  if(existing.status !== "waiting_confirmation"){
    throw new Error("Phiếu không ở trạng thái chờ xác nhận.");
  }

  if(existing.customerConfirmationStatus !== "pending"){
    throw new Error("Phiếu không còn ở trạng thái chờ xác nhận.");
  }

  if(
    existing.customerConfirmationDeadline &&
    typeof existing.customerConfirmationDeadline.toDate === "function" &&
    Date.now() <= existing.customerConfirmationDeadline.toDate().getTime()
  ){
    throw new Error("Phiếu chưa quá 18 giờ. CSKH vẫn còn thời gian xác nhận.");
  }

  const confirmedBy =
    String(data.confirmedBy || data.confirmedByName || "").trim();

  if(!confirmedBy){
    throw new Error("Người xác nhận cấp quản lý là bắt buộc.");
  }

  await updateDoc(
    doc(db, COLLECTIONS.MAINTENANCE, maintenanceId),
    {
      status: "completed",
      customerConfirmationStatus: "manager_confirmed",
      customerConfirmedBy: confirmedBy,
      customerConfirmedAt: serverTimestamp(),
      customerConfirmationNote:
        String(data.note || "").trim(),
      confirmationEscalatedBy: confirmedBy,
      confirmationEscalatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );

  return getMaintenance(maintenanceId);
}


/* =========================
   WORK ORDERS / PHIẾU CÔNG VIỆC
   V2 — INDEPENDENT SOURCE / ASSET CONTEXT / ASSIGNMENT
========================= */

const WORK_ORDER_COUNTER_ID = "workOrderTicket";
const WORK_ORDER_COOLDOWN_MS = 20 * 60 * 1000;

const WORK_ORDER_SOURCE_TYPES = [
  "MAINTENANCE",
  "CUSTOMER_REPORT",
  "INCIDENT",
  "SALES",
  "MANAGEMENT",
  "OTHER"
];

const WORK_ORDER_TYPES = [
  "MAINTENANCE",
  "BREAKDOWN",
  "REPAIR",
  "INSPECTION"
];

const WORK_ORDER_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent"
];

const WORK_ORDER_STATUSES = [
  "draft",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "cancelled"
];

function normalizeWorkOrderStatus(value){
  return WORK_ORDER_STATUSES.includes(value) ? value : "draft";
}

function normalizeWorkOrderPriority(value){
  return WORK_ORDER_PRIORITIES.includes(value) ? value : "normal";
}

function normalizeWorkOrderType(value){
  return WORK_ORDER_TYPES.includes(value) ? value : "REPAIR";
}

function workOrderStatusLabel(value){
  return {
    draft:"Nháp",
    assigned:"Đã phân công",
    in_progress:"Đang xử lý",
    waiting_parts:"Chờ vật tư",
    completed:"Hoàn thành",
    cancelled:"Đã hủy"
  }[value] || value;
}

function normalizeWorkOrderText(value){
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildWorkOrderIssueFingerprint({ type, issueTitle, problemDescription }){
  return [
    normalizeWorkOrderText(type),
    normalizeWorkOrderText(issueTitle),
    normalizeWorkOrderText(problemDescription)
  ].join("|").slice(0, 500);
}

function validateWorkOrderState({
  sourceType,
  status,
  technicianId,
  resolution,
  completedDate,
  existingStatus = "",
  maintenanceId = ""
}){
  if(!WORK_ORDER_SOURCE_TYPES.includes(sourceType)){
    throw new Error("Nguồn Work Order không hợp lệ.");
  }

  if(existingStatus === "completed" && status !== "completed"){
    throw new Error("Work Order đã hoàn thành và không được chuyển ngược trạng thái.");
  }

  if(
    ["assigned","in_progress","waiting_parts","completed"].includes(status) &&
    !String(technicianId || "").trim()
  ){
    throw new Error(
      `Trạng thái "${workOrderStatusLabel(status)}" bắt buộc phải có kỹ thuật viên.`
    );
  }

  if(status === "completed"){
    if(!String(resolution || "").trim()){
      throw new Error("Muốn hoàn thành Work Order phải nhập Biện pháp xử lý.");
    }

    if(!completedDate){
      throw new Error("Muốn hoàn thành Work Order phải có Ngày hoàn thành.");
    }
  }

  if(
    sourceType === "MAINTENANCE" &&
    !String(maintenanceId || "").trim()
  ){
    throw new Error("Nguồn MAINTENANCE bắt buộc phải có Phiếu bảo trì.");
  }
}

async function validateWorkOrderReferences(data){
  requireValue(data.customerId, "customerId");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.elevatorId, "elevatorId");

  const [customer, building, elevator] = await Promise.all([
    getCustomer(data.customerId),
    getBuilding(data.buildingId),
    getElevator(data.elevatorId)
  ]);

  if(!customer) throw new Error("Không tìm thấy khách hàng.");
  if(!building) throw new Error("Không tìm thấy tòa nhà.");
  if(!elevator) throw new Error("Không tìm thấy thang máy.");

  if(String(building.customerId) !== String(customer.id)){
    throw new Error("Tòa nhà không thuộc khách hàng đã chọn.");
  }

  if(String(elevator.buildingId) !== String(building.id)){
    throw new Error("Thang máy không thuộc tòa nhà đã chọn.");
  }

  return { customer, building, elevator };
}

async function validateWorkOrderMaintenance(data){
  if(data.sourceType !== "MAINTENANCE") return null;

  requireValue(data.maintenanceId, "maintenanceId");

  const maintenance = await getMaintenance(data.maintenanceId);

  if(!maintenance){
    throw new Error("Không tìm thấy phiếu bảo trì.");
  }

  if(
    String(maintenance.customerId || "") !== String(data.customerId || "") ||
    String(maintenance.buildingId || "") !== String(data.buildingId || "") ||
    String(maintenance.elevatorId || "") !== String(data.elevatorId || "")
  ){
    throw new Error(
      "Phiếu bảo trì không thuộc đúng Customer → Building → Elevator của Work Order."
    );
  }

  if(!maintenance.contractId || !maintenance.elevatorId){
    throw new Error("Phiếu bảo trì chưa đủ liên kết Hợp đồng → Thang máy.");
  }

  return maintenance;
}

async function assertWorkOrderCooldown(
  elevatorId,
  issueFingerprint,
  excludeWorkOrderId = ""
){
  if(!elevatorId || !issueFingerprint) return;

  // Query by elevator only to avoid requiring a Firestore composite index.
  const q = query(
    collection(db, COLLECTIONS.WORK_ORDERS),
    where("elevatorId", "==", String(elevatorId))
  );

  const snapshot = await getDocs(q);
  const now = Date.now();

  for(const item of snapshot.docs){
    if(excludeWorkOrderId && item.id === excludeWorkOrderId) continue;

    const data = item.data() || {};
    const createdAt = data.createdAt;

    if(createdAt && typeof createdAt.toMillis === "function"){
      const age = now - createdAt.toMillis();

      if(age >= 0 && age < WORK_ORDER_COOLDOWN_MS){
        // Cooldown chỉ áp dụng cho cùng thang + cùng nội dung công việc.
        // Không chặn hai Work Order khác nhau phát sinh liên tiếp trên cùng thang.
        const existingFingerprint = String(data?.issueFingerprint || "");
        if(existingFingerprint !== issueFingerprint) continue;

        const workOrderNo = data.workOrderNo || item.id;
        const remaining = Math.max(
          1,
          Math.ceil((WORK_ORDER_COOLDOWN_MS - age) / 60000)
        );

        throw new Error(
          `Phiếu công việc ${workOrderNo} vừa được tạo. ` +
          `Vui lòng chờ khoảng ${remaining} phút trước khi tạo lại Work Order tương tự cho cùng thang máy.`
        );
      }
    }
  }
}

function syncMaintenanceWorkOrderLink(
  transaction,
  maintenanceId,
  workOrderId,
  workOrderNo,
  status,
  maintenanceSnapshot
){
  if(!maintenanceId || !maintenanceSnapshot) return;

  const maintenanceRef = doc(
    db,
    COLLECTIONS.MAINTENANCE,
    maintenanceId
  );

  const snapshot = maintenanceSnapshot;

  if(!snapshot.exists()) return;

  const current = snapshot.data() || {};
  const currentIds = Array.isArray(current.workOrderIds)
    ? current.workOrderIds.map(String)
    : [];

  if(!currentIds.includes(String(workOrderId))){
    currentIds.push(String(workOrderId));
  }

  transaction.update(maintenanceRef, {
    workOrderIds: currentIds,
    workOrderCount: currentIds.length,
    latestWorkOrderId: String(workOrderId),
    latestWorkOrderNo: String(workOrderNo || ""),
    latestWorkOrderStatus: status || "draft",
    updatedAt: serverTimestamp()
  });
}

export async function getWorkOrder(workOrderId){
  requireValue(workOrderId, "workOrderId");

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.WORK_ORDERS, workOrderId)
  );

  if(!snapshot.exists()) return null;

  return {
    id:snapshot.id,
    ...snapshot.data()
  };
}

export async function getWorkOrders(options = {}){
  const technicianId = String(options?.technicianId || "").trim();

  const source = technicianId
    ? query(
        collection(db, COLLECTIONS.WORK_ORDERS),
        where("assignedTechnicianId", "==", technicianId)
      )
    : collection(db, COLLECTIONS.WORK_ORDERS);

  const snapshot = await getDocs(source);

  return snapshot.docs.map(item => ({
    id:item.id,
    ...item.data()
  }));
}

export async function getWorkOrdersByMaintenance(maintenanceId){
  requireValue(maintenanceId, "maintenanceId");

  const q = query(
    collection(db, COLLECTIONS.WORK_ORDERS),
    where("maintenanceId", "==", String(maintenanceId))
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => ({
    id:item.id,
    ...item.data()
  }));
}

export async function createWorkOrder(data){
  const sourceType = data.sourceType;
  const type = data.type;
  const priority = data.priority;
  const status = data.status;

  if(!WORK_ORDER_SOURCE_TYPES.includes(sourceType)){
    throw new Error("Nguồn Work Order không hợp lệ.");
  }

  if(!WORK_ORDER_TYPES.includes(type)){
    throw new Error("Loại công việc không hợp lệ.");
  }

  if(!WORK_ORDER_PRIORITIES.includes(priority)){
    throw new Error("Ưu tiên không hợp lệ.");
  }

  if(!WORK_ORDER_STATUSES.includes(status)){
    throw new Error("Trạng thái không hợp lệ.");
  }

  requireValue(data.customerId, "customerId");
  requireValue(data.buildingId, "buildingId");
  requireValue(data.elevatorId, "elevatorId");

  const issueTitle = String(data.issueTitle || "").trim();
  const problemDescription = String(data.problemDescription || "").trim();

  if(!issueTitle) throw new Error("Tiêu đề công việc là bắt buộc.");
  if(!problemDescription) throw new Error("Mô tả vấn đề là bắt buộc.");

  const technicianId = String(data.assignedTechnicianId || "").trim();
  const resolution = String(data.resolution || "").trim();

  const openedDate =
    data.openedDate || new Date().toISOString().slice(0,10);

  const completedDate =
    status === "completed"
      ? (data.completedDate || new Date().toISOString().slice(0,10))
      : (data.completedDate || "");

  validateWorkOrderState({
    sourceType,
    status,
    technicianId,
    resolution,
    completedDate,
    maintenanceId:data.maintenanceId
  });

  const references = await validateWorkOrderReferences(data);
  const maintenance = await validateWorkOrderMaintenance({
    ...data,
    sourceType,
    customerId:references.customer.id,
    buildingId:references.building.id,
    elevatorId:references.elevator.id
  });

  const maintenanceId = maintenance?.id || "";
  const maintenanceTicketNo =
    maintenance?.ticketNo || String(data.maintenanceTicketNo || "");

  const contractId =
    maintenance?.contractId ||
    String(data.contractId || "");

  const contractCode =
    maintenance?.contractCode ||
    String(data.contractCode || "");

  const customerName =
    references.customer.name ||
    String(data.customerName || "");

  const buildingName =
    references.building.name ||
    String(data.buildingName || "");

  const elevatorName =
    references.elevator.name ||
    String(data.elevatorName || "");

  const elevatorAssetCode =
    references.elevator.assetCode ||
    String(data.elevatorAssetCode || "");

  const issueFingerprint = buildWorkOrderIssueFingerprint({
    type,
    issueTitle,
    problemDescription
  });

  await assertWorkOrderCooldown(
    references.elevator.id,
    issueFingerprint
  );

  const workOrderId =
    `wo_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  const workOrderRef = doc(
    db,
    COLLECTIONS.WORK_ORDERS,
    workOrderId
  );

  const counterRef = doc(
    db,
    COLLECTIONS.SETTINGS,
    WORK_ORDER_COUNTER_ID
  );

  const maintenanceRef = maintenanceId
    ? doc(db, COLLECTIONS.MAINTENANCE, maintenanceId)
    : null;

  const saved = await runTransaction(db, async transaction => {
    // IMPORTANT: Firestore transaction requires reads before writes.
    const counterSnapshot = await transaction.get(counterRef);

    const maintenanceSnapshot = maintenanceRef
      ? await transaction.get(maintenanceRef)
      : null;

    const currentNumber = counterSnapshot.exists()
      ? Number(
          counterSnapshot.data().lastNumber ??
          counterSnapshot.data().value ??
          0
        )
      : 0;

    const nextNumber = currentNumber + 1;
    const workOrderNo =
      `WO-${String(nextNumber).padStart(6, "0")}`;

    const payload = {
      workOrderNo,

      sourceType,
      sourceNote:String(data.sourceNote || "").trim(),

      maintenanceId,
      maintenanceTicketNo,

      customerId:references.customer.id,
      customerName,

      buildingId:references.building.id,
      buildingName,

      elevatorId:references.elevator.id,
      elevatorName,
      elevatorAssetCode,

      contractId,
      contractCode,

      type,
      priority,
      status,

      issueTitle,
      problemDescription,

      assignedTechnicianId:technicianId,
      assignedTechnicianName:
        String(data.assignedTechnicianName || "").trim(),

      openedDate,
      dueDate:data.dueDate || "",
      completedDate,

      cause:String(data.cause || "").trim(),
      resolution,

      materials:Array.isArray(data.materials)
        ? data.materials
        : [],

      laborCost:Number(data.laborCost || 0) || 0,
      materialCost:Number(data.materialCost || 0) || 0,
      totalCost:Number(data.totalCost || 0) || 0,

      attachmentUrls:Array.isArray(data.attachmentUrls)
        ? data.attachmentUrls
        : [],

      note:String(data.note || "").trim(),

      issueFingerprint,

      createdByUid:String(data.createdByUid || ""),
      createdByName:String(data.createdByName || ""),

      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp(),

      completedAt:
        status === "completed"
          ? serverTimestamp()
          : null
    };

    // ---- ALL READS ARE ABOVE. WRITES START HERE. ----

    transaction.set(
      counterRef,
      {
        lastNumber:nextNumber,
        prefix:"WO-",
        updatedAt:serverTimestamp()
      },
      { merge:true }
    );

    transaction.set(workOrderRef, payload);

    if(maintenanceSnapshot?.exists()){
      syncMaintenanceWorkOrderLink(
        transaction,
        maintenanceId,
        workOrderId,
        workOrderNo,
        status,
        maintenanceSnapshot
      );
    }

    return {
      id:workOrderId,
      workOrderNo,
      payload
    };
  });

  return {
    id:saved.id,
    ...saved.payload,
    workOrderNo:saved.workOrderNo
  };
}

export async function updateWorkOrder(workOrderId, data){
  requireValue(workOrderId, "workOrderId");

  const existing = await getWorkOrder(workOrderId);

  if(!existing){
    throw new Error("Không tìm thấy phiếu công việc.");
  }

  const sourceType =
    data.sourceType ??
    existing.sourceType ??
    "OTHER";

  const type =
    data.type ??
    existing.type ??
    "REPAIR";

  const priority =
    data.priority ??
    existing.priority ??
    "normal";

  const status =
    data.status ??
    existing.status ??
    "draft";

  if(!WORK_ORDER_SOURCE_TYPES.includes(sourceType)){
    throw new Error("Nguồn Work Order không hợp lệ.");
  }

  if(!WORK_ORDER_TYPES.includes(type)){
    throw new Error("Loại công việc không hợp lệ.");
  }

  if(!WORK_ORDER_PRIORITIES.includes(priority)){
    throw new Error("Ưu tiên không hợp lệ.");
  }

  if(!WORK_ORDER_STATUSES.includes(status)){
    throw new Error("Trạng thái không hợp lệ.");
  }

  const customerId =
    data.customerId ??
    existing.customerId ??
    "";

  const buildingId =
    data.buildingId ??
    existing.buildingId ??
    "";

  const elevatorId =
    data.elevatorId ??
    existing.elevatorId ??
    "";

  const maintenanceId =
    data.maintenanceId ??
    existing.maintenanceId ??
    "";

  const contractId =
    data.contractId ??
    existing.contractId ??
    "";

  const issueTitle = String(
    data.issueTitle ??
    existing.issueTitle ??
    ""
  ).trim();

  const problemDescription = String(
    data.problemDescription ??
    existing.problemDescription ??
    ""
  ).trim();

  if(!issueTitle) throw new Error("Tiêu đề công việc là bắt buộc.");
  if(!problemDescription) throw new Error("Mô tả vấn đề là bắt buộc.");

  const technicianId = String(
    data.assignedTechnicianId ??
    existing.assignedTechnicianId ??
    ""
  ).trim();

  const completedDate =
    status === "completed"
      ? (
          data.completedDate ||
          existing.completedDate ||
          new Date().toISOString().slice(0,10)
        )
      : (
          data.completedDate ??
          existing.completedDate ??
          ""
        );

  const resolution = String(
    data.resolution ??
    existing.resolution ??
    ""
  ).trim();

  validateWorkOrderState({
    sourceType,
    status,
    technicianId,
    resolution,
    completedDate,
    existingStatus:existing.status,
    maintenanceId
  });

  const references = await validateWorkOrderReferences({
    customerId,
    buildingId,
    elevatorId
  });

  const maintenance = await validateWorkOrderMaintenance({
    sourceType,
    maintenanceId,
    customerId,
    buildingId,
    elevatorId
  });

  const maintenanceTicketNo =
    maintenance?.ticketNo ??
    data.maintenanceTicketNo ??
    existing.maintenanceTicketNo ??
    "";

  const finalContractId =
    maintenance?.contractId ||
    contractId ||
    "";

  const finalContractCode =
    maintenance?.contractCode ||
    data.contractCode ||
    existing.contractCode ||
    "";

  const issueFingerprint = buildWorkOrderIssueFingerprint({
    type,
    issueTitle,
    problemDescription
  });

  await assertWorkOrderCooldown(
    elevatorId,
    issueFingerprint,
    workOrderId
  );

  const workOrderRef = doc(
    db,
    COLLECTIONS.WORK_ORDERS,
    workOrderId
  );

  const maintenanceRef = maintenanceId
    ? doc(db, COLLECTIONS.MAINTENANCE, maintenanceId)
    : null;

  await runTransaction(db, async transaction => {
    // IMPORTANT: read first, then write.
    const currentSnapshot =
      await transaction.get(workOrderRef);

    if(!currentSnapshot.exists()){
      throw new Error("Work Order không còn tồn tại.");
    }

    const current = currentSnapshot.data() || {};

    const maintenanceSnapshot = maintenanceRef
      ? await transaction.get(maintenanceRef)
      : null;

    if(
      current.status === "completed" &&
      status !== "completed"
    ){
      throw new Error(
        "Work Order đã hoàn thành và không được chuyển ngược trạng thái."
      );
    }

    const payload = {
      sourceType,
      sourceNote:String(
        data.sourceNote ??
        existing.sourceNote ??
        ""
      ).trim(),

      maintenanceId,
      maintenanceTicketNo,

      customerId:references.customer.id,
      customerName:
        references.customer.name ||
        data.customerName ||
        existing.customerName ||
        "",

      buildingId:references.building.id,
      buildingName:
        references.building.name ||
        data.buildingName ||
        existing.buildingName ||
        "",

      elevatorId:references.elevator.id,
      elevatorName:
        references.elevator.name ||
        data.elevatorName ||
        existing.elevatorName ||
        "",
      elevatorAssetCode:
        references.elevator.assetCode ||
        data.elevatorAssetCode ||
        existing.elevatorAssetCode ||
        "",

      contractId:finalContractId,
      contractCode:finalContractCode,

      type,
      priority,
      status,

      issueTitle,
      problemDescription,

      assignedTechnicianId:technicianId,
      assignedTechnicianName:String(
        data.assignedTechnicianName ??
        existing.assignedTechnicianName ??
        ""
      ).trim(),

      openedDate:
        data.openedDate ??
        existing.openedDate ??
        "",

      dueDate:
        data.dueDate ??
        existing.dueDate ??
        "",

      completedDate,

      cause:String(
        data.cause ??
        existing.cause ??
        ""
      ).trim(),

      resolution,

      materials:
        Array.isArray(data.materials)
          ? data.materials
          : (Array.isArray(existing.materials)
              ? existing.materials
              : []),

      laborCost:
        Number(
          data.laborCost ??
          existing.laborCost ??
          0
        ) || 0,

      materialCost:
        Number(
          data.materialCost ??
          existing.materialCost ??
          0
        ) || 0,

      totalCost:
        Number(
          data.totalCost ??
          existing.totalCost ??
          0
        ) || 0,

      attachmentUrls:
        Array.isArray(data.attachmentUrls)
          ? data.attachmentUrls
          : (Array.isArray(existing.attachmentUrls)
              ? existing.attachmentUrls
              : []),

      note:String(
        data.note ??
        existing.note ??
        ""
      ).trim(),

      issueFingerprint,

      updatedAt:serverTimestamp(),

      completedAt:
        status === "completed"
          ? (current.completedAt || serverTimestamp())
          : null
    };

    // ---- ALL READS ARE ABOVE. WRITES START HERE. ----

    transaction.update(workOrderRef, payload);

    if(maintenanceSnapshot?.exists()){
      syncMaintenanceWorkOrderLink(
        transaction,
        maintenanceId,
        workOrderId,
        current.workOrderNo || "",
        status,
        maintenanceSnapshot
      );
    }
  });

  return getWorkOrder(workOrderId);
}

export async function reportWorkOrderByTechnician(workOrderId, status) {
  requireValue(workOrderId, "workOrderId");

  if(!["in_progress", "completed"].includes(status)){
    throw new Error("Trạng thái báo cáo KTV không hợp lệ.");
  }

  const workOrderRef = doc(
    db,
    COLLECTIONS.WORK_ORDERS,
    workOrderId
  );

  const snapshot = await getDoc(workOrderRef);
  if(!snapshot.exists()){
    throw new Error("Không tìm thấy Work Order.");
  }

  const existing = snapshot.data() || {};

  const isCompleted = status === "completed";
  const today = new Date().toISOString().slice(0,10);

  const payload = {
    status,
    completedDate: isCompleted ? (existing.completedDate || today) : "",
    resolution: isCompleted
      ? (existing.resolution || "KTV báo cáo đã hoàn thành")
      : "",
    completedAt: isCompleted
      ? (existing.completedAt || serverTimestamp())
      : null,
    updatedAt: serverTimestamp()
  };

  await updateDoc(workOrderRef, payload);

  return {
    id: workOrderId,
    ...existing,
    ...payload
  };
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
