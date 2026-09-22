/**
 * Deterministic, readable IDs for demo/fixture data only. Digits alone are a
 * valid (if boring) Crockford base32 string, so `demoId("ana", 1)` always
 * satisfies `idOf("ana")` (docs/SCHEMA.md section 2) without needing the
 * real ULID generator — that's Phase 2 engine work (T-2.01/T-2.02), where
 * runs actually need fresh unique IDs. Demo data is static, so a real
 * generator would add nothing here.
 */
export function demoId(prefix: string, n: number): string {
  return `${prefix}_${n.toString().padStart(26, "0")}`;
}
