import { cn } from "@/lib/utils";

import type { ComponentProps } from "react";

// DESIGN section 6: "Static Surface tone at final layout size; no shimmer."
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-data bg-panel-raised", className)}
      {...props}
    />
  );
}

export { Skeleton };
