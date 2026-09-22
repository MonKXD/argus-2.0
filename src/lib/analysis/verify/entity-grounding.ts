/**
 * V3 entity grounding (AI_SPEC section 6): "Every string in `claim.entities`
 * must appear (case-insensitive) in the evidence corpus. A heuristic scan
 * for capitalised names in claim text not present in the corpus produces a
 * warning."
 */

/** Declared entities absent from the evidence corpus (fails the claim). */
export function undeclaredEntities(entities: string[], corpusText: string): string[] {
  const corpus = corpusText.toLowerCase();
  return entities.filter((entity) => !corpus.includes(entity.toLowerCase()));
}

const CAPITALISED_PHRASE_RE = /\b(?:[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+){0,3})\b/g;

// Common sentence-start words that trip the heuristic without naming anything.
const COMMON_WORDS = new Set([
  "The",
  "This",
  "That",
  "These",
  "Those",
  "A",
  "An",
  "It",
  "They",
  "We",
  "Our",
  "Its",
]);

/**
 * Capitalised phrases in `claimText` not present in the corpus and not
 * already declared in `entities` — a heuristic, so it only warns (never
 * strips the claim). Approximate by design: it will miss lowercase-styled
 * names and can flag ordinary sentence-start capitalisation.
 */
export function heuristicUndeclaredNames(claimText: string, entities: string[], corpusText: string): string[] {
  const declared = new Set(entities.map((e) => e.toLowerCase()));
  const corpus = corpusText.toLowerCase();
  const hits = new Set<string>();

  for (const match of claimText.matchAll(CAPITALISED_PHRASE_RE)) {
    const phrase = match[0];
    const firstWord = phrase.split(" ")[0]!;
    if (phrase.split(" ").length === 1 && COMMON_WORDS.has(firstWord)) continue;
    if (declared.has(phrase.toLowerCase())) continue;
    if (corpus.includes(phrase.toLowerCase())) continue;
    hits.add(phrase);
  }
  return [...hits];
}
