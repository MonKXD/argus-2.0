import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * WCAG contrast check for the token palette (DESIGN section 3.2: "Verify
 * with an automated contrast check in T-1.01 and record results in
 * PROJECT_MEMORY"). Reads src/styles/tokens.css directly rather than
 * duplicating hex values here, so it can't drift from the real tokens.
 */

const tokensCss = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf-8");

function readToken(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokensCss);
  if (!match) throw new Error(`Token --${name} not found in tokens.css`);
  return match[1];
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio, from 1:1 to 21:1. */
function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;
const AA_NON_TEXT = 3;

const surfaces = {
  ink: readToken("ink"),
  slate: readToken("surface-2"),
};

const textTokens = {
  paper: readToken("paper"),
  mist: readToken("mist"),
  haze: readToken("haze"),
};

const evidenceSpectrum = {
  verified: readToken("verified"),
  analysis: readToken("analysis"),
  assumption: readToken("assumption"),
  ember: readToken("ember"),
  "ember-high": readToken("ember-high"),
};

describe("token contrast (DESIGN section 3.2)", () => {
  for (const [surfaceName, surfaceHex] of Object.entries(surfaces)) {
    describe(`on ${surfaceName}`, () => {
      for (const [tokenName, tokenHex] of Object.entries(textTokens)) {
        it(`${tokenName} meets AA normal-text contrast (>= ${AA_NORMAL_TEXT}:1)`, () => {
          expect(contrastRatio(tokenHex, surfaceHex)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });
      }

      for (const [tokenName, tokenHex] of Object.entries(evidenceSpectrum)) {
        it(`${tokenName} meets AA normal-text contrast (>= ${AA_NORMAL_TEXT}:1)`, () => {
          expect(contrastRatio(tokenHex, surfaceHex)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });
      }
    });
  }

  it("cta-fg (ink) on cta-bg (paper) meets AA normal-text contrast", () => {
    expect(contrastRatio(readToken("ink"), readToken("paper"))).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });

  it("haze meets at least the non-text threshold on surface-3 (the ScoreGauge track; not used for text there)", () => {
    expect(contrastRatio(textTokens.haze, readToken("surface-3"))).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it("ink (the destructive Button's text) meets AA normal-text contrast on ember (its background) — white failed at 3.06:1 (T-1.17)", () => {
    expect(contrastRatio(readToken("ink"), readToken("ember"))).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });
});
