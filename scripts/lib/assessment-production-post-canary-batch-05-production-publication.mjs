import { createHash } from "node:crypto";

export const POST_CANARY_BATCH_05_PRODUCTION_PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/production-publication";
export const POST_CANARY_BATCH_05_PRODUCTION_PUBLICATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-05-production-publication";
export const POST_CANARY_BATCH_05_PRODUCTION_PUBLICATION_ORDER = Object.freeze([
  "158",
  "46",
  "64",
  "132",
  "189",
  "109",
  "179",
  "05",
  "42",
  "59"
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readQuoted(source, start, quote) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index += 1;
  }
  throw new Error("unterminated string in src/data/debates.js");
}

function readComment(source, start) {
  if (source[start + 1] === "/") {
    const end = source.indexOf("\n", start + 2);
    return end < 0 ? source.length : end + 1;
  }
  if (source[start + 1] === "*") {
    const end = source.indexOf("*/", start + 2);
    if (end < 0) throw new Error("unterminated comment in src/data/debates.js");
    return end + 2;
  }
  return start + 1;
}

function findMatchingBrace(source, start) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' || character === "'" || character === "`") {
      index = readQuoted(source, index, character) - 1;
      continue;
    }
    if (character === "/" && ["/", "*"].includes(source[index + 1])) {
      index = readComment(source, index) - 1;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("unterminated debate object in src/data/debates.js");
}

export function extractProductionDebateRecords(source) {
  const arrayAnchor = "export const debates = [";
  const anchorIndex = source.indexOf(arrayAnchor);
  if (anchorIndex < 0) throw new Error("production debate-array anchor missing");
  const arrayStart = anchorIndex + arrayAnchor.length - 1;
  const records = [];
  let arrayDepth = 0;
  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' || character === "'" || character === "`") {
      index = readQuoted(source, index, character) - 1;
      continue;
    }
    if (character === "/" && ["/", "*"].includes(source[index + 1])) {
      index = readComment(source, index) - 1;
      continue;
    }
    if (character === "[") {
      arrayDepth += 1;
      continue;
    }
    if (character === "]") {
      arrayDepth -= 1;
      if (arrayDepth === 0) break;
      continue;
    }
    if (character !== "{" || arrayDepth !== 1) continue;
    const end = findMatchingBrace(source, index);
    const text = source.slice(index, end + 1);
    const number = text.match(/(?:"number"|number)\s*:\s*"([^"]+)"/)?.[1];
    const id = text.match(/(?:"id"|id)\s*:\s*"([^"]+)"/)?.[1];
    if (!number || !id) throw new Error("production debate identity missing");
    records.push({ index: records.length, number, id, start: index, end, text });
    index = end;
  }
  if (records.length === 0) throw new Error("no production debate records found");
  return records;
}

export function serializeCandidateForProduction(candidate) {
  return JSON.stringify(candidate, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");
}

export function buildProductionDebatesSource({
  baselineSource,
  replacements
}) {
  const records = extractProductionDebateRecords(baselineSource);
  const byNumber = new Map(records.map((record) => [record.number, record]));
  const ordered = replacements.map((replacement) => {
    const record = byNumber.get(replacement.debateNumber);
    if (!record || record.id !== replacement.debateId) {
      throw new Error(`${replacement.debateNumber}: production record identity changed`);
    }
    if (sha256(record.text) !== replacement.currentProductionRecordSha256) {
      throw new Error(`${replacement.debateNumber}: production record source changed`);
    }
    if (
      replacement.candidate?.number !== replacement.debateNumber ||
      replacement.candidate?.id !== replacement.debateId
    ) {
      throw new Error(`${replacement.debateNumber}: finalized candidate identity changed`);
    }
    return {
      ...record,
      replacementText: serializeCandidateForProduction(replacement.candidate)
    };
  });
  let output = baselineSource;
  for (const replacement of ordered.sort((left, right) => right.start - left.start)) {
    output =
      output.slice(0, replacement.start) +
      replacement.replacementText +
      output.slice(replacement.end + 1);
  }
  return output;
}

export function inventoryDigest(records) {
  return sha256(
    records
      .map((record) => `${record.path}\t${record.sha256}\t${record.bytes}\n`)
      .sort()
      .join("")
  );
}
