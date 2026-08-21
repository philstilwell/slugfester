import { lexicalTokens } from "./v418-source-integrity.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

function parseSourceRows(chunkBytes) {
  assertV4(Buffer.isBuffer(chunkBytes), "Batch 5 token-counted chunk source must be a buffer");
  const sourceRows = chunkBytes
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  assertV4(sourceRows.length > 0, "Batch 5 token-counted chunk source is empty");
  for (const [index, row] of sourceRows.entries()) {
    assertV4(
      Array.isArray(row) &&
        row.length === 4 &&
        Number.isInteger(row[0]) &&
        Number.isInteger(row[1]) &&
        Number.isInteger(row[2]) &&
        typeof row[3] === "string" &&
        row[3].trim().length > 0,
      `Batch 5 token-counted ledger row ${index}: invalid source shape`
    );
  }
  return sourceRows;
}

export function findBatch05ZeroLexicalTokenRows(chunkBytes) {
  return parseSourceRows(chunkBytes)
    .filter((row) => lexicalTokens(row[3]).length === 0)
    .map((row) => ({ eventIndex: row[0], startMs: row[1], durationMs: row[2], text: row[3] }));
}

export function buildBatch05TokenCountedChunkLedger(chunkBytes) {
  const rows = parseSourceRows(chunkBytes).map((row) => [
    row[0],
    row[1],
    row[2],
    lexicalTokens(row[3]).length,
    row[3],
  ]);
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}
