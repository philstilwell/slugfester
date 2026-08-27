#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { PROTOCOL_ID, ROOT, validateOutput } from "./lib/assessment-production-post-canary-batch-13-audio-attribution.mjs";

const shouldWrite = process.argv.includes("--write");
const base = "docs/assessment-production/post-canary-continuation-v1/batch-13/audio-verification";
const [manifest, execution, originalAudit, originalAnalysis] = await Promise.all([
  readFile(`${ROOT}/execution-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${base}/audio-verification.json`, "utf8").then(JSON.parse),
  readFile(`${base}/analysis.json`, "utf8").then(JSON.parse),
]);
assert.equal(execution.status, "batch-13-audio-attribution-recovery-execution-passed");
assert.equal(execution.retries, 0);
assert.equal(execution.paidTranscriptionCalls, 0);
const validations = [];
const decisions = [];
for (const context of manifest.contexts) {
  const [packet, output] = await Promise.all([readFile(context.packet, "utf8").then(JSON.parse), readFile(context.output, "utf8").then(JSON.parse)]);
  const validation = await validateOutput(output, packet);
  validations.push(validation);
  decisions.push(...output.adjudications.map((decision) => ({ debateNumber: context.debateNumber, debateId: context.debateId, ...decision })));
}
const recoveredVerified = validations.reduce((sum, item) => sum + item.verified, 0);
const recoveredUnresolved = validations.reduce((sum, item) => sum + item.unresolved, 0);
const passed = recoveredVerified === 6 && recoveredUnresolved === 0;
const combined = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-combined-audio-verification",
  protocolId: PROTOCOL_ID,
  status: passed ? "post-canary-batch-13-combined-audio-verification-passed" : "post-canary-batch-13-combined-audio-verification-unresolved",
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  preservedOriginalDeterministicGate: { status: originalAudit.status, verified: originalAudit.totals.verified, unresolved: originalAudit.totals.unresolved, erasedOrReclassified: false },
  recovery: { contexts: 2, decisions, verified: recoveredVerified, unresolved: recoveredUnresolved, rawTranscriptsChanged: false, thresholdsChanged: false, rawSpeakerLabelsChanged: false },
  totals: { requiredMoves: 8, deterministicallyVerified: 2, attributionAdjudicatedVerified: recoveredVerified, verified: 2 + recoveredVerified, unresolved: recoveredUnresolved, verificationRate: (2 + recoveredVerified) / 8, paidDiarizationCallsCompleted: 8, paidDiarizationRetries: 0, additionalPaidTranscriptionCalls: 0, additionalDirectIncrementalCostUsd: 0, usageDerivedEstimatedPaidDiarizationCostUsd: originalAudit.totals.usageDerivedEstimatedCostUsd, scoresDerived: 0 },
  authorization: { disputeAdjudicationPreparation: passed, disputeAdjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-audio-attribution-recovery-analysis",
  protocolId: PROTOCOL_ID,
  status: passed ? "batch-13-audio-attribution-recovery-passed" : "batch-13-audio-attribution-recovery-unresolved",
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  preservedOriginalGate: { status: originalAnalysis.status, passed: originalAnalysis.gate.passed, verified: originalAnalysis.gate.verified, unresolved: originalAnalysis.gate.unresolved, erasedOrReclassified: false },
  validation: { contexts: validations, verified: recoveredVerified, unresolved: recoveredUnresolved },
  combinedAudioResult: combined.totals,
  costs: { originalUsageDerivedEstimatedPaidDiarizationCostUsd: originalAudit.totals.usageDerivedEstimatedCostUsd, originalMaximumAuthorizedUsd: originalAudit.totals.maximumAuthorizedCostUsd, additionalPaidTranscriptionCalls: 0, additionalDirectIncrementalCostUsd: 0, modelAuthentication: "ChatGPT subscription" },
  scoreBlindness: { ratingsAccessed: false, scoresAccessed: false, legacyAssessmentsAccessed: false, otherDebatesAccessed: false, publicationProseAccessed: false, scoreArtifactCreated: false },
  authorization: combined.authorization,
};
if (shouldWrite) {
  await writeFile(manifest.artifacts.combinedAudioGate, `${JSON.stringify(combined, null, 2)}\n`);
  await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, recoveredVerified, recoveredUnresolved, combinedVerified: combined.totals.verified, combinedRequired: combined.totals.requiredMoves, disputeAdjudicationPreparationAuthorized: combined.authorization.disputeAdjudicationPreparation, additionalPaidTranscriptionCalls: 0, additionalDirectIncrementalCostUsd: 0, scoresDerived: 0 }, null, 2));
if (!passed) process.exitCode = 1;
