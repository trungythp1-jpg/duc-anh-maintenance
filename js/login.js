import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "./core/firebase.js";


/* =========================
   ELEMENTS
========================= */

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");

const passwordToggle =
  document.getElementById("passwordToggle");

const forgotButton =
  document.getElementById("forgotButton");

const loginButton =
  document.getElementById("loginButton");

const loginMessage =
  document.getElementById("loginMessage");

const emailError =
  document.getElementById("emailError");

const passwordError =
  document.getElementById("passwordError");


/* =========================
   MESSAGE
========================= */

function showMessage(message, type = "") {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.dataset.type = type;
}


function clearErrors() {
  if (emailError) {
    emailError.textContent = "";
  }

  if (passwordError) {
    passwordError.textContent = "";
  }

  showMessage("");
}


/* =========================
   LOADING
========================= */

function setLoading(loading) {

  if (!loginButton) return;

  loginButton.disabled = loading;

  const text =
    loginButton.querySelector("span:first-child");

  if (text) {
    text.textContent =
      loading
        ? "Đang đăng nhập..."
        : "Đăng nhập";
  }

  loginButton.style.opacity =
    loading ? "0.7" : "";
}


/* =========================
   FIREBASE ERROR
========================= */

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


/* =========================
   PASSWORD SHOW / HIDE
========================= */

passwordToggle?.addEventListener("click", () => {

  const showing =
    password.type === "text";

  password.type =
    showing ? "password" : "text";

  passwordToggle.textContent =
    showing ? "Hiện" : "Ẩn";
});


/* =========================
   FORGOT PASSWORD
========================= */

forgotButton?.addEventListener(
  "click",
  async () => {

    clearErrors();

    const emailValue =
      email.value.trim();

    if (!emailValue) {

      emailError.textContent =
        "Nhập email trước khi khôi phục mật khẩu.";

      email.focus();

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        emailValue
      )
    ) {

      emailError.textContent =
        "Email chưa đúng định dạng.";

      email.focus();

      return;
    }

    try {

      showMessage(
        "Đang gửi email khôi phục...",
        "info"
      );

      await sendPasswordResetEmail(
        auth,
        emailValue
      );

      showMessage(
        "Đã gửi email khôi phục mật khẩu. Hãy kiểm tra hộp thư.",
        "success"
      );

    } catch (error) {

      showMessage(
        friendlyAuthError(error),
        "error"
      );
    }
  }
);


/* =========================
   LOGIN
========================= */

form?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearErrors();

    const emailValue =
      email.value.trim();

    const passwordValue =
      password.value;


    /* VALIDATION */

    let valid = true;

    if (!emailValue) {

      emailError.textContent =
        "Vui lòng nhập email.";

      valid = false;

    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        emailValue
      )
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


    /* LOGIN */

    setLoading(true);

    try {

      const persistence =
        remember?.checked
          ? browserLocalPersistence
          : browserSessionPersistence;


      /*
       * Firebase sẽ hoàn tất việc thiết lập
       * persistence trước khi thực hiện đăng nhập.
       */
      await setPersistence(
        auth,
        persistence
      );


      await signInWithEmailAndPassword(
        auth,
        emailValue,
        passwordValue
      );


      /*
       * Đăng nhập thành công → chuyển ngay
       * sang Dashboard.
       */
      window.location.replace(
        "dashboard.html"
      );


    } catch (error) {

      showMessage(
        friendlyAuthError(error),
        "error"
      );

      setLoading(false);
    }

  }
);