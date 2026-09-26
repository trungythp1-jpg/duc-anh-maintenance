/*
  ĐỨC ANH MAINTENANCE — ELEVATOR MODULE V1.0
  Source baseline: elevators_V1.16_DAE.html
  App Shell architecture: same mount pattern as locked Customer / Building modules.

  No business logic redesign.
  No schema change.
*/

import {
  createElevator,
  updateElevator,
  getElevators,
  getBuildings,
  getCustomers
} from "../core/firestore-v1.js";

const ELEVATOR_CSS = '\n:root{--y:#f5c400;--y2:#ffd83d;--bg:#090909;--panel:#121212;--border:#292929;--text:#f4f4f4;--muted:#949494;--green:#38c793;--red:#ef6262;--blue:#5da9ff}\n*{box-sizing:border-box}\n.elevator-module{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}\nbutton,input,select,textarea{font:inherit}button{cursor:pointer}\n.page{min-height:100vh;padding:28px}.container{width:min(1550px,100%);margin:auto}\n.head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:26px}\n.eyebrow{margin:0 0 7px;color:var(--y);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}\nh1{margin:0;font-size:clamp(28px,3vw,38px);letter-spacing:-.03em}.sub{margin:9px 0 0;color:var(--muted);font-size:14px}\n.primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:9px;padding:12px 17px;background:var(--y);color:#080808;font-weight:800}.primary:hover{background:var(--y2)}\n.primary:disabled{opacity:.6;cursor:not-allowed}\n.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}\n.kpi{position:relative;overflow:hidden;min-height:112px;padding:18px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(145deg,#151515,#101010)}\n.kpi:after{content:"";position:absolute;right:-25px;bottom:-40px;width:110px;height:110px;border-radius:50%;background:rgba(245,196,0,.06)}\n.label{color:var(--muted);font-size:12px}.value{margin-top:9px;font-size:29px;font-weight:800}.note{margin-top:5px;color:var(--muted);font-size:11px}\n.toolbar{display:flex;gap:10px;padding:13px;margin-bottom:14px;border:1px solid var(--border);border-radius:12px;background:var(--panel)}\n.search{position:relative;flex:1}.search span{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#777}\n.search input,.filter{height:42px;width:100%;border:1px solid var(--border);border-radius:8px;background:#0d0d0d;color:var(--text);outline:none}.search input{padding:0 13px 0 37px}.filter{width:190px;padding:0 12px}\n.search input:focus,.filter:focus{border-color:var(--y)}\n.card{overflow:hidden;border:1px solid var(--border);border-radius:12px;background:var(--panel)}\n.card-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)}\n.card-title{font-size:14px;font-weight:800}.count{font-size:12px;color:var(--muted)}\n.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}\ntable{width:100%;min-width:1120px;border-collapse:collapse}\nth{padding:13px 16px;border-bottom:1px solid var(--border);color:#858585;font-size:10px;letter-spacing:.08em;text-align:left;white-space:nowrap}\ntd{padding:15px 16px;border-bottom:1px solid #202020;color:#ddd;font-size:13px;vertical-align:middle}tbody tr:hover{background:#171717}tbody tr:last-child td{border-bottom:0}\nth:nth-last-child(2),td:nth-last-child(2){padding-right:110px}\nth:last-child,td:last-child{position:sticky;right:0;background:var(--panel);box-shadow:-10px 0 18px rgba(0,0,0,.3);z-index:1;min-width:82px}\nthead th:last-child{z-index:3}tbody tr:hover td:last-child{background:#171717}\n.name{font-weight:700;color:#fff}.id{margin-top:4px;color:#666;font-size:10px;font-family:monospace}.muted{color:var(--muted)}\n.status{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}.status:before{content:"";width:6px;height:6px;border-radius:50%}\n.active{background:rgba(56,199,147,.1);color:var(--green)}.active:before{background:var(--green)}\n.maint{background:rgba(93,169,255,.1);color:var(--blue)}.maint:before{background:var(--blue)}\n.care{background:rgba(245,196,0,.1);color:var(--y)}.care:before{background:var(--y)}\n.inactive{background:rgba(239,98,98,.1);color:var(--red)}.inactive:before{background:var(--red)}\n.action{border:1px solid var(--border);border-radius:7px;padding:7px 10px;background:#101010;color:#ccc;font-size:11px}.action:hover{border-color:var(--y);color:var(--y)}.action-group{display:flex;gap:7px;align-items:center;justify-content:flex-end}\n.mobile-list{display:none}.elevator-item{padding:15px;border-bottom:1px solid #202020}.elevator-item:last-child{border:0}\n.e-top{display:flex;justify-content:space-between;gap:10px}.e-meta{margin:8px 0;color:#aaa;font-size:12px;line-height:1.5}\n.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stat{padding:9px;border:1px solid var(--border);border-radius:8px;background:#0d0d0d}.stat b{display:block;font-size:15px}.stat span{color:#777;font-size:9px}\n.bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}\n.backdrop{position:fixed;inset:0;z-index:1000;display:none;background:rgba(0,0,0,.78);backdrop-filter:blur(5px)}.backdrop.show{display:block}\n.drawer{position:absolute;top:0;right:0;width:min(650px,100%);height:100%;overflow-y:auto;background:#111;border-left:1px solid var(--border);box-shadow:-25px 0 80px rgba(0,0,0,.55)}\n.drawer-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid var(--border);background:rgba(17,17,17,.96);backdrop-filter:blur(10px)}\n.kicker{margin:0 0 5px;color:var(--y);font-size:10px;letter-spacing:.12em;text-transform:uppercase}.drawer-head h2{margin:0;font-size:20px}.drawer-id{margin-top:4px;color:#666;font-size:10px;font-family:monospace}\n.drawer-head-actions{display:flex;align-items:center;gap:8px}.drawer-head-actions .action{min-height:34px}\n.close{width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:#171717;color:#aaa;font-size:18px}\n.drawer-body{padding:20px}.section-title{margin:0 0 10px;color:var(--y);font-size:11px;letter-spacing:.1em;text-transform:uppercase}\n.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}.item{padding:12px;border:1px solid var(--border);border-radius:9px;background:#151515}.item span{display:block;color:#777;font-size:10px;margin-bottom:5px}.item b{font-size:13px}\n.tabs{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px;margin-bottom:18px}.tab{flex:0 0 auto;border:1px solid var(--border);border-radius:8px;padding:9px 11px;background:#151515;color:#aaa;font-size:11px}.tab.active{border-color:var(--y);background:rgba(245,196,0,.09);color:var(--y)}\n.list{display:grid;gap:8px}.row{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--border);border-radius:8px;background:#0d0d0d;font-size:12px}.row span{color:#999}\n.footer{display:flex;justify-content:space-between;padding:13px 18px;border-top:1px solid var(--border);color:var(--muted);font-size:11px}\n@media(max-width:900px){.page{padding:20px 16px}.kpis{grid-template-columns:1fr 1fr}}\n@media(max-width:640px){.page{padding:16px 12px}.head{flex-direction:column}.primary{width:100%}.toolbar{flex-direction:column}.filter{width:100%}.scroll{display:none}.mobile-list{display:block}.grid{grid-template-columns:1fr 1fr}.drawer{width:100%;border-left:0}.footer{flex-direction:column;gap:5px}}\n.empty{padding:30px 18px;text-align:center;color:#777;border-top:1px solid var(--border)}\n.loading{padding:24px;text-align:center;color:#999}.error{padding:14px 18px;background:rgba(239,98,98,.08);color:#ef8888;border-bottom:1px solid rgba(239,98,98,.2)}\n.notice{padding:12px 14px;margin-bottom:14px;border:1px solid rgba(245,196,0,.25);border-radius:9px;background:rgba(245,196,0,.06);color:#d8c46c;font-size:12px}\n.modal-backdrop{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(5px)}\n.modal-backdrop.show{display:flex}.modal{width:min(620px,100%);max-height:92vh;overflow:auto;border:1px solid var(--border);border-radius:14px;background:#111;box-shadow:0 30px 100px rgba(0,0,0,.65)}\n.modal-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid var(--border)}.modal-head h3{margin:0;font-size:18px}.modal-head p{margin:5px 0 0;color:#777;font-size:11px}\n.modal-body{padding:20px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}.field label{color:#888;font-size:11px}.field input,.field select{height:42px;padding:0 12px;border:1px solid var(--border);border-radius:8px;background:#0d0d0d;color:#f4f4f4;outline:none}.field input:focus,.field select:focus{border-color:var(--y)}\n.modal-actions{position:sticky;bottom:0;z-index:5;display:flex;justify-content:flex-end;gap:9px;padding:14px 20px;border-top:1px solid var(--border);background:rgba(17,17,17,.97);backdrop-filter:blur(10px)}\n.modal-actions .primary,.modal-actions .secondary{min-height:42px}\n@media(max-width:640px){.modal-actions{justify-content:stretch;padding:12px 16px calc(12px + env(safe-area-inset-bottom))}.modal-actions .secondary,.modal-actions .primary{flex:1}}\n.secondary{border:1px solid var(--border);border-radius:8px;padding:10px 14px;background:#151515;color:#bbb}.secondary:hover{border-color:#555}\n.form-error{display:none;margin-bottom:14px;padding:11px 12px;border:1px solid rgba(239,98,98,.25);border-radius:8px;background:rgba(239,98,98,.08);color:#ef8888;font-size:12px}.form-error.show{display:block}\n@media(max-width:640px){\n  .form-grid{grid-template-columns:1fr}\n  .field.full{grid-column:auto}\n  .modal-backdrop{align-items:flex-start;justify-content:center;padding:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}\n  .modal{width:100%;min-height:100dvh;height:auto;max-height:none;margin:0;display:block;overflow:visible;border:0;border-radius:0}\n  .modal-head{position:sticky;top:0;z-index:10;min-height:68px;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;background:#111}\n  .modal-body{min-height:auto;overflow:visible;padding:18px 16px 30px}\n  .field input,.field select{height:50px;min-height:50px;padding:13px 14px;font-size:16px}\n  .field label{font-size:13px;margin-bottom:0}\n  .modal-actions{position:relative;bottom:auto;display:flex;justify-content:stretch;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#111;border-top:1px solid var(--border)}\n  .modal-actions .secondary,.modal-actions .primary{min-height:48px;flex:1}\n}\n\n/* V1.6 INPUT / MODAL FIX\n   Shared navigation must stay behind page dialogs.\n*/\n.da-shared-sidebar{\n  z-index:900 !important;\n}\n.da-nav-overlay{\n  z-index:850 !important;\n}\n.da-mobile-menu{\n  z-index:950 !important;\n}\n\n/* Customer / Building / Elevator dialogs */\n.modal-backdrop,\n.backdrop,\n.detail-backdrop{\n  z-index:3000 !important;\n}\n\n.modal,\n.drawer{\n  position:relative;\n  z-index:3001;\n}\n\n\n/* V1.8: mobile + button hit-area fix */\n#addButton{position:relative !important;z-index:20 !important;pointer-events:auto !important;touch-action:manipulation !important;}\n#addButton *{pointer-events:none;}\n.modal,.modal-backdrop,.backdrop{z-index:3000 !important;}\n@media (max-width:1100px), (pointer:coarse){\n  .page{padding:22px 14px 30px !important;}\n  .head{flex-direction:column !important;align-items:stretch !important;}\n  .head .primary{width:100% !important;min-height:54px;}\n  .kpis{grid-template-columns:1fr 1fr !important;}\n}\n@media(max-width:640px){\n  .page{padding:16px 12px 30px !important;}\n  .kpis{grid-template-columns:1fr !important;}\n}\n\n\n/* =========================================================\n   SHARED DASHBOARD TOPBAR + SIDEBAR — V1.12\n   Same system as locked Customer / Building.\n   ========================================================= */\n.da-page-topbar{position:sticky;top:0;z-index:950;height:68px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#0b0b0b;border-bottom:1px solid #242424}\n.da-top-menu{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;padding:0;border:1px solid #303030;border-radius:10px;background:#151515;color:#f4f4f4;font-size:21px;line-height:1;-webkit-tap-highlight-color:transparent}\n.da-top-menu:hover{border-color:#555;color:#f5c400}\n.da-breadcrumb{min-width:0;display:flex;align-items:center;gap:9px;color:#777;font-size:12px;white-space:nowrap;overflow:hidden}\n.da-breadcrumb b{color:#444;font-weight:500}.da-breadcrumb span:last-child{color:#ddd;overflow:hidden;text-overflow:ellipsis}\n.da-top-actions{margin-left:auto;display:flex;align-items:center;gap:9px}.da-top-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid #303030;border-radius:10px;background:#151515;color:#ddd;font-size:18px}\n.da-user-chip{display:flex;align-items:center;gap:9px;min-width:0}.da-avatar{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:50%;background:#f5c400;color:#080808;font-size:13px;font-weight:900}.da-user-text{display:flex;flex-direction:column;gap:2px}.da-user-text strong{color:#eee;font-size:11px}.da-user-text small{color:#777;font-size:9px;letter-spacing:.08em}\n.da-shared-sidebar{position:fixed;inset:0 auto 0 0;width:236px;height:100dvh;z-index:900;display:flex;flex-direction:column;background:#0b0b0b;border-right:1px solid #242424;color:#aaa}\n.da-brand{flex:0 0 auto;min-height:96px;display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #242424}.da-brand-mark{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:12px;background:#f5c400;color:#080808;font-weight:900;font-size:17px}.da-brand-name{color:#f4f4f4;font-size:15px;font-weight:800;letter-spacing:.08em}.da-brand-sub{margin-top:4px;color:#777;font-size:10px;letter-spacing:.18em}\n.da-nav-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:20px 12px;-webkit-overflow-scrolling:touch}.da-nav-section{margin-bottom:18px}.da-nav-label{padding:0 14px 9px;color:#666;font-size:10px;font-weight:700;letter-spacing:.18em}.da-nav-item{min-height:46px;display:flex;align-items:center;gap:13px;padding:0 14px;margin:3px 0;border:1px solid transparent;border-radius:10px;color:#aaa;text-decoration:none;font-size:14px;font-weight:600}.da-nav-item:hover{color:#fff;background:#151515}.da-nav-item.active{color:#f5c400;background:rgba(245,196,0,.09);border-color:rgba(245,196,0,.35)}.da-nav-icon{width:22px;flex:0 0 22px;text-align:center;font-size:16px;line-height:1}.da-nav-footer{flex:0 0 auto;padding:16px 20px calc(20px + env(safe-area-inset-bottom));border-top:1px solid #242424;color:#aaa;background:#0b0b0b}.da-nav-footer strong{display:block;color:#aaa;font-size:10px;letter-spacing:.06em}.da-nav-footer span{display:block;margin-top:4px;color:#666;font-size:10px}\n.elevator-module{padding-left:0 !important}.da-nav-overlay{position:fixed;inset:0;z-index:850;display:none;background:rgba(0,0,0,.72);backdrop-filter:blur(3px)}.da-nav-overlay.show{display:block}html.da-sidebar-open,html.da-sidebar-open body{overflow:hidden}\n@media(max-width:820px){.elevator-module{padding-left:0 !important;overflow-x:hidden}.da-shared-sidebar{width:min(315px,88vw);transform:translateX(-105%);transition:transform .22s ease;box-shadow:18px 0 60px rgba(0,0,0,.55)}.da-shared-sidebar.open{transform:translateX(0)}.da-page-topbar{height:68px;padding:0 16px}.da-top-menu{width:54px;height:54px;flex-basis:54px;border-radius:14px;font-size:24px}.da-breadcrumb{flex:1;justify-content:center;font-size:11px}.da-breadcrumb span:first-child,.da-breadcrumb b{display:none}.da-top-actions{margin-left:0;gap:7px}.da-top-icon{width:54px;height:54px;border-radius:14px}.da-avatar{width:54px;height:54px;flex-basis:54px;font-size:15px}.da-user-text{display:none}}\n@media(max-width:640px){.da-page-topbar{padding:0 16px}.da-top-menu,.da-top-icon,.da-avatar{width:54px;height:54px}.da-top-menu{flex-basis:54px}.da-avatar{flex-basis:54px}.page{padding-top:16px !important}}\n\n';

export async function mountElevatorModule(root) {
  if(!root) throw new Error("ELEVATOR_ROOT_NOT_FOUND");

  const styleId = "elevator-module-style";
  if(!document.getElementById(styleId)){
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = ELEVATOR_CSS;
    document.head.appendChild(style);
  }

  root.innerHTML = '<div class="elevator-module"><main class="page">\n<div class="container">\n<header class="head">\n<div>\n<p class="eyebrow">Elevator Asset Management</p>\n<h1>Thang máy</h1>\n<p class="sub">Quản lý tài sản thang máy, tủ điện và toàn bộ vòng đời dịch vụ.</p>\n</div>\n<button class="primary" id="addButton" type="button">＋ <span>Thêm thang máy</span></button>\n</header>\n<section class="kpis">\n<article class="kpi"><div class="label">Tổng thang máy</div><div class="value" id="kpiTotal">0</div><div class="note">Tài sản đang quản lý</div></article>\n<article class="kpi"><div class="label">Đang hoạt động</div><div class="value" id="kpiActive">0</div><div class="note">Đang vận hành</div></article>\n<article class="kpi"><div class="label">Đang bảo trì</div><div class="value" id="kpiMaint">0</div><div class="note">Có dịch vụ theo dõi</div></article>\n<article class="kpi"><div class="label">Cần xử lý</div><div class="value" id="kpiCare">0</div><div class="note">Cần kiểm tra / liên hệ</div></article>\n</section>\n<section class="toolbar">\n<div class="search"><span>⌕</span><input autocomplete="off" id="search" placeholder="Tìm mã thang, tên tòa nhà, khách hàng..." type="search"/></div>\n<select class="filter" id="status">\n<option value="all">Tất cả trạng thái</option>\n<option value="active">Đang hoạt động</option>\n<option value="maint">Đang bảo trì</option>\n<option value="care">Cần xử lý</option>\n<option value="inactive">Ngừng hoạt động</option>\n</select>\n</section>\n<div id="messageArea"></div>\n<section class="card">\n<div class="card-head"><div class="card-title">Danh sách thang máy</div><div class="count" id="count">0 thang máy</div></div>\n<div class="scroll">\n<table>\n<thead>\n<tr>\n<th>Thang máy</th>\n<th>Tòa nhà</th>\n<th>Khách hàng</th>\n<th>Tải trọng</th>\n<th>Số tầng</th>\n<th>Máy kéo</th>\n<th>Tủ điện</th>\n<th>Trạng thái</th>\n<th></th>\n</tr>\n</thead>\n<tbody id="tbody"></tbody>\n</table>\n</div>\n<div class="mobile-list" id="mobileList"></div>\n<div class="footer"><span>Dữ liệu Firebase DEV — Mã thang tự động DAE - 000001.</span><span>DEV V1.16</span></div>\n</section>\n</div>\n</main>\n<div class="backdrop" id="backdrop">\n<aside aria-modal="true" class="drawer" role="dialog">\n<div class="drawer-head">\n<div>\n<p class="kicker">Elevator Asset Profile</p>\n<h2 id="dName">—</h2>\n<div class="drawer-id" id="dId">—</div>\n</div>\n<div class="drawer-head-actions">\n<button class="action" id="editDetail" type="button">Sửa</button>\n<button class="close" id="closeDetail" type="button">×</button>\n</div>\n</div>\n<div class="drawer-body">\n<div id="dStatus" style="margin-bottom:18px"></div>\n<p class="section-title">Định danh &amp; quan hệ</p>\n<div class="grid">\n<div class="item"><span>Tòa nhà</span><b id="dBuilding">—</b></div>\n<div class="item"><span>Khách hàng</span><b id="dCustomer">—</b></div>\n<div class="item"><span>Mã thang</span><b id="dAssetCode">—</b></div>\n<div class="item"><span>Định danh Firebase</span><b id="dFirebaseId">Auto ID</b></div>\n<div class="item"><span>Trạng thái tài sản</span><b id="dAssetStatus">—</b></div>\n</div>\n<p class="section-title">Thông số kỹ thuật</p>\n<div class="grid">\n<div class="item"><span>Tải trọng</span><b id="dCapacity">—</b></div>\n<div class="item"><span>Tốc độ</span><b id="dSpeed">—</b></div>\n<div class="item"><span>Số tầng / điểm dừng</span><b id="dStops">—</b></div>\n<div class="item"><span>Máy kéo</span><b id="dMachine">—</b></div>\n<div class="item"><span>Tủ điện</span><b id="dController">—</b></div>\n<div class="item"><span>Năm lắp đặt</span><b id="dYear">—</b></div>\n</div>\n<p class="section-title">Dịch vụ</p>\n<div class="grid">\n<div class="item"><span>Bảo trì</span><b id="dMaintenance">—</b></div>\n<div class="item"><span>Hợp đồng</span><b>Chưa kết nối</b></div>\n<div class="item"><span>Work Order</span><b>Chưa kết nối</b></div>\n<div class="item"><span>Kỳ bảo trì gần nhất</span><b>Chưa kết nối</b></div>\n</div>\n<div class="tabs">\n<button class="tab active" data-tab="history" type="button">Lịch sử</button>\n<button class="tab" data-tab="maintenance" type="button">Bảo trì</button>\n<button class="tab" data-tab="workorders" type="button">Work Order</button>\n<button class="tab" data-tab="contracts" type="button">Hợp đồng</button>\n</div>\n<div class="list" id="dList"></div>\n</div>\n</aside>\n</div>\n<div class="modal-backdrop" id="modalBackdrop">\n<section aria-labelledby="modalTitle" aria-modal="true" class="modal" role="dialog">\n<div class="modal-head">\n<div>\n<h3 id="modalTitle">Thêm thang máy</h3>\n<p>Mã thang được hệ thống tự động cấp theo thứ tự DAE - 000001, không nhập tay và không thay đổi sau khi cấp.</p>\n</div>\n<button class="close" id="closeModal" type="button">×</button>\n</div>\n<form id="elevatorForm">\n<input id="editingElevatorId" type="hidden"/>\n<div class="modal-body">\n<div class="form-error" id="formError"></div>\n<div class="form-grid">\n<div class="field full">\n<label for="eName">Tên thang máy *</label>\n<input id="eName" placeholder="Ví dụ: Thang máy nhà anh Trung" required=""/>\n</div>\n<div class="field">\n<label for="customerSelect">Khách hàng *</label>\n<select id="customerSelect" required="">\n<option value="">Đang tải...</option>\n</select>\n</div>\n<div class="field">\n<label for="buildingSelect">Tòa nhà *</label>\n<select disabled="" id="buildingSelect" required="">\n<option value="">Chọn khách hàng trước</option>\n</select>\n</div>\n<div class="field">\n<label for="elevatorStatus">Tình trạng thang máy</label>\n<select id="elevatorStatus">\n<option value="active">Đang hoạt động</option>\n<option value="maint">Đang bảo trì</option>\n<option value="care">Cần xử lý</option>\n<option value="inactive">Ngừng hoạt động</option>\n</select>\n<div style="margin-top:5px;color:#666;font-size:10px;line-height:1.4">\nĐây là trạng thái vận hành của tài sản. Trạng thái bảo trì được quản lý riêng.\n</div>\n</div>\n<div class="field">\n<label for="capacity">Tải trọng (kg)</label>\n<input id="capacity" min="1" placeholder="350" type="number"/>\n</div>\n<div class="field">\n<label for="speed">Tốc độ (m/s)</label>\n<input id="speed" placeholder="0.75"/>\n</div>\n<div class="field">\n<label for="stops">Số tầng / điểm dừng</label>\n<input id="stops" min="1" placeholder="5" type="number"/>\n</div>\n<div class="field">\n<label for="year">Năm lắp đặt</label>\n<input id="year" max="2100" min="1900" placeholder="2026" type="number"/>\n</div>\n<div class="field">\n<label for="machine">Máy kéo</label>\n<input id="machine" placeholder="Torin"/>\n</div>\n<div class="field">\n<label for="controller">Tủ điện</label>\n<input id="controller" placeholder="Step"/>\n</div>\n</div>\n</div>\n<div class="modal-actions">\n<button class="secondary" id="cancelModal" type="button">Hủy</button>\n<button class="primary" id="saveButton" type="submit">Lưu thang máy</button>\n</div>\n</form>\n</section>\n</div></div>';

/*
  ĐỨC ANH MAINTENANCE — ELEVATOR MODULE V1.16
  Reference architecture:
  - Customer page: direct Firebase data lifecycle
  - Building page V1.30: getCustomers/getBuildings/getElevators
  - One module only
  - Refresh Customer + Building references whenever the form opens
  - Add / Edit use the same Firestore service
*/


const $ = id => root.querySelector(`#${id}`);

let elevators = [];
let buildings = [];
let customers = [];

const statusMap = {
  active: ["Đang hoạt động", "active"],
  maint: ["Đang bảo trì", "maint"],
  care: ["Cần xử lý", "care"],
  inactive: ["Ngừng hoạt động", "inactive"]
};

function safe(value){
  return String(value ?? "").trim();
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function statusLabel(status){
  const item = statusMap[status] || statusMap.inactive;
  return `<span class="status ${item[1]}">${item[0]}</span>`;
}

function customerName(id){
  return customers.find(item => item.id === id)?.name || "Không xác định";
}

function buildingName(id){
  return buildings.find(item => item.id === id)?.name || "Không xác định";
}

function capacityLabel(value){
  return value === null || value === undefined || value === ""
    ? "—"
    : `${value} kg`;
}

function speedLabel(value){
  return value === null || value === undefined || value === ""
    ? "—"
    : `${value} m/s`;
}

function machineLabel(elevator){
  return elevator?.technical?.machine?.brand || "—";
}

function controllerLabel(elevator){
  return elevator?.technical?.controller?.brand || "—";
}

function filtered(){
  const query = safe($("search").value).toLowerCase();
  const status = $("status").value;

  return elevators.filter(elevator => {
    const haystack = [
      elevator.assetCode,
      elevator.id,
      elevator.name,
      buildingName(elevator.buildingId),
      customerName(elevator.customerId),
      machineLabel(elevator),
      controllerLabel(elevator)
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query)) &&
           (status === "all" || elevator.status === status);
  });
}

function renderKpis(){
  $("kpiTotal").textContent = elevators.length;
  $("kpiActive").textContent =
    elevators.filter(item => item.status === "active").length;
  $("kpiMaint").textContent =
    elevators.filter(item => item.status === "maint").length;
  $("kpiCare").textContent =
    elevators.filter(item => item.status === "care").length;
}

function render(){
  const list = filtered();

  $("count").textContent = `${list.length} thang máy`;

  $("tbody").innerHTML = list.map(elevator => `
    <tr>
      <td>
        <div class="name">${escapeHtml(elevator.name)}</div>
        <div class="id">${escapeHtml(elevator.assetCode || "Chưa cấp mã")}</div>
        <div class="id">ID: ${escapeHtml(elevator.id)}</div>
      </td>
      <td>${escapeHtml(buildingName(elevator.buildingId))}</td>
      <td>${escapeHtml(customerName(elevator.customerId))}</td>
      <td>${escapeHtml(capacityLabel(elevator.technical?.capacityKg))}</td>
      <td>${escapeHtml(elevator.technical?.stops ?? "—")}</td>
      <td>${escapeHtml(machineLabel(elevator))}</td>
      <td>${escapeHtml(controllerLabel(elevator))}</td>
      <td>${statusLabel(elevator.status)}</td>
      <td>
        <div class="action-group">
          <button class="action" data-view="${escapeHtml(elevator.id)}" type="button">Xem</button>
          <button class="action" data-edit-elevator="${escapeHtml(elevator.id)}" type="button">Sửa</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("mobileList").innerHTML = list.map(elevator => `
    <article class="elevator-item">
      <div class="e-top">
        <div>
          <div class="name">${escapeHtml(elevator.name)}</div>
          <div class="id">${escapeHtml(elevator.assetCode || "Chưa cấp mã")}</div>
        </div>
        ${statusLabel(elevator.status)}
      </div>

      <div class="e-meta">
        <strong style="color:#f5c400">${escapeHtml(elevator.assetCode || "Chưa cấp mã")}</strong><br>
        ${escapeHtml(buildingName(elevator.buildingId))}<br>
        ${escapeHtml(customerName(elevator.customerId))}<br>
        ${escapeHtml(machineLabel(elevator))}
        · ${escapeHtml(controllerLabel(elevator))}
        · ${escapeHtml(capacityLabel(elevator.technical?.capacityKg))}
        · ${escapeHtml(elevator.technical?.stops ?? "—")} điểm dừng
      </div>

      <div class="stats">
        <div class="stat">
          <b>${escapeHtml(capacityLabel(elevator.technical?.capacityKg))}</b>
          <span>TẢI TRỌNG</span>
        </div>
        <div class="stat">
          <b>${escapeHtml(elevator.technical?.stops ?? "—")}</b>
          <span>ĐIỂM DỪNG</span>
        </div>
        <div class="stat">
          <b>${escapeHtml(elevator.technical?.installationYear ?? "—")}</b>
          <span>LẮP ĐẶT</span>
        </div>
      </div>

      <div class="bottom">
        <span class="muted">
          ${escapeHtml(
            elevator.service?.maintenanceStatus === "active"
              ? "Đang theo dõi"
              : elevator.service?.maintenanceStatus || "—"
          )}
        </span>
        <div class="action-group">
          <button class="action" data-view="${escapeHtml(elevator.id)}" type="button">Xem hồ sơ</button>
          <button class="action" data-edit-elevator="${escapeHtml(elevator.id)}" type="button">Sửa</button>
        </div>
      </div>
    </article>
  `).join("");

  if(!list.length){
    $("tbody").innerHTML = "";
    $("mobileList").innerHTML =
      '<div class="empty">Chưa có thang máy phù hợp với bộ lọc hiện tại.</div>';
  }
}

function setMessage(message="", type=""){
  const area = $("messageArea");
  if(!area) return;

  if(!message){
    area.innerHTML = "";
    return;
  }

  if(type === "error"){
    area.innerHTML =
      `<div class="error">${escapeHtml(message)}</div>`;
  }else{
    area.innerHTML =
      `<div class="notice">${escapeHtml(message)}</div>`;
  }
}

function showFormError(message=""){
  const box = $("formError");
  box.textContent = message;
  box.classList.toggle("show", Boolean(message));
}

function renderCustomerOptions(selectedId=""){
  const select = $("customerSelect");

  if(!customers.length){
    select.innerHTML = '<option value="">Chưa có khách hàng</option>';
    select.disabled = true;

    $("buildingSelect").innerHTML =
      '<option value="">Chưa có tòa nhà</option>';
    $("buildingSelect").disabled = true;
    return;
  }

  select.disabled = false;

  const sorted = customers
    .slice()
    .sort((a,b) =>
      String(a.name || "").localeCompare(
        String(b.name || ""),
        "vi"
      )
    );

  select.innerHTML =
    '<option value="">Chọn khách hàng</option>' +
    sorted.map(customer =>
      `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}</option>`
    ).join("");

  if(selectedId){
    select.value = selectedId;
  }

  renderBuildingOptions(selectedId);
}

function renderBuildingOptions(customerId="", selectedBuildingId=""){
  const select = $("buildingSelect");

  if(!customerId){
    select.innerHTML =
      '<option value="">Chọn khách hàng trước</option>';
    select.disabled = true;
    return;
  }

  const relatedBuildings = buildings
    .filter(building =>
      String(building.customerId || "") === String(customerId)
    )
    .sort((a,b) =>
      String(a.name || "").localeCompare(
        String(b.name || ""),
        "vi"
      )
    );

  if(!relatedBuildings.length){
    select.innerHTML =
      '<option value="">Khách hàng chưa có tòa nhà</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;

  select.innerHTML =
    '<option value="">Chọn tòa nhà</option>' +
    relatedBuildings.map(building =>
      `<option value="${escapeHtml(building.id)}">${escapeHtml(building.name)}</option>`
    ).join("");

  if(selectedBuildingId){
    select.value = selectedBuildingId;
  }
}

/*
 * Same data-loading pattern as Building V1.30:
 * one try/catch around the three Firestore reads.
 * This prevents "Đang tải..." from staying forever.
 */
async function loadData(){
  setMessage("");

  $("tbody").innerHTML =
    '<tr><td colspan="9"><div class="loading">Đang tải dữ liệu từ Firebase...</div></td></tr>';
  $("mobileList").innerHTML = "";

  try{
    const [customerData, buildingData, elevatorData] =
      await Promise.all([
        getCustomers(),
        getBuildings(),
        getElevators()
      ]);

    customers = customerData || [];
    buildings = buildingData || [];
    elevators = elevatorData || [];

    renderCustomerOptions();
    renderKpis();
    render();

    $("count").textContent = `${elevators.length} thang máy`;

    setMessage(
      `Đã kết nối Firestore. ${customers.length} khách hàng · ${buildings.length} tòa nhà · ${elevators.length} thang máy.`,
      "success"
    );
  }catch(error){
    console.error("ELEVATOR FIRESTORE ERROR:", error);

    customers = [];
    buildings = [];
    elevators = [];

    renderCustomerOptions();
    renderKpis();
    render();

    setMessage(
      `Không thể tải dữ liệu Firebase: ${error?.message || "UNKNOWN_ERROR"}`,
      "error"
    );
  }
}

/*
 * Always refresh Customer + Building when opening the form.
 * This mirrors Building V1.30, where references are refreshed
 * before the modal is populated.
 */
async function refreshReferences(){
  try{
    const [customerData, buildingData] = await Promise.all([
      getCustomers(),
      getBuildings()
    ]);

    customers = customerData || [];
    buildings = buildingData || [];

    return true;
  }catch(error){
    console.error("REFRESH ELEVATOR REFERENCES ERROR:", error);

    showFormError(
      `Không thể tải khách hàng / tòa nhà: ${error?.message || "UNKNOWN_ERROR"}`
    );

    return false;
  }
}

function resetForm(){
  $("elevatorForm").reset();

  $("editingElevatorId").value = "";
  $("modalTitle").textContent = "Thêm thang máy";
  $("saveButton").textContent = "Lưu thang máy";
  $("saveButton").disabled = false;

  $("elevatorStatus").value = "active";

  showFormError("");

  renderCustomerOptions();

  if(!customers.length){
    showFormError("Chưa có khách hàng. Hãy tạo khách hàng trước.");
  }else if(!buildings.length){
    showFormError("Chưa có tòa nhà. Hãy tạo tòa nhà trước.");
  }
}

async function openModal(){
  const loaded = await refreshReferences();

  resetForm();

  $("modalBackdrop").classList.add("show");
  document.body.style.overflow = "hidden";

  const modal = $("modalBackdrop .modal");
  if(modal) modal.scrollTop = 0;

  if(!loaded){
    $("saveButton").disabled = true;
    return;
  }

  if(window.innerWidth > 640){
    setTimeout(() => $("eName").focus(), 40);
  }
}

async function openEditModal(id){
  const elevator = elevators.find(item => item.id === id);
  if(!elevator) return;

  const loaded = await refreshReferences();

  $("elevatorForm").reset();
  $("editingElevatorId").value = elevator.id;
  $("modalTitle").textContent = "Sửa thang máy";
  $("saveButton").textContent = "Lưu thay đổi";
  $("saveButton").disabled = !loaded;

  showFormError("");

  $("eName").value = elevator.name || "";

  renderCustomerOptions(elevator.customerId || "");
  renderBuildingOptions(
    elevator.customerId || "",
    elevator.buildingId || ""
  );

  $("elevatorStatus").value = elevator.status || "active";
  $("capacity").value = elevator.technical?.capacityKg ?? "";
  $("speed").value = elevator.technical?.speed ?? "";
  $("stops").value = elevator.technical?.stops ?? "";
  $("year").value = elevator.technical?.installationYear ?? "";
  $("machine").value = elevator.technical?.machine?.brand ?? "";
  $("controller").value = elevator.technical?.controller?.brand ?? "";

  $("modalBackdrop").classList.add("show");
  document.body.style.overflow = "hidden";

  const modal = $("modalBackdrop .modal");
  if(modal) modal.scrollTop = 0;

  if(!loaded){
    showFormError(
      "Không tải được dữ liệu tham chiếu. Vui lòng đóng form và thử lại."
    );
  }
}

function closeModal(){
  $("modalBackdrop").classList.remove("show");
  document.body.style.overflow = "";
}

function openDetail(id){
  const elevator = elevators.find(item => item.id === id);
  if(!elevator) return;

  $("dName").textContent = elevator.name || "—";
  $("dId").textContent = elevator.assetCode || "Chưa cấp mã";
  $("dAssetCode").textContent = elevator.assetCode || "Chưa cấp mã";
  $("dFirebaseId").textContent = elevator.id;
  $("dStatus").innerHTML = statusLabel(elevator.status);
  $("dBuilding").textContent = buildingName(elevator.buildingId);
  $("dCustomer").textContent = customerName(elevator.customerId);
  $("dAssetStatus").textContent =
    elevator.status === "inactive"
      ? "Ngừng hoạt động"
      : "Đang quản lý";

  $("dCapacity").textContent =
    capacityLabel(elevator.technical?.capacityKg);
  $("dSpeed").textContent =
    speedLabel(elevator.technical?.speed);
  $("dStops").textContent =
    elevator.technical?.stops ?? "—";
  $("dMachine").textContent =
    machineLabel(elevator);
  $("dController").textContent =
    controllerLabel(elevator);
  $("dYear").textContent =
    elevator.technical?.installationYear ?? "—";
  $("dMaintenance").textContent =
    elevator.service?.maintenanceStatus === "active"
      ? "Đang theo dõi"
      : elevator.service?.maintenanceStatus || "—";

  $("editDetail").onclick = async () => {
    closeDetail();
    await openEditModal(elevator.id);
  };

  setTab("history");

  $("backdrop").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeDetail(){
  $("backdrop").classList.remove("show");
  document.body.style.overflow = "";
}

function setTab(tab){
  root.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === tab
    );
  });

  const data = {
    history:[
      ["Thông tin tài sản","Đang quản lý"],
      ["Quan hệ tòa nhà","Đang theo dõi"],
      ["Quan hệ khách hàng","Đang theo dõi"]
    ],
    maintenance:[
      ["Module bảo trì","Chưa kết nối"],
      ["Lịch bảo trì","Chưa kết nối"],
      ["Checklist","Chưa kết nối"]
    ],
    workorders:[
      ["Module Work Order","Chưa kết nối"],
      ["Lệnh sửa chữa","Chưa kết nối"],
      ["Xử lý sự cố","Chưa kết nối"]
    ],
    contracts:[
      ["Module hợp đồng","Chưa kết nối"],
      ["Hợp đồng bảo trì","Chưa kết nối"]
    ]
  };

  $("dList").innerHTML =
    (data[tab] || []).map(item => `
      <div class="row">
        <b>${escapeHtml(item[0])}</b>
        <span>${escapeHtml(item[1])}</span>
      </div>
    `).join("");
}

async function handleCreate(event){
  event.preventDefault();

  const name = safe($("eName").value);
  const customerId = safe($("customerSelect").value);
  const buildingId = safe($("buildingSelect").value);
  const editingId = safe($("editingElevatorId").value);

  showFormError("");

  if(!name){
    showFormError("Tên thang máy là bắt buộc.");
    return;
  }

  if(!customerId){
    showFormError("Vui lòng chọn khách hàng.");
    return;
  }

  if(!buildingId){
    showFormError("Vui lòng chọn tòa nhà.");
    return;
  }

  const selectedStatus = $("elevatorStatus").value;

  if(!["active","maint","care","inactive"].includes(selectedStatus)){
    showFormError("Vui lòng chọn tình trạng thang máy.");
    return;
  }

  const selectedCustomer =
    customers.find(item => item.id === customerId);

  if(!selectedCustomer){
    showFormError("Khách hàng không còn tồn tại trong Firebase.");
    return;
  }

  const selectedBuilding =
    buildings.find(item => item.id === buildingId);

  if(!selectedBuilding){
    showFormError("Tòa nhà không còn tồn tại trong Firebase.");
    return;
  }

  if(String(selectedBuilding.customerId || "") !== String(customerId)){
    showFormError(
      "Tòa nhà không thuộc khách hàng đã chọn."
    );
    return;
  }

  const button = $("saveButton");

  button.disabled = true;
  button.textContent =
    editingId ? "Đang lưu..." : "Đang lưu...";

  const payload = {
    name,
    customerId,
    buildingId,
    status: selectedStatus,
    technical:{
      capacityKg:
        safe($("capacity").value)
          ? Number($("capacity").value)
          : null,

      speed:
        safe($("speed").value) || null,

      stops:
        safe($("stops").value)
          ? Number($("stops").value)
          : null,

      machine:{
        brand: safe($("machine").value),
        model:""
      },

      controller:{
        brand: safe($("controller").value),
        model:""
      },

      installationYear:
        safe($("year").value)
          ? Number($("year").value)
          : null
    }
  };

  try{
    let saved;

    if(editingId){
      saved = await updateElevator(
        editingId,
        payload
      );
    }else{
      saved = await createElevator({
        ...payload,
        service:{
          maintenanceStatus:"active"
        }
      });
    }

    closeModal();

    await loadData();

    setMessage(
      editingId
        ? `Đã cập nhật thang máy "${saved?.name || name}" thành công. Mã thang: ${saved?.assetCode || "—"}`
        : `Đã tạo thang máy "${saved?.name || name}" thành công. Mã thang: ${saved?.assetCode || "—"}`,
      "success"
    );

  }catch(error){
    console.error(
      editingId
        ? "UPDATE ELEVATOR ERROR:"
        : "CREATE ELEVATOR ERROR:",
      error
    );

    showFormError(
      error?.message ||
      (editingId
        ? "Không thể cập nhật thang máy."
        : "Không thể tạo thang máy.")
    );

  }finally{
    button.disabled = false;
    button.textContent =
      editingId
        ? "Lưu thay đổi"
        : "Lưu thang máy";
  }
}

/* Add button — same direct DOM binding model as Building. */
$("addButton").addEventListener("click", async event => {
  event.preventDefault();
  event.stopPropagation();

  try{
    await openModal();
  }catch(error){
    console.error("OPEN ELEVATOR MODAL ERROR:", error);
    setMessage(
      error?.message || "Không thể mở form tạo thang máy.",
      "error"
    );
  }
});

$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);

$("modalBackdrop").addEventListener("click", event => {
  if(event.target === $("modalBackdrop")){
    closeModal();
  }
});

$("customerSelect").addEventListener("change", event => {
  renderBuildingOptions(event.target.value);
});

$("elevatorForm").addEventListener("submit", handleCreate);

$("search").addEventListener("input", render);
$("status").addEventListener("change", render);

$("closeDetail").addEventListener("click", closeDetail);

$("backdrop").addEventListener("click", event => {
  if(event.target === $("backdrop")){
    closeDetail();
  }
});

root.addEventListener("click", event => {
  const editButton =
    event.target.closest("[data-edit-elevator]");

  if(editButton){
    event.preventDefault();
    event.stopPropagation();

    openEditModal(
      editButton.dataset.editElevator
    ).catch(error => {
      console.error("OPEN EDIT ELEVATOR ERROR:", error);
      setMessage(
        error?.message || "Không thể mở form sửa thang máy.",
        "error"
      );
    });

    return;
  }

  const viewButton =
    event.target.closest("[data-view]");

  if(viewButton){
    openDetail(viewButton.dataset.view);
  }
});

root.querySelectorAll(".tab").forEach(button => {
  button.addEventListener(
    "click",
    () => setTab(button.dataset.tab)
  );
});

root.addEventListener("keydown", event => {
  if(event.key === "Escape"){
    closeDetail();
    closeModal();
  }
});

/* Initial page load — same pattern as Building V1.30. */
loadData().catch(error => {
  console.error("ELEVATOR PAGE ERROR:", error);

  setMessage(
    error?.message ||
    "Không thể khởi tạo module Thang máy.",
    "error"
  );
});
}
