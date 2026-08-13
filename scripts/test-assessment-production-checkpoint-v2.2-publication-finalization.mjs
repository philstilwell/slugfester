#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT,
  validateCheckpointV22PublicationFinalCandidate
} from "./lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readBytes = (file) => readFile(path.resolve(file));
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

const activationPath =
  `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution-activation.json`;
const [activation, execution, analysis] = await Promise.all([
  parse(activationPath),
  parse(`${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution.json`),
  parse(`${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/analysis.json`)
]);
const [audit, compatibility, identity] = await Promise.all([
  parse(activation.artifacts.finalizationAudit),
  parse(activation.artifacts.compatibilityAnalysis),
  parse(activation.inputs.identitySnapshot)
]);

assert.equal(
  activation.status,
  "publication-finalization-execution-authorized-and-frozen"
);
assert.equal(activation.protocolId, CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID);
assert.deepEqual(activation.explicitOrder, CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER);
assert.equal(activation.authorization.publicationFinalization, true);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.scoreRecalculation, false);
assert.equal(activation.authorization.renderingVerification, false);
assert.equal(activation.authorization.validatorMigration, false);
assert.equal(activation.authorization.productionLedgerPublication, false);
assert.equal(activation.authorization.productionMutation, false);

assert.equal(execution.status, "ten-debate-publication-finalization-passed");
assert.equal(execution.outputBundlePublished, true);
assert.equal(execution.failureMessage, null);
assert.equal(execution.rows.length, 10);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.retries, 0);
assert.equal(execution.scorePasses, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.renderingVerificationPerformed, false);
assert.equal(execution.validatorMigrationPerformed, false);
assert.equal(execution.productionLedgerPublicationPerformed, false);
assert.equal(execution.productionMutationPerformed, false);

assert.equal(analysis.status, "ten-debate-publication-finalization-passed");
assert.equal(analysis.gate.sourceHashesPassed, true);
assert.equal(analysis.gate.explicitOrderPassed, true);
assert.equal(analysis.gate.finalCandidatesPassed, 10);
assert.equal(analysis.gate.expectedFinalCandidates, 10);
assert.equal(analysis.gate.displayFieldsChanged, 0);
assert.equal(analysis.gate.participantScoresChanged, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-plan-preparation"
);
assert.equal(analysis.authorization.renderingVerificationPlanPreparation, true);
assert.equal(analysis.authorization.renderingVerification, false);
assert.equal(analysis.authorization.productionMutation, false);

assert.equal(audit.status, "passed-ten-debate-publication-finalization");
assert.deepEqual(audit.explicitOrder, CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER);
assert.equal(audit.rows.length, 10);
assert.equal(audit.publicationFinalizationPerformed, true);
assert.equal(audit.renderingVerificationPerformed, false);
assert.equal(audit.validatorMigrationPerformed, false);
assert.equal(audit.productionLedgerPublicationPerformed, false);
assert.equal(audit.productionMutationPerformed, false);
assert.deepEqual(audit.compatibilityBoundary.blockers, [
  "optional-overall-reference-links",
  "checkpoint-ledger-schema-adapter"
]);
assert.equal(audit.compatibilityBoundary.productionMutationBlocked, true);
assert.equal(compatibility.findings.length, 2);
assert.ok(compatibility.findings.every((finding) => finding.blocksProductionMutation));
assert.ok(compatibility.findings.every((finding) => !finding.blocksFinalizationStaging));

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readBytes(file)), digest, `source hash mismatch: ${file}`);
}

let sections = 0;
let moves = 0;
let overallBlunders = 0;
let emptyOverallReferenceLinks = 0;
let sourceChainFiles = 0;
for (const debateNumber of CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER) {
  const context = activation.contexts.find((item) => item.debateNumber === debateNumber);
  const auditRow = audit.rows.find((item) => item.debateNumber === debateNumber);
  const executionRow = execution.rows.find((item) => item.debateNumber === debateNumber);
  const identityRow = identity.rows.find((item) => item.number === debateNumber);
  assert.ok(context && auditRow && executionRow && identityRow, `${debateNumber}: row missing`);

  const [compiledBytes, outputBytes, packetBytes, candidateBytes, provenanceBytes] =
    await Promise.all([
      readBytes(context.compiledInput),
      readBytes(context.publicationOutput),
      readBytes(context.publicationPacket),
      readBytes(context.finalCandidate),
      readBytes(context.provenance)
    ]);
  assert.equal(sha256(compiledBytes), context.compiledInputSha256);
  assert.equal(sha256(outputBytes), context.publicationOutputSha256);
  assert.equal(sha256(packetBytes), context.publicationPacketSha256);
  assert.equal(sha256(candidateBytes), context.expectedFinalCandidateSha256);
  assert.equal(sha256(provenanceBytes), context.expectedProvenanceSha256);
  assert.equal(sha256(candidateBytes), auditRow.finalCandidateSha256);
  assert.equal(sha256(provenanceBytes), auditRow.provenanceSha256);
  assert.equal(auditRow.finalCandidateSha256, executionRow.finalCandidateSha256);
  assert.equal(auditRow.provenanceSha256, executionRow.provenanceSha256);

  const compiled = JSON.parse(compiledBytes);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const candidate = JSON.parse(candidateBytes);
  const provenance = JSON.parse(provenanceBytes);
  const expectedCandidate = structuredClone(compiled);
  delete expectedCandidate.stagingAudit;
  assert.equal(canonicalJson(candidate), canonicalJson(expectedCandidate));
  assert.equal("stagingAudit" in candidate, false);
  assert.equal(provenance.allowedTransformation,
    "remove-stagingAudit-from-display-candidate-and-preserve-it-here");
  assert.equal(provenance.displayFieldsChanged, 0);
  assert.equal(provenance.participantScoresChanged, false);
  assert.equal(provenance.scorePassesExecuted, 0);
  assert.equal(provenance.modelContexts, 0);
  assert.equal(provenance.productionMutationPerformed, false);
  assert.deepEqual(provenance.sourceChain, compiled.stagingAudit.sourceChain);
  assert.deepEqual(provenance.displayContract, compiled.stagingAudit.displayContract);
  assert.deepEqual(provenance.noveltyMap, compiled.stagingAudit.noveltyMap);
  assert.deepEqual(candidate.score, compiled.score);
  assert.equal(provenance.model.label, "5.6 Sol");
  assert.equal(provenance.model.reasoningEffort, "low");
  assert.equal(provenance.model.authentication, "ChatGPT subscription");
  assert.equal(provenance.model.participantJudgmentWasScoreBlind, true);
  assert.doesNotMatch(candidateBytes.toString("utf8"), /unassailable/i);

  const validation = validateCheckpointV22PublicationFinalCandidate({
    candidate,
    provenance,
    compiled,
    output,
    packet,
    identity: identityRow
  });
  assert.deepEqual(validation, context.validation);
  assert.deepEqual(validation, auditRow.validation);
  sections += validation.sections;
  moves += validation.moves;
  overallBlunders += validation.overallBlunders;
  emptyOverallReferenceLinks += validation.emptyOverallReferenceLinks;

  for (const [pathKey, hashKey] of [
    ["transcriptPath", "transcriptSha256"],
    ["eventsPath", "eventsSha256"],
    ["localManifestPath", "localManifestSha256"]
  ]) {
    assert.equal(
      sha256(await readBytes(provenance.sourceChain[pathKey])),
      provenance.sourceChain[hashKey],
      `${debateNumber}: source-chain hash mismatch for ${pathKey}`
    );
    sourceChainFiles += 1;
  }
}

assert.equal(sections, 51);
assert.equal(moves, 188);
assert.equal(overallBlunders, 56);
assert.equal(emptyOverallReferenceLinks, 53);
assert.equal(sourceChainFiles, 30);
assert.deepEqual(audit.totals, {
  debates: 10,
  sections: 51,
  moves: 188,
  displayFieldsChanged: 0,
  participantScoresChanged: false,
  modelContexts: 0,
  modelAuthoredScores: 0,
  scorePasses: 0,
  directCostUsd: 0
});

const previewBytes = await readBytes(activation.artifacts.preview);
const preview = previewBytes.toString("utf8");
assert.equal(sha256(previewBytes), audit.preview.sha256);
assert.match(preview, /<meta name="robots" content="noindex,nofollow">/);
assert.match(preview, /renderPublicationStagingDebate/);
assert.match(preview, /new Set\(\["127\.0\.0\.1",\s*"localhost"\]\)/);
assert.match(preview, /Publication staging preview unavailable/);
assert.match(preview, /\.\.\/final-candidates\/debate-/);
const appSource = await readFile(path.resolve("src/app.js"), "utf8");
assert.match(appSource, /export function renderPublicationStagingDebate\(/);
assert.match(appSource, /Publication staging preview:/);

console.log(JSON.stringify({
  status: "passed",
  debates: 10,
  sections,
  moves,
  overallBlunders,
  emptyOverallReferenceLinks,
  sourceChainFiles,
  finalCandidateHashesReplayed: 10,
  provenanceHashesReplayed: 10,
  displayFieldsChanged: 0,
  participantScoresChanged: false,
  modelContexts: 0,
  scorePasses: 0,
  directCostUsd: 0,
  renderingVerification: false,
  productionMutation: false
}, null, 2));
