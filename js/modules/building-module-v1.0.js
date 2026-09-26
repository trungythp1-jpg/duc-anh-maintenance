// BUILDING APP SHELL MODULE V1.1
// Based directly on the currently working Building App Shell module. No Firebase/business logic changed.
export async function mountBuildingModule(container){
  if(!container) throw new Error("BUILDING_CONTAINER_REQUIRED");

  const styleId = "building-module-style";
  if(!document.getElementById(styleId)){
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = ':root{\n      --y:#f5c400;--y2:#ffd83d;--bg:#090909;--panel:#121212;--panel2:#171717;\n      --border:#292929;--text:#f4f4f4;--muted:#949494;--green:#38c793;\n      --red:#ef6262;--blue:#5da9ff;\n    }\n    *{box-sizing:border-box}\n    .building-module{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}\n    .building-module button,.building-module input,.building-module select,.building-module textarea{font:inherit}.building-module button{cursor:pointer}\n    .page{min-height:100vh;padding:28px}.container{width:min(1500px,100%);margin:auto}\n    .head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:26px}\n    .eyebrow{margin:0 0 7px;color:var(--y);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}\n    .building-module h1{margin:0;font-size:clamp(28px,3vw,38px);letter-spacing:-.03em}\n    .sub{margin:9px 0 0;color:var(--muted);font-size:14px}\n    .primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:9px;padding:12px 17px;background:var(--y);color:#080808;font-weight:800}\n    .primary:hover{background:var(--y2)}.primary:disabled{opacity:.6;cursor:not-allowed}\n    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}\n    .kpi{position:relative;overflow:hidden;min-height:112px;padding:18px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(145deg,#151515,#101010)}\n    .kpi:after{content:"";position:absolute;right:-25px;bottom:-40px;width:110px;height:110px;border-radius:50%;background:rgba(245,196,0,.06)}\n    .label{color:var(--muted);font-size:12px}.value{margin-top:9px;font-size:29px;font-weight:800}.note{margin-top:5px;color:var(--muted);font-size:11px}\n    .toolbar{display:flex;gap:10px;padding:13px;margin-bottom:14px;border:1px solid var(--border);border-radius:12px;background:var(--panel)}\n    .search{position:relative;flex:1}.search span{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#777}\n    .search input,.filter{height:42px;width:100%;border:1px solid var(--border);border-radius:8px;background:#0d0d0d;color:var(--text);outline:none}\n    .search input{padding:0 13px 0 37px}.filter{width:190px;padding:0 12px}.search input:focus,.filter:focus{border-color:var(--y)}\n    .card{overflow:hidden;border:1px solid var(--border);border-radius:12px;background:var(--panel)}\n    .card-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)}\n    .card-title{font-size:14px;font-weight:800}.count{font-size:12px;color:var(--muted)}\n    .notice{margin:0;padding:11px 16px;border-bottom:1px solid var(--border);font-size:12px;line-height:1.5;display:none}\n    .notice.show{display:block}.notice.success{color:var(--green);background:rgba(56,199,147,.04)}.notice.error{color:var(--red);background:rgba(239,98,98,.04)}.notice.info{color:#aaa;background:rgba(255,255,255,.02)}\n    .scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}\n    .building-module table{width:100%;min-width:980px;border-collapse:collapse}\n    .building-module th{padding:13px 16px;border-bottom:1px solid var(--border);color:#858585;font-size:10px;letter-spacing:.08em;text-align:left;white-space:nowrap}\n    .building-module td{padding:15px 16px;border-bottom:1px solid #202020;color:#ddd;font-size:13px;vertical-align:middle}\n    .building-module tbody tr:hover{background:#171717}tbody tr:last-child .building-module td{border-bottom:0}\n    th:nth-last-child(2),td:nth-last-child(2){padding-right:110px}\n    th:last-child,td:last-child{position:sticky;right:0;background:var(--panel);box-shadow:-10px 0 18px rgba(0,0,0,.3);z-index:1;min-width:82px}\n    .building-module thead th:last-child{z-index:3}tbody tr:hover td:last-child{background:#171717}\n    .name{font-weight:700;color:#fff}.id{margin-top:4px;color:#666;font-size:10px;font-family:monospace}.muted{color:var(--muted)}\n    .status{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}.status:before{content:"";width:6px;height:6px;border-radius:50%}\n    .active{background:rgba(56,199,147,.1);color:var(--green)}.active:before{background:var(--green)}\n    .care{background:rgba(245,196,0,.1);color:var(--y)}.care:before{background:var(--y)}\n    .inactive{background:rgba(239,98,98,.1);color:var(--red)}.inactive:before{background:var(--red)}\n    .action{border:1px solid var(--border);border-radius:7px;padding:7px 10px;background:#101010;color:#ccc;font-size:11px}.action:hover{border-color:var(--y);color:var(--y)}.action.danger{color:#e95f5f;border-color:rgba(239,98,98,.28)}.action.danger:hover{border-color:#ef6262;background:rgba(239,98,98,.08);color:#ff7777}.action-group{display:flex;align-items:center;gap:6px;white-space:nowrap}\n    .mobile-list{display:none}.building-item{padding:15px;border-bottom:1px solid #202020}.building-item:last-child{border:0}\n    .building-top{display:flex;justify-content:space-between;gap:10px}.building-contact{margin:8px 0;color:#aaa;font-size:12px;line-height:1.5}\n    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stat{padding:9px;border:1px solid var(--border);border-radius:8px;background:#0d0d0d}.stat b{display:block;font-size:15px}.stat span{color:#777;font-size:9px}\n    .bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}\n    .backdrop{position:fixed;inset:0;z-index:1000;display:none;background:rgba(0,0,0,.78);backdrop-filter:blur(5px)}.backdrop.show{display:block}\n    .drawer{position:absolute;top:0;right:0;width:min(620px,100%);height:100%;overflow-y:auto;background:#111;border-left:1px solid var(--border);box-shadow:-25px 0 80px rgba(0,0,0,.55)}\n    .drawer-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid var(--border);background:rgba(17,17,17,.96);backdrop-filter:blur(10px)}\n    .kicker{margin:0 0 5px;color:var(--y);font-size:10px;letter-spacing:.12em;text-transform:uppercase}.drawer-head h2{margin:0;font-size:20px}.drawer-id{margin-top:4px;color:#666;font-size:10px;font-family:monospace}\n    .close{width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:#171717;color:#aaa;font-size:18px}.drawer-body{padding:20px}\n    .section-title{margin:0 0 10px;color:var(--y);font-size:11px;letter-spacing:.1em;text-transform:uppercase}\n    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}.item{padding:12px;border:1px solid var(--border);border-radius:9px;background:#151515}.item span{display:block;color:#777;font-size:10px;margin-bottom:5px}.item b{font-size:13px}\n    .tabs{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px;margin-bottom:18px}.tab{flex:0 0 auto;border:1px solid var(--border);border-radius:8px;padding:9px 11px;background:#151515;color:#aaa;font-size:11px}.tab.active{border-color:var(--y);background:rgba(245,196,0,.09);color:var(--y)}\n    .list{display:grid;gap:8px}.row{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--border);border-radius:8px;background:#0d0d0d;font-size:12px}.row span{color:#999}\n    .empty{padding:16px;border:1px dashed var(--border);border-radius:9px;color:#777;font-size:12px;text-align:center}\n    .modal{\n      position:fixed;\n      inset:0;\n      z-index:1100;\n      display:none;\n      align-items:center;\n      justify-content:center;\n      padding:20px;\n      background:rgba(0,0,0,.78);\n      backdrop-filter:blur(5px);\n    }\n    .modal.show{display:flex}\n\n    /* Match the locked Customer modal on Desktop + iPad */\n    .modal-box{\n      width:min(720px,100%);\n      height:min(800px,calc(100dvh - 40px));\n      max-height:calc(100dvh - 40px);\n      display:flex;\n      flex-direction:column;\n      overflow:hidden;\n      border:1px solid var(--border);\n      border-radius:14px;\n      background:#111;\n      box-shadow:0 25px 80px rgba(0,0,0,.55);\n    }\n\n    .modal-head{\n      position:sticky;\n      top:0;\n      z-index:5;\n      flex:0 0 auto;\n      display:flex;\n      justify-content:space-between;\n      align-items:center;\n      padding:17px 20px;\n      border-bottom:1px solid var(--border);\n      background:#111;\n    }\n    .modal-head h2{margin:0;font-size:18px}\n\n    /* CRITICAL: the form owns the modal\'s scrollable body + fixed footer */\n    .modal-box > form{\n      flex:1 1 auto;\n      min-height:0;\n      display:flex;\n      flex-direction:column;\n      overflow:hidden;\n    }\n\n    .modal-body{\n      flex:1 1 auto;\n      min-height:0;\n      overflow-y:auto;\n      -webkit-overflow-scrolling:touch;\n      overscroll-behavior:contain;\n      padding:20px;\n    }\n    .form-title{margin:0 0 13px;color:var(--y);font-size:11px;letter-spacing:.1em;text-transform:uppercase}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}.field.full{grid-column:1/-1}\n    .field label{display:block;margin-bottom:6px;color:#aaa;font-size:11px}.field input,.field select,.field textarea{width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px;outline:none;background:#0b0b0b;color:#eee}.field textarea{min-height:80px;resize:vertical}\n    .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--y)}.field select:disabled{opacity:.55;cursor:not-allowed}.form-help{margin-top:6px;color:#666;font-size:10px;line-height:1.4}\n    .modal-foot{display:flex;justify-content:flex-end;gap:9px;padding:15px 20px;border-top:1px solid var(--border)}.secondary{border:1px solid var(--border);border-radius:8px;padding:11px 15px;background:#171717;color:#ccc}.secondary:hover{border-color:#555}\n    .location-box{padding:12px;border:1px solid var(--border);border-radius:10px;background:#0d0d0d}.location-status{display:flex;align-items:flex-start;gap:10px}.location-dot{width:9px;height:9px;margin-top:5px;flex:0 0 auto;border-radius:50%;background:#666;box-shadow:0 0 0 4px rgba(255,255,255,.03)}\n    .location-status.ready .location-dot{background:var(--y);box-shadow:0 0 0 4px rgba(245,196,0,.10)}.location-status b{display:block;color:#eee;font-size:12px}.location-status small{display:block;margin-top:4px;color:#777;font-size:10px;line-height:1.4}\n    .location-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.location-button{min-height:40px;border:1px solid var(--border);border-radius:8px;background:#151515;color:#ddd;font-size:11px;font-weight:700}.location-button:hover{border-color:var(--y);color:var(--y)}.location-button.secondary-location{background:#111}\n    .location-coordinates{display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);color:#999;font-size:10px;line-height:1.5}.location-coordinates.show{display:block}\n    .location-profile{margin-bottom:24px}.location-profile-card{padding:12px;border:1px solid var(--border);border-radius:10px;background:#0d0d0d}.location-profile-title{color:#eee;font-size:12px;font-weight:700}.location-profile-meta{margin-top:5px;color:#777;font-size:10px;line-height:1.5}.location-profile-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.location-profile-empty{padding:14px;border:1px dashed var(--border);border-radius:10px;color:#777;font-size:11px}\n    .footer{display:flex;justify-content:space-between;padding:13px 18px;border-top:1px solid var(--border);color:var(--muted);font-size:11px}.loading-row{padding:30px 18px;color:#777;text-align:center;font-size:12px}\n    @media(max-width:900px){.page{padding:20px 16px}.kpis{grid-template-columns:1fr 1fr}}\n    @media(max-width:640px){\n  .page{padding:16px 12px}\n  .head{flex-direction:column}\n  .primary{width:100%;min-height:54px}\n  .toolbar{flex-direction:column}\n  .filter{width:100%}\n  .scroll{display:none}\n  .mobile-list{display:block}\n  .grid{grid-template-columns:1fr 1fr}\n  .form-grid{grid-template-columns:1fr}\n  .field.full{grid-column:auto}\n\n  /*\n   * iPhone — exact same modal model as locked Customer:\n   * one page scroll surface, full-screen form, bottom actions reachable.\n   */\n  .modal{\n    align-items:flex-start;\n    justify-content:center;\n    padding:0;\n    overflow-y:auto;\n    -webkit-overflow-scrolling:touch;\n    overscroll-behavior:contain;\n  }\n\n  .modal-box{\n    width:100%;\n    min-height:100dvh;\n    height:auto;\n    max-height:none;\n    display:block;\n    overflow:visible;\n    border:0;\n    border-radius:0;\n  }\n\n  .modal-box > form{\n    display:block;\n    min-height:auto;\n    overflow:visible;\n  }\n\n  .modal-head{\n    position:sticky;\n    top:0;\n    z-index:10;\n    padding:\n      calc(14px + env(safe-area-inset-top))\n      16px\n      14px;\n    background:#111;\n  }\n\n  .modal-body{\n    min-height:auto;\n    overflow:visible;\n    padding:18px 16px 30px;\n  }\n\n  .modal-foot{\n    position:relative;\n    display:flex;\n    padding:\n      12px\n      16px\n      calc(12px + env(safe-area-inset-bottom));\n    background:#111;\n    border-top:1px solid var(--border);\n  }\n\n  .modal-foot .primary{\n    flex:1;\n  }\n\n  .modal-foot .secondary{\n    min-width:84px;\n    min-height:48px;\n  }\n\n  .drawer{width:100%;border-left:0}\n  .footer{flex-direction:column;gap:5px}\n}\n  \n    /* Shared Navigation V1.11 — embedded to avoid navigation.css load/path/cache issues */\n    .da-shared-sidebar{\n      position:fixed;\n      inset:0 auto 0 0;\n      width:236px;\n      height:100dvh;\n      z-index:900;\n      display:flex;\n      flex-direction:column;\n      background:#0b0b0b;\n      border-right:1px solid #242424;\n      color:#aaa;\n    }\n\n    .da-brand{\n      flex:0 0 auto;\n      min-height:96px;\n      display:flex;\n      align-items:center;\n      gap:12px;\n      padding:18px 20px;\n      border-bottom:1px solid #242424;\n    }\n\n    .da-brand-mark{\n      width:48px;\n      height:48px;\n      flex:0 0 48px;\n      display:grid;\n      place-items:center;\n      border-radius:12px;\n      background:#f5c400;\n      color:#080808;\n      font-weight:900;\n      font-size:17px;\n    }\n\n    .da-brand-name{\n      color:#f4f4f4;\n      font-size:15px;\n      font-weight:800;\n      letter-spacing:.08em;\n    }\n\n    .da-brand-sub{\n      margin-top:4px;\n      color:#777;\n      font-size:10px;\n      letter-spacing:.18em;\n    }\n\n    .da-nav-scroll{\n      flex:1 1 auto;\n      min-height:0;\n      overflow-y:auto;\n      padding:20px 12px;\n      -webkit-overflow-scrolling:touch;\n    }\n\n    .da-nav-section{margin-bottom:18px}\n\n    .da-nav-label{\n      padding:0 14px 9px;\n      color:#666;\n      font-size:10px;\n      font-weight:700;\n      letter-spacing:.18em;\n    }\n\n    .da-nav-item{\n      min-height:46px;\n      display:flex;\n      align-items:center;\n      gap:13px;\n      padding:0 14px;\n      margin:3px 0;\n      border:1px solid transparent;\n      border-radius:10px;\n      color:#aaa;\n      text-decoration:none;\n      font-size:14px;\n      font-weight:600;\n    }\n\n    .da-nav-item:hover{\n      color:#fff;\n      background:#151515;\n    }\n\n    .da-nav-item.active{\n      color:#f5c400;\n      background:rgba(245,196,0,.09);\n      border-color:rgba(245,196,0,.35);\n    }\n\n    .da-nav-icon{\n      width:22px;\n      flex:0 0 22px;\n      text-align:center;\n      font-size:16px;\n      line-height:1;\n    }\n\n    .da-nav-footer{\n      flex:0 0 auto;\n      padding:16px 20px calc(20px + env(safe-area-inset-bottom));\n      border-top:1px solid #242424;\n      color:#aaa;\n      background:#0b0b0b;\n    }\n\n    .da-nav-footer strong{\n      display:block;\n      color:#aaa;\n      font-size:10px;\n      letter-spacing:.06em;\n    }\n\n    .da-nav-footer span{\n      display:block;\n      margin-top:4px;\n      color:#666;\n      font-size:10px;\n    }\n\n    /* Desktop */\n    body.da-nav-page{\n      padding-left:236px !important;\n    }\n\n    .da-mobile-menu{\n      position:fixed;\n      top:18px;\n      left:18px;\n      z-index:950;\n      display:none;\n      width:54px;\n      height:54px;\n      padding:0;\n      border:1px solid #303030;\n      border-radius:14px;\n      background:#151515;\n      color:#f4f4f4;\n      font-size:24px;\n      line-height:1;\n      box-shadow:none;\n      -webkit-tap-highlight-color:transparent;\n    }\n\n    .da-mobile-menu.open{\n      background:#151515;\n      color:#f4f4f4;\n    }\n\n    .da-nav-overlay{\n      position:fixed;\n      inset:0;\n      z-index:850;\n      display:none;\n      background:rgba(0,0,0,.72);\n      backdrop-filter:blur(3px);\n    }\n\n    .da-nav-overlay.show{display:block}\n\n    html.da-sidebar-open,\n    html.da-sidebar-open body{\n      overflow:hidden;\n    }\n\n    /* Dialogs always above navigation */\n    .modal-backdrop,\n    .backdrop,\n    .detail-backdrop{\n      z-index:3000 !important;\n    }\n\n    .modal,\n    .drawer{\n      position:relative;\n      z-index:3001;\n    }\n\n    /* iPad / iPhone */\n    @media(max-width:820px){\n\n      body.da-nav-page{\n        padding-left:0 !important;\n        overflow-x:hidden;\n      }\n\n      .da-shared-sidebar{\n        width:min(315px,88vw);\n        transform:translateX(-105%);\n        transition:transform .22s ease;\n        box-shadow:18px 0 60px rgba(0,0,0,.55);\n      }\n\n      .da-shared-sidebar.open{\n        transform:translateX(0);\n      }\n\n      .da-mobile-menu{\n        display:grid;\n        place-items:center;\n      }\n\n      /*\n       * IMPORTANT:\n       * The Dashboard has a header zone above its content.\n       * Customer / Building / Elevator now reserve the same zone,\n       * so the menu never sits on top of the page title.\n       */\n      body.da-nav-page > main{\n        max-width:100%;\n      }\n    }\n\n    /* iPhone portrait */\n    @media(max-width:640px){\n\n      .da-mobile-menu{\n        top:16px;\n        left:16px;\n        width:54px;\n        height:54px;\n        border-radius:14px;\n      }\n\n      .da-brand{\n        min-height:86px;\n        padding:15px 18px;\n      }\n\n      .da-brand-mark{\n        width:46px;\n        height:46px;\n        flex-basis:46px;\n      }\n\n      .da-nav-scroll{\n        padding:18px 10px;\n      }\n\n      .da-nav-item{\n        min-height:48px;\n        padding:0 14px;\n      }\n\n      .da-nav-footer{\n        padding:13px 18px calc(15px + env(safe-area-inset-bottom));\n      }\n    }\n\n    html,\n    body{\n      max-width:100%;\n      overflow-x:hidden;\n    }\n\n\n    /* V1.11 CUSTOMER HARD FIX — self-contained navigation */\n    @media(max-width:820px){    }\n    @media(max-width:640px){    }\n  \n\n/* =========================================================\n   DASHBOARD TOPBAR — V1.12\n   Customer / Building / Elevator use the same header system.\n   ========================================================= */\n\n.da-page-topbar{\n  position:sticky;\n  top:0;\n  z-index:950;\n  height:68px;\n  display:flex;\n  align-items:center;\n  gap:14px;\n  padding:0 18px;\n  margin:0;\n  background:#0b0b0b;\n  border-bottom:1px solid #242424;\n}\n\n.da-top-menu{\n  width:42px;\n  height:42px;\n  flex:0 0 42px;\n  display:grid;\n  place-items:center;\n  padding:0;\n  border:1px solid #303030;\n  border-radius:10px;\n  background:#151515;\n  color:#f4f4f4;\n  font-size:21px;\n  line-height:1;\n  -webkit-tap-highlight-color:transparent;\n}\n\n.da-top-menu:hover{\n  border-color:#555;\n  color:#f5c400;\n}\n\n.da-breadcrumb{\n  min-width:0;\n  display:flex;\n  align-items:center;\n  gap:9px;\n  color:#777;\n  font-size:12px;\n  white-space:nowrap;\n  overflow:hidden;\n}\n\n.da-breadcrumb b{\n  color:#444;\n  font-weight:500;\n}\n\n.da-breadcrumb span:last-child{\n  color:#ddd;\n  overflow:hidden;\n  text-overflow:ellipsis;\n}\n\n.da-top-actions{\n  margin-left:auto;\n  display:flex;\n  align-items:center;\n  gap:9px;\n}\n\n.da-top-icon{\n  width:42px;\n  height:42px;\n  display:grid;\n  place-items:center;\n  border:1px solid #303030;\n  border-radius:10px;\n  background:#151515;\n  color:#ddd;\n  font-size:18px;\n}\n\n.da-user-chip{\n  display:flex;\n  align-items:center;\n  gap:9px;\n  min-width:0;\n}\n\n.da-avatar{\n  width:42px;\n  height:42px;\n  flex:0 0 42px;\n  display:grid;\n  place-items:center;\n  border-radius:50%;\n  background:#f5c400;\n  color:#080808;\n  font-size:13px;\n  font-weight:900;\n}\n\n.da-user-text{\n  display:flex;\n  flex-direction:column;\n  gap:2px;\n  min-width:0;\n}\n\n.da-user-text strong{\n  color:#eee;\n  font-size:11px;\n  white-space:nowrap;\n}\n\n.da-user-text small{\n  color:#777;\n  font-size:9px;\n  letter-spacing:.08em;\n  white-space:nowrap;\n}\n\n.da-mobile-menu{\n  display:none !important;\n}\n\n@media(max-width:820px){\n  .da-page-topbar{\n    height:68px;\n    padding:0 16px;\n  }\n\n  .da-top-menu{\n    width:54px;\n    height:54px;\n    flex-basis:54px;\n    border-radius:14px;\n    font-size:24px;\n  }\n\n  .da-breadcrumb{\n    flex:1;\n    justify-content:center;\n    font-size:11px;\n  }\n\n  .da-breadcrumb span:first-child,\n  .da-breadcrumb b{\n    display:none;\n  }\n\n  .da-top-actions{\n    margin-left:0;\n    gap:7px;\n  }\n\n  .da-top-icon{\n    width:54px;\n    height:54px;\n    border-radius:14px;\n  }\n\n  .da-avatar{\n    width:54px;\n    height:54px;\n    flex-basis:54px;\n    font-size:15px;\n  }\n\n  .da-user-text{\n    display:none;\n  }\n\n  body.da-nav-page{\n    padding-left:0 !important;\n  }\n\n  .customer-page{\n    padding-top:22px !important;\n  }\n}\n\n@media(max-width:640px){\n  .da-page-topbar{\n    padding:0 16px;\n  }\n\n  .da-top-menu{\n    width:54px;\n    height:54px;\n  }\n\n  .da-top-icon{\n    width:54px;\n    height:54px;\n  }\n\n  .da-avatar{\n    width:54px;\n    height:54px;\n    flex-basis:54px;\n  }\n\n  .customer-page{\n    padding:16px 12px 30px !important;\n  }\n}\n\n  \n\n/* =========================================================\n   BUILDING — SAME DISPLAY SYSTEM AS CUSTOMER V1.14\n   ========================================================= */\n\n@media(min-width:821px){\n  body.da-nav-page{\n    padding-left:236px !important;\n    padding-top:0 !important;\n  }\n\n  .page{\n    padding:28px !important;\n  }\n\n  .head{\n    flex-direction:row !important;\n    align-items:flex-start !important;\n    justify-content:space-between !important;\n    gap:20px !important;\n    margin-bottom:26px !important;\n  }\n\n  .head .primary{\n    width:auto !important;\n    min-height:48px !important;\n    flex:0 0 auto;\n  }\n\n  .kpis{\n    grid-template-columns:repeat(2,1fr) !important;\n  }\n}\n\n@media(max-width:820px){\n  body.da-nav-page{\n    padding-left:0 !important;\n    padding-top:0 !important;\n  }\n\n  .page{\n    padding:16px 12px !important;\n  }\n\n  .head{\n    flex-direction:column !important;\n    align-items:stretch !important;\n    gap:18px !important;\n  }\n\n  .head .primary{\n    width:100% !important;\n    min-height:54px !important;\n  }\n\n  .kpis{\n    grid-template-columns:1fr !important;\n  }\n}\n\n@media(max-width:640px){\n  .page{\n    padding:16px 12px 30px !important;\n  }\n}\n\n\n/* BUILDING — match Customer primary action width */\n@media(min-width:821px){\n  #addButton{\n    min-width:223px !important;\n    min-height:96px !important;\n    padding:12px 24px !important;\n    font-size:16px !important;\n  }\n}\n\n@media(max-width:820px){\n  #addButton{\n    width:100% !important;\n    min-height:54px !important;\n  }\n}\n\n\n/* V1.17 — Add Building direct-open fallback */\n#addButton{\n  position:relative !important;\n  z-index:4000 !important;\n  pointer-events:auto !important;\n  touch-action:manipulation !important;\n  -webkit-tap-highlight-color:transparent;\n}\n#addButton *{pointer-events:none;}\n\n\n/* =========================================================\n   BUILDING V1.18 — DISPLAY LOCKED TO CUSTOMER V1.14\n   ========================================================= */\n\n/* Same page rhythm as Customer */\n@media(min-width:821px){\n  body.da-nav-page{\n    padding-left:236px !important;\n    padding-top:0 !important;\n  }\n\n  .page{\n    min-height:100vh !important;\n    padding:28px !important;\n  }\n\n  .container{\n    width:min(1500px,100%) !important;\n    margin:0 auto !important;\n  }\n\n  .head{\n    display:flex !important;\n    align-items:flex-start !important;\n    justify-content:space-between !important;\n    gap:20px !important;\n    margin-bottom:26px !important;\n  }\n\n  .head > div{\n    min-width:0;\n  }\n\n  .head .primary{\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    gap:9px !important;\n    width:223px !important;\n    min-width:223px !important;\n    height:96px !important;\n    min-height:96px !important;\n    flex:0 0 223px !important;\n    padding:12px 17px !important;\n    border-radius:9px !important;\n    font-size:16px !important;\n  }\n\n  .kpis{\n    grid-template-columns:repeat(2,minmax(0,1fr)) !important;\n    gap:14px !important;\n    margin-bottom:18px !important;\n  }\n}\n\n/* iPad / iPhone: exactly the same stacked rhythm as Customer */\n@media(max-width:820px){\n  body.da-nav-page{\n    padding-left:0 !important;\n    padding-top:0 !important;\n    overflow-x:hidden !important;\n  }\n\n  .page{\n    min-height:100vh !important;\n    padding:16px 12px 30px !important;\n  }\n\n  .head{\n    display:flex !important;\n    flex-direction:column !important;\n    align-items:stretch !important;\n    gap:18px !important;\n    margin-bottom:18px !important;\n  }\n\n  .head .primary{\n    width:100% !important;\n    min-width:0 !important;\n    min-height:54px !important;\n    height:54px !important;\n    flex:0 0 auto !important;\n    border-radius:9px !important;\n  }\n\n  .kpis{\n    grid-template-columns:1fr !important;\n    gap:9px !important;\n  }\n\n  .kpi{\n    min-height:95px !important;\n    padding:13px !important;\n  }\n\n  .value{\n    font-size:24px !important;\n  }\n\n  .toolbar{\n    flex-direction:column !important;\n    align-items:stretch !important;\n  }\n\n  .filter{\n    width:100% !important;\n  }\n}\n\n/* iPhone modal: same single-scroll surface as locked Customer */\n@media(max-width:640px){\n  .modal{\n    align-items:flex-start !important;\n    justify-content:center !important;\n    padding:0 !important;\n    overflow-y:auto !important;\n    -webkit-overflow-scrolling:touch !important;\n    overscroll-behavior:contain !important;\n  }\n\n  .modal-box{\n    width:100% !important;\n    min-height:100dvh !important;\n    height:auto !important;\n    max-height:none !important;\n    display:block !important;\n    overflow:visible !important;\n    border:0 !important;\n    border-radius:0 !important;\n  }\n\n  .modal-head{\n    position:sticky !important;\n    top:0 !important;\n    z-index:10 !important;\n    min-height:68px !important;\n    background:#111 !important;\n  }\n\n  .modal-body{\n    min-height:auto !important;\n    overflow:visible !important;\n    padding:18px 16px 30px !important;\n  }\n\n  .form-grid{\n    grid-template-columns:1fr !important;\n    gap:15px !important;\n  }\n\n  .field.full{\n    grid-column:auto !important;\n  }\n\n  .field label{\n    margin-bottom:7px !important;\n    font-size:13px !important;\n  }\n\n  .field input,\n  .field select,\n  .field textarea{\n    min-height:50px !important;\n    padding:13px 14px !important;\n    font-size:16px !important;\n  }\n\n  .modal-foot{\n    position:relative !important;\n    display:flex !important;\n    padding:12px 16px calc(12px + env(safe-area-inset-bottom)) !important;\n    background:#111 !important;\n    border-top:1px solid var(--border) !important;\n  }\n\n  .modal-foot .primary{\n    flex:1 !important;\n    min-height:48px !important;\n    width:auto !important;\n  }\n\n  .modal-foot .secondary{\n    min-width:84px !important;\n    min-height:48px !important;\n  }\n\n  .footer{\n    flex-direction:column !important;\n    gap:5px !important;\n  }\n}\n\n/* Button must always receive touch/click events */\n#addButton{\n  position:relative !important;\n  z-index:4000 !important;\n  pointer-events:auto !important;\n  touch-action:manipulation !important;\n  -webkit-tap-highlight-color:transparent !important;\n}\n#addButton *{pointer-events:none !important;}\n\n/* Dialogs remain above navigation */\n.modal,\n.backdrop{\n  z-index:3000 !important;\n}';
    document.head.appendChild(style);
  }

  container.innerHTML = '<div class="building-module"><main class="page">\n  <div class="container">\n\n    <header class="head">\n      <div>\n        <p class="eyebrow">Building Management</p>\n        <h1>Tòa nhà</h1>\n        <p class="sub">Quản lý tòa nhà, khách hàng, thang máy và trạng thái dịch vụ.</p>\n      </div>\n      <button class="primary" id="addButton" type="button">＋ <span>Thêm tòa nhà</span></button>\n    </header>\n\n    <section class="kpis">\n      <article class="kpi"><div class="label">Tổng tòa nhà</div><div class="value" id="kpiTotal">0</div><div class="note">Trong hệ thống</div></article>\n      <article class="kpi"><div class="label">Đang hoạt động</div><div class="value" id="kpiActive">0</div><div class="note">Có dịch vụ đang theo dõi</div></article>\n      <article class="kpi"><div class="label">Tổng thang máy</div><div class="value" id="kpiElevators">0</div><div class="note">Thuộc các tòa nhà</div></article>\n      <article class="kpi"><div class="label">Cần chăm sóc</div><div class="value" id="kpiCare">0</div><div class="note">Cần xử lý / liên hệ</div></article>\n    </section>\n\n    <section class="toolbar">\n      <div class="search"><span>⌕</span><input id="search" type="search" placeholder="Tìm tên tòa nhà, khách hàng, địa chỉ..." autocomplete="off"></div>\n      <select class="filter" id="status">\n        <option value="all">Tất cả trạng thái</option>\n        <option value="active">Đang hoạt động</option>\n        <option value="care">Cần chăm sóc</option>\n        <option value="inactive">Ngừng hoạt động</option>\n      </select>\n    </section>\n\n    <section class="card">\n      <div class="card-head"><div class="card-title">Danh sách tòa nhà</div><div class="count" id="count">0 tòa nhà</div></div>\n      <div class="notice" id="notice"></div>\n\n      <div class="scroll">\n        <table>\n          <thead><tr><th>Tòa nhà</th><th>Khách hàng</th><th>Địa chỉ</th><th>Thang máy</th><th>Phụ trách</th><th>Trạng thái</th><th></th></tr></thead>\n          <tbody id="tbody">\n            <tr><td colspan="7"><div class="loading-row">Đang tải dữ liệu từ Firebase...</div></td></tr>\n          </tbody>\n        </table>\n      </div>\n\n      <div class="mobile-list" id="mobileList"></div>\n\n      <div class="footer">\n        <span id="footerSource">Đang kết nối Firebase DEV — Firestore.</span>\n        <span>DEV V1.26</span>\n      </div>\n    </section>\n\n  </div>\n</main>\n\n<div class="backdrop" id="backdrop">\n  <aside class="drawer" role="dialog" aria-modal="true">\n    <div class="drawer-head">\n      <div><p class="kicker">Building Profile</p><h2 id="dName">—</h2><div class="drawer-id" id="dId">—</div></div>\n      <button class="close" id="closeDetail" type="button">×</button>\n    </div>\n\n    <div class="drawer-body">\n      <div id="dStatus" style="margin-bottom:18px"></div>\n\n      <p class="section-title">Thông tin tòa nhà</p>\n      <div class="grid">\n        <div class="item"><span>Khách hàng</span><b id="dCustomer">—</b></div>\n        <div class="item"><span>Địa chỉ</span><b id="dAddress">—</b></div>\n        <div class="item"><span>Người phụ trách</span><b id="dManager">—</b></div>\n        <div class="item"><span>Loại công trình</span><b id="dType">—</b></div>\n      </div>\n\n      <p class="section-title">Vị trí công trình</p>\n      <div class="location-profile" id="dLocation">\n        <div class="location-profile-empty">Chưa có vị trí được ghim.</div>\n      </div>\n\n      <p class="section-title">Tài sản & dịch vụ</p>\n      <div class="grid">\n        <div class="item"><span>Thang máy</span><b id="dElevators">0</b></div>\n        <div class="item"><span>Hợp đồng</span><b>—</b></div>\n        <div class="item"><span>Bảo trì</span><b id="dMaintenance">Đang theo dõi</b></div>\n        <div class="item"><span>Work Order</span><b>—</b></div>\n      </div>\n\n      <div class="tabs">\n        <button class="tab active" data-tab="elevators" type="button">Thang máy</button>\n        <button class="tab" data-tab="contracts" type="button">Hợp đồng</button>\n        <button class="tab" data-tab="maintenance" type="button">Bảo trì</button>\n        <button class="tab" data-tab="workorders" type="button">Work Order</button>\n      </div>\n\n      <div class="list" id="dList"></div>\n    </div>\n  </aside>\n</div>\n\n<div class="building-modal-backdrop" id="modal">\n  <section class="building-modal">\n    <div class="building-modal-head">\n      <h2>Thêm tòa nhà</h2>\n      <button class="close-button" id="closeModal" type="button">×</button>\n    </div>\n\n    <form id="buildingForm">\n      <div class="building-modal-body">\n\n        <p class="form-title">Thông tin tòa nhà</p>\n\n        <div class="form-grid">\n          <div class="field full">\n            <label for="buildingName">Tên tòa nhà *</label>\n            <input id="buildingName" required placeholder="Nhập tên tòa nhà">\n          </div>\n\n          <div class="field">\n            <label for="customer">Khách hàng *</label>\n            <select id="customer" required><option value="">Đang tải khách hàng...</option></select>\n            <div class="form-help">Khách hàng được lấy trực tiếp từ Firebase DEV.</div>\n          </div>\n\n          <div class="field">\n            <label for="buildingType">Loại công trình</label>\n            <select id="buildingType">\n              <option value="apartment">Chung cư</option>\n              <option value="office">Văn phòng</option>\n              <option value="factory">Nhà máy</option>\n              <option value="hotel">Khách sạn</option>\n              <option value="house">Nhà riêng</option>\n              <option value="hospital">Bệnh viện</option>\n              <option value="other">Khác</option>\n            </select>\n          </div>\n\n          <div class="field full">\n            <label for="address">Địa chỉ</label>\n            <input id="address" placeholder="Địa chỉ tòa nhà">\n          </div>\n\n          <div class="field">\n            <label for="province">Tỉnh / Thành phố</label>\n            <input id="province" placeholder="Ví dụ: Hải Phòng">\n          </div>\n\n          <div class="field">\n            <label for="district">Quận / Huyện</label>\n            <input id="district" placeholder="Ví dụ: Lê Chân">\n          </div>\n\n          <div class="field full">\n            <label>📍 Vị trí công trình</label>\n            <div class="location-box">\n              <div class="location-status" id="locationStatus">\n                <span class="location-dot"></span>\n                <div><b>Chưa ghim vị trí</b><small>Hãy lấy GPS hiện tại hoặc chọn trên bản đồ.</small></div>\n              </div>\n\n              <div class="location-actions">\n                <button class="location-button" id="useCurrentLocation" type="button">📍 Lấy vị trí hiện tại</button>\n                <button class="location-button secondary-location" id="chooseMapLocation" type="button">🗺 Chọn trên bản đồ</button>\n              </div>\n\n              <div class="location-coordinates" id="locationCoordinates"></div>\n            </div>\n          </div>\n\n          <div class="field">\n            <label for="manager">Người phụ trách</label>\n            <input id="manager" placeholder="Nhân sự phụ trách">\n          </div>\n\n          <div class="field">\n            <label for="phone">Số điện thoại liên hệ</label>\n            <input id="phone" placeholder="Số điện thoại">\n          </div>\n\n          <div class="field full">\n            <label for="note">Ghi chú</label>\n            <textarea id="note" placeholder="Thông tin bổ sung..."></textarea>\n          </div>\n        </div>\n      </div>\n\n      <div class="building-modal-foot">\n        <button class="secondary" id="cancel" type="button">Hủy</button>\n        <button class="primary" id="saveBuilding" type="submit">Lưu tòa nhà</button>\n      </div>\n    </form>\n  </section>\n</div>\n</div>';

import {
  createBuilding,
  getBuildings,
  getElevators,
  getCustomers
} from "../core/firestore-v1.js";

import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "../core/firebase.js";

const $ = id => container.querySelector(`#${id}`);

let buildings = [];
let elevators = [];
let customers = [];
let currentBuilding = null;
let selectedLocation = null;

function safe(value){ return String(value ?? "").trim(); }

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function customerName(customerId){
  const customer = customers.find(item => item.id === customerId);
  return customer?.name || "Chưa xác định";
}

function addressText(address){
  if (!address) return "—";
  if (typeof address === "string") return address || "—";
  return [address.detail,address.district,address.province].filter(Boolean).join(", ") || "—";
}

function buildingTypeLabel(type){
  const map = {apartment:"Chung cư",office:"Văn phòng",factory:"Nhà máy",hotel:"Khách sạn",house:"Nhà riêng",hospital:"Bệnh viện",other:"Khác"};
  return map[type] || type || "Khác";
}

function statusLabel(status){
  const map = {
    active:["Đang hoạt động","active"],
    care:["Cần chăm sóc","care"],
    inactive:["Ngừng hoạt động","inactive"]
  };
  const item = map[status] || map.inactive;
  return `<span class="status ${item[1]}">${item[0]}</span>`;
}

function elevatorsForBuilding(buildingId){
  return elevators.filter(elevator => elevator.buildingId === buildingId);
}

function managerName(building){
  if (building?.manager?.name) return building.manager.name;
  if (typeof building?.manager === "string") return building.manager;
  return "Chưa phân công";
}

function normalizeLocation(location){
  if (!location) return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
    source: location.source || "map"
  };
}

function formatCoordinates(location){
  const item = normalizeLocation(location);
  if (!item) return "";
  const accuracy = item.accuracy ? ` · ±${Math.round(item.accuracy)} m` : "";
  return `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}${accuracy}`;
}

function googleMapsUrl(location){
  const item = normalizeLocation(location);
  if (!item) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.lat},${item.lng}`)}`;
}

function updateLocationUI(){
  const status = $("locationStatus");
  const coordinates = $("locationCoordinates");
  if (!status || !coordinates) return;

  const item = normalizeLocation(selectedLocation);

  if (!item){
    status.classList.remove("ready");
    status.innerHTML = `<span class="location-dot"></span><div><b>Chưa ghim vị trí</b><small>Hãy lấy GPS hiện tại hoặc chọn trên bản đồ.</small></div>`;
    coordinates.className = "location-coordinates";
    coordinates.textContent = "";
    return;
  }

  status.classList.add("ready");
  status.innerHTML = `<span class="location-dot"></span><div><b>Đã ghim vị trí</b><small>Nguồn: ${item.source === "gps" ? "GPS thiết bị" : "Chọn trên bản đồ"}</small></div>`;
  coordinates.className = "location-coordinates show";
  coordinates.textContent = formatCoordinates(item);
}

function resetLocation(){
  selectedLocation = null;
  updateLocationUI();
}

function setLocationFromPosition(position){
  selectedLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    source: "gps"
  };
  updateLocationUI();
}

function requestCurrentLocation(){
  if (!navigator.geolocation){
    showNotice("Thiết bị/trình duyệt không hỗ trợ GPS.","error");
    return;
  }

  showNotice("Đang lấy vị trí hiện tại...","info");

  navigator.geolocation.getCurrentPosition(
    position => {
      setLocationFromPosition(position);
      showNotice("Đã lấy vị trí hiện tại.","success");
    },
    error => {
      console.error("GEOLOCATION ERROR:", error);
      const messages = {
        1:"Bạn chưa cấp quyền vị trí cho trình duyệt.",
        2:"Không xác định được vị trí hiện tại.",
        3:"Lấy vị trí quá lâu. Vui lòng thử lại."
      };
      showNotice(messages[error.code] || "Không thể lấy vị trí hiện tại.","error");
    },
    {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
}

function chooseMapLocation(){
  if (!selectedLocation){
    showNotice("Bản đồ chọn điểm sẽ được mở ở bước tiếp theo. Hiện tại hãy dùng 'Lấy vị trí hiện tại' để ghim GPS.","info");
    return;
  }
  showNotice("Đã có vị trí. Bản đồ chọn điểm thủ công sẽ được hoàn thiện ở bước Map UI.","info");
}

function showNotice(message,type="info"){
  const notice = $("notice");
  notice.textContent = message;
  notice.className = `notice show ${type}`;
}

function hideNotice(){
  const notice = $("notice");
  notice.textContent = "";
  notice.className = "notice";
}

function renderKpis(){
  const total = buildings.length;
  const active = buildings.filter(building => building.status === "active").length;
  const care = buildings.filter(building => building.status === "care").length;
  $("kpiTotal").textContent = total;
  $("kpiActive").textContent = active;
  $("kpiCare").textContent = care;
  $("kpiElevators").textContent = elevators.length;
}

function filteredBuildings(){
  const q = $("search").value.trim().toLowerCase();
  const status = $("status").value;

  return buildings.filter(building => {
    const customer = customerName(building.customerId);
    const text = [building.name,customer,addressText(building.address),managerName(building)].join(" ").toLowerCase();
    return (!q || text.includes(q)) && (status === "all" || building.status === status);
  });
}

function render(){
  renderKpis();
  const list = filteredBuildings();
  $("count").textContent = `${list.length} tòa nhà`;

  if (!list.length){
    $("tbody").innerHTML = `<tr><td colspan="7"><div class="loading-row">Chưa có tòa nhà trong Firebase.</div></td></tr>`;
    $("mobileList").innerHTML = `<div class="loading-row">Chưa có tòa nhà trong Firebase.</div>`;
    return;
  }

  $("tbody").innerHTML = list.map(building => {
    const customer = customerName(building.customerId);
    const buildingElevators = elevatorsForBuilding(building.id);
    return `<tr>
      <td><div class="name">${escapeHtml(building.name)}</div><div class="id">${escapeHtml(building.id)}</div></td>
      <td>${escapeHtml(customer)}</td>
      <td>${escapeHtml(addressText(building.address))}</td>
      <td>${buildingElevators.length}</td>
      <td>${escapeHtml(managerName(building))}</td>
      <td>${statusLabel(building.status)}</td>
      <td><div class="action-group">
        <button class="action" data-view="${escapeHtml(building.id)}" type="button">Xem</button>
        <button class="action danger" data-delete-building="${escapeHtml(building.id)}" type="button">Xóa</button>
      </div></td>
    </tr>`;
  }).join("");

  $("mobileList").innerHTML = list.map(building => {
    const customer = customerName(building.customerId);
    const buildingElevators = elevatorsForBuilding(building.id);
    return `<article class="building-item">
      <div class="building-top">
        <div><div class="name">${escapeHtml(building.name)}</div><div class="id">${escapeHtml(building.id)}</div></div>
        ${statusLabel(building.status)}
      </div>
      <div class="building-contact">${escapeHtml(customer)}<br>${escapeHtml(addressText(building.address))}<br>Phụ trách: ${escapeHtml(managerName(building))}</div>
      <div class="stats">
        <div class="stat"><b>${buildingElevators.length}</b><span>THANG MÁY</span></div>
        <div class="stat"><b>—</b><span>HỢP ĐỒNG</span></div>
        <div class="stat"><b>—</b><span>WORK ORDER</span></div>
      </div>
      <div class="bottom">
        <span class="muted">${escapeHtml(buildingTypeLabel(building.type))}</span>
        <div class="action-group">
          <button class="action" data-view="${escapeHtml(building.id)}" type="button">Xem hồ sơ</button>
          <button class="action danger" data-delete-building="${escapeHtml(building.id)}" type="button">Xóa</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderCustomerOptions(){
  const select = $("customer");

  if (!customers.length){
    select.innerHTML = `<option value="">Chưa có khách hàng</option>`;
    return;
  }

  select.innerHTML = `<option value="">Chọn khách hàng</option>${
    customers.map(customer => `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}</option>`).join("")
  }`;
}

async function loadData(){
  hideNotice();

  $("tbody").innerHTML = `<tr><td colspan="7"><div class="loading-row">Đang tải dữ liệu từ Firebase...</div></td></tr>`;

  try {
    const [customerData,buildingData,elevatorData] = await Promise.all([
      getCustomers(),getBuildings(),getElevators()
    ]);

    customers = customerData || [];
    buildings = buildingData || [];
    elevators = elevatorData || [];

    renderCustomerOptions();
    render();

    $("footerSource").textContent = `Dữ liệu Firebase DEV — ${buildings.length} tòa nhà.`;
    showNotice(`Đã kết nối Firestore. ${buildings.length} tòa nhà.`,"success");
  } catch(error){
    console.error("BUILDING FIRESTORE ERROR:",error);
    customers = [];
    buildings = [];
    elevators = [];
    renderCustomerOptions();
    render();
    $("footerSource").textContent = "Firebase DEV — lỗi kết nối Firestore.";
    showNotice(`Không thể tải dữ liệu Firebase: ${error?.message || "UNKNOWN_ERROR"}`,"error");
  }
}

async function openDetail(id){
  const building = buildings.find(item => item.id === id);
  if (!building) return;

  currentBuilding = building;
  const customer = customerName(building.customerId);
  const buildingElevators = elevatorsForBuilding(building.id);

  $("dName").textContent = building.name || "—";
  $("dId").textContent = building.id || "—";
  $("dStatus").innerHTML = statusLabel(building.status);
  $("dCustomer").textContent = customer;
  $("dAddress").textContent = addressText(building.address);
  $("dManager").textContent = managerName(building);
  $("dType").textContent = buildingTypeLabel(building.type);
  $("dElevators").textContent = buildingElevators.length;

  renderLocationProfile(building.location);
  setTab("elevators");

  $("backdrop").classList.add("show");
  document.body.style.overflow = "hidden";
}

function renderLocationProfile(location){
  const container = $("dLocation");
  const item = normalizeLocation(location);
  if (!container) return;

  if (!item){
    container.innerHTML = `<div class="location-profile-empty">Chưa có vị trí được ghim.</div>`;
    return;
  }

  container.innerHTML = `<div class="location-profile-card">
    <div class="location-profile-title">📍 ${escapeHtml(formatCoordinates(item))}</div>
    <div class="location-profile-meta">Nguồn: ${item.source === "gps" ? "GPS thiết bị" : "Chọn trên bản đồ"}</div>
    <div class="location-profile-actions">
      <a class="action" href="${escapeHtml(googleMapsUrl(item))}" target="_blank" rel="noopener">Mở bản đồ</a>
      <a class="action" href="${escapeHtml(googleMapsUrl(item))}" target="_blank" rel="noopener">Chỉ đường</a>
    </div>
  </div>`;
}

function closeDetail(){
  $("backdrop").classList.remove("show");
  document.body.style.overflow = "";
  currentBuilding = null;
}

async function handleDeleteBuilding(id){
  const building = buildings.find(item => item.id === id);
  if (!building) return;

  const linkedElevators = elevatorsForBuilding(id);
  if (linkedElevators.length){
    showNotice(`Không thể xóa \"${building.name}\" vì đang có ${linkedElevators.length} thang máy liên kết. Hãy xử lý thang máy trước.`,"error");
    return;
  }

  const confirmed = window.confirm(`Xóa tòa nhà \"${building.name}\"?\n\nThao tác này sẽ xóa dữ liệu tòa nhà khỏi Firebase và không thể hoàn tác.`);
  if (!confirmed) return;

  try{
    await deleteDoc(doc(db,"buildings",id));
    if (currentBuilding?.id === id) closeDetail();
    showNotice(`Đã xóa tòa nhà \"${building.name}\".` ,"success");
    await loadData();
  }catch(error){
    console.error("DELETE BUILDING ERROR:",error);
    showNotice(`Không thể xóa tòa nhà: ${error?.message || "UNKNOWN_ERROR"}`,"error");
  }
}

function setTab(tab){
  container.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("active",button.dataset.tab === tab);
  });

  if (!currentBuilding) return;

  const buildingElevators = elevatorsForBuilding(currentBuilding.id);

  if (tab === "elevators"){
    if (!buildingElevators.length){
      $("dList").innerHTML = `<div class="empty">Chưa có thang máy liên kết với tòa nhà này.</div>`;
      return;
    }

    $("dList").innerHTML = buildingElevators.map(elevator => {
      const machine = elevator.technical?.machine?.brand || "—";
      const controller = elevator.technical?.controller?.brand || "—";

      return `<div class="row">
        <div>
          <b>${escapeHtml(elevator.name || "Thang máy")}</b>
          <div style="margin-top:4px;color:#666;font-size:10px;font-family:monospace">${escapeHtml(elevator.id)}</div>
        </div>
        <span>${escapeHtml(machine)} · ${escapeHtml(controller)}</span>
      </div>`;
    }).join("");

    return;
  }

  const placeholders = {
    contracts:[["Hợp đồng","Chưa kết nối module Hợp đồng"]],
    maintenance:[["Bảo trì","Chưa kết nối module Bảo trì"]],
    workorders:[["Work Order","Chưa kết nối module Work Order"]]
  };

  $("dList").innerHTML = (placeholders[tab] || []).map(row => `
    <div class="row"><b>${escapeHtml(row[0])}</b><span>${escapeHtml(row[1])}</span></div>
  `).join("");
}

window.__openBuildingModal = async function(event){
  if (event){
    event.preventDefault();
    event.stopPropagation();
  }

  const button = $("addButton");
  if (button && button.disabled) return;

  try{
    await openModal();
  }catch(error){
    console.error("OPEN BUILDING MODAL ERROR:", error);

    const notice = $("notice");
    if (notice){
      notice.textContent =
        error?.message || "Không thể mở form tạo tòa nhà.";
      notice.className = "notice show error";
    }else{
      alert(
        error?.message || "Không thể mở form tạo tòa nhà."
      );
    }
  }
};

async function openModal(){
  /* Refresh references first so a Customer created on another page is available
     without requiring the user to manually reload this page. */
  if (!customers.length){
    try{
      const freshCustomers = await getCustomers();
      customers = freshCustomers || [];
      renderCustomerOptions();
    }catch(error){
      console.error("REFRESH CUSTOMER ERROR:", error);
    }
  }

  resetLocation();
  renderCustomerOptions();

  const modal = $("modal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  modal.scrollTop = 0;
  const modalBody = modal.querySelector(".building-modal-body");
  if (modalBody) modalBody.scrollTop = 0;

  if (window.innerWidth > 820){
    setTimeout(() => $("buildingName").focus(),40);
  }
}

function closeModal(){
  $("modal").classList.remove("show");
  document.body.style.overflow = "";
  $("buildingForm").reset();
  resetLocation();
}

async function handleCreateBuilding(event){
  event.preventDefault();

  const button = $("saveBuilding");
  const name = safe($("buildingName").value);
  const customerId = $("customer").value;

  if (!name){
    showNotice("Vui lòng nhập tên tòa nhà.","error");
    return;
  }

  if (!customerId){
    showNotice("Vui lòng chọn khách hàng.","error");
    return;
  }

  button.disabled = true;
  button.textContent = "Đang lưu...";

  try {
    const created = await createBuilding({
      name,
      customerId,
      type:$("buildingType").value || "other",
      address:{
        province:safe($("province").value),
        district:safe($("district").value),
        detail:safe($("address").value)
      },
      location:normalizeLocation(selectedLocation),
      manager:{
        name:safe($("manager").value),
        phone:safe($("phone").value)
      },
      status:"active"
    });

    closeModal();
    showNotice(`Đã tạo tòa nhà "${created.name}". Firebase Auto ID: ${created.id}`,"success");
    await loadData();
  } catch(error){
    console.error("CREATE BUILDING ERROR:",error);
    showNotice(`Không thể tạo tòa nhà: ${error?.message || "UNKNOWN_ERROR"}`,"error");
  } finally {
    button.disabled = false;
    button.textContent = "Lưu tòa nhà";
  }
}


$("closeDetail").addEventListener("click",closeDetail);

$("backdrop").addEventListener("click",event => {
  if (event.target === $("backdrop")) closeDetail();
});

$("closeModal").addEventListener("click",closeModal);
$("cancel").addEventListener("click",closeModal);

$("modal").addEventListener("click",event => {
  if (event.target === $("modal")) closeModal();
});

if (container.dataset.buildingDelegates !== "1") {
  container.addEventListener("click",event => {
    const deleteButton = event.target.closest("[data-delete-building]");
    if (deleteButton){
      event.preventDefault();
      event.stopPropagation();
      handleDeleteBuilding(deleteButton.dataset.deleteBuilding);
      return;
    }

    const button = event.target.closest("[data-view]");
    if (button) openDetail(button.dataset.view);
  });

  container.addEventListener("keydown",event => {
    if (event.key === "Escape"){
      closeDetail();
      closeModal();
    }
  });

  container.dataset.buildingDelegates = "1";
}

container.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click",() => setTab(button.dataset.tab));
});

$("search").addEventListener("input",render);
$("status").addEventListener("change",render);
$("useCurrentLocation").addEventListener("click",requestCurrentLocation);
$("chooseMapLocation").addEventListener("click",chooseMapLocation);
$("buildingForm").addEventListener("submit",handleCreateBuilding);


loadData();
}
