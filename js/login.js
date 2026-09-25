import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { auth, db } from "./core/firebase.js";

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

function showMessage(message, type = "normal") {
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
    text.textContent = loading ? "Đang đăng nhập..." : "Đăng nhập";
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

function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

async function getPostLoginPath(user) {
  const profileSnap = await getDoc(doc(db, "users", user.uid));

  if (!profileSnap.exists()) {
    throw new Error("Tài khoản đã đăng nhập nhưng chưa có hồ sơ users/{uid}.");
  }

  const profile = profileSnap.data() || {};
  const role = normalizeRole(profile.role);

  /*
   * KTV không đi qua Dashboard.
   * Sau khi đăng nhập thành công, chuyển thẳng tới
   * màn hình "Công việc của tôi".
   */
  if (role === "TECHNICIAN") {
    return "cong-viec-cua-toi.html";
  }

  /*
   * Các role quản lý vẫn giữ luồng cũ.
   */
  return "dashboard.html";
}

/* Hiện / ẩn mật khẩu */
passwordToggle?.addEventListener("click", () => {
  const showing = password.type === "text";

  password.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Hiện" : "Ẩn";
});

/* Quên mật khẩu */
forgotButton?.addEventListener("click", async () => {
  clearErrors();

  const emailValue = email.value.trim();

  if (!emailValue) {
    emailError.textContent = "Nhập email trước khi khôi phục mật khẩu.";
    email.focus();
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    emailError.textContent = "Email chưa đúng định dạng.";
    email.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, emailValue);
    showMessage("Đã gửi email khôi phục mật khẩu. Hãy kiểm tra hộp thư.", "success");
  } catch (error) {
    showMessage(friendlyAuthError(error), "error");
  }
});

/* Đăng nhập Firebase */
form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearErrors();

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

  setLoading(true);

  try {
    const persistence = remember?.checked
      ? browserLocalPersistence
      : browserSessionPersistence;

    await setPersistence(auth, persistence);

    const credential = await signInWithEmailAndPassword(
      auth,
      emailValue,
      passwordValue
    );

    await credential.user.getIdToken(true);

    const destination = await getPostLoginPath(credential.user);

    showMessage("Đăng nhập thành công. Đang mở hệ thống...", "success");

    window.location.replace(destination);

  } catch (error) {
    console.error("LOGIN_ERROR:", error);
    showMessage(
      error?.message?.startsWith("Tài khoản đã đăng nhập")
        ? error.message
        : friendlyAuthError(error),
      "error"
    );

  } finally {
    setLoading(false);
  }
});
