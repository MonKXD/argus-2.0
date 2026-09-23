"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

import { clientEnv } from "@/lib/env";

/** Client-side Firebase app/Auth/Storage singletons (TRD section 8: Firebase Auth on the client; T-3.06: direct-to-Storage uploads). */
let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedStorage: FirebaseStorage | undefined;
let authEmulatorConnected = false;
let storageEmulatorConnected = false;

function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  cachedApp =
    existing ??
    initializeApp({
      apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
    });

  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;

  cachedAuth = getAuth(getFirebaseApp());

  // connectAuthEmulator must be called exactly once, before any other Auth
  // use, or it throws — guarded here rather than at every call site.
  if (clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS && !authEmulatorConnected) {
    connectAuthEmulator(cachedAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    authEmulatorConnected = true;
  }

  return cachedAuth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) return cachedStorage;

  cachedStorage = getStorage(getFirebaseApp());

  // Same one-time-before-any-use guard as connectAuthEmulator, for Storage's own emulator connection.
  if (clientEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATORS && !storageEmulatorConnected) {
    connectStorageEmulator(cachedStorage, "127.0.0.1", 9199);
    storageEmulatorConnected = true;
  }

  return cachedStorage;
}
