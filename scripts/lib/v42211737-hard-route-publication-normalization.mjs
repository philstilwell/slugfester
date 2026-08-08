import { assertV4 } from "./v4-lean-production.mjs";
import { validateV42211736PublicationOutput } from "./v42211736-hard-route-publication-integrity.mjs";

export const V42211737_ROOT = "docs/calibration/v4.2.21.17.37/hard-route-publication-normalization";
export const V42211737_PROTOCOL_ID = "v4.2.21.17.37-hard-route-publication-normalization";
const wordCount = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;

export function normalizeV42211737PublicationOutput(rawOutput, packet) {
  const output = structuredClone(rawOutput);
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const transformations = [];
  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    const move = moveById.get(quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible, `${side}: quote source is not eligible for normalization`);
    assertV4(move.sourceExcerpt.includes(quote.text), `${side}: non-exact quote cannot be normalized`);
    const words = [...quote.text.matchAll(/\S+/gu)];
    if (words.length <= 18) continue;
    const start = words.at(-18).index;
    const normalized = quote.text.slice(start).trim();
    assertV4(wordCount(normalized) === 18 && quote.text.includes(normalized) && move.sourceExcerpt.includes(normalized), `${side}: deterministic quote normalization failed exactness`);
    transformations.push({ field: `representativeQuotes.${side}.text`, operation: "retain-final-18-contiguous-words", beforeWords: words.length, afterWords: 18, before: quote.text, after: normalized });
    quote.text = normalized;
  }
  return { output, transformations };
}

export function normalizeAndValidateV42211737PublicationOutput(rawOutput, packet) {
  const normalized = normalizeV42211737PublicationOutput(rawOutput, packet);
  const validation = validateV42211736PublicationOutput(normalized.output, packet);
  return { ...normalized, validation };
}

