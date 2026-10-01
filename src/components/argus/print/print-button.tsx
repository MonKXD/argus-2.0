"use client";

import { Button } from "@/components/ui/button";

/** FR-EXP-02: triggers the browser's own print dialog, from which "Save as
 * PDF" is a destination choice the browser (not this app) provides. Hidden
 * from the printed output itself via `print:hidden` on its wrapper. */
function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}

export { PrintButton };
