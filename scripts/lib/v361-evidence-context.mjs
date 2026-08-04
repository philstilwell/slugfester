import { assert } from "./v35-semantic-compiler.mjs";

function occurrenceCount(excerpt, text) {
  let count = 0, offset = -1;
  while ((offset = excerpt.indexOf(text, offset + 1)) >= 0) count += 1;
  return count;
}

export function uniqueEvidenceText(excerpt, span, maximumLength = 160) {
  assert(span && Number.isInteger(span.startChar) && Number.isInteger(span.endChar), "evidence span is missing offsets");
  assert(excerpt.slice(span.startChar, span.endChar) === span.text, "evidence span does not match sourceExcerpt");
  if (occurrenceCount(excerpt, span.text) === 1) return span.text;
  const starts = new Set([span.startChar, 0]), ends = new Set([span.endChar, excerpt.length]);
  for (const match of excerpt.matchAll(/\S+/g)) {
    starts.add(match.index);
    ends.add(match.index + match[0].length);
  }
  const candidates = [];
  for (const start of starts) for (const end of ends) {
    if (start > span.startChar || end < span.endChar || end <= start || end - start > maximumLength) continue;
    const value = excerpt.slice(start, end);
    if (value.slice(span.startChar - start, span.endChar - start) !== span.text || occurrenceCount(excerpt, value) !== 1) continue;
    candidates.push({ value, start, end, added: (span.startChar - start) + (end - span.endChar) });
  }
  assert(candidates.length > 0, `no unique word-boundary evidence window within ${maximumLength} characters`);
  candidates.sort((left, right) => left.value.length - right.value.length || left.added - right.added || left.start - right.start || left.end - right.end || left.value.localeCompare(right.value));
  return candidates[0].value;
}

export { occurrenceCount };
