(() => {
  const NAV_ITEMS = [
    {
      section: "TỔNG QUAN",
      items: [
        { label: "Dashboard", href: "dashboard.html", icon: "⌂" }
      ]
    },
    {
      section: "VẬN HÀNH",
      items: [
        { label: "Khách hàng", href: "customers.html", icon: "♙" },
        { label: "Tòa nhà", href: "buildings.html", icon: "▦" },
        { label: "Thang máy", href: "elevators.html", icon: "↕" },
        { label: "Hợp đồng", module: "contracts", icon: "▤" },
        { label: "Bảo trì", module: "maintenance", icon: "⚙" },
        { label: "Work Order", module: "work-orders", icon: "✓" }
      ]
    },
    {
      section: "NHÂN SỰ",
      items: [
        { label: "Kỹ thuật viên", module: "technicians", icon: "♟" },
        { label: "KPI", module: "kpi", icon: "▥" }
      ]
    },
    {
      section: "HỆ THỐNG",
      items: [
        { label: "Import Center", module: "import-center", icon: "⇧" },
        { label: "Documents", module: "documents", icon: "▱" },
        { label: "Cài đặt", module: "settings", icon: "⚙" }
      ]
    }
  ];

  function currentPage() {
    const file = window.location.pathname.split("/").pop();
    return file || "index.html";
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

            ${section.items.map(item => {
              const unavailable = item.module
                ? ` data-module="${item.module}"`
                : "";

              const href = item.href || "#";

              return `
                <a
                  class="da-nav-item"
                  href="${href}"${unavailable}
                  data-label="${item.label}">
                  <span class="da-nav-icon">${item.icon}</span>
                  <span>${item.label}</span>
                </a>
              `;
            }).join("")}
          </div>
        `).join("")}
      </nav>

      <div class="da-nav-footer">
        <strong>ĐỨC ANH MAINTENANCE</strong>
        <span>DEV V1.5</span>
      </div>
    `;

    return sidebar;
  }

  function buildMobileControls() {
    const button = document.createElement("button");
    button.className = "da-mobile-menu";
    button.id = "daMenuButton";
    button.type = "button";
    button.setAttribute("aria-label", "Mở menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = "☰";

    const overlay = document.createElement("div");
    overlay.className = "da-nav-overlay";
    overlay.id = "daNavOverlay";

    return { button, overlay };
  }

  function setActiveLink(sidebar) {
    const page = currentPage();

    sidebar.querySelectorAll(".da-nav-item").forEach(link => {
      const href = link.getAttribute("href");

      if (href && href !== "#" && href === page) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function closeSidebar(sidebar, overlay, button) {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    button.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("da-sidebar-open");
  }

  function openSidebar(sidebar, overlay, button) {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    button.classList.add("open");
    button.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("da-sidebar-open");
  }

  function init() {
    if (document.querySelector(".da-shared-sidebar")) return;

    document.body.classList.add("da-nav-page");

    const sidebar = buildSidebar();
    const { button, overlay } = buildMobileControls();

    document.body.prepend(overlay);
    document.body.prepend(sidebar);
    document.body.prepend(button);

    setActiveLink(sidebar);

    button.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeSidebar(sidebar, overlay, button);
      } else {
        openSidebar(sidebar, overlay, button);
      }
    });

    overlay.addEventListener("click", () => {
      closeSidebar(sidebar, overlay, button);
    });

    sidebar.addEventListener("click", event => {
      const link = event.target.closest(".da-nav-item");
      if (!link) return;

      const module = link.dataset.module;

      if (module) {
        event.preventDefault();
        closeSidebar(sidebar, overlay, button);

        alert(
          "Module này đang trong quá trình xây dựng.\n\n" +
          "Đức Anh Maintenance DEV V1.5"
        );

        return;
      }

      if (window.innerWidth <= 820) {
        closeSidebar(sidebar, overlay, button);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeSidebar(sidebar, overlay, button);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        closeSidebar(sidebar, overlay, button);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
