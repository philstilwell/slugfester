#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(`${V422116_ROOT}/inventory-recovery-execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsAttempted === 1 && execution.retries === 0 && execution.scoresDerived === 0, "inventory recovery execution is incomplete or crossed its boundary");
const debates = [];
let acceptedHashesUnchanged = true;
for (const accepted of manifest.acceptedLockedInventoriesReused) {
  for (const [key, file] of Object.entries(accepted.files)) if (sha256(await readFile(file)) !== accepted.hashes[key]) acceptedHashesUnchanged = false;
  const [inventory, validation] = await Promise.all([accepted.files.lockedInventory, accepted.files.validation].map((file) => readFile(file, "utf8").then(JSON.parse)));
  debates.push({ debateNumber: accepted.debateNumber, source: "accepted-v4.2.21.16.1", accepted: true, sections: inventory.sections.length, moves: inventory.moves.length, finalEvidenceSourceExact: validation.finalEvidenceSourceExact, ratingsAbsent: validation.ratingsAbsent, responseTopologyAbsent: validation.responseTopologyAbsent });
}
const result = execution.results[0];
if (result.accepted) {
  const [inventory, validation] = await Promise.all([manifest.context.lockedInventoryOutput, manifest.context.validationOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  debates.push({ debateNumber: "182", source: "v4.2.21.16.2-transport-recovery", accepted: true, elapsedMs: result.elapsedMs, sections: inventory.sections.length, moves: inventory.moves.length, finalEvidenceSourceExact: validation.finalEvidenceSourceExact, ratingsAbsent: validation.ratingsAbsent, responseTopologyAbsent: validation.responseTopologyAbsent, everyCandidateAvailableDuringSelection: validation.everyCandidateAvailableDuringSelection, omittedValidatorFieldsRestored: validation.omittedValidatorFieldsRestoredFromFullEvidenceBundle });
} else debates.push({ debateNumber: "182", source: "v4.2.21.16.2-transport-recovery", accepted: false, elapsedMs: result.elapsedMs, failure: result.timedOut ? "timeout" : result.validationMessage ?? result.status });
const passed = result.accepted && acceptedHashesUnchanged && debates.length === 3 && debates.every((debate) => debate.accepted && debate.finalEvidenceSourceExact && debate.ratingsAbsent && debate.responseTopologyAbsent);
const analysis = {
  schemaVersion: "4.2.21.16.2-inventory-transport-recovery-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "retired-partition-three-inventory-gate-passed-independent-judgment-preparation-authorized" : "inventory-transport-recovery-failed-analysis-only",
  calibrationOnly: true,
  AIOnly: true,
  execution: { successorContextsAttempted: 1, successorValidContexts: execution.validContexts, retries: 0, elapsedMs: execution.totalElapsedMs, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  combinedGate: { debates, acceptedPriorHashesUnchanged: acceptedHashesUnchanged, validLockedInventories: debates.filter((debate) => debate.accepted).length, semanticRepairs: 0, ratings: 0, responseTopology: 0, scores: 0, passed },
  interpretation: passed ? { scoreBlindPartitionInventoryOperational: true, allCandidatesRetainedInRecovery: true, deterministicTransportProjectionSufficient: true, sameLockedInventoriesReadyForTwoIndependentJudgmentPreparation: true } : { independentJudgmentPreparationRecommended: false },
  authorization: { independentJudgmentPreparation: passed, independentJudgmentExecutionManifest: false, independentJudgmentModelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, execution: analysis.execution, combinedGate: analysis.combinedGate, authorization: analysis.authorization }, null, 2));
