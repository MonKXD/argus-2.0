"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, signInWithEmail, signUpWithEmail } from "@/lib/firebase/client-auth";
import { cn } from "@/lib/utils";

interface EmailPasswordFormProps {
  mode: "login" | "signup";
  onSuccess: () => void;
  onError: (message: string | null) => void;
}

// DESIGN section 6 / R-UI-08: visible label above every control, error text
// tied to its field with aria-describedby, form-level failures announced via
// role="alert" (R-UI-11: plain, sentence case, no apology).
function EmailPasswordForm({ mode, onSuccess, onError }: EmailPasswordFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    onError(null);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess();
    } catch (caught) {
      onError(authErrorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete={mode === "signup" ? "email" : "username"}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            aria-describedby={mode === "signup" ? "password-constraints" : undefined}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className={cn(
              "absolute inset-y-0 right-0 flex w-9 items-center justify-center text-mist",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {mode === "signup" && (
          <p id="password-constraints" className="text-ui-sm text-mist">
            Eight or more characters.
          </p>
        )}
      </div>

      <Button type="submit" disabled={submitting}>
        {mode === "signup"
          ? submitting
            ? "Creating account…"
            : "Create account"
          : submitting
            ? "Signing in…"
            : "Sign in"}
      </Button>
    </form>
  );
}

export { EmailPasswordForm };
