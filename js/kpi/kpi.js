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

import { db } from "./firebase.js";

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
    elevatorAssetCode: workOrder.elevatorAssetCode || ""
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
