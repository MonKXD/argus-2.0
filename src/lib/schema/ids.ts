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
