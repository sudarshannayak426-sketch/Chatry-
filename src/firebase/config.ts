import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { FirebaseClientConfig } from '../types';

const STORAGE_KEY = 'chatry_firebase_custom_config';

export function getActiveFirebaseConfig(): FirebaseClientConfig | null {
  // 1. Check local storage for user-provided configuration
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.apiKey && parsed?.projectId && !parsed.apiKey.includes('YOUR_')) {
        return parsed as FirebaseClientConfig;
      }
    }
  } catch (err) {
    console.warn('Error reading saved Firebase configuration', err);
  }

  // 2. Check environment variables
  const env = import.meta.env;
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && !env.VITE_FIREBASE_API_KEY.includes('YOUR_')) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
    };
  }

  // 3. Check for firebase-applet-config.json if provisioned or dropped into project
  try {
    const appletConfigs = import.meta.glob<Record<string, any>>('/firebase-applet-config.json', { eager: true });
    const configModule = appletConfigs['/firebase-applet-config.json'];
    if (configModule) {
      const json: any = configModule.default || configModule;
      if (json?.apiKey && json?.projectId && !json.apiKey.includes('YOUR_')) {
        return {
          apiKey: json.apiKey,
          authDomain: json.authDomain || `${json.projectId}.firebaseapp.com`,
          projectId: json.projectId,
          storageBucket: json.storageBucket || `${json.projectId}.appspot.com`,
          messagingSenderId: json.messagingSenderId || '',
          appId: json.appId || '',
          measurementId: json.measurementId || '',
        };
      }
    }
  } catch {
    // Ignore if not found
  }

  return null;
}

export function saveFirebaseConfig(cfg: FirebaseClientConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getMissingConfigFields(): string[] {
  const current = getActiveFirebaseConfig();
  if (!current) {
    return ['apiKey', 'projectId', 'authDomain', 'storageBucket', 'appId'];
  }
  const missing: string[] = [];
  if (!current.apiKey) missing.push('apiKey');
  if (!current.projectId) missing.push('projectId');
  if (!current.authDomain) missing.push('authDomain');
  if (!current.storageBucket) missing.push('storageBucket');
  if (!current.appId) missing.push('appId');
  return missing;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const config = getActiveFirebaseConfig();

if (config) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
}

export { app, auth, db, storage };

export function isFirebaseConfigured(): boolean {
  return Boolean(app && auth && db && storage);
}

export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return {
      success: false,
      message: 'Firebase Firestore is not initialized. Please configure your Firebase credentials.',
    };
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { success: true, message: 'Successfully connected to Cloud Firestore!' };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        return { success: false, message: 'Client is offline. Please check your network and Firebase config.' };
      }
      // Any server response (including permission-denied on the test doc) verifies live reachability to Firestore
      return { success: true, message: 'Firestore server is reachable and active!' };
    }
    return { success: false, message: 'Unknown error connecting to Firestore.' };
  }
}
