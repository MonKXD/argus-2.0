"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

/**
 * Shared by every "New analysis" entry point (Topbar, MobileBottomBar,
 * empty states). FR-INT-01 makes the startup name required at creation;
 * the wizard's Basics step is where the user actually names it, so this
 * seeds a placeholder they immediately edit.
 */
export function useCreateAnalysis(): { create: () => Promise<void>; creating: boolean } {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  const create = React.useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startup: { name: "Untitled analysis" } }),
      });
      if (!response.ok) throw new Error("Could not create analysis.");
      const { analysis } = (await response.json()) as { analysis: { id: string } };
      router.push(`/app/analyses/${analysis.id}/setup?step=basics`);
    } catch {
      setCreating(false);
    }
  }, [creating, router]);

  return { create, creating };
}
