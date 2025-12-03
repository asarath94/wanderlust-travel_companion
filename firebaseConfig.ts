import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
// @ts-ignore - getReactNativePersistence not typed in firebase/auth but available at runtime
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from 'react-native';



// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtznfcvf9nOi-Zm48PRFtcVc1F--6TOVU",
  authDomain: "wander-lust-ce399.firebaseapp.com",
  projectId: "wander-lust-ce399",
  storageBucket: "wander-lust-ce399.firebasestorage.app",
  messagingSenderId: "675306888518",
  appId: "1:675306888518:web:d2b7ad38353272772cd947",
  measurementId: "G-NB163QST41"
};

const app = initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
