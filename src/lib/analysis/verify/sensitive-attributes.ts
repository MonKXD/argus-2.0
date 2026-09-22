/**
 * V6 sensitive attributes (AI_SPEC section 6 and section 9): "Never infer,
 * state or score on: race, ethnicity, national origin, religion, health or
 * disability, sexual orientation, gender identity, age, marital or family
 * status, political affiliation, or private-life details... V6 backs this
 * with a lexicon and pattern scan. Prompts are the second line, not the
 * first" — i.e. the prompt (AI_SPEC 7.1 rule 6) is the primary defence;
 * this is a deliberately conservative backstop.
 *
 * A failed match strips the whole claim (destructive), so every pattern
 * here favours precision over recall: multi-word phrases and person-context
 * prefixes rather than single ambiguous words. "Asian markets", "family
 * office", "a single round", "engaged users" and "liberal use of capital"
 * are common, entirely legitimate business phrases this must never flag —
 * verified against a real fixture set before being trusted (R-PRC-08). The
 * cost is reduced recall: this will miss attributes phrased in ways not
 * anticipated here, a known limitation, same class as V2's bare-integer
 * exemption.
 */

export interface SensitiveAttributeMatch {
  category: string;
  match: string;
}

const PERSON_PREFIX = "(?:he|she|they|the founder|the ceo|the co-founder)";

const PATTERNS: Array<{ category: string; re: RegExp }> = [
  {
    category: "health",
    re: /\b(diagnosed with|medical condition|chronic illness|mental health condition|on medical leave|disability|disabled|wheelchair user|battling an illness|cancer diagnosis)\b/i,
  },
  {
    category: "religion",
    re: /\b(christian|muslim|jewish|hindu|buddhist|catholic|protestant|sikh|atheist|agnostic)\b/i,
  },
  {
    category: "orientation_gender",
    re: /\b(gay|lesbian|bisexual|transgender|non-binary|nonbinary|lgbtq\+?)\b/i,
  },
  {
    category: "race_ethnicity",
    re: new RegExp(`\\b${PERSON_PREFIX}\\s+is\\s+(black|white|asian(?:-american)?|hispanic|latino|latina|native american|african[- ]american)\\b`, "i"),
  },
  {
    category: "national_origin",
    re: /\b(of [a-z]+ descent|immigrated from|is an immigrant|naturalized citizen)\b/i,
  },
  {
    category: "marital_family",
    re: /\b(married to|is divorced|is engaged to|is widowed|his wife|her husband|his spouse|her spouse|is pregnant|maternity leave|paternity leave)\b/i,
  },
  {
    category: "political",
    re: /\b(registered (democrat|republican)|democratic party|republican party|labour party|conservative party|political affiliation|politically (conservative|liberal))\b/i,
  },
  {
    category: "age",
    re: /\b\d{1,3}\s*years?\s*old\b|\bin (his|her|their) \d0s\b/i,
  },
  {
    category: "private_life",
    re: /\b(romantic relationship|personal relationship|dating (his|her|their)|custody battle|divorce proceedings|having an affair)\b/i,
  },
];

export function sensitiveAttributeMatches(text: string): SensitiveAttributeMatch[] {
  const hits: SensitiveAttributeMatch[] = [];
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.re);
    if (match) hits.push({ category: pattern.category, match: match[0] });
  }
  return hits;
}
