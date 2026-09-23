"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { signOutUser } from "@/lib/firebase/client-auth";

interface UserMenuProps {
  email: string | null;
}

function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutUser();
    router.push("/login");
    router.refresh();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={email ? `Account menu, ${email}` : "Account menu"}
          className="size-8 shrink-0 rounded-full border border-hairline bg-panel-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-3">
          {email && <p className="truncate text-ui-sm text-mist">{email}</p>}
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { UserMenu };
