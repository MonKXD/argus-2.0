import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/api/auth";

import type { ReactNode } from "react";

// src/proxy.ts already redirects an unauthenticated request here before it
// renders (cookie presence only, fast). This is the real authorization
// boundary (TRD section 8): requireUser() verifies the cookie
// cryptographically. Defence in depth — a route excluded from proxy's
// matcher by a future refactor still can't reach this layout unauthenticated.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser().catch(() => {
    redirect("/login");
  });

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
