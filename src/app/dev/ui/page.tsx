"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Component gallery seed (T-1.17 builds this out to cover every primitive
 * and state). For now: Dialog and Sheet, the two hand-built native-<dialog>
 * primitives, exercised by tests/e2e/dialog-sheet.spec.ts — jsdom doesn't
 * implement showModal() (see PROJECT_MEMORY), so a real browser is the only
 * way to catch regressions in that wiring.
 */
export default function DevUiGallery() {
  return (
    <main className="flex flex-col gap-8 p-16">
      <h1 className="font-serif text-h2">Component gallery</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm export</DialogTitle>
              <DialogDescription>This exports the current report as Markdown.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Export</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Sheet</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open sheet</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Evidence</SheetTitle>
            </SheetHeader>
            <p>Deck, page 7. &ldquo;ARR reached $2.0M in Q2&rdquo;</p>
          </SheetContent>
        </Sheet>
      </section>
    </main>
  );
}
