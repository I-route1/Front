// src/firebase/config.js
import { initializeApp, getApps } from 'firebase/app'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigValid = (config = firebaseConfig) => {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId
  )
}

export const getFirebaseApp = () => {
  if (!isFirebaseConfigValid()) {
    console.warn('[Firebase] Firebase 설정값이 부족해서 초기화를 건너뜁니다.')
    return null
  }

  if (getApps().length > 0) {
    return getApps()[0]
  }

  return initializeApp(firebaseConfig)
}

export const app = getFirebaseApp()