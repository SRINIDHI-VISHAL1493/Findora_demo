// src/config/firebase.js
// Firebase Admin SDK initialization with demo mode fallback

const admin = require('firebase-admin');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');

let db = null;
let storage = null;
let auth = null;
const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your-project-id';

if (!isDemoMode) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY is missing');

    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
    };

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    db = getFirestore();
    storage = getStorage();
    auth = getAuth();
    console.log('✅ Firebase Admin SDK initialized (project:', process.env.FIREBASE_PROJECT_ID + ')');
  } catch (err) {
    console.warn('⚠️  Firebase init failed, running in DEMO mode:', err.message);
  }
} else {
  console.log('🔧 Running in DEMO mode (no Firebase credentials needed)');
}

module.exports = { admin, db, storage, auth, isDemoMode: isDemoMode || !auth };
