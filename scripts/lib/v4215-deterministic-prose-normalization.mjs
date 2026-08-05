import { wordCount } from "./v388-reconstruction.mjs";

export const V4215_ROOT = "docs/calibration/v4.2.15/deterministic-prose-normalization";
const protectedPattern = /(strongest feature|strongest features|principal limitation|live burden|locked score)/i;

export function normalizeV4215Critique(text) {
  const beforeWords = wordCount(text); if (beforeWords <= 130) return { text, beforeWords, afterWords: beforeWords, removedSentences: [] };
  const sentences = String(text).trim().split(/(?<=[.!?])\s+/).filter(Boolean), active = sentences.map((sentence, index) => ({ sentence, index, words: wordCount(sentence), protected: protectedPattern.test(sentence) })), removed = [];
  while (wordCount(active.filter((item) => !removed.includes(item.index)).map((item) => item.sentence).join(" ")) > 130) {
    const currentWords = wordCount(active.filter((item) => !removed.includes(item.index)).map((item) => item.sentence).join(" "));
    const candidates = active.filter((item) => !item.protected && !removed.includes(item.index) && currentWords - item.words >= 105).sort((left, right) => left.words - right.words || left.index - right.index);
    if (!candidates.length) throw new Error("v4.2.15 no safe nonessential sentence can satisfy the word range"); removed.push(candidates[0].index);
  }
  const normalized = active.filter((item) => !removed.includes(item.index)).map((item) => item.sentence).join(" "), afterWords = wordCount(normalized);
  if (afterWords < 105 || afterWords > 130) throw new Error(`v4.2.15 normalized critique word count ${afterWords}`);
  for (const marker of ["strongest feature", "principal limitation", "live burden", "locked score"]) if (!normalized.toLowerCase().includes(marker)) throw new Error(`v4.2.15 protected marker removed: ${marker}`);
  return { text: normalized, beforeWords, afterWords, removedSentences: active.filter((item) => removed.includes(item.index)).map((item) => ({ index: item.index, words: item.words, text: item.sentence })) };
}

export function normalizeV4215Proposal(proposal) {
  const normalized = structuredClone(proposal), report = [];
  for (const item of normalized.critiques) { const result = normalizeV4215Critique(item.text); if (result.removedSentences.length) { item.text = result.text; report.push({ moveId: item.moveId, beforeWords: result.beforeWords, afterWords: result.afterWords, removedSentences: result.removedSentences }); } }
  return { normalized, report };
}
