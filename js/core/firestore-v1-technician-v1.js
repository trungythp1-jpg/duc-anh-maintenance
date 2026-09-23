/*
 * ĐỨC ANH MAINTENANCE
 * TECHNICIAN DATA LAYER V1
 *
 * Module 4.1 / 4.2
 *
 * NGUYÊN TẮC:
 * - technicians là collection nghiệp vụ riêng.
 * - technicianId là mã KTV lâu dài.
 * - Không xóa cứng hồ sơ KTV.
 * - uid chỉ là liên kết Firebase Auth.
 * - Công ty cấp / thu hồi tài khoản Firebase Auth bên ngoài module này.
 * - status:
 *      active
 *      leave
 *      inactive
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { auth } from "./firebase.js";
const COLLECTION = "technicians";
const VALID_STATUS = [
  "active",
  "leave",
  "inactive"
];
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
  return String(value || "")
    .trim()
    .toUpperCase();
}
function normalizeText(value) {
  return String(value || "").trim();
}
function currentUid() {
  return auth?.currentUser?.uid || "";
}
/* =========================================================
   GET ONE
========================================================= */
export async function getTechnician(technicianId) {
  requireValue(technicianId, "Mã kỹ thuật viên");
  const id = normalizeTechnicianId(technicianId);
  const snapshot = await getDoc(
    doc(db, COLLECTION, id)
  );
  if (!snapshot.exists()) {
    return null;
  }
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}
/* =========================================================
   GET ALL
========================================================= */
export async function getTechnicians() {
  const snapshot = await getDocs(
    collection(db, COLLECTION)
  );
  return snapshot.docs
    .map(item => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(a.technicianId || a.id)
        .localeCompare(
          String(b.technicianId || b.id),
          "vi",
          { numeric: true }
        )
    );
}
/* =========================================================
   GET BY STATUS
========================================================= */
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
/* =========================================================
   CREATE
========================================================= */
export async function createTechnician(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu kỹ thuật viên không hợp lệ.");
  }
  const technicianId = normalizeTechnicianId(
    data.technicianId
  );
  requireValue(
    technicianId,
    "Mã kỹ thuật viên"
  );
  requireValue(
    data.name,
    "Tên kỹ thuật viên"
  );
  const existing = await getDoc(
    doc(db, COLLECTION, technicianId)
  );
  if (existing.exists()) {
    throw new Error(
      `Mã kỹ thuật viên ${technicianId} đã tồn tại.`
    );
  }
  const uid = normalizeText(data.uid);
  const nowUser = currentUid();
  const payload = {
    technicianId,
    uid,
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
  await setDoc(
    doc(db, COLLECTION, technicianId),
    payload
  );
  return getTechnician(technicianId);
}
/* =========================================================
   UPDATE
========================================================= */
export async function updateTechnician(
  technicianId,
  data
) {
  requireValue(
    technicianId,
    "Mã kỹ thuật viên"
  );
  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu kỹ thuật viên không hợp lệ.");
  }
  const id = normalizeTechnicianId(
    technicianId
  );
  const existing = await getTechnician(id);
  if (!existing) {
    throw new Error(
      `Không tìm thấy kỹ thuật viên ${id}.`
    );
  }
  const nowUser = currentUid();
  const payload = {
    /*
     * technicianId KHÔNG được đổi trong màn hình sửa.
     * Đây là mã nghiệp vụ lâu dài.
     */
    technicianId: existing.technicianId || id,
    /*
     * UID chỉ được cập nhật khi công ty liên kết tài khoản.
     */
    uid: normalizeText(
      data.uid !== undefined
        ? data.uid
        : existing.uid
    ),
    name: normalizeText(
      data.name !== undefined
        ? data.name
        : existing.name
    ),
    phone: normalizeText(
      data.phone !== undefined
        ? data.phone
        : existing.phone
    ),
    email: normalizeText(
      data.email !== undefined
        ? data.email
        : existing.email
    ),
    status: normalizeStatus(
      data.status !== undefined
        ? data.status
        : existing.status
    ),
    position: normalizeText(
      data.position !== undefined
        ? data.position
        : existing.position
    ),
    team: normalizeText(
      data.team !== undefined
        ? data.team
        : existing.team
    ),
    note: normalizeText(
      data.note !== undefined
        ? data.note
        : existing.note
    ),
    updatedAt: serverTimestamp(),
    updatedBy: nowUser
  };
  await updateDoc(
    doc(db, COLLECTION, id),
    payload
  );
  return getTechnician(id);
}