import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "./core/firebase.js";

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

function showMessage(message, type = "") {
  loginMessage.textContent = message;
  loginMessage.dataset.type = type;
}

function clearErrors() {
  emailError.textContent = "";
  passwordError.textContent = "";
  showMessage("");
}

function setLoading(loading) {
  loginButton.disabled = loading;

  const text = loginButton.querySelector("span:first-child");

  if (text) {
    text.textContent = loading
      ? "Đang kiểm tra..."
      : "Đăng nhập";
  }

  loginButton.style.opacity = loading ? "0.7" : "";
}

function friendlyAuthError(error) {
  console.error("FIREBASE AUTH ERROR:", error);

  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email hoặc mật khẩu không đúng.";

    case "auth/user-disabled":
      return "Tài khoản đã bị khóa.";

    case "auth/too-many-requests":
      return "Có quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.";

    case "auth/network-request-failed":
      return "Không thể kết nối Firebase. Kiểm tra Internet.";

    case "auth/invalid-email":
      return "Email chưa đúng định dạng.";

    case "auth/user-not-found":
      return "Không tìm thấy tài khoản.";

    case "auth/wrong-password":
      return "Mật khẩu không đúng.";

    case "auth/api-key-not-valid":
      return "Firebase API Key không hợp lệ.";

    case "auth/operation-not-allowed":
      return "Phương thức Email/Password chưa được bật.";

    default:
      return `Firebase lỗi: ${error?.code || "UNKNOWN_ERROR"}`;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(message);
        error.code = "DEBUG_TIMEOUT";
        reject(error);
      }, ms);
    })
  ]);
}


/* =========================
   PASSWORD SHOW / HIDE
========================= */

passwordToggle?.addEventListener("click", () => {
  const showing = password.type === "text";

  password.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Hiện" : "Ẩn";
});


/* =========================
   FORGOT PASSWORD
========================= */

forgotButton?.addEventListener("click", async () => {
  clearErrors();

  const emailValue = email.value.trim();

  if (!emailValue) {
    emailError.textContent =
      "Nhập email trước khi khôi phục mật khẩu.";
    email.focus();
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    emailError.textContent =
      "Email chưa đúng định dạng.";
    email.focus();
    return;
  }

  try {
    showMessage("Đang gửi email khôi phục...", "info");

    await withTimeout(
      sendPasswordResetEmail(auth, emailValue),
      15000,
      "Gửi email khôi phục quá thời gian."
    );

    showMessage(
      "Đã gửi email khôi phục mật khẩu. Hãy kiểm tra hộp thư.",
      "success"
    );

  } catch (error) {
    console.error("PASSWORD_RESET_ERROR:", error);
    showMessage(
      friendlyAuthError(error),
      "error"
    );
  }
});


/* =========================
   LOGIN
========================= */

form?.addEventListener("submit", async (event) => {

  event.preventDefault();

  clearErrors();

  const emailValue = email.value.trim();
  const passwordValue = password.value;

  let valid = true;

  if (!emailValue) {
    emailError.textContent = "Vui lòng nhập email.";
    valid = false;
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
  ) {
    emailError.textContent =
      "Email chưa đúng định dạng.";
    valid = false;
  }

  if (!passwordValue) {
    passwordError.textContent =
      "Vui lòng nhập mật khẩu.";
    valid = false;
  }

  if (!valid) return;

  setLoading(true);

  try {

    /* STEP 1 */
    showMessage(
      "BƯỚC 1/3 — Đang kết nối Firebase...",
      "info"
    );

    console.log("DEBUG 1: Firebase Auth", auth);

    if (!auth) {
      throw new Error("Firebase Auth chưa được khởi tạo.");
    }


    /* STEP 2 */
    showMessage(
      "BƯỚC 2/3 — Đang thiết lập phiên đăng nhập...",
      "info"
    );

    const persistence = remember?.checked
      ? browserLocalPersistence
      : browserSessionPersistence;

    await withTimeout(
      setPersistence(auth, persistence),
      15000,
      "Thiết lập phiên đăng nhập quá thời gian."
    );

    console.log("DEBUG 2: Persistence OK");


    /* STEP 3 */
    showMessage(
      "BƯỚC 3/3 — Đang xác thực tài khoản...",
      "info"
    );

    console.log("DEBUG 3: Signing in...");

    const credential = await withTimeout(
      signInWithEmailAndPassword(
        auth,
        emailValue,
        passwordValue
      ),
      15000,
      "Firebase Authentication không phản hồi sau 15 giây."
    );

    console.log(
      "DEBUG 4: LOGIN SUCCESS",
      credential.user.uid
    );

    showMessage(
      "Đăng nhập thành công. Đang mở hệ thống...",
      "success"
    );

    await wait(500);

    window.location.replace("dashboard.html");

  } catch (error) {

    console.error("LOGIN DEBUG ERROR:", error);

    if (error?.code === "DEBUG_TIMEOUT") {

      showMessage(
        "Firebase không phản hồi sau 15 giây. " +
        "Mở console để xem chi tiết lỗi.",
        "error"
      );

    } else {

      showMessage(
        friendlyAuthError(error),
        "error"
      );

    }

  } finally {

    setLoading(false);

  }

});