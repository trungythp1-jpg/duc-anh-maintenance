import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvctMMojc9qpbRiImmpFprc0RZ5Av00TU",
  authDomain: "duc-anh-maintenance-dev.firebaseapp.com",
  projectId: "duc-anh-maintenance-dev",
  storageBucket: "duc-anh-maintenance-dev.firebasestorage.app",
  messagingSenderId: "105981730366",
  appId: "1:105981730366:web:170460eb879c048afd3b6f"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };