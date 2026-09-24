/*
 * ĐỨC ANH MAINTENANCE
 * MODULE 5 — KPI DATA LAYER V1
 *
 * NGUYÊN TẮC KHÓA:
 * - Không sửa schema Work Order hiện tại.
 * - KPI lấy Work Order làm nguồn dữ liệu vận hành chính.
 * - Không tính trực tiếp từ localStorage.
 * - Không xóa dữ liệu KPI.
 * - KPI theo kỹ thuật viên dùng assignedTechnicianId.
 * - Work Order cancelled không tính vào khối lượng KPI.
 * - Kỳ KPI được xác định bằng openedDate.
 * - completedDate dùng để xác định hoàn thành và đúng hạn.
 * - dueDate dùng để xác định quá hạn/đúng hạn.
 *
 * KPI V1:
 * 1. totalWorkOrders       — Tổng WO hợp lệ trong kỳ
 * 2. completedWorkOrders   — WO đã hoàn thành
 * 3. activeWorkOrders      — WO chưa hoàn thành
 * 4. overdueWorkOrders     — WO quá hạn tại thời điểm tính
 * 5. completedOnTime       — WO hoàn thành không muộn hạn
 * 6. completedLate        — WO hoàn thành sau hạn
 * 7. completionRate       — Tỷ lệ hoàn thành
 * 8. onTimeRate           — Tỷ lệ đúng hạn trên WO đã hoàn thành
 * 9. averageProcessingDays— Thời gian xử lý trung bình
 * 10. totalLaborCost       — Tổng chi phí nhân công của WO
 * 11. totalMaterialCost    — Tổng chi phí vật tư của WO
 * 12. totalCost            — Tổng chi phí WO
 *
 * LƯU Ý:
 * - Không chấm điểm hay xếp hạng kỹ thuật viên ở V1.
 * - KPI V1 là số liệu vận hành, không phải đánh giá nhân sự tự động.
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
const KPI_COLLECTION = "kpi";

const VALID_STATUSES = new Set([
  "draft",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "cancelled"
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
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(start, end) {
  const a = normalizeDate(start);
  const b = normalizeDate(end);
  if (!a || !b) return null;

  const diff = b.getTime() - a.getTime();
  return Math.max(0, diff / 86400000);
}

function isWithinPeriod(value, startDate, endDate) {
  const d = normalizeDate(value);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!d || !start || !end) return false;
  return d >= start && d <= end;
}

function round(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return 0;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function normalizeWorkOrder(workOrder) {
  return {
    id: workOrder.id,
    workOrderNo: workOrder.workOrderNo || "",
    assignedTechnicianId: workOrder.assignedTechnicianId || "",
    assignedTechnicianName: workOrder.assignedTechnicianName || "",
    status: VALID_STATUSES.has(workOrder.status)
      ? workOrder.status
      : "draft",
    openedDate: workOrder.openedDate || "",
    dueDate: workOrder.dueDate || "",
    completedDate: workOrder.completedDate || "",
    laborCost: Number(workOrder.laborCost || 0) || 0,
    materialCost: Number(workOrder.materialCost || 0) || 0,
    totalCost: Number(workOrder.totalCost || 0) || 0,
    customerId: workOrder.customerId || "",
    customerName: workOrder.customerName || "",
    buildingId: workOrder.buildingId || "",
    buildingName: workOrder.buildingName || "",
    elevatorId: workOrder.elevatorId || "",
    elevatorName: workOrder.elevatorName || "",
    elevatorAssetCode: workOrder.elevatorAssetCode || "",
    maintenanceId: workOrder.maintenanceId || "",
    source: workOrder.source || ""
  };
}

/* =========================================================
   WORK ORDERS — READ
========================================================= */

export async function getAllWorkOrdersForKpi() {
  const snapshot = await getDocs(
    collection(db, WORK_ORDERS_COLLECTION)
  );

  return snapshot.docs.map(item =>
    normalizeWorkOrder({
      id: item.id,
      ...item.data()
    })
  );
}

/*
 * TECHNICIAN SCOPE
 *
 * Firestore rules hiện tại yêu cầu technician query theo:
 * assignedTechnicianId == technicianIdFromUser().
 * Vì vậy hàm này dùng đúng field scope.
 */
export async function getWorkOrdersForTechnician(technicianId) {
  requireValue(technicianId, "technicianId");

  const q = query(
    collection(db, WORK_ORDERS_COLLECTION),
    where("assignedTechnicianId", "==", technicianId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(item =>
    normalizeWorkOrder({
      id: item.id,
      ...item.data()
    })
  );
}


/* =========================================================
   MAINTENANCE — READ / KPI
========================================================= */

const MAINTENANCE_COLLECTION = "maintenance";

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
  const snapshot = await getDocs(
    collection(db, MAINTENANCE_COLLECTION)
  );

  return snapshot.docs.map(item =>
    normalizeMaintenance({
      id: item.id,
      ...item.data()
    })
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
    normalizeMaintenance({
      id: item.id,
      ...item.data()
    })
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
  const completionRate = planned > 0 ? (completed / planned) * 100 : 0;
  const onTimeRate = completed > 0 ? (completedOnTime / completed) * 100 : 0;

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
    maintenanceCompletionRate: round(completionRate),
    maintenanceOnTimeRate: round(onTimeRate),

    maintenanceIds: rows.map(row => row.id),
    maintenanceRows: rows
  };
}

/* =========================================================
   KPI CALCULATION
========================================================= */

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
      isCompleted &&
      !!due &&
      !!completedDate &&
      completedDate <= due;

    const isCompletedLate =
      isCompleted &&
      !!due &&
      !!completedDate &&
      completedDate > due;

    const isOverdue =
      !isCompleted &&
      !!due &&
      due < asOf;

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
  const completionRate = total > 0
    ? (completed / total) * 100
    : 0;

  const onTimeRate = completed > 0
    ? (completedOnTime / completed) * 100
    : 0;

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

    completionRate: round(completionRate),
    onTimeRate: round(onTimeRate),
    averageProcessingDays: processingDaysCount > 0
      ? round(processingDaysTotal / processingDaysCount)
      : 0,

    totalLaborCost: round(laborCost),
    totalMaterialCost: round(materialCost),
    totalCost: round(totalCost),

    workOrderIds: rows.map(row => row.id),
    rows
  };
}


/* =========================================================
   WORK ORDER ORIGIN — KPI V3
   Không thay đổi schema. Đọc field source hiện có.
========================================================= */

function normalizeWorkOrderSource(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "other";

  if (
    raw === "maintenance" ||
    raw === "maintenance_report" ||
    raw === "bao_tri" ||
    raw === "bảo trì" ||
    raw === "from_maintenance"
  ) {
    return "maintenance";
  }

  if (
    raw === "admin" ||
    raw === "administrator" ||
    raw === "management" ||
    raw === "manager" ||
    raw === "external" ||
    raw === "customer" ||
    raw === "hotline" ||
    raw === "zalo" ||
    raw === "phone" ||
    raw === "other_source"
  ) {
    return "external";
  }

  return "other";
}

function getWorkOrderOrigin(workOrder) {
  const normalized = normalizeWorkOrderSource(workOrder.source);

  if (normalized === "maintenance") {
    return {
      type: "maintenance",
      label: "Phát sinh từ bảo trì"
    };
  }

  if (workOrder.maintenanceId) {
    return {
      type: "maintenance",
      label: "Phát sinh từ bảo trì"
    };
  }

  if (normalized === "external") {
    return {
      type: "external",
      label: "Nguồn khác / Admin tạo"
    };
  }

  return {
    type: "other",
    label: "Nguồn khác"
  };
}

/* =========================================================
   COMBINED KPI V2
   Maintenance = workload chính
   Work Order = workload phát sinh/đi kèm
========================================================= */

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

  let maintenanceSourceCount = 0;
  let externalSourceCount = 0;
  let otherSourceCount = 0;

  const workOrderOriginRows = workOrder.rows.map(row => {
    const source = workOrders.find(item =>
      String(item.id) === String(row.id)
    );

    const origin = getWorkOrderOrigin(source || row);

    if (origin.type === "maintenance") maintenanceSourceCount += 1;
    else if (origin.type === "external") externalSourceCount += 1;
    else otherSourceCount += 1;

    return {
      ...row,
      source: source?.source || "",
      maintenanceId: source?.maintenanceId || "",
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

  /*
   * Lưu ý:
   * - maintenanceSourceCount = WO có nguồn/quan hệ từ bảo trì.
   * - externalSourceCount = WO do nguồn khác đưa vào để Admin tiếp nhận/tạo/phân công.
   * - Không cộng các loại này vào "tổng workload bảo trì".
   * - Tất cả vẫn thuộc tổng Work Order vận hành của KTV.
   */
  return {
    technicianId: String(technicianId),
    technicianName: technicianName || "",
    periodId: String(periodId),
    startDate: maintenance.startDate,
    endDate: maintenance.endDate,

    maintenance,
    workOrder,

    workOrdersFromMaintenance: relatedWorkOrders.length,
    workOrdersFromExternalSource: externalSourceCount,
    workOrdersFromOtherSource: otherSourceCount,

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

/* =========================================================
   KPI SNAPSHOT
========================================================= */

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

/*
 * Chỉ ADMIN / MANAGER nên gọi hàm này.
 * Firestore rules đã khóa create/update collection kpi.
 */
export async function saveKpiSnapshot(kpi) {
  requireValue(kpi?.periodId, "periodId");
  requireValue(kpi?.technicianId, "technicianId");

  const id = makeKpiDocumentId(
    kpi.periodId,
    kpi.technicianId
  );

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

/* =========================================================
   PERIOD HELPERS
========================================================= */

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
