"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { authErrorMessage, signInWithGoogle } from "@/lib/firebase/client-auth";

interface GoogleButtonProps {
  onSuccess: () => void;
  onError: (message: string | null) => void;
}

function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick() {
    setSubmitting(true);
    onError(null);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (error) {
      onError(authErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={submitting}>
      {submitting ? "Connecting to Google…" : "Continue with Google"}
    </Button>
  );
}

export { GoogleButton };
