#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V30_MODEL, V30_RUBRIC, V30_WORKFLOW, assert, sha256, validateAnnotation } from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const analysisPath = `${gateRoot}/reliability-analysis.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.0-retired-consensus-gate-manifest" && manifest.workflowVersion === V30_WORKFLOW && manifest.rubricVersion === V30_RUBRIC && manifest.model === V30_MODEL, "manifest identity invalid");
assert(manifest.status === "frozen-before-v3.0-passes" && manifest.calibrationOnly === true && manifest.heldOutTranscriptsOpened === false && manifest.numericalScoringAuthorized === false && manifest.productionMutationAuthorized === false, "manifest stop rule invalid");
assert(manifest.sample.debateCount === 3 && manifest.sample.allDebatesRetired === true && manifest.sample.selectionFrozenBeforePasses === true, "manifest sample invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen source hash mismatch: ${file}`);
let caseCount = 0;
let disputeCount = 0;
let mediumOrLowMoveCount = 0;
let audioVerifiedMediumOrLowMoveCount = 0;
const seenRoles = new Set();
for (const debate of manifest.sample.debates) {
  seenRoles.add(debate.role);
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, goldText, sourceAuditText, passAText, passBText, packetText, adjudicationText, finalLockText, scoringInputText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(debate.sourceAudit.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication), read(outputs.finalLock), read(outputs.scoringInput)
  ]);
  assert(sha256(inputText) === debate.sha256 && sha256(goldText) === debate.gold.sha256 && sha256(sourceAuditText) === debate.sourceAudit.sha256, `${debate.debateId}: frozen artifact hash mismatch`);
  const input = JSON.parse(inputText);
  const gold = JSON.parse(goldText);
  const sourceAudit = JSON.parse(sourceAuditText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const packet = JSON.parse(packetText);
  const adjudication = JSON.parse(adjudicationText);
  const finalLock = JSON.parse(finalLockText);
  const scoringInput = JSON.parse(scoringInputText);
  assert(input.caseCount === debate.caseCount && gold.annotations.length === input.caseCount && passA.annotations.length === input.caseCount && passB.annotations.length === input.caseCount && finalLock.cases.length === input.caseCount, `${debate.debateId}: case count mismatch`);
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const annotation of gold.annotations) validateAnnotation(annotation, caseById.get(annotation.caseId), `${debate.debateId}.gold.${annotation.caseId}`);
  for (const item of finalLock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.final.${item.caseId}`);
  assert(packet.exclusions.nondisputedFieldsIncluded === false && packet.exclusions.goldIncluded === false && packet.exclusions.legacyMaterialIncluded === false && packet.exclusions.numericalScoresIncluded === false, `${debate.debateId}: dispute packet scope leak`);
  assert(adjudication.resolutions.length === packet.disputeCount && finalLock.audit.disputeCount === packet.disputeCount && finalLock.audit.resolvedDisputeCount === packet.disputeCount && finalLock.audit.unresolvedDisputes === 0 && finalLock.audit.nondisputedAlterations === 0 && finalLock.audit.participantPerformanceScoresPresent === false, `${debate.debateId}: merge audit invalid`);
  assert(scoringInput.finalLockSha256 === sha256(finalLockText) && scoringInput.builtOnlyAfterValidatedConsensus === true && scoringInput.numericalScoresPresent === false, `${debate.debateId}: post-adjudication scoring boundary invalid`);
  assert(sourceAudit.audioVerificationRate === 1 && sourceAudit.mediumOrLowMoveCount === sourceAudit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: audio gate invalid`);
  for (const verified of sourceAudit.verifiedMoves) {
    const bytes = await readFile(path.resolve(root, verified.path));
    assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio hash mismatch`);
  }
  const [transcriptText, eventsText, captionManifestText] = await Promise.all([read(sourceAudit.transcriptPath), read(sourceAudit.eventsPath), read(sourceAudit.manifestPath)]);
  assert(sha256(transcriptText) === sourceAudit.transcriptSha256 && sha256(eventsText) === sourceAudit.eventsSha256 && sha256(captionManifestText) === sourceAudit.manifestSha256, `${debate.debateId}: local transcript chain mismatch`);
  caseCount += input.caseCount;
  disputeCount += packet.disputeCount;
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
}
assert(seenRoles.has("straightforward-dyadic") && seenRoles.has("difficult-dyadic-reframe") && seenRoles.has("multi-speaker"), "sample role coverage invalid");
assert(caseCount === manifest.sample.caseCount && mediumOrLowMoveCount > 0 && mediumOrLowMoveCount === audioVerifiedMediumOrLowMoveCount, "aggregate source gate invalid");
const analysisText = await read(analysisPath);
const analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sample.caseCount === caseCount, "analysis source mismatch");
assert(Object.values(analysis.gates).every(Boolean) === analysis.decision.passed, "analysis decision mismatch");
assert(analysis.decision.heldOutTranscriptsAuthorized === false && analysis.decision.numericalScoringAuthorized === false && analysis.decision.productionMutationAuthorized === false, "analysis authorization overreach");
console.log(JSON.stringify({ status: "passed", gateId: manifest.gateId, retiredExecutionGatePassed: analysis.decision.passed, debateCount: manifest.sample.debateCount, caseCount, disputeCount, mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, analysisSha256: sha256(analysisText) }, null, 2));

