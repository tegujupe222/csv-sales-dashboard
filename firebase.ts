import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AlzaSyAr546IZIDpUkQFJPukXESbIsaZ6dY11fY",
  authDomain: "iga-factory-1701767663081.firebaseapp.com",
  projectId: "iga-factory-1701767663081",
  storageBucket: "iga-factory-1701767663081.appspot.com",
  messagingSenderId: "801031733242",
  appId: "1:801031733242:web:f120c9a12cb56efcf02e43"
  // measurementId: "G-XXXXXXXXXX" // （もし表示されていればここに追加）
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

