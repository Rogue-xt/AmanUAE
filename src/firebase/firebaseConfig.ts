import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBoAnPNR5Smb01o3TPc3lqjLo392BSh3vo",
  authDomain: "zonegard-48542.firebaseapp.com",
  projectId: "zonegard-48542",
  storageBucket: "zonegard-48542.firebasestorage.app",
  messagingSenderId: "599396470801",
  appId: "1:599396470801:web:75830f2471bc0ed172e1b0",
  measurementId: "G-K3Z7HHNRT3",
};

const hasExistingApp = getApps().length > 0;
const app = hasExistingApp ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = hasExistingApp
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

export { auth };

export const db = getFirestore(app);

export default app;
