import { Suspense } from "react";

import { AuthScreen } from "@/components/auth/auth-screen";

import type { Metadata } from "next";

// T-6.15: no unique content for a search result to land on — noindex, but
// still followable so crawlers reach pages linked from here.
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
