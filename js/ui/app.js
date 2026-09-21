const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");

  // Lock the page behind the sidebar.
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");

  document.body.classList.remove("sidebar-open");
}

function toggleSidebar() {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

menuButton?.addEventListener("click", toggleSidebar);

overlay?.addEventListener("click", closeSidebar);

// Menu items.
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((navItem) => {
      navItem.classList.remove("active");
    });

    item.classList.add("active");

    // Close only after selecting a menu item.
    if (window.innerWidth <= 820) {
      closeSidebar();
    }
  });
});

// If the screen becomes desktop-sized, reset mobile state.
window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    closeSidebar();
  }
});
