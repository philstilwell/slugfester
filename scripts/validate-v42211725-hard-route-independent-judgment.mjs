#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileAndValidateV422116Judgment } from "./lib/v422116-decomposed-consensus.mjs";

const [judgmentPath, preparationPath, debateNumber, reviewerPass, writeFlag] = process.argv.slice(2);
assertV4(judgmentPath && preparationPath && debateNumber && reviewerPass, "usage: validate-v42211725-hard-route-independent-judgment.mjs JUDGMENT PREPARATION DEBATE PASS [--write]");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.status === "ten-hard-route-independent-judgment-contexts-prepared", "hard-route independent judgment preparation unavailable");
const context = preparation.contexts.find((item) => item.debateNumber === debateNumber && item.reviewerPass === reviewerPass);
assertV4(context, `${debateNumber}/${reviewerPass}: unknown hard-route independent judgment context`);
const [judgment, packet, sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes] = await Promise.all([
  readFile(judgmentPath, "utf8").then(JSON.parse),
  readFile(context.judgmentPacket, "utf8").then(JSON.parse),
  readFile(context.sourcePacket, "utf8").then(JSON.parse),
  readFile(context.originalEvents, "utf8").then(JSON.parse),
  readFile(context.originalEvents),
  readFile(context.fullLedger),
]);
const compiled = compileAndValidateV422116Judgment(judgment, packet, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes });
const confidenceMoves = (level) => compiled.rawOutput.moves.filter((move) => move.assessmentConfidence === level).map((move) => move.moveId);
const mediumConfidenceMoves = confidenceMoves("medium");
const lowConfidenceMoves = confidenceMoves("low");
const belowHighConfidenceMoves = [...mediumConfidenceMoves, ...lowConfidenceMoves];
const summary = {
  schemaVersion: "4.2.21.17.25-hard-route-independent-judgment-validation",
  protocolId: preparation.protocolId,
  status: "passed",
  debateNumber,
  reviewerPass,
  moves: compiled.rawOutput.moves.length,
  lockedInventorySha256: packet.lockedInventorySha256,
  unchangedV4220ValidatorPassed: true,
  semanticRepairPerformed: compiled.provenance.semanticRepairPerformed,
  mediumConfidenceMoves,
  lowConfidenceMoves,
  belowHighConfidenceMoves,
  audioVerificationRequiredBeforeAdjudication: belowHighConfidenceMoves.length > 0,
  scoresDerived: 0,
};
if (writeFlag === "--write") {
  for (const output of [context.rawOutput, context.validationOutput, context.provenanceOutput]) await mkdir(path.dirname(output), { recursive: true });
  await writeFile(context.rawOutput, `${JSON.stringify(compiled.rawOutput, null, 2)}\n`);
  await writeFile(context.validationOutput, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(context.provenanceOutput, `${JSON.stringify(compiled.provenance, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
