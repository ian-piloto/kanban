import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAz7DYLSW90-yx9v8XPalfI03dik0_n-qc",
  authDomain: "kanban-tds-2026.firebaseapp.com",
  projectId: "kanban-tds-2026",
  storageBucket: "kanban-tds-2026.firebasestorage.app",
  messagingSenderId: "31033051711",
  appId: "1:31033051711:web:a5fdd6400334f4e1fdc68a"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
