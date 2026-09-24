/* ĐỨC ANH MAINTENANCE — MODULE 5 KPI DATA LAYER V1 */
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./core/firebase.js";

const WORK_ORDERS_COLLECTION = "workOrders";
const KPI_COLLECTION = "kpi";

const VALID_STATUSES = new Set([
  "draft","assigned","in_progress","waiting_parts","completed","cancelled"
]);

function requireValue(value, fieldName) {
  if (!value || String(value).trim() === "") throw new Error(`${fieldName} là bắt buộc.`);
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      d.setHours(0,0,0,0); return d;
    }
  }
  if (value?.toDate instanceof Function) {
    const d = value.toDate(); d.setHours(0,0,0,0); return d;
  }
  if (value instanceof Date) {
    const d = new Date(value); d.setHours(0,0,0,0); return d;
  }
  return null;
}

function dateToKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function daysBetween(start,end) {
  const a=normalizeDate(start), b=normalizeDate(end);
  if(!a||!b) return null;
  return Math.max(0,(b.getTime()-a.getTime())/86400000);
}

function isWithinPeriod(value,startDate,endDate) {
  const d=normalizeDate(value), start=normalizeDate(startDate), end=normalizeDate(endDate);
  return !!(d&&start&&end&&d>=start&&d<=end);
}

function round(value,digits=2) {
  if(!Number.isFinite(Number(value))) return 0;
  const factor=10**digits;
  return Math.round(Number(value)*factor)/factor;
}

function normalizeWorkOrder(workOrder) {
  return {
    id:workOrder.id,
    workOrderNo:workOrder.workOrderNo||"",
    assignedTechnicianId:workOrder.assignedTechnicianId||"",
    assignedTechnicianName:workOrder.assignedTechnicianName||"",
    status:VALID_STATUSES.has(workOrder.status)?workOrder.status:"draft",
    openedDate:workOrder.openedDate||"",
    dueDate:workOrder.dueDate||"",
    completedDate:workOrder.completedDate||"",
    customerId:workOrder.customerId||"",
    customerName:workOrder.customerName||"",
    buildingId:workOrder.buildingId||"",
    buildingName:workOrder.buildingName||"",
    elevatorId:workOrder.elevatorId||"",
    elevatorName:workOrder.elevatorName||"",
    elevatorAssetCode:workOrder.elevatorAssetCode||"",
    maintenanceId:workOrder.maintenanceId||"",
    maintenanceTicketNo:workOrder.maintenanceTicketNo||"",
    contractId:workOrder.contractId||"",
    contractCode:workOrder.contractCode||"",
    periodNumber:workOrder.periodNumber||null,
    laborCost:Number(workOrder.laborCost)||0,
    materialCost:Number(workOrder.materialCost)||0,
    totalCost:Number(workOrder.totalCost)||0
  };
}

export async function getAllWorkOrdersForKpi() {
  const snapshot=await getDocs(collection(db,WORK_ORDERS_COLLECTION));
  return snapshot.docs.map(item=>normalizeWorkOrder({id:item.id,...item.data()}));
}

export async function getWorkOrdersForTechnician(technicianId) {
  requireValue(technicianId,"technicianId");
  const q=query(
    collection(db,WORK_ORDERS_COLLECTION),
    where("assignedTechnicianId","==",technicianId)
  );
  const snapshot=await getDocs(q);
  return snapshot.docs.map(item=>normalizeWorkOrder({id:item.id,...item.data()}));
}

export function calculateTechnicianKpi({
  technicianId, technicianName="", periodId, startDate, endDate,
  workOrders=[], asOfDate=new Date()
}) {
  requireValue(technicianId,"technicianId");
  requireValue(periodId,"periodId");
  requireValue(startDate,"startDate");
  requireValue(endDate,"endDate");

  const periodStart=normalizeDate(startDate), periodEnd=normalizeDate(endDate);
  if(!periodStart||!periodEnd||periodStart>periodEnd) throw new Error("Khoảng thời gian KPI không hợp lệ.");

  const asOf=normalizeDate(asOfDate)||new Date();
  const source=workOrders.map(normalizeWorkOrder)
    .filter(wo=>wo.assignedTechnicianId===String(technicianId))
    .filter(wo=>wo.status!=="cancelled")
    .filter(wo=>isWithinPeriod(wo.openedDate,periodStart,periodEnd));

  let completed=0,active=0,overdue=0,completedOnTime=0,completedLate=0;
  let processingDaysTotal=0,processingDaysCount=0,laborCost=0,materialCost=0,totalCost=0;

  const rows=source.map(wo=>{
    const opened=normalizeDate(wo.openedDate);
    const due=normalizeDate(wo.dueDate);
    const completedDate=normalizeDate(wo.completedDate);
    const isCompleted=wo.status==="completed";
    const isCompletedOnTime=isCompleted&&!!completedDate&&(!due||completedDate<=due);
    const isCompletedLate=isCompleted&&!!completedDate&&!!due&&completedDate>due;
    const isOverdue=!isCompleted&&!!due&&due<asOf;
    let processingDays=null;

    if(isCompleted) completed++; else active++;
    if(isOverdue) overdue++;
    if(isCompletedOnTime) completedOnTime++;
    if(isCompletedLate) completedLate++;

    if(opened&&completedDate){
      processingDays=daysBetween(opened,completedDate);
      if(processingDays!==null){processingDaysTotal+=processingDays;processingDaysCount++;}
    }

    laborCost+=wo.laborCost; materialCost+=wo.materialCost; totalCost+=wo.totalCost;

    return {
      id:wo.id,workOrderNo:wo.workOrderNo,status:wo.status,
      openedDate:wo.openedDate,dueDate:wo.dueDate,completedDate:wo.completedDate,
      isOverdue,isCompletedOnTime,isCompletedLate,processingDays,
      customerName:wo.customerName,buildingName:wo.buildingName,
      elevatorName:wo.elevatorName,elevatorAssetCode:wo.elevatorAssetCode
    };
  });

  const total=source.length;
  return {
    technicianId:String(technicianId),
    technicianName:technicianName||source[0]?.assignedTechnicianName||"",
    periodId:String(periodId),
    startDate:dateToKey(periodStart),endDate:dateToKey(periodEnd),
    calculatedAt:new Date().toISOString(),
    totalWorkOrders:total,completedWorkOrders:completed,activeWorkOrders:active,
    overdueWorkOrders:overdue,completedOnTime,completedLate,
    completionRate:round(total?(completed/total)*100:0),
    onTimeRate:round(completed?(completedOnTime/completed)*100:0),
    averageProcessingDays:processingDaysCount?round(processingDaysTotal/processingDaysCount):0,
    totalLaborCost:round(laborCost),totalMaterialCost:round(materialCost),totalCost:round(totalCost),
    workOrderIds:rows.map(row=>row.id),rows
  };
}

function makeKpiDocumentId(periodId,technicianId) {
  return `${String(periodId)}__${String(technicianId)}`.replace(/[^a-zA-Z0-9_-]/g,"_");
}

export async function getKpiSnapshot(periodId,technicianId) {
  requireValue(periodId,"periodId"); requireValue(technicianId,"technicianId");
  const id=makeKpiDocumentId(periodId,technicianId);
  const snapshot=await getDoc(doc(db,KPI_COLLECTION,id));
  return snapshot.exists()?{id:snapshot.id,...snapshot.data()}:null;
}

export async function saveKpiSnapshot(kpi) {
  requireValue(kpi?.periodId,"periodId"); requireValue(kpi?.technicianId,"technicianId");
  const id=makeKpiDocumentId(kpi.periodId,kpi.technicianId);
  const payload={...kpi,updatedAt:serverTimestamp()};
  delete payload.id;
  await setDoc(doc(db,KPI_COLLECTION,id),payload,{merge:true});
  return getKpiSnapshot(kpi.periodId,kpi.technicianId);
}

export function createMonthlyPeriod(year,month) {
  const y=Number(year),m=Number(month);
  if(!Number.isInteger(y)||!Number.isInteger(m)||m<1||m>12) throw new Error("Năm/tháng không hợp lệ.");
  const start=new Date(y,m-1,1),end=new Date(y,m,0);
  return {periodId:`${y}-${String(m).padStart(2,"0")}`,startDate:dateToKey(start),endDate:dateToKey(end)};
}

export function createQuarterPeriod(year,quarter) {
  const y=Number(year),q=Number(quarter);
  if(!Number.isInteger(y)||!Number.isInteger(q)||q<1||q>4) throw new Error("Năm/quý không hợp lệ.");
  const startMonth=(q-1)*3;
  const start=new Date(y,startMonth,1),end=new Date(y,startMonth+3,0);
  return {periodId:`${y}-Q${q}`,startDate:dateToKey(start),endDate:dateToKey(end)};
}
