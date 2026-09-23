"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { GoogleButton } from "@/components/auth/google-button";

interface AuthScreenProps {
  mode: "login" | "signup";
}

const COPY = {
  login: {
    title: "Sign in",
    subtitle: "Welcome back.",
    switchPrompt: "New to ARGUS?",
    switchHref: "/signup",
    switchLabel: "Create an account",
  },
  signup: {
    title: "Create an account",
    subtitle: "Start a due-diligence run in minutes.",
    switchPrompt: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in",
  },
} as const;

function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const copy = COPY[mode];

  function handleSuccess() {
    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect.startsWith("/app") ? redirect : "/app");
  }

  return (
    <AuthCard title={copy.title} subtitle={copy.subtitle} error={error}>
      <div className="flex flex-col gap-4">
        <GoogleButton onSuccess={handleSuccess} onError={setError} />

        <div className="flex items-center gap-3 text-ui-sm text-mist" role="separator">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <EmailPasswordForm mode={mode} onSuccess={handleSuccess} onError={setError} />

        <p className="text-ui-sm text-mist">
          {copy.switchPrompt}{" "}
          <Link href={copy.switchHref} className="text-foreground underline underline-offset-4">
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export { AuthScreen };
