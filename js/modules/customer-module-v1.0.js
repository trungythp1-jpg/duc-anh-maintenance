/* Đức Anh Maintenance — Customer Module V1.0
   App Shell module. Business logic based on the current customers.html supplied by user.
   No Firebase schema changes. */
import {
  createCustomer,
  getCustomers,
  getBuildings,
  getElevators
} from "../core/firestore-v1.js";

const CUSTOMER_CSS = `
.customer-module{padding:28px 0 40px}
.customer-module .customer-container{width:min(1500px,100%);margin:0 auto}
.customer-module .customer-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:26px}
.customer-module .customer-eyebrow{margin:0 0 7px;color:#f5c400;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.customer-module .customer-title{margin:0;font-size:clamp(28px,3vw,38px);line-height:1.1;letter-spacing:-.03em}
.customer-module .customer-subtitle{margin:9px 0 0;color:#969696;font-size:14px}
.customer-module .primary-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:9px;padding:12px 17px;background:#f5c400;color:#080808;font-weight:800}
.customer-module .primary-button:hover{background:#ffd83d}
.customer-module .customer-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.customer-module .kpi-card{position:relative;overflow:hidden;min-height:112px;padding:18px;border:1px solid #292929;border-radius:12px;background:linear-gradient(145deg,#151515,#101010)}
.customer-module .kpi-label{color:#969696;font-size:12px}.customer-module .kpi-value{margin-top:9px;font-size:29px;font-weight:800}.customer-module .kpi-note{margin-top:5px;color:#969696;font-size:11px}
.customer-module .customer-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:13px;border:1px solid #292929;border-radius:12px;background:#121212}
.customer-module .search-box{position:relative;flex:1;min-width:180px}.customer-module .search-box span{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#777}
.customer-module .search-box input,.customer-module .filter-select{width:100%;height:42px;border:1px solid #292929;border-radius:8px;outline:none;background:#0d0d0d;color:#f4f4f4}
.customer-module .search-box input{padding:0 13px 0 37px}.customer-module .filter-select{width:175px;padding:0 12px}
.customer-module .customer-table-card{overflow:hidden;border:1px solid #292929;border-radius:12px;background:#121212}
.customer-module .table-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #292929}
.customer-module .table-title{font-size:14px;font-weight:800}.customer-module .table-count{color:#969696;font-size:12px}
.customer-module .table-scroll{overflow-x:auto} .customer-module table{width:100%;min-width:900px;border-collapse:collapse}
.customer-module th{padding:13px 16px;border-bottom:1px solid #292929;color:#858585;font-size:10px;font-weight:700;letter-spacing:.08em;text-align:left;text-transform:uppercase}
.customer-module td{padding:15px 16px;border-bottom:1px solid #202020;color:#ddd;font-size:13px;vertical-align:middle}
.customer-module tbody tr:hover{background:#171717}
.customer-module th:last-child,.customer-module td:last-child{position:sticky;right:0;background:#121212;box-shadow:-10px 0 18px rgba(0,0,0,.32);z-index:1}
.customer-module .customer-name{color:#fff;font-weight:700}.customer-module .customer-id{margin-top:4px;color:#666;font-size:10px;font-family:monospace}.customer-module .muted{color:#969696}
.customer-module .status{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:700}
.customer-module .status:before{content:"";width:6px;height:6px;border-radius:50%}
.customer-module .status.active{background:rgba(56,199,147,.1);color:#38c793}.customer-module .status.active:before{background:#38c793}
.customer-module .status.care{background:rgba(245,196,0,.1);color:#f5c400}.customer-module .status.care:before{background:#f5c400}
.customer-module .status.inactive{background:rgba(239,98,98,.1);color:#ef6262}.customer-module .status.inactive:before{background:#ef6262}
.customer-module .action-button,.customer-module .icon-button{border:1px solid #292929;border-radius:7px;padding:7px 10px;background:#101010;color:#ccc;font-size:11px}
.customer-module .action-button:hover{border-color:#f5c400;color:#f5c400}
.customer-module .table-footer{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-top:1px solid #292929;color:#969696;font-size:11px}
.customer-module .mobile-customer-list{display:none}
.customer-module .customer-card{padding:15px;border-bottom:1px solid #202020}.customer-module .customer-card-top{display:flex;justify-content:space-between;gap:10px}
.customer-module .customer-card-contact{margin:9px 0;color:#bbb;font-size:12px;line-height:1.55}
.customer-module .customer-card-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}.customer-module .mini-stat{padding:9px;border:1px solid #292929;border-radius:8px;background:#0d0d0d}.customer-module .mini-stat b{display:block;font-size:15px}.customer-module .mini-stat span{color:#777;font-size:9px}
.customer-module .customer-card-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.cm-backdrop{position:fixed;inset:0;z-index:3000;display:none;background:rgba(0,0,0,.78);backdrop-filter:blur(5px)}
.cm-backdrop.show{display:flex}
.customer-module .cm-drawer{position:absolute;top:0;right:0;width:min(600px,100%);height:100%;overflow-y:auto;background:#111;border-left:1px solid #292929;box-shadow:-25px 0 80px rgba(0,0,0,.55)}
.customer-module .cm-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid #292929;background:rgba(17,17,17,.96)}
.customer-module .cm-head h2{margin:0;font-size:20px}.customer-module .cm-kicker,.customer-module .form-section-title,.customer-module .detail-section-title{margin:0 0 7px;color:#f5c400;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.customer-module .cm-body{padding:20px}.customer-module .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}.customer-module .detail-item{padding:12px;border:1px solid #292929;border-radius:9px;background:#151515}.customer-module .detail-item span{display:block;color:#777;font-size:10px;margin-bottom:5px}.customer-module .detail-item b{font-size:13px}
.customer-module .detail-tabs{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px;margin-bottom:18px}.customer-module .detail-tab{flex:0 0 auto;border:1px solid #292929;border-radius:8px;padding:9px 11px;background:#151515;color:#aaa;font-size:11px}.customer-module .detail-tab.active{border-color:#f5c400;background:rgba(245,196,0,.09);color:#f5c400}
.customer-module .detail-list{display:grid;gap:8px}.customer-module .detail-row{display:flex;justify-content:space-between;gap:10px;padding:11px 12px;border:1px solid #292929;border-radius:8px;background:#0d0d0d;font-size:12px}.customer-module .detail-row span{color:#999}
.customer-module .cm-modal{width:min(720px,100%);height:min(800px,calc(100dvh - 40px));display:flex;flex-direction:column;overflow:hidden;border:1px solid #292929;border-radius:14px;background:#111;box-shadow:0 25px 80px rgba(0,0,0,.55)}
.customer-module .cm-modal-head{display:flex;justify-content:space-between;align-items:center;padding:17px 20px;border-bottom:1px solid #292929;background:#111}
.customer-module .cm-modal-head h2{margin:0;font-size:18px}.customer-module .close-button{width:38px;height:38px;border:1px solid #292929;border-radius:9px;background:#171717;color:#aaa;font-size:22px}
.customer-module .cm-modal-body{flex:1;min-height:0;overflow-y:auto;padding:20px}.customer-module .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:24px}.customer-module .form-field.full{grid-column:1/-1}.customer-module .form-field label{display:block;margin-bottom:6px;color:#aaa;font-size:11px}
.customer-module .form-field input,.customer-module .form-field select,.customer-module .form-field textarea{width:100%;min-height:46px;border:1px solid #292929;border-radius:9px;outline:none;background:#0b0b0b;color:#eee;padding:11px 12px;font-size:16px}.customer-module .form-field textarea{min-height:95px;resize:vertical}
.customer-module .cm-modal-foot{display:flex;justify-content:flex-end;gap:9px;padding:13px 20px;border-top:1px solid #292929;background:#111}.customer-module .secondary-button{border:1px solid #292929;border-radius:8px;padding:11px 15px;background:#171717;color:#ccc}
.customer-module .firebase-message{margin-bottom:14px;padding:11px 13px;border:1px solid #292929;border-radius:9px;background:#101010;color:#aaa;font-size:12px}.customer-module .firebase-message.error{border-color:rgba(239,98,98,.4);color:#ef8989}.customer-module .firebase-message.success{border-color:rgba(56,199,147,.4);color:#72d8b1}
@media(max-width:900px){.customer-module .customer-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){
 .customer-module{padding:16px 0 30px}.customer-module .customer-header{flex-direction:column}.customer-module .primary-button{width:100%}.customer-module .customer-toolbar{flex-direction:column;align-items:stretch}.customer-module .filter-select{width:100%}
 .customer-module .table-scroll{display:none}.customer-module .mobile-customer-list{display:block}.customer-module .table-footer{flex-direction:column;align-items:flex-start;gap:5px}
 .customer-module .cm-drawer{width:100%;border-left:0}.customer-module .detail-grid{grid-template-columns:1fr 1fr}
 .cm-backdrop.modal-backdrop{align-items:flex-start;justify-content:center;padding:0;overflow-y:auto}
 .customer-module .cm-modal{width:100%;min-height:100dvh;height:auto;max-height:none;display:block;overflow:visible;border-radius:0;border:0}
 .customer-module .cm-modal-body{overflow:visible;padding:18px 16px 30px}.customer-module .form-grid{grid-template-columns:1fr;gap:15px}.customer-module .form-field.full{grid-column:auto}
 .customer-module .form-field label{font-size:13px}.customer-module .form-field input,.customer-module .form-field select,.customer-module .form-field textarea{min-height:50px;padding:13px 14px}
 .customer-module .cm-modal-foot{padding:12px 16px calc(12px + env(safe-area-inset-bottom));position:relative}.customer-module .cm-modal-foot .primary-button{flex:1;min-height:48px}.customer-module .cm-modal-foot .secondary-button{min-width:84px}
}
`;

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function typeLabel(t){return ({individual:"Cá nhân",business:"Doanh nghiệp",building_management:"Ban quản lý tòa nhà",investor:"Chủ đầu tư"})[t]||t||"—"}
function statusLabel(s){const m={active:["Đang hoạt động","active"],care:["Cần chăm sóc","care"],inactive:["Ngừng hoạt động","inactive"]};const [l,c]=m[s]||["Chưa xác định","inactive"];return `<span class="status ${c}">${l}</span>`}

export async function mountCustomerModule(root){
  if(!root) throw new Error("CUSTOMER_ROOT_NOT_FOUND");
  if(!document.getElementById("customer-module-style")){
    const style=document.createElement("style");style.id="customer-module-style";style.textContent=CUSTOMER_CSS;document.head.appendChild(style);
  }

  root.innerHTML=`
  <section class="customer-module">
    <div class="customer-container">
      <header class="customer-header">
        <div><p class="customer-eyebrow">CUSTOMER MANAGEMENT</p><h1 class="customer-title">Khách hàng</h1><p class="customer-subtitle">Quản lý khách hàng, tòa nhà và quan hệ dịch vụ bảo trì.</p></div>
        <button class="primary-button" id="cmAdd">＋ <span>Thêm khách hàng</span></button>
      </header>
      <section class="customer-kpis">
        <article class="kpi-card"><div class="kpi-label">Tổng khách hàng</div><div class="kpi-value" id="cmKpiTotal">0</div><div class="kpi-note">Trong hệ thống</div></article>
        <article class="kpi-card"><div class="kpi-label">Đang hoạt động</div><div class="kpi-value" id="cmKpiActive">0</div><div class="kpi-note">Đang có quan hệ dịch vụ</div></article>
        <article class="kpi-card"><div class="kpi-label">Có hợp đồng</div><div class="kpi-value">—</div><div class="kpi-note">Chưa kết nối module hợp đồng</div></article>
        <article class="kpi-card"><div class="kpi-label">Cần chăm sóc</div><div class="kpi-value" id="cmKpiCare">0</div><div class="kpi-note">Trong dữ liệu Customer</div></article>
      </section>
      <section class="customer-toolbar">
        <div class="search-box"><span>⌕</span><input id="cmSearch" type="search" placeholder="Tìm tên, số điện thoại, email..." autocomplete="off"></div>
        <select class="filter-select" id="cmStatus"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="care">Cần chăm sóc</option><option value="inactive">Ngừng hoạt động</option></select>
      </section>
      <section class="customer-table-card">
        <div class="table-header"><div class="table-title">Danh sách khách hàng</div><div class="table-count" id="cmCount">Đang tải...</div></div>
        <div id="cmMessage" class="firebase-message"></div>
        <div class="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Tòa nhà</th><th>Thang máy</th><th>Phụ trách</th><th>Trạng thái</th><th></th></tr></thead><tbody id="cmBody"></tbody></table></div>
        <div class="mobile-customer-list" id="cmMobile"></div>
        <div class="table-footer"><span>Dữ liệu Firebase DEV — Firestore.</span><span>CUSTOMER MODULE V1.0</span></div>
      </section>
    </div>
  <div class="cm-backdrop" id="cmDetail"><aside class="cm-drawer"><div class="cm-head"><div><p class="cm-kicker">CUSTOMER PROFILE</p><h2 id="cmDetailName">—</h2><div id="cmDetailId" class="customer-id">—</div></div><button class="close-button" id="cmCloseDetail">×</button></div><div class="cm-body"><div id="cmDetailStatus" style="margin-bottom:18px"></div><p class="detail-section-title">Thông tin</p><div class="detail-grid"><div class="detail-item"><span>Số điện thoại</span><b id="cmPhone">—</b></div><div class="detail-item"><span>Email</span><b id="cmEmail">—</b></div><div class="detail-item"><span>Người phụ trách</span><b id="cmManager">—</b></div><div class="detail-item"><span>Loại khách hàng</span><b id="cmType">—</b></div></div><p class="detail-section-title">Quan hệ dịch vụ</p><div class="detail-grid"><div class="detail-item"><span>Tòa nhà</span><b id="cmBuildings">0</b></div><div class="detail-item"><span>Thang máy</span><b id="cmElevators">0</b></div><div class="detail-item"><span>Hợp đồng</span><b>—</b></div><div class="detail-item"><span>Work Order</span><b>—</b></div></div><div class="detail-tabs"><button class="detail-tab active" data-tab="buildings">Tòa nhà</button><button class="detail-tab" data-tab="elevators">Thang máy</button><button class="detail-tab" data-tab="contracts">Hợp đồng</button><button class="detail-tab" data-tab="maintenance">Bảo trì</button><button class="detail-tab" data-tab="workorders">Work Order</button></div><div class="detail-list" id="cmDetailList"></div></div></aside></div>
  <div class="cm-backdrop modal-backdrop" id="cmModal"><section class="cm-modal"><div class="cm-modal-head"><h2>Thêm khách hàng</h2><button class="close-button" id="cmCloseModal">×</button></div><form id="cmForm"><div class="cm-modal-body"><p class="form-section-title">Thông tin khách hàng</p><div class="form-grid"><div class="form-field full"><label>Tên khách hàng *</label><input id="cmName" required></div><div class="form-field"><label>Loại khách hàng</label><select id="cmTypeInput"><option>Cá nhân</option><option>Doanh nghiệp</option><option>Ban quản lý tòa nhà</option><option>Chủ đầu tư</option></select></div><div class="form-field"><label>Số điện thoại</label><input id="cmCustomerPhone" type="tel"></div><div class="form-field"><label>Email</label><input id="cmCustomerEmail" type="email"></div><div class="form-field"><label>Mã số thuế</label><input id="cmTaxCode"></div><div class="form-field full"><label>Địa chỉ</label><input id="cmAddress"></div></div><p class="form-section-title">Người liên hệ</p><div class="form-grid"><div class="form-field"><label>Họ tên</label><input id="cmContactName"></div><div class="form-field"><label>Số điện thoại</label><input id="cmContactPhone" type="tel"></div><div class="form-field full"><label>Ghi chú</label><textarea id="cmNote"></textarea></div></div></div><div class="cm-modal-foot"><button class="secondary-button" type="button" id="cmCancel">Hủy</button><button class="primary-button" type="submit">Lưu khách hàng</button></div></form></section></div>
  </section>`;

  let customers=[],buildings=[],elevators=[],selected=null;

  function msg(t,type=""){const e=root.querySelector("#cmMessage");e.textContent=t||"";e.className="firebase-message"+(t?" "+type:"")}
  function normalized(c){const bs=buildings.filter(x=>x.customerId===c.id),es=elevators.filter(x=>x.customerId===c.id);return {...c,phone:c.phone||"",email:c.email||"",manager:c.contactPerson?.name||"Chưa phân công",buildings:bs.length,elevators:es.length,type:typeLabel(c.type)}}
  function updateKpi(){root.querySelector("#cmKpiTotal").textContent=customers.length;root.querySelector("#cmKpiActive").textContent=customers.filter(x=>x.status==="active").length;root.querySelector("#cmKpiCare").textContent=customers.filter(x=>x.status==="care").length}
  function render(){
    const q=root.querySelector("#cmSearch").value.trim().toLowerCase(), st=root.querySelector("#cmStatus").value;
    const list=customers.map(normalized).filter(c=>(!q||[c.name,c.phone,c.email,c.manager].join(" ").toLowerCase().includes(q))&&(st==="all"||c.status===st));
    root.querySelector("#cmCount").textContent=`${list.length} khách hàng`;
    root.querySelector("#cmBody").innerHTML=list.length?list.map(c=>`<tr><td><div class="customer-name">${esc(c.name)}</div><div class="customer-id">${esc(c.id)}</div></td><td>${esc(c.phone||"—")}<div class="muted">${esc(c.email||"—")}</div></td><td>${c.buildings}</td><td>${c.elevators}</td><td>${esc(c.manager)}</td><td>${statusLabel(c.status)}</td><td><button class="action-button" data-view="${esc(c.id)}">Xem</button></td></tr>`).join(""):`<tr><td colspan="7" style="text-align:center;padding:45px;color:#777">Chưa có khách hàng</td></tr>`;
    root.querySelector("#cmMobile").innerHTML=list.map(c=>`<article class="customer-card"><div class="customer-card-top"><div><div class="customer-name">${esc(c.name)}</div><div class="customer-id">${esc(c.id)}</div></div>${statusLabel(c.status)}</div><div class="customer-card-contact">${esc(c.phone||"—")}<br>${esc(c.email||"—")}<br>Phụ trách: ${esc(c.manager)}</div><div class="customer-card-stats"><div class="mini-stat"><b>${c.buildings}</b><span>TÒA NHÀ</span></div><div class="mini-stat"><b>${c.elevators}</b><span>THANG MÁY</span></div><div class="mini-stat"><b>—</b><span>HỢP ĐỒNG</span></div></div><div class="customer-card-bottom"><span class="muted">${esc(c.type)}</span><button class="action-button" data-view="${esc(c.id)}">Xem hồ sơ</button></div></article>`).join("");
  }
  function detail(id){
    const raw=customers.find(x=>x.id===id);if(!raw)return;selected=normalized(raw);
    root.querySelector("#cmDetailName").textContent=selected.name||"—";root.querySelector("#cmDetailId").textContent=selected.id||"—";root.querySelector("#cmDetailStatus").innerHTML=statusLabel(selected.status);root.querySelector("#cmPhone").textContent=selected.phone||"—";root.querySelector("#cmEmail").textContent=selected.email||"—";root.querySelector("#cmManager").textContent=selected.manager||"—";root.querySelector("#cmType").textContent=selected.type||"—";root.querySelector("#cmBuildings").textContent=selected.buildings;root.querySelector("#cmElevators").textContent=selected.elevators;
    tab("buildings");root.querySelector("#cmDetail").classList.add("show");document.body.style.overflow="hidden";
  }
  function tab(t){
    root.querySelectorAll(".detail-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));if(!selected)return;
    const id=selected.id,bs=buildings.filter(x=>x.customerId===id),es=elevators.filter(x=>x.customerId===id);let rows=[];
    if(t==="buildings")rows=bs.map(x=>[x.name||"Tòa nhà",x.status==="active"?"Đang quản lý":x.status||"—"]);
    else if(t==="elevators")rows=es.map(x=>[x.name||"Thang máy",x.status==="active"?"Đang hoạt động":x.status||"—"]);
    else if(t==="contracts")rows=[["Chưa có dữ liệu hợp đồng","—"]];
    else if(t==="maintenance")rows=[["Chưa có dữ liệu bảo trì","—"]];
    else rows=[["Chưa có Work Order","—"]];
    root.querySelector("#cmDetailList").innerHTML=rows.length?rows.map(r=>`<div class="detail-row"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join(""):`<div class="detail-row"><b>Chưa có dữ liệu</b><span>—</span></div>`;
  }
  async function load(){
    msg("Đang tải dữ liệu từ Firebase...");
    root.querySelector("#cmBody").innerHTML=`<tr><td colspan="7" style="text-align:center;padding:35px;color:#888">Đang tải dữ liệu từ Firebase...</td></tr>`;
    try{[customers,buildings,elevators]=await Promise.all([getCustomers(),getBuildings(),getElevators()]);render();updateKpi();msg(`Đã kết nối Firestore. ${customers.length} khách hàng.`,"success")}
    catch(e){console.error(e);msg(`Lỗi Firebase: ${e.message}`,"error");root.querySelector("#cmBody").innerHTML=`<tr><td colspan="7" style="text-align:center;padding:35px;color:#ef6262">${esc(e.message)}</td></tr>`}
  }
  function closeDetail(){root.querySelector("#cmDetail").classList.remove("show");document.body.style.overflow=""}
  function closeModal(){root.querySelector("#cmModal").classList.remove("show");document.body.style.overflow="";root.querySelector("#cmForm").reset()}
  root.querySelector("#cmAdd").onclick=()=>{root.querySelector("#cmModal").classList.add("show");document.body.style.overflow="hidden";setTimeout(()=>root.querySelector("#cmName")?.focus(),50)}
  root.querySelector("#cmCloseModal").onclick=closeModal;root.querySelector("#cmCancel").onclick=closeModal;root.querySelector("#cmCloseDetail").onclick=closeDetail;
  root.querySelector("#cmDetail").onclick=e=>{if(e.target.id==="cmDetail")closeDetail()}
  root.querySelector("#cmModal").onclick=e=>{if(e.target.id==="cmModal")closeModal()}
  root.querySelector("#cmSearch").oninput=render;root.querySelector("#cmStatus").onchange=render;
  root.addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)detail(b.dataset.view);const t=e.target.closest(".detail-tab");if(t)tab(t.dataset.tab)})
  root.querySelector("#cmForm").onsubmit=async e=>{
    e.preventDefault();const btn=root.querySelector("#cmForm button[type=submit]");const old=btn.textContent;btn.disabled=true;btn.textContent="Đang lưu...";
    const typeMap={"Cá nhân":"individual","Doanh nghiệp":"business","Ban quản lý tòa nhà":"building_management","Chủ đầu tư":"investor"};
    try{
      const created=await createCustomer({name:root.querySelector("#cmName").value.trim(),type:typeMap[root.querySelector("#cmTypeInput").value]||"business",phone:root.querySelector("#cmCustomerPhone").value.trim(),email:root.querySelector("#cmCustomerEmail").value.trim(),taxCode:root.querySelector("#cmTaxCode").value.trim(),address:root.querySelector("#cmAddress").value.trim(),contactPerson:{name:root.querySelector("#cmContactName").value.trim(),phone:root.querySelector("#cmContactPhone").value.trim()},status:"active"});
      closeModal();await load();detail(created.id);
    }catch(err){console.error(err);alert("Không thể lưu khách hàng.\n\n"+err.message)}
    finally{btn.disabled=false;btn.textContent=old}
  };
  await load();
}
