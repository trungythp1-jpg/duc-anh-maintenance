/*
 * ĐỨC ANH MAINTENANCE
 * MODULE 5 — KPI DATA LAYER V4
 *
 * NGUYÊN TẮC KHÓA:
 * - Không sửa schema Work Order.
 * - KPI lấy Work Order + Maintenance làm nguồn dữ liệu.
 * - Không dùng localStorage.
 * - Work Order cancelled không tính.
 * - Kỳ KPI của Work Order dùng openedDate.
 * - completedDate dùng cho hoàn thành/đúng hạn.
 * - dueDate dùng cho quá hạn/đúng hạn.
 * - KPI không chấm điểm/xếp hạng nhân sự.
 * - Work Order V2 dùng sourceType; không dùng field source cũ.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../core/firebase.js";

const WORK_ORDERS_COLLECTION = "workOrders";
const MAINTENANCE_COLLECTION = "maintenance";
const KPI_COLLECTION = "kpi";

const VALID_STATUSES = new Set([
  "draft",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "cancelled"
]);

const VALID_SOURCE_TYPES = new Set([
  "MAINTENANCE",
  "CUSTOMER_REPORT",
  "INCIDENT",
  "SALES",
  "MANAGEMENT",
  "OTHER"
]);

function requireValue(value, fieldName) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${fieldName} là bắt buộc.`);
  }
}

function normalizeDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const d = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  if (value?.toDate instanceof Function) {
    const d = value.toDate();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (value instanceof Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

function dateToKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function daysBetween(start, end) {
  const a = normalizeDate(start);
  const b = normalizeDate(end);
  if (!a || !b) return null;
  return Math.max(0, (b.getTime() - a.getTime()) / 86400000);
}

function isWithinPeriod(value, startDate, endDate) {
  const d = normalizeDate(value);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  return !!d && !!start && !!end && d >= start && d <= end;
}

function round(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return 0;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function normalizeWorkOrder(item) {
  const sourceType = VALID_SOURCE_TYPES.has(String(item.sourceType || "").toUpperCase())
    ? String(item.sourceType).toUpperCase()
    : "OTHER";

  return {
    id: item.id,
    workOrderNo: item.workOrderNo || "",
    sourceType,
    sourceNote: item.sourceNote || "",
    assignedTechnicianId: item.assignedTechnicianId || "",
    assignedTechnicianName: item.assignedTechnicianName || "",
    status: VALID_STATUSES.has(item.status) ? item.status : "draft",
    openedDate: item.openedDate || "",
    dueDate: item.dueDate || "",
    completedDate: item.completedDate || "",
    completedAt: item.completedAt || null,
    laborCost: Number(item.laborCost || 0) || 0,
    materialCost: Number(item.materialCost || 0) || 0,
    totalCost: Number(item.totalCost || 0) || 0,
    customerId: item.customerId || "",
    customerName: item.customerName || "",
    buildingId: item.buildingId || "",
    buildingName: item.buildingName || "",
    elevatorId: item.elevatorId || "",
    elevatorName: item.elevatorName || "",
    elevatorAssetCode: item.elevatorAssetCode || "",
    contractId: item.contractId || "",
    contractCode: item.contractCode || "",
    maintenanceId: item.maintenanceId || "",
    maintenanceTicketNo: item.maintenanceTicketNo || "",
    issueTitle: item.issueTitle || "",
    problemDescription: item.problemDescription || "",
    resolution: item.resolution || ""
  };
}

export async function getAllWorkOrdersForKpi() {
  const snapshot = await getDocs(collection(db, WORK_ORDERS_COLLECTION));
  return snapshot.docs.map(item =>
    normalizeWorkOrder({ id: item.id, ...item.data() })
  );
}

export async function getWorkOrdersForTechnician(technicianId) {
  requireValue(technicianId, "technicianId");

  const q = query(
    collection(db, WORK_ORDERS_COLLECTION),
    where("assignedTechnicianId", "==", technicianId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(item =>
    normalizeWorkOrder({ id: item.id, ...item.data() })
  );
}

function normalizeMaintenance(item) {
  return {
    id: item.id,
    ticketNo: item.ticketNo || "",
    technicianId: item.technicianId || "",
    technicianName: item.technicianName || "",
    scheduledDate: item.scheduledDate || "",
    completedDate: item.completedDate || "",
    status: item.status || "draft",
    customerId: item.customerId || "",
    customerName: item.customerName || "",
    buildingId: item.buildingId || "",
    buildingName: item.buildingName || "",
    elevatorId: item.elevatorId || "",
    elevatorName: item.elevatorName || "",
    elevatorAssetCode: item.elevatorAssetCode || "",
    contractId: item.contractId || "",
    contractCode: item.contractCode || "",
    periodNumber: Number(item.periodNumber || 0) || null,
    issueFound: Boolean(item.issueFound),
    result: item.result || "",
    note: item.note || ""
  };
}

export async function getAllMaintenancesForKpi() {
  const snapshot = await getDocs(collection(db, MAINTENANCE_COLLECTION));
  return snapshot.docs.map(item =>
    normalizeMaintenance({ id: item.id, ...item.data() })
  );
}

export async function getMaintenancesForTechnician(technicianId) {
  requireValue(technicianId, "technicianId");

  const q = query(
    collection(db, MAINTENANCE_COLLECTION),
    where("technicianId", "==", technicianId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(item =>
    normalizeMaintenance({ id: item.id, ...item.data() })
  );
}

function calculateMaintenanceKpi({
  technicianId,
  technicianName = "",
  periodId,
  startDate,
  endDate,
  maintenances = [],
  asOfDate = new Date()
}) {
  requireValue(technicianId, "technicianId");
  requireValue(periodId, "periodId");
  requireValue(startDate, "startDate");
  requireValue(endDate, "endDate");

  const periodStart = normalizeDate(startDate);
  const periodEnd = normalizeDate(endDate);
  const asOf = normalizeDate(asOfDate) || new Date();

  const source = maintenances
    .map(normalizeMaintenance)
    .filter(m => m.technicianId === String(technicianId))
    .filter(m => m.status !== "cancelled")
    .filter(m => isWithinPeriod(m.scheduledDate, periodStart, periodEnd));

  let completed = 0;
  let active = 0;
  let overdue = 0;
  let completedOnTime = 0;
  let completedLate = 0;

  const rows = source.map(m => {
    const scheduled = normalizeDate(m.scheduledDate);
    const completedDate = normalizeDate(m.completedDate);
    const isCompleted = m.status === "completed" && !!completedDate;
    const isCompletedOnTime =
      isCompleted && !!scheduled && completedDate <= scheduled;
    const isCompletedLate =
      isCompleted && !!scheduled && completedDate > scheduled;
    const isOverdue =
      !isCompleted && !!scheduled && scheduled < asOf;

    if (isCompleted) completed += 1;
    else active += 1;
    if (isOverdue) overdue += 1;
    if (isCompletedOnTime) completedOnTime += 1;
    if (isCompletedLate) completedLate += 1;

    return {
      id: m.id,
      ticketNo: m.ticketNo,
      technicianId: m.technicianId,
      technicianName: m.technicianName,
      scheduledDate: m.scheduledDate,
      completedDate: m.completedDate,
      status: m.status,
      isOverdue,
      isCompletedOnTime,
      isCompletedLate,
      customerName: m.customerName,
      buildingName: m.buildingName,
      elevatorName: m.elevatorName,
      elevatorAssetCode: m.elevatorAssetCode,
      contractCode: m.contractCode,
      issueFound: m.issueFound,
      result: m.result
    };
  });

  const planned = source.length;

  return {
    technicianId: String(technicianId),
    technicianName,
    periodId: String(periodId),
    startDate: dateToKey(periodStart),
    endDate: dateToKey(periodEnd),
    plannedMaintenance: planned,
    completedMaintenance: completed,
    activeMaintenance: active,
    remainingMaintenance: Math.max(0, planned - completed),
    overdueMaintenance: overdue,
    completedMaintenanceOnTime: completedOnTime,
    completedMaintenanceLate: completedLate,
    maintenanceCompletionRate: round(planned ? completed / planned * 100 : 0),
    maintenanceOnTimeRate: round(completed ? completedOnTime / completed * 100 : 0),
    maintenanceIds: rows.map(row => row.id),
    maintenanceRows: rows
  };
}

export function calculateTechnicianKpi({
  technicianId,
  technicianName = "",
  periodId,
  startDate,
  endDate,
  workOrders = [],
  asOfDate = new Date()
}) {
  requireValue(technicianId, "technicianId");
  requireValue(periodId, "periodId");
  requireValue(startDate, "startDate");
  requireValue(endDate, "endDate");

  const periodStart = normalizeDate(startDate);
  const periodEnd = normalizeDate(endDate);
  const asOf = normalizeDate(asOfDate) || new Date();

  if (!periodStart || !periodEnd) {
    throw new Error("Khoảng thời gian KPI không hợp lệ.");
  }
  if (periodStart > periodEnd) {
    throw new Error("startDate không được lớn hơn endDate.");
  }

  const source = workOrders
    .map(normalizeWorkOrder)
    .filter(wo => wo.assignedTechnicianId === String(technicianId))
    .filter(wo => wo.status !== "cancelled")
    .filter(wo => isWithinPeriod(wo.openedDate, periodStart, periodEnd));

  let completed = 0;
  let active = 0;
  let overdue = 0;
  let completedOnTime = 0;
  let completedLate = 0;
  let processingDaysTotal = 0;
  let processingDaysCount = 0;
  let laborCost = 0;
  let materialCost = 0;
  let totalCost = 0;

  const rows = source.map(wo => {
    const opened = normalizeDate(wo.openedDate);
    const due = normalizeDate(wo.dueDate);
    const completedDate = normalizeDate(wo.completedDate);

    const isCompleted = wo.status === "completed";
    const isCompletedOnTime =
      isCompleted && !!due && !!completedDate && completedDate <= due;
    const isCompletedLate =
      isCompleted && !!due && !!completedDate && completedDate > due;
    const isOverdue =
      !isCompleted && !!due && due < asOf;

    let processingDays = null;
    if (opened && completedDate) {
      processingDays = daysBetween(opened, completedDate);
      if (processingDays !== null) {
        processingDaysTotal += processingDays;
        processingDaysCount += 1;
      }
    }

    if (isCompleted) completed += 1;
    else active += 1;
    if (isOverdue) overdue += 1;
    if (isCompletedOnTime) completedOnTime += 1;
    if (isCompletedLate) completedLate += 1;

    laborCost += wo.laborCost;
    materialCost += wo.materialCost;
    totalCost += wo.totalCost;

    return {
      id: wo.id,
      workOrderNo: wo.workOrderNo,
      sourceType: wo.sourceType,
      sourceNote: wo.sourceNote,
      maintenanceId: wo.maintenanceId,
      maintenanceTicketNo: wo.maintenanceTicketNo,
      status: wo.status,
      openedDate: wo.openedDate,
      dueDate: wo.dueDate,
      completedDate: wo.completedDate,
      isOverdue,
      isCompletedOnTime,
      isCompletedLate,
      processingDays,
      customerName: wo.customerName,
      buildingName: wo.buildingName,
      elevatorName: wo.elevatorName,
      elevatorAssetCode: wo.elevatorAssetCode
    };
  });

  const total = source.length;

  return {
    technicianId: String(technicianId),
    technicianName: technicianName || source[0]?.assignedTechnicianName || "",
    periodId: String(periodId),
    startDate: dateToKey(periodStart),
    endDate: dateToKey(periodEnd),
    calculatedAt: new Date().toISOString(),
    totalWorkOrders: total,
    completedWorkOrders: completed,
    activeWorkOrders: active,
    overdueWorkOrders: overdue,
    completedOnTime,
    completedLate,
    completionRate: round(total ? completed / total * 100 : 0),
    onTimeRate: round(completed ? completedOnTime / completed * 100 : 0),
    averageProcessingDays: processingDaysCount
      ? round(processingDaysTotal / processingDaysCount)
      : 0,
    totalLaborCost: round(laborCost),
    totalMaterialCost: round(materialCost),
    totalCost: round(totalCost),
    workOrderIds: rows.map(row => row.id),
    rows
  };
}

function getWorkOrderOrigin(workOrder) {
  const sourceType = String(workOrder?.sourceType || "OTHER").toUpperCase();

  if (sourceType === "MAINTENANCE" || workOrder?.maintenanceId) {
    return {
      type: "maintenance",
      sourceType,
      label: "Phát sinh từ bảo trì"
    };
  }

  const labels = {
    CUSTOMER_REPORT: "Khách hàng báo",
    INCIDENT: "Sự cố",
    SALES: "Kinh doanh",
    MANAGEMENT: "Quản lý",
    OTHER: "Khác"
  };

  return {
    type: "other",
    sourceType,
    label: labels[sourceType] || "Khác"
  };
}

export function calculateTechnicianKpiV2({
  technicianId,
  technicianName = "",
  periodId,
  startDate,
  endDate,
  maintenances = [],
  workOrders = [],
  asOfDate = new Date()
}) {
  const maintenance = calculateMaintenanceKpi({
    technicianId,
    technicianName,
    periodId,
    startDate,
    endDate,
    maintenances,
    asOfDate
  });

  const workOrder = calculateTechnicianKpi({
    technicianId,
    technicianName,
    periodId,
    startDate,
    endDate,
    workOrders,
    asOfDate
  });

  const maintenanceIdSet = new Set(maintenance.maintenanceIds);

  const workOrderOriginRows = workOrder.rows.map(row => {
    const source = workOrders.find(item =>
      String(item.id) === String(row.id)
    );

    const origin = getWorkOrderOrigin(source || row);

    return {
      ...row,
      sourceType: origin.sourceType,
      originType: origin.type,
      originLabel: origin.label
    };
  });

  const relatedWorkOrders = workOrderOriginRows.filter(row =>
    row.maintenanceId &&
    maintenanceIdSet.has(String(row.maintenanceId))
  );

  const maintenanceWithWorkOrderIds = new Set(
    relatedWorkOrders
      .map(row => String(row.maintenanceId || ""))
      .filter(Boolean)
  );

  const bySourceType = {};
  for (const row of workOrderOriginRows) {
    bySourceType[row.sourceType] =
      (bySourceType[row.sourceType] || 0) + 1;
  }

  return {
    technicianId: String(technicianId),
    technicianName: technicianName || "",
    periodId: String(periodId),
    startDate: maintenance.startDate,
    endDate: maintenance.endDate,
    maintenance,
    workOrder,
    workOrdersFromMaintenance: relatedWorkOrders.length,
    workOrdersFromOtherSource: Math.max(
      0,
      workOrderOriginRows.length - relatedWorkOrders.length
    ),
    workOrdersBySourceType: bySourceType,
    maintenanceWithWorkOrder: maintenanceWithWorkOrderIds.size,
    maintenanceWithoutWorkOrder: Math.max(
      0,
      maintenance.plannedMaintenance - maintenanceWithWorkOrderIds.size
    ),
    workOrderGenerationRate: maintenance.completedMaintenance > 0
      ? round(
          relatedWorkOrders.length /
          maintenance.completedMaintenance *
          100
        )
      : 0,
    workOrderOriginRows
  };
}

function makeKpiDocumentId(periodId, technicianId) {
  return `${String(periodId)}__${String(technicianId)}`
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function getKpiSnapshot(periodId, technicianId) {
  requireValue(periodId, "periodId");
  requireValue(technicianId, "technicianId");

  const id = makeKpiDocumentId(periodId, technicianId);
  const snapshot = await getDoc(doc(db, KPI_COLLECTION, id));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function saveKpiSnapshot(kpi) {
  requireValue(kpi?.periodId, "periodId");
  requireValue(kpi?.technicianId, "technicianId");

  const id = makeKpiDocumentId(kpi.periodId, kpi.technicianId);

  const payload = {
    ...kpi,
    id: undefined,
    updatedAt: serverTimestamp()
  };

  delete payload.id;

  await setDoc(
    doc(db, KPI_COLLECTION, id),
    payload,
    { merge: true }
  );

  return getKpiSnapshot(kpi.periodId, kpi.technicianId);
}

export function createMonthlyPeriod(year, month) {
  const y = Number(year);
  const m = Number(month);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error("Năm/tháng không hợp lệ.");
  }

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);

  return {
    periodId: `${y}-${String(m).padStart(2, "0")}`,
    startDate: dateToKey(start),
    endDate: dateToKey(end),
    label: `Tháng ${m}/${y}`
  };
}

export function createQuarterPeriod(year, quarter) {
  const y = Number(year);
  const q = Number(quarter);

  if (!Number.isInteger(y) || !Number.isInteger(q) || q < 1 || q > 4) {
    throw new Error("Năm/quý không hợp lệ.");
  }

  const startMonth = (q - 1) * 3;
  const start = new Date(y, startMonth, 1);
  const end = new Date(y, startMonth + 3, 0);

  return {
    periodId: `${y}-Q${q}`,
    startDate: dateToKey(start),
    endDate: dateToKey(end),
    label: `Quý ${q}/${y}`
  };
}
