#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { compileAndValidateV422116Judgment } from "./lib/v422116-decomposed-consensus.mjs";

const [judgmentPath, preparationPath, debateNumber, reviewerPass, writeFlag] =
  process.argv.slice(2);
assertV4(
  judgmentPath && preparationPath && debateNumber && reviewerPass,
  "usage: validate-assessment-production-post-canary-batch-13-independent-judgment.mjs JUDGMENT PREPARATION DEBATE PASS [--write]"
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(
  preparation.status ===
      "twenty-post-canary-batch-13-independent-judgment-contexts-prepared-and-frozen" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 13 &&
    preparation.stagingOnly === true &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true &&
    preparation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    preparation.sourceCompatibility?.sourceRowsInjected === 0 &&
    preparation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    preparation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    preparation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    preparation.sourceCompatibility?.occurrences?.length === 0,
  "Batch 13 independent-judgment preparation unavailable"
);
const context = preparation.contexts.find(
  (item) =>
    item.debateNumber === debateNumber && item.reviewerPass === reviewerPass
);
assertV4(context, `${debateNumber}/${reviewerPass}: unknown judgment context`);

const [
  judgment,
  packetBytes,
  sourcePacketBytes,
  lockedInventoryBytes,
  schemaBytes,
  originalEventsDocument,
  originalEventsBytes,
  sourceLedgerBytes,
] = await Promise.all([
  readFile(judgmentPath, "utf8").then(JSON.parse),
  readFile(context.judgmentPacket),
  readFile(context.sourcePacket),
  readFile(context.lockedInventory),
  readFile(context.schema),
  readFile(context.originalEvents, "utf8").then(JSON.parse),
  readFile(context.originalEvents),
  readFile(context.fullLedger),
]);
assertV4(
  sha256(packetBytes) === context.judgmentPacketSha256 &&
    sha256(sourcePacketBytes) === context.sourcePacketSha256 &&
    sha256(lockedInventoryBytes) === context.lockedInventorySha256 &&
    sha256(schemaBytes) === context.schemaSha256 &&
    sha256(originalEventsBytes) === context.originalEventsSha256 &&
    sha256(sourceLedgerBytes) === context.fullLedgerSha256,
  `${debateNumber}/${reviewerPass}: prepared source hash drifted`
);
const packet = JSON.parse(packetBytes);
const sourcePacket = JSON.parse(sourcePacketBytes);
assertV4(
  sourcePacket.sourceChain.eventsSha256 === context.originalEventsSha256 &&
    sourcePacket.transportChain.sourceLedgerSha256 ===
      context.fullLedgerSha256,
  `${debateNumber}: source packet chain drifted`
);
assertV4(
  sourceLedgerBytes.toString("utf8").endsWith("\n"),
  `${debateNumber}: source ledger lacks terminal newline`
);

const rows = sourceLedgerBytes.toString("utf8").slice(0, -1).split("\n");
const canonicalEvents = rows.map((line, index) => {
  const row = JSON.parse(line);
  assertV4(
    Array.isArray(row) && row.length === 4 && row[0] === index,
    `${debateNumber}: invalid source-ledger row ${index}`
  );
  return { startMs: row[1], durationMs: row[2], text: row[3] };
});
const originalProjection = normalizeV418Events(originalEventsDocument).map(
  (event) => ({
    startMs: event.startMs,
    durationMs: event.durationMs,
    text: event.text,
  })
);
assertV4(
  canonicalJson(canonicalEvents) === canonicalJson(originalProjection),
  `${debateNumber}: canonical event projection drifted`
);

const compiled = compileAndValidateV422116Judgment(judgment, packet, {
  sourcePacket,
  eventsDocument: canonicalEvents,
  eventsBytes: originalEventsBytes,
  sourceLedgerBytes,
});
const confidenceMoves = (level) =>
  compiled.rawOutput.moves
    .filter((move) => move.assessmentConfidence === level)
    .map((move) => move.moveId);
const mediumConfidenceMoves = confidenceMoves("medium");
const lowConfidenceMoves = confidenceMoves("low");
const belowHighConfidenceMoves = [
  ...mediumConfidenceMoves,
  ...lowConfidenceMoves,
];
const summary = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-13-independent-judgment-validation",
  protocolId: preparation.protocolId,
  status: "passed",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  debateNumber,
  reviewerPass,
  moves: compiled.rawOutput.moves.length,
  lockedInventorySha256: packet.lockedInventorySha256,
  preparedSourceHashesVerified: true,
  originalEventHashVerified: true,
  canonicalEventProjectionReplayed: true,
  sourceCompatibilityPreserved: true,
  unchangedV4220ValidatorPassed: true,
  semanticRepairPerformed: compiled.provenance.semanticRepairPerformed,
  mediumConfidenceMoves,
  lowConfidenceMoves,
  belowHighConfidenceMoves,
  audioVerificationRequiredBeforeAdjudication:
    belowHighConfidenceMoves.length > 0,
  modelAuthoredScores: 0,
  scoresDerived: 0,
};
if (writeFlag === "--write") {
  for (const output of [
    context.rawOutput,
    context.validationOutput,
    context.provenanceOutput,
  ]) {
    await mkdir(path.dirname(output), { recursive: true });
  }
  await writeFile(
    context.rawOutput,
    `${JSON.stringify(compiled.rawOutput, null, 2)}\n`
  );
  await writeFile(
    context.validationOutput,
    `${JSON.stringify(summary, null, 2)}\n`
  );
  await writeFile(
    context.provenanceOutput,
    `${JSON.stringify(compiled.provenance, null, 2)}\n`
  );
}
console.log(JSON.stringify(summary, null, 2));
