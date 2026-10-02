"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import * as React from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";

interface UseDeleteAccountResult {
  deleting: boolean;
  error: string | null;
  deleteAccount: () => Promise<void>;
}

/**
 * FR-AUT-03: calls the real cascading `DELETE /api/account` and redirects
 * to `/login` on success. Same split-from-the-Dialog-component shape as
 * `useDeleteAnalysis` (jsdom can't render native `<dialog>`'s
 * `showModal()`), with one addition: `DELETE /api/account` already clears
 * the server-side session cookie, but the client Firebase Auth SDK keeps
 * its own cached signed-in state independent of that cookie — `signOut()`
 * here clears it too, the same cleanup `signOutUser()` does for a plain
 * sign-out, so a stale client session can't briefly believe it's still
 * authenticated after the account is already gone.
 */
export function useDeleteAccount(): UseDeleteAccountResult {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const deleteAccount = React.useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't delete your account. Try again.");
        setDeleting(false);
        return;
      }
      await signOut(getFirebaseAuth());
      router.push("/login");
      router.refresh();
    } catch {
      setError("Couldn't delete your account. Check your connection and try again.");
      setDeleting(false);
    }
  }, [router]);

  return { deleting, error, deleteAccount };
}
