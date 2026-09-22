import { z } from "zod";

/** Verbatim from docs/SCHEMA.md section 2. */

export const ID_PREFIXES = {
  analysis: "ana",
  source: "src",
  evidence: "ev",
  fact: "fct",
  claim: "clm",
  run: "run",
  report: "rpt",
  flag: "flg",
  checklist: "chk",
  comparison: "cmp",
  activity: "act",
  signal: "sig",
  export: "exp",
  note: "note",
} as const;

export const idOf = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`));

export const Iso = z.iso.datetime();

/**
 * ULID (https://github.com/ulid/spec): a 48-bit millisecond timestamp
 * followed by 80 bits of randomness, both Crockford Base32-encoded (26
 * characters total) — lexicographically sortable by creation time, unlike a
 * raw UUID. Hand-rolled rather than a dependency: the algorithm is small,
 * fully specified, and the alphabet below is exactly `idOf()`'s regex
 * character class, so there is nothing a library adds here. R-COD-04: this
 * is the one shared generator; no ad-hoc IDs elsewhere in the codebase.
 */
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_CHARS = 10;
const RANDOM_CHARS = 16;

function encodeTime(ms: number): string {
  let time = ms;
  let out = "";
  for (let i = 0; i < TIME_CHARS; i++) {
    out = CROCKFORD_BASE32[time % 32] + out;
    time = Math.floor(time / 32);
  }
  return out;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(RANDOM_CHARS);
  crypto.getRandomValues(bytes); // 256 is a multiple of 32: no modulo bias
  let out = "";
  for (const byte of bytes) out += CROCKFORD_BASE32[byte % 32];
  return out;
}

function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/** `newId("clm")` → `"clm_01ARZ3NDEKTSV4RRFFQ69G5FAV"`, validated by `idOf()`. */
export function newId(prefix: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]): string {
  return `${prefix}_${ulid()}`;
}
