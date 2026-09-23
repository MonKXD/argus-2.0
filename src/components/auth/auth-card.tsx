import Link from "next/link";

import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: ReactNode;
  error: string | null;
  children: ReactNode;
}

// DESIGN: dark-only surface, tokens only (R-UI-02), no gradients or glow (R-UI-06).
function AuthCard({ title, subtitle, error, children }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-panel border border-border bg-card p-8">
        <Link href="/" className="text-ui font-medium text-mist hover:text-foreground">
          ARGUS AI
        </Link>
        <h1 className="mt-4 font-serif text-h3">{title}</h1>
        <p className="mt-1 text-body text-mist">{subtitle}</p>

        {error && (
          <p role="alert" className="mt-4 text-ui-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export { AuthCard };
