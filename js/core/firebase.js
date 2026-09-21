// ============================================================
// DUC ANH MAINTENANCE
// Firebase DEV Configuration
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { getStorage } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "duc-anh-maintenance-dev.firebaseapp.com",
  projectId: "duc-anh-maintenance-dev",
  storageBucket: "duc-anh-maintenance-dev.firebasestorage.app",
  messagingSenderId: "105981730366",
  appId: "PASTE_YOUR_FIREBASE_APP_ID_HERE"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);


// ============================================================
// SERVICES
// ============================================================

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


// ============================================================
// EXPORT
// ============================================================

export {
  app,
  auth,
  db,
  storage
};