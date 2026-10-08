import { Suspense } from "react";

import { AuthScreen } from "@/components/auth/auth-screen";

import type { Metadata } from "next";

// T-6.15: same reasoning as /login — noindex, still followable.
export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <Suspense>
      <AuthScreen mode="signup" />
    </Suspense>
  );
}
