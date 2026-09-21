import { httpsCallable } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
import { app } from './firebase.js';
export function callable(name){ if(!app) throw new Error('FIREBASE_NOT_CONFIGURED'); return httpsCallable(getFunctions(app,'asia-southeast1'),name); }
