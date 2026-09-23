"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { getFirebaseAuth } from "./client";

import type { UserCredential } from "firebase/auth";

/** R-UI-11: plain, specific, sentence case, no apology. Keyed by the
 * Firebase Auth error codes this flow can actually hit. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-not-found": "No account matches that email.",
  "auth/wrong-password": "That email or password is incorrect.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/weak-password": "Use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in was closed before it finished.",
  "auth/cancelled-popup-request": "Sign-in was closed before it finished.",
  "auth/network-request-failed": "Check your connection and try again.",
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? "Sign-in failed. Try again.";
  }
  return "Sign-in failed. Try again.";
}

async function establishSession(credential: UserCredential): Promise<void> {
  const idToken = await credential.user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error("Could not start a session. Try again.");
  }
}

export async function signInWithGoogle(): Promise<void> {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  await establishSession(credential);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await establishSession(credential);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await establishSession(credential);
}

export async function signOutUser(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(getFirebaseAuth());
}
