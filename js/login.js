import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
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
      ? "Đang đăng nhập..."
      : "Đăng nhập";
  }

  loginButton.style.opacity = loading ? "0.7" : "";
}


function friendlyAuthError(error) {

  switch (error?.code) {

    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email hoặc mật khẩu không đúng.";

    case "auth/user-disabled":
      return "Tài khoản đã bị khóa.";

    case "auth/too-many-requests":
      return "Có quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau.";

    case "auth/network-request-failed":
      return "Không thể kết nối máy chủ. Kiểm tra Internet và thử lại.";

    case "auth/invalid-email":
      return "Email chưa đúng định dạng.";

    case "auth/user-not-found":
      return "Không tìm thấy tài khoản.";

    default:
      return "Đăng nhập không thành công. Vui lòng thử lại.";
  }
}


/* ================================
   HIỆN / ẨN MẬT KHẨU
================================ */

passwordToggle?.addEventListener("click", () => {

  const showing = password.type === "text";

  password.type = showing
    ? "password"
    : "text";

  passwordToggle.textContent = showing
    ? "Hiện"
    : "Ẩn";
});


/* ================================
   QUÊN MẬT KHẨU
================================ */

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

    await sendPasswordResetEmail(
      auth,
      emailValue
    );

    showMessage(
      "Đã gửi email khôi phục mật khẩu. Hãy kiểm tra hộp thư.",
      "success"
    );

  } catch (error) {

    console.error(
      "PASSWORD_RESET_ERROR:",
      error
    );

    showMessage(
      friendlyAuthError(error),
      "error"
    );
  }

});


/* ================================
   ĐĂNG NHẬP FIREBASE
================================ */

form?.addEventListener("submit", async (event) => {

  event.preventDefault();

  clearErrors();

  const emailValue =
    email.value.trim();

  const passwordValue =
    password.value;

  let valid = true;


  /* Validate Email */

  if (!emailValue) {

    emailError.textContent =
      "Vui lòng nhập email.";

    valid = false;

  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
  ) {

    emailError.textContent =
      "Email chưa đúng định dạng.";

    valid = false;
  }


  /* Validate Password */

  if (!passwordValue) {

    passwordError.textContent =
      "Vui lòng nhập mật khẩu.";

    valid = false;
  }


  if (!valid) {
    return;
  }


  setLoading(true);


  try {

    /*
     * Ghi nhớ đăng nhập:
     * LOCAL = giữ phiên đăng nhập
     * SESSION = chỉ giữ trong phiên hiện tại
     */

    const persistence =
      remember?.checked
        ? browserLocalPersistence
        : browserSessionPersistence;


    await setPersistence(
      auth,
      persistence
    );


    /*
     * Đăng nhập Firebase
     */

    const credential =
      await signInWithEmailAndPassword(
        auth,
        emailValue,
        passwordValue
      );


    /*
     * Làm mới ID Token để lấy
     * custom claims mới nhất.
     */

    await credential.user.getIdToken(true);


    showMessage(
      "Đăng nhập thành công. Đang mở hệ thống...",
      "success"
    );


    /*
     * Chuyển sang Dashboard
     */

    window.location.replace(
      "dashboard.html"
    );


  } catch (error) {

    console.error(
      "LOGIN_ERROR:",
      error
    );

    showMessage(
      friendlyAuthError(error),
      "error"
    );

  } finally {

    setLoading(false);

  }

});