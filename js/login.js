const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const passwordToggle = document.getElementById("passwordToggle");
const forgotButton = document.getElementById("forgotButton");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

passwordToggle?.addEventListener("click", () => {
  const showing = password.type === "text";

  password.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Hiện" : "Ẩn";
  passwordToggle.setAttribute(
    "aria-label",
    showing ? "Hiện mật khẩu" : "Ẩn mật khẩu"
  );
});

forgotButton?.addEventListener("click", () => {
  loginMessage.textContent = "Chức năng khôi phục mật khẩu sẽ được kết nối sau.";
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  emailError.textContent = "";
  passwordError.textContent = "";
  loginMessage.textContent = "";

  const emailValue = email.value.trim();
  const passwordValue = password.value;

  let valid = true;

  if (!emailValue) {
    emailError.textContent = "Vui lòng nhập email.";
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    emailError.textContent = "Email chưa đúng định dạng.";
    valid = false;
  }

  if (!passwordValue) {
    passwordError.textContent = "Vui lòng nhập mật khẩu.";
    valid = false;
  }

  if (!valid) return;

  loginButton.disabled = true;
  loginButton.querySelector("span:first-child").textContent = "Đang kiểm tra...";

  /*
   * UI ONLY:
   * Firebase Authentication will be connected later.
   */
  setTimeout(() => {
    loginButton.disabled = false;
    loginButton.querySelector("span:first-child").textContent = "Đăng nhập";
    loginMessage.textContent =
      "Giao diện đăng nhập đã sẵn sàng. Firebase sẽ được kết nối ở bước backend.";
  }, 500);
});
