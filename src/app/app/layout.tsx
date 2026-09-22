import { AppShell } from "@/components/layout/app-shell";

import type { ReactNode } from "react";

// Auth guard (requireUser, redirect to /login) lands in Phase 3 (T-3.xx) —
// this route group only has demo-data content until then (T-1.13, T-1.14).

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
