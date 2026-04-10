import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDqZ-VBV6swHBkVNW1Fpu4yx0c6Zf-YIPE",
  authDomain: "kairodocs-database.firebaseapp.com",
  databaseURL: "https://kairodocs-database-default-rtdb.firebaseio.com",
  projectId: "kairodocs-database",
  storageBucket: "kairodocs-database.firebasestorage.app",
  messagingSenderId: "808095840055",
  appId: "1:808095840055:web:3bef883409de15e0d74cb2",
  measurementId: "G-P9L9NHGNKX"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { app, auth, database, storage };
