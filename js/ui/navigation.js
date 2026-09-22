(() => {
  const NAV_ITEMS = [
    { section: "TỔNG QUAN", items: [
      { label: "Dashboard", href: "dashboard.html", icon: "⌂" }
    ]},
    { section: "VẬN HÀNH", items: [
      { label: "Khách hàng", href: "customers.html", icon: "♙" },
      { label: "Tòa nhà", href: "buildings.html", icon: "▦" },
      { label: "Thang máy", href: "elevators.html", icon: "↕" },
      { label: "Hợp đồng", module: "contracts", icon: "▤" },
      { label: "Bảo trì", module: "maintenance", icon: "⚙" },
      { label: "Work Order", module: "work-orders", icon: "✓" }
    ]},
    { section: "NHÂN SỰ", items: [
      { label: "Kỹ thuật viên", module: "technicians", icon: "♟" },
      { label: "KPI", module: "kpi", icon: "▥" }
    ]},
    { section: "HỆ THỐNG", items: [
      { label: "Import Center", module: "import-center", icon: "⇧" },
      { label: "Documents", module: "documents", icon: "▱" },
      { label: "Cài đặt", module: "settings", icon: "⚙" }
    ]}
  ];

  function currentPage() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function buildSidebar() {
    const sidebar = document.createElement("aside");
    sidebar.className = "da-shared-sidebar";
    sidebar.id = "daSidebar";

    sidebar.innerHTML = `
      <div class="da-brand">
        <div class="da-brand-mark">DA</div>
        <div>
          <div class="da-brand-name">ĐỨC ANH</div>
          <div class="da-brand-sub">MAINTENANCE</div>
        </div>
      </div>
      <nav class="da-nav-scroll" aria-label="Điều hướng chính">
        ${NAV_ITEMS.map(section => `
          <div class="da-nav-section">
            <div class="da-nav-label">${section.section}</div>
            ${section.items.map(item => `
              <a class="da-nav-item"
                 href="${item.href || "#"}"
                 ${item.module ? `data-module="${item.module}"` : ""}>
                <span class="da-nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join("")}
          </div>
        `).join("")}
      </nav>
      <div class="da-nav-footer">
        <strong>ĐỨC ANH MAINTENANCE</strong>
        <span>DEV V1.8</span>
      </div>
    `;
    return sidebar;
  }

  function init() {
    if (document.querySelector(".da-shared-sidebar")) return;

    document.body.classList.add("da-nav-page");

    const sidebar = buildSidebar();
    const button = document.createElement("button");
    button.className = "da-mobile-menu";
    button.type = "button";
    button.id = "daMenuButton";
    button.setAttribute("aria-label", "Mở menu");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";

    const overlay = document.createElement("div");
    overlay.className = "da-nav-overlay";
    overlay.id = "daNavOverlay";

    document.body.prepend(overlay);
    document.body.prepend(sidebar);
    document.body.prepend(button);

    const page = currentPage();
    sidebar.querySelectorAll(".da-nav-item").forEach(link => {
      if (link.getAttribute("href") === page) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });

    const close = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
      button.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      document.documentElement.classList.remove("da-sidebar-open");
    };

    const open = () => {
      sidebar.classList.add("open");
      overlay.classList.add("show");
      button.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      document.documentElement.classList.add("da-sidebar-open");
    };

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      sidebar.classList.contains("open") ? close() : open();
    });

    overlay.addEventListener("click", close);

    sidebar.addEventListener("click", event => {
      const link = event.target.closest(".da-nav-item");
      if (!link) return;
      if (link.dataset.module) {
        event.preventDefault();
        close();
        alert("Module này đang trong quá trình xây dựng.\n\nĐức Anh Maintenance DEV V1.8");
      } else if (window.innerWidth <= 1100 || window.matchMedia("(pointer: coarse)").matches) {
        close();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") close();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100 && !window.matchMedia("(pointer: coarse)").matches) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
