import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAf546IZIDpUkQFJPukXESbIsaZ6dY11fY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "iga-factory-1701676663081.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "iga-factory-1701676663081",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "iga-factory-1701676663081.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "801031733242",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:801031733242:web:f120c9a12cb56efcf02e43",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2F5LVR52SE"
};

// Validate that required config is present
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
  console.error("Firebase API key is missing. Please check your environment variables.");
}

// Check if we should disable Firebase (for development/testing)
const DISABLE_FIREBASE = import.meta.env.VITE_DISABLE_FIREBASE === 'true';

let app: any = null;
let auth: any = null;
let provider: any = null;
let db: any = null;

if (!DISABLE_FIREBASE) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    console.log('Continuing without Firebase authentication');
  }
} else {
  console.log('Firebase disabled by environment variable');
}

export { auth, provider, db };

