import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';

const firebaseConfig = window.DA_FIREBASE_CONFIG || null;
export const FIREBASE_ENV='DEV';
export const firebaseReady=Boolean(firebaseConfig?.projectId);
export const app=firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const auth=app ? getAuth(app) : null;
export const db=app ? getFirestore(app) : null;
export const storage=app ? getStorage(app) : null;
