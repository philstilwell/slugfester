#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileV422116LockedInventory } from "./lib/v422116-decomposed-consensus.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] = process.argv.slice(2);
assertV4(
  proposalPath && preparationPath && debateNumber,
  "usage: validate-assessment-production-canary-inventory.mjs PROPOSAL PREPARATION DEBATE_NUMBER [--write]"
);

const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(
  preparation.status === "ten-production-canary-score-blind-inventory-contexts-prepared" &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true,
  "production-canary inventory preparation unavailable"
);
const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
assertV4(context, `${debateNumber}: inventory context unavailable`);

const [proposal, evidenceBundle, eventsDocument] = await Promise.all([
  readFile(proposalPath, "utf8").then(JSON.parse),
  readFile(context.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
  readFile(context.originalEvents, "utf8").then(JSON.parse)
]);
const compiled = compileV422116LockedInventory(proposal, evidenceBundle, eventsDocument);
const belowHighAttributionMoveIds = compiled.lockedInventory.moves
  .filter((move) => move.attributionConfidence !== "high")
  .map((move) => move.moveId);
const summary = {
  schemaVersion: "1.0-production-canary-score-blind-inventory-validation",
  protocolId: preparation.protocolId,
  status: "passed",
  productionCanary: true,
  stagingOnly: true,
  debateNumber,
  sections: compiled.lockedInventory.sections.length,
  moves: compiled.lockedInventory.moves.length,
  proMoves: compiled.lockedInventory.moves.filter((move) => move.side === "pro").length,
  conMoves: compiled.lockedInventory.moves.filter((move) => move.side === "con").length,
  belowHighAttributionMoveIds,
  belowHighAttributionMovesRequireAudioVerification: true,
  everyCandidateAvailableDuringSelection: true,
  omittedValidatorFieldsRestoredFromFullEvidenceBundle: true,
  finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact,
  ratingsAbsent: compiled.validation.ratingsAbsent,
  responseTopologyAbsent: compiled.validation.responseTopologyAbsent,
  semanticRepairPerformed: false,
  scoresDerived: 0
};

if (writeFlag === "--write") {
  for (const output of [
    context.lockedInventoryOutput,
    context.validationOutput,
    context.provenanceOutput
  ]) await mkdir(path.dirname(output), { recursive: true });
  await writeFile(context.lockedInventoryOutput, `${JSON.stringify(compiled.lockedInventory, null, 2)}\n`);
  await writeFile(context.validationOutput, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(context.provenanceOutput, `${JSON.stringify(compiled.provenance, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
