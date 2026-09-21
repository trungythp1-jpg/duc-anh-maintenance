import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { auth } from './firebase.js';
export async function login(email,password){ if(!auth) throw new Error('FIREBASE_NOT_CONFIGURED'); return signInWithEmailAndPassword(auth,email,password); }
export async function logout(){ if(auth) return signOut(auth); }
export function watchAuth(callback){ if(!auth) return ()=>{}; return onAuthStateChanged(auth,callback); }
