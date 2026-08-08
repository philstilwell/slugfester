import { assertV4 } from "./v4-lean-production.mjs";
import { validateV42211732PublicationOutput } from "./v42211732-hard-route-publication.mjs";

export const V42211736_ROOT = "docs/calibration/v4.2.21.17.36/hard-route-publication-integrity";
export const V42211736_PROTOCOL_ID = "v4.2.21.17.36-hard-route-publication-integrity";
const unexpectedScript = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

export function validateV42211736PublicationOutput(output, packet) {
  const base = validateV42211732PublicationOutput(output, packet);
  for (const [moveId, prose] of Object.entries(output.moveProse)) {
    const critique = prose.critique.trim();
    assertV4(/[.!?]$/u.test(critique), `${moveId}: critique lacks terminal punctuation`);
    assertV4(!unexpectedScript.test(critique), `${moveId}: critique contains unexpected non-Latin script`);
    assertV4(!critique.includes("�"), `${moveId}: critique contains replacement character`);
  }
  return { ...base, critiqueTerminalPunctuationPassed: true, unexpectedScriptHits: 0 };
}

