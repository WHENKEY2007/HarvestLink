const admin = require('firebase-admin');

let firebaseAdminApp = null;
let isFirebaseInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    isFirebaseInitialized = true;
    console.log('[Firebase Admin] Initialized with Service Account credentials');
  } else if (projectId) {
    // Attempt default initialization if running on Google Cloud or with GOOGLE_APPLICATION_CREDENTIALS
    firebaseAdminApp = admin.initializeApp({
      projectId
    });
    isFirebaseInitialized = true;
    console.log('[Firebase Admin] Initialized with Project ID:', projectId);
  } else {
    console.warn('[Firebase Admin Warning] Missing service account credentials in .env. Firebase Admin token verification running in fallback mode.');
  }
} catch (error) {
  console.error('[Firebase Admin Error]', error.message);
}

module.exports = {
  admin,
  firebaseAdminApp,
  isFirebaseInitialized: () => isFirebaseInitialized
};
