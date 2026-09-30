"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe `matchMedia` subscription. Server render and the first client
 * render both return `false` (avoids a hydration mismatch); the real value
 * is applied in an effect once `window` exists, then kept in sync via the
 * media query's own `change` event.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    // Defer the initial read: calling setState synchronously in an effect
    // body trips react-hooks/set-state-in-effect (same pattern as
    // ReportSectionNav's initial-hash measurement).
    const raf = requestAnimationFrame(onChange);
    mql.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(raf);
      mql.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
}

export { useMediaQuery };
