const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

let touchStartX = 0;
let touchStartY = 0;

function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");

  document.documentElement.classList.add("sidebar-open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");

  document.documentElement.classList.remove("sidebar-open");
}

function toggleSidebar() {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/* Nút menu */
menuButton?.addEventListener("click", toggleSidebar);

/* Chạm vùng bên phải */
overlay?.addEventListener("click", (event) => {
  event.preventDefault();
  closeSidebar();
});

/* iPhone: đảm bảo touch cũng đóng menu */
overlay?.addEventListener("touchend", (event) => {
  event.preventDefault();
  closeSidebar();
}, { passive: false });

/* Vuốt từ trái sang phải để đóng */
sidebar?.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

sidebar?.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];

  const deltaX = touch.clientX - touchStartX;
  const deltaY = Math.abs(touch.clientY - touchStartY);

  if (deltaX > 80 && deltaY < 100) {
    closeSidebar();
  }
}, { passive: true });

/* Menu */
document.querySelectorAll(".nav-item").forEach((item) => {

  item.addEventListener("click", () => {

    document.querySelectorAll(".nav-item").forEach((navItem) => {
      navItem.classList.remove("active");
    });

    item.classList.add("active");

    if (window.innerWidth <= 820) {
      closeSidebar();
    }
  });

});

/* Resize về desktop */
window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    closeSidebar();
  }
});