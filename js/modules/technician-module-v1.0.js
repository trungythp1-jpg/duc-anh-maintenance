/* ĐỨC ANH MAINTENANCE — TECHNICIAN MODULE V1.0 APP SHELL
 * Only the presentation/bootstrap layer is adapted for App Shell.
 * Firestore/business functions remain unchanged.
 */
import { auth, db } from "../core/firebase.js";
import { getTechnicians, createTechnician, updateTechnician } from "../core/firestore-v1-technician-v1.js";

export async function mountTechnicianModule(root){
  if(!root) throw new Error("TECHNICIAN_ROOT_MISSING");
  root.__technicianCleanup?.();

  root.innerHTML = `<style>
:root{--yellow:#f5c400;--yellow-dark:#d9aa00;--black:#111;--bg:#f5f5f5;--line:#e8e8e8;--danger:#d93025;--success:#16803c;--warning:#b77900}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:var(--bg);color:#171717}
button,input,select,textarea{font:inherit}button{cursor:pointer}
.da-shared-sidebar{position:fixed;inset:0 auto 0 0;width:250px;background:var(--black);color:#fff;z-index:1000;display:flex;flex-direction:column}
.da-brand{display:flex;align-items:center;gap:12px;padding:22px 18px;border-bottom:1px solid #292929}
.da-brand-mark{width:40px;height:40px;border-radius:10px;background:var(--yellow);color:#111;display:flex;align-items:center;justify-content:center;font-weight:900}
.da-brand-name{font-size:14px;font-weight:900;letter-spacing:.04em}.da-brand-sub{font-size:10px;color:#aaa;margin-top:2px;letter-spacing:.12em}
.da-nav-scroll{flex:1;overflow:auto;padding:14px 10px}.da-nav-section{margin-bottom:20px}.da-nav-label{padding:8px 10px;color:#777;font-size:10px;font-weight:800;letter-spacing:.12em}
.da-nav-item{display:flex;align-items:center;gap:11px;color:#d8d8d8;text-decoration:none;padding:11px 12px;border-radius:9px;font-size:14px;margin-bottom:3px}
.da-nav-item:hover{background:#222}.da-nav-item.active{background:var(--yellow);color:#111;font-weight:800}.da-nav-icon{width:22px;text-align:center}
.da-nav-footer{border-top:1px solid #292929;padding:14px 18px;display:flex;flex-direction:column;gap:3px;font-size:10px;color:#777}.da-nav-footer strong{color:#aaa;font-size:9px;letter-spacing:.08em}
.main-area{margin-left:250px;min-height:100vh}.topbar{height:68px;background:#fff;border-bottom:1px solid #e7e7e7;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:500}
.menu-button{display:none}.breadcrumb{display:flex;align-items:center;gap:9px;font-size:13px;color:#777}.breadcrumb span:last-child{color:#111;font-weight:700}
.top-actions{display:flex;align-items:center}.user-chip{display:flex;align-items:center;gap:9px}.avatar{width:34px;height:34px;border-radius:50%;background:#111;color:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}.user-text{display:flex;flex-direction:column}.user-text strong{font-size:12px}.user-text small{color:#888;font-size:10px}
.content{padding:24px;max-width:1450px;margin:auto}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}
.eyebrow{margin:0 0 6px;color:#888;font-size:10px;font-weight:900;letter-spacing:.12em}h1{margin:0;font-size:28px;letter-spacing:-.03em}.subtitle{margin:7px 0 0;color:#777;font-size:13px}
.btn{border:0;border-radius:9px;padding:11px 16px;font-weight:800;font-size:13px}.btn-primary{background:var(--yellow);color:#111}.btn-primary:hover{background:var(--yellow-dark)}.btn-light{background:#eee;color:#222}
.panel{background:#fff;border:1px solid #e7e7e7;border-radius:14px;overflow:hidden}.toolbar{padding:16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.search{flex:1;min-width:220px}input,select,textarea{width:100%;border:1px solid #dcdcdc;border-radius:8px;background:#fff;padding:11px 12px;outline:none}
input:focus,select:focus,textarea:focus{border-color:#111;box-shadow:0 0 0 2px #f5c40055}textarea{min-height:90px;resize:vertical}
.stats{display:flex;gap:8px;flex-wrap:wrap}.stat{padding:8px 12px;border-radius:999px;background:#f3f3f3;font-size:11px;color:#555}.stat strong{color:#111}
.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:850px}th{text-align:left;background:#fafafa;border-bottom:1px solid #eee;padding:12px 14px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777}
td{padding:14px;border-bottom:1px solid #f0f0f0;font-size:13px;vertical-align:middle}tr:last-child td{border-bottom:0}tbody tr:hover{background:#fffdf0}
.tech-name{font-weight:800}.tech-id{font-size:11px;color:#777;margin-top:3px}.badge{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:800}
.badge-active{background:#eaf7ee;color:var(--success)}.badge-leave{background:#fff5d8;color:var(--warning)}.badge-inactive{background:#eee;color:#777}
.actions{display:flex;gap:7px;flex-wrap:wrap}.action{border:1px solid #ddd;background:#fff;padding:7px 10px;border-radius:7px;font-size:11px;font-weight:700}
.empty{text-align:center;padding:50px 20px;color:#888}.status-message{padding:12px 16px;font-size:12px;display:none}.status-message.show{display:block}.status-success{background:#eef9f1;color:#176b35}.status-error{background:#fff0ef;color:#a52219}
.modal-backdrop{position:fixed;inset:0;background:#0009;display:none;align-items:center;justify-content:center;padding:20px;z-index:2000}.modal-backdrop.open{display:flex}
.modal{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 70px #0005}.modal-head{padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between}.modal-head h2{margin:0;font-size:19px}
.close{width:34px;height:34px;border:0;background:#eee;border-radius:50%;font-size:18px}.form{padding:20px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:11px;font-weight:800;color:#555}.required{color:var(--danger)}.help{font-size:10px;color:#888}
.modal-foot{padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px}.da-nav-overlay{display:none}
.status-help{margin-top:4px;padding:9px 10px;border-radius:7px;background:#fafafa;border:1px solid #eee;font-size:10px;line-height:1.5;color:#777}
.status-help strong{color:#333}
@media(max-width:820px){
.da-shared-sidebar{transform:translateX(-100%);transition:transform .2s ease}.da-shared-sidebar.open{transform:translateX(0)}
.da-nav-overlay{position:fixed;inset:0;background:#0008;z-index:999}.da-nav-overlay.show{display:block}.main-area{margin-left:0}.topbar{padding:0 14px}
.menu-button{display:flex;width:38px;height:38px;border:0;background:#111;color:#f5c400;border-radius:9px;align-items:center;justify-content:center;font-size:19px}
.breadcrumb{margin-left:10px;margin-right:auto}.user-text{display:none}.content{padding:16px}.page-heading{align-items:flex-start;flex-direction:column}.page-heading .btn{width:100%}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.modal-backdrop{padding:10px}.modal{max-height:94vh}
}
</style><style>
#technician-module-root{--bg:#090909;--panel:#11110f;--line:#302c25;--text:#eee9df;--muted:#aaa49a;--gold:#d6a84f;--gold2:#f0ca76;--danger:#e35b4f;background:#090909;color:var(--text);min-height:100%;padding:1px 0}
#technician-module-root .content,#technician-module-root .panel{background:#11110f!important;border-color:#302c25!important;color:var(--text)!important}
#technician-module-root .subtitle,#technician-module-root .help,#technician-module-root .tech-id,#technician-module-root .empty{color:#aaa49a!important}
#technician-module-root h1{color:#f0ca76!important}
#technician-module-root th{background:#171714!important;color:#f0ca76!important;border-color:#302c25!important}
#technician-module-root td{border-color:#292722!important;color:#eee9df!important}
#technician-module-root tbody tr:hover{background:#171714!important}
#technician-module-root input,#technician-module-root select,#technician-module-root textarea{background:#171714!important;color:#eee9df!important;border-color:#4a4438!important}
#technician-module-root .stat{background:#25231e!important;color:#aaa49a!important}
#technician-module-root .stat strong{color:#f5f1e7!important}
#technician-module-root .modal{background:#11110f!important;color:#eee9df!important}
#technician-module-root .modal-head,#technician-module-root .modal-foot{border-color:#302c25!important}
#technician-module-root .modal-head h2{color:#f0ca76!important}
#technician-module-root .close,#technician-module-root .btn-light,#technician-module-root .action{background:#171714!important;color:#eee9df!important;border-color:#4a4438!important}
#technician-module-root .btn-primary{background:linear-gradient(180deg,#e0b65c,#bd8e34)!important;color:#111!important}
#technician-module-root .status-success{background:#132017!important;color:#75dda5!important}
#technician-module-root .status-error{background:#211312!important;color:#ff8176!important}
</style><div id="technician-module-root">
<section class="page-heading">
<div><p class="eyebrow">NHÂN SỰ / VẬN HÀNH</p><h1>Kỹ thuật viên</h1><p class="subtitle">Quản lý hồ sơ, trạng thái và liên kết tài khoản Firebase của kỹ thuật viên.</p></div>
<button class="btn btn-primary" id="addButton" type="button">+ Thêm kỹ thuật viên</button>
</section>

<section class="panel">
<div class="toolbar">
<div class="search"><input id="search" type="search" placeholder="Tìm theo mã, tên, điện thoại, email..." autocomplete="off"></div>
<div style="width:180px"><select id="statusFilter"><option value="">Tất cả trạng thái</option><option value="active">Đang làm việc</option><option value="leave">Đang nghỉ</option><option value="inactive">Đã nghỉ việc</option></select></div>
<div class="stats"><div class="stat">Tổng <strong id="totalCount">0</strong></div><div class="stat">Đang làm <strong id="activeCount">0</strong></div><div class="stat">Nghỉ <strong id="leaveCount">0</strong></div><div class="stat">Nghỉ việc <strong id="inactiveCount">0</strong></div></div>
</div>
<div id="statusMessage" class="status-message"></div>
<div class="table-wrap">
<table><thead><tr><th>Kỹ thuật viên</th><th>Điện thoại</th><th>Email</th><th>Chức vụ</th><th>Trạng thái</th><th>Firebase UID</th><th>Thao tác</th></tr></thead><tbody id="rows"></tbody></table>
<div id="empty" class="empty" style="display:none">Chưa có kỹ thuật viên.</div>
</div>
</section>
</main>
</div>

<div class="modal-backdrop" id="modalBackdrop">
<div class="modal" role="dialog" aria-modal="true">
<div class="modal-head"><h2 id="modalTitle">Thêm kỹ thuật viên</h2><button class="close" id="closeButton" type="button">×</button></div>
<form class="form" id="technicianForm">
<input type="hidden" id="editId">
<div class="form-grid">
<div class="field"><label>Mã kỹ thuật viên <span class="required">*</span></label><input id="technicianId" required maxlength="50" placeholder="Ví dụ: KTV-001"><div class="help">Mã nghiệp vụ lâu dài. Không đổi sau khi tạo.</div></div>
<div class="field"><label>Họ và tên <span class="required">*</span></label><input id="name" required maxlength="100" placeholder="Nguyễn Văn A"></div>
<div class="field"><label>Điện thoại</label><input id="phone" type="tel" maxlength="20"></div>
<div class="field"><label>Email</label><input id="email" type="email" maxlength="120"></div>
<div class="field"><label>Chức vụ</label><select id="position"><option value="">-- Chọn chức vụ --</option><option value="Kỹ thuật viên">Kỹ thuật viên</option><option value="Tổ trưởng kỹ thuật">Tổ trưởng kỹ thuật</option><option value="Kỹ thuật trưởng">Kỹ thuật trưởng</option><option value="Trưởng bộ phận kỹ thuật">Trưởng bộ phận kỹ thuật</option></select></div>
<div class="field"><label>Trạng thái</label><select id="status"><option value="active">Đang làm việc</option><option value="leave">Đang nghỉ</option><option value="inactive">Đã nghỉ việc</option></select><div id="statusHelp" class="status-help"></div></div>
<div class="field"><label>Firebase Auth UID</label><input id="uid" maxlength="150"><div class="help">Không tạo tài khoản tại đây. Công ty cấp tài khoản Firebase bên ngoài.</div></div>
<div class="field full"><label>Ghi chú</label><textarea id="note"></textarea></div>
</div>
</form>
<div class="modal-foot"><button class="btn btn-light" id="cancelButton" type="button">Hủy</button><button class="btn btn-primary" id="saveButton" type="submit" form="technicianForm">Lưu kỹ thuật viên</button></div>
</div>
</div>

</div>`;

  


let technicians=[],currentRole="",editingId="",previousStatus="";

async function loadCurrentUser(user){
 if(!user){return false}
 $("userAvatar") && $("userAvatar").textContent=(user.displayName||user.email||"DA").slice(0,2).toUpperCase();
 $("userName") && $("userName").textContent=user.displayName||user.email||"Người dùng";
 try{
  const s=await getDoc(doc(db,"users",user.uid));
  currentRole=s.exists()?String(s.data().role||"").toUpperCase():"";
 }catch(e){console.error(e);currentRole=""}
 $("userRole") && const roleEl=$("userRole");if(roleEl)roleEl.textContent=currentRole||"USER";
 $("addButton").style.display=(currentRole==="ADMIN"||currentRole==="MANAGER")?"":"none";
 return true;
}

function showMessage(message,type="success"){
 const box=$("statusMessage");box.textContent=message;box.className=`status-message show ${type==="error"?"status-error":"status-success"}`;
 clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>box.className="status-message",5000);
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function statusLabel(s){return s==="leave"?"Đang nghỉ":s==="inactive"?"Đã nghỉ việc":"Đang làm việc"}
function statusBadge(s){const n=s==="leave"?"leave":s==="inactive"?"inactive":"active";return `<span class="badge badge-${n}">${statusLabel(n)}</span>`}
function updateStatusHelp(status){
 const box=$("statusHelp");
 if(status==="leave")box.innerHTML="<strong>Đang nghỉ:</strong> không nhận PBM/Work Order mới. Công việc cũ và lịch sử vẫn được giữ.";
 else if(status==="inactive")box.innerHTML="<strong>Đã nghỉ việc:</strong> không nhận công việc mới. Hồ sơ, mã KTV và lịch sử vẫn được giữ; tài khoản Firebase do công ty xử lý riêng.";
 else box.innerHTML="<strong>Đang làm việc:</strong> được phép nhận công việc mới.";
}
function applyStatusTransitionRules(){
 const current=$("status").value;
 if(previousStatus==="inactive"&&current==="active"){
  const ok=window.confirm("Kỹ thuật viên này đang ở trạng thái Đã nghỉ việc. Bạn có chắc chắn nhân sự đã quay lại làm việc và muốn kích hoạt lại không?");
  if(!ok){$("status").value="inactive";updateStatusHelp("inactive");return false}
 }
 updateStatusHelp(current);return true;
}

function filteredTechnicians(){
 const search=$("search").value.trim().toLowerCase(),status=$("statusFilter").value;
 return technicians.filter(item=>{
  const hay=[item.technicianId,item.name,item.phone,item.email,item.position,item.uid].join(" ").toLowerCase();
  return (!search||hay.includes(search))&&(!status||String(item.status||"active")===status);
 });
}
function renderStats(){
 $("totalCount").textContent=technicians.length;
 $("activeCount").textContent=technicians.filter(x=>x.status==="active").length;
 $("leaveCount").textContent=technicians.filter(x=>x.status==="leave").length;
 $("inactiveCount").textContent=technicians.filter(x=>x.status==="inactive").length;
}
function render(){
 renderStats();const list=filteredTechnicians(),rows=$("rows");
 if(!list.length){rows.innerHTML="";$("empty").style.display="";return}
 $("empty").style.display="none";
 const canManage=currentRole==="ADMIN"||currentRole==="MANAGER";
 rows.innerHTML=list.map(item=>`
<tr>
<td><div class="tech-name">${esc(item.name||"—")}</div><div class="tech-id">${esc(item.technicianId||item.id)}</div></td>
<td>${esc(item.phone||"—")}</td><td>${esc(item.email||"—")}</td><td>${esc(item.position||"—")}</td>
<td>${statusBadge(item.status)}</td>
<td>${item.uid?`<span title="${esc(item.uid)}" style="font-size:10px;color:#777">${esc(item.uid.length>16?item.uid.slice(0,16)+"…":item.uid)}</span>`:`<span style="color:#aaa">Chưa liên kết</span>`}</td>
<td><div class="actions">${canManage?`<button class="action" type="button" data-edit="${esc(item.technicianId||item.id)}">Sửa</button>`:""}</div></td>
</tr>`).join("");
}
async function loadData(){
 try{technicians=await getTechnicians();render()}
 catch(error){console.error(error);technicians=[];render();showMessage(error?.message||"Không thể tải danh sách kỹ thuật viên.","error")}
}
function openModal(item=null){
 editingId=item?String(item.technicianId||item.id):"";
 previousStatus=item?String(item.status||"active"):"";
 $("modalTitle").textContent=item?"Sửa kỹ thuật viên":"Thêm kỹ thuật viên";
 $("technicianId").value=item?(item.technicianId||item.id||""):"";
 $("technicianId").disabled=Boolean(item);
 $("name").value=item?.name||"";$("phone").value=item?.phone||"";$("email").value=item?.email||"";
 $("position").value=item?.position||"";$("status").value=item?.status||"active";
 $("uid").value=item?.uid||"";$("note").value=item?.note||"";
 updateStatusHelp($("status").value);
 $("modalBackdrop").classList.add("open");setTimeout(()=>$("name").focus(),50);
}
function closeModal(){$("modalBackdrop").classList.remove("open");editingId="";previousStatus="";$("technicianId").disabled=false}

async function saveTechnician(){
 if(!applyStatusTransitionRules())return;
 const technicianId=$("technicianId").value.trim().toUpperCase(),name=$("name").value.trim();
 if(!technicianId){showMessage("Vui lòng nhập mã kỹ thuật viên.","error");return}
 if(!name){showMessage("Vui lòng nhập tên kỹ thuật viên.","error");return}
 const payload={technicianId,uid:$("uid").value.trim(),name,phone:$("phone").value.trim(),email:$("email").value.trim(),status:$("status").value,position:$("position").value,note:$("note").value.trim()};
 const button=$("saveButton");button.disabled=true;button.textContent="Đang lưu...";
 try{
  if(editingId){await updateTechnician(editingId,payload);showMessage("Đã cập nhật kỹ thuật viên.")}
  else{await createTechnician(payload);showMessage("Đã tạo kỹ thuật viên.")}
  closeModal();await loadData();
 }catch(error){console.error(error);showMessage(error?.message||"Không thể lưu kỹ thuật viên.","error")}
 finally{button.disabled=false;button.textContent="Lưu kỹ thuật viên"}
}

$("addButton").addEventListener("click",()=>{if(currentRole==="ADMIN"||currentRole==="MANAGER")openModal()});
$("closeButton").addEventListener("click",closeModal);$("cancelButton").addEventListener("click",closeModal);
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});
$("technicianForm").addEventListener("submit",e=>{e.preventDefault();saveTechnician()});
$("status").addEventListener("change",applyStatusTransitionRules);
$("search").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("rows").addEventListener("click",e=>{
 const b=e.target.closest("[data-edit]");if(!b)return;
 const item=technicians.find(x=>String(x.technicianId||x.id)===String(b.dataset.edit));if(item)openModal(item);
});
root.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

const user=auth?.currentUser||null;
if(!user) throw new Error("TECHNICIAN_AUTH_REQUIRED");
if(!(await loadCurrentUser(user))) throw new Error("TECHNICIAN_PROFILE_LOAD_FAILED");
await loadData();
root.__technicianCleanup=()=>{};

}
