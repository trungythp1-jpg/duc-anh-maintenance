/* ĐỨC ANH MAINTENANCE
 * TECHNICIAN DATA LAYER V1
 *
 * Module 4.1 / 4.2
 *
 * - technicians là collection nghiệp vụ riêng.
 * - technicianId là mã KTV lâu dài.
 * - Không xóa cứng hồ sơ KTV.
 * - uid chỉ là liên kết Firebase Auth.
 * - status: active | leave | inactive
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* Không phụ thuộc export db/auth từ ./firebase.js. */
async function loadFirebaseConfig(){
  const response=await fetch("./firebase.js?v=20260927-technician-bootstrap",{cache:"no-store"});
  if(!response.ok) throw new Error(`Không đọc được /js/core/firebase.js (HTTP ${response.status}).`);
  const source=await response.text();
  let match=source.match(/(?:export\s+)?const\s+firebaseConfig\s*=\s*(\{[\s\S]*?\})\s*;/);
  if(!match) match=source.match(/initializeApp\s*\(\s*(\{[\s\S]*?\})\s*\)/);
  if(!match) throw new Error("Không tìm thấy firebaseConfig trong /js/core/firebase.js.");
  const config=Function(`"use strict"; return (${match[1]});`)();
  const required=["apiKey","authDomain","projectId","appId"];
  const missing=required.filter(key=>!config?.[key]);
  if(missing.length) throw new Error("firebaseConfig thiếu: "+missing.join(", "));
  return config;
}

const firebaseConfig=await loadFirebaseConfig();
const app=initializeApp(firebaseConfig,"duc-anh-maintenance-technician-v1");
const db=getFirestore(app);
const auth=getAuth(app);

const COLLECTION = "technicians";
const VALID_STATUS = ["active", "leave", "inactive"];

function requireValue(value, fieldName) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${fieldName} là bắt buộc.`);
  }
}

function normalizeStatus(status) {
  const value = String(status || "active").trim().toLowerCase();
  if (!VALID_STATUS.includes(value)) {
    throw new Error(
      "Trạng thái KTV không hợp lệ. Chỉ chấp nhận active, leave hoặc inactive."
    );
  }
  return value;
}

function normalizeTechnicianId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function currentUid() {
  return auth?.currentUser?.uid || "";
}

export async function getTechnician(technicianId) {
  requireValue(technicianId, "Mã kỹ thuật viên");
  const id = normalizeTechnicianId(technicianId);
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getTechnicians() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) =>
      String(a.technicianId || a.id).localeCompare(
        String(b.technicianId || b.id),
        "vi",
        { numeric: true }
      )
    );
}

export async function getTechniciansByStatus(status) {
  const normalized = normalizeStatus(status);
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", normalized)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function createTechnician(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu kỹ thuật viên không hợp lệ.");
  }

  const technicianId = normalizeTechnicianId(data.technicianId);
  requireValue(technicianId, "Mã kỹ thuật viên");
  requireValue(data.name, "Tên kỹ thuật viên");

  const existing = await getDoc(doc(db, COLLECTION, technicianId));
  if (existing.exists()) {
    throw new Error(`Mã kỹ thuật viên ${technicianId} đã tồn tại.`);
  }

  const nowUser = currentUid();

  const payload = {
    technicianId,
    uid: normalizeText(data.uid),
    name: normalizeText(data.name),
    phone: normalizeText(data.phone),
    email: normalizeText(data.email),
    status: normalizeStatus(data.status),
    position: normalizeText(data.position),
    team: normalizeText(data.team),
    note: normalizeText(data.note),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: nowUser,
    updatedBy: nowUser
  };

  await setDoc(doc(db, COLLECTION, technicianId), payload);
  return getTechnician(technicianId);
}

export async function updateTechnician(technicianId, data) {
  requireValue(technicianId, "Mã kỹ thuật viên");

  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu kỹ thuật viên không hợp lệ.");
  }

  const id = normalizeTechnicianId(technicianId);
  const existing = await getTechnician(id);

  if (!existing) {
    throw new Error(`Không tìm thấy kỹ thuật viên ${id}.`);
  }

  const nowUser = currentUid();

  const payload = {
    technicianId: existing.technicianId || id,
    uid: normalizeText(data.uid !== undefined ? data.uid : existing.uid),
    name: normalizeText(data.name !== undefined ? data.name : existing.name),
    phone: normalizeText(data.phone !== undefined ? data.phone : existing.phone),
    email: normalizeText(data.email !== undefined ? data.email : existing.email),
    status: normalizeStatus(
      data.status !== undefined ? data.status : existing.status
    ),
    position: normalizeText(
      data.position !== undefined ? data.position : existing.position
    ),
    team: normalizeText(
      data.team !== undefined ? data.team : existing.team
    ),
    note: normalizeText(
      data.note !== undefined ? data.note : existing.note
    ),
    updatedAt: serverTimestamp(),
    updatedBy: nowUser
  };

  await updateDoc(doc(db, COLLECTION, id), payload);
  return getTechnician(id);
}
