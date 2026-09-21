import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
      <h1 className="font-serif text-h2">ARGUS AI</h1>
      <p className="max-w-md text-center text-body text-muted-foreground">
        Foundation scaffold. The landing page ships in Phase 1 (see docs/TRACKER.md).
      </p>
      <Button>Placeholder button</Button>
    </main>
  );
}
