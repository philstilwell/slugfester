#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_ADJUDICATOR_MODEL, V32_PASS_MODELS, V32_RUBRIC, V32_WORKFLOW, assert,
  compoundFields, sha256, validateAnnotation
} from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`, analysisPath = `${gateRoot}/reliability-analysis.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath), manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.2-retired-hybrid-gate-manifest" && manifest.workflowVersion === V32_WORKFLOW && manifest.rubricVersion === V32_RUBRIC, "manifest identity invalid");
assert(manifest.status === "frozen-before-v3.2-passes" && manifest.calibrationOnly === true && manifest.heldOutTranscriptsOpened === false && manifest.numericalScoringAuthorized === false && manifest.productionMutationAuthorized === false, "manifest stop rule invalid");
assert(manifest.models.passA === V32_PASS_MODELS.A && manifest.models.passB === V32_PASS_MODELS.B && manifest.models.adjudicator === V32_ADJUDICATOR_MODEL, "manifest models invalid");
assert(manifest.sample.debateCount === 3 && manifest.sample.caseCount === 13 && manifest.sample.allDebatesRetired === true && manifest.sample.selectionFrozenBeforePasses === true, "manifest sample invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen source hash mismatch: ${file}`);

let caseCount = 0, fieldCount = 0, mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0;
const seenRoles = new Set();
for (const debate of manifest.sample.debates) {
  seenRoles.add(debate.role);
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, goldText, sourceAuditText, passAText, passBText, packetText, adjudicationText, finalText, scoringText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(debate.sourceAudit.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication), read(outputs.finalLock), read(outputs.scoringInput)
  ]);
  assert(sha256(inputText) === debate.sha256 && sha256(goldText) === debate.gold.sha256 && sha256(sourceAuditText) === debate.sourceAudit.sha256, `${debate.debateId}: frozen artifact hash mismatch`);
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", outputs.passA, debate.path], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", outputs.passB, debate.path], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v32-risk-adjudication.mjs", outputs.adjudication, outputs.disputePacket], { cwd: root, stdio: "ignore" });
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), packet = JSON.parse(packetText), finalLock = JSON.parse(finalText), scoringInput = JSON.parse(scoringText), sourceAudit = JSON.parse(sourceAuditText);
  assert(packet.source.inputSha256 === sha256(inputText) && packet.source.passASha256 === sha256(passAText) && packet.source.passBSha256 === sha256(passBText) && packet.source.manifestSha256 === sha256(manifestText), `${debate.debateId}: packet provenance invalid`);
  assert(finalLock.sources.manifestSha256 === sha256(manifestText) && finalLock.sources.inputSha256 === sha256(inputText) && finalLock.sources.passASha256 === sha256(passAText) && finalLock.sources.passBSha256 === sha256(passBText) && finalLock.sources.disputePacketSha256 === sha256(packetText) && finalLock.sources.adjudicationSha256 === sha256(adjudicationText), `${debate.debateId}: final provenance invalid`);
  assert(input.caseCount === debate.caseCount && gold.annotations.length === input.caseCount && finalLock.cases.length === input.caseCount, `${debate.debateId}: case count mismatch`);
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const annotation of gold.annotations) validateAnnotation(annotation, caseById.get(annotation.caseId), `${debate.debateId}.gold.${annotation.caseId}`);
  for (const item of finalLock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.final.${item.caseId}`);
  assert(finalLock.audit.adjudicatedFieldCount === packet.fieldCount && finalLock.audit.unresolvedFields === 0 && finalLock.audit.unflaggedAlterations === 0 && finalLock.audit.participantPerformanceScoresPresent === false, `${debate.debateId}: final audit invalid`);
  assert(scoringInput.finalLockSha256 === sha256(finalText) && scoringInput.builtOnlyAfterValidatedRiskAdjudication === true && scoringInput.numericalScoresPresent === false, `${debate.debateId}: scoring boundary invalid`);
  assert(sourceAudit.audioVerificationRate === 1 && sourceAudit.mediumOrLowMoveCount === sourceAudit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: audio gate invalid`);
  for (const verified of sourceAudit.verifiedMoves) {
    const bytes = await readFile(path.resolve(root, verified.path));
    assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio hash mismatch`);
  }
  const [transcriptText, eventsText, captionManifestText] = await Promise.all([read(sourceAudit.transcriptPath), read(sourceAudit.eventsPath), read(sourceAudit.manifestPath)]);
  assert(sha256(transcriptText) === sourceAudit.transcriptSha256 && sha256(eventsText) === sourceAudit.eventsSha256 && sha256(captionManifestText) === sourceAudit.manifestSha256, `${debate.debateId}: transcript chain mismatch`);
  caseCount += input.caseCount;
  fieldCount += finalLock.cases.reduce((sum, item) => sum + compoundFields(item.annotation).length, 0);
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
}
assert(seenRoles.has("straightforward-dyadic") && seenRoles.has("difficult-dyadic-reframe") && seenRoles.has("multi-speaker"), "sample role coverage invalid");
assert(caseCount === manifest.sample.caseCount && mediumOrLowMoveCount > 0 && mediumOrLowMoveCount === audioVerifiedMediumOrLowMoveCount, "aggregate source gate invalid");
const analysisText = await read(analysisPath), analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sample.caseCount === caseCount && analysis.sample.semanticFieldCount === fieldCount, "analysis source mismatch");
assert(Object.values(analysis.gates).every(Boolean) === analysis.decision.passed, "analysis decision mismatch");
assert(analysis.decision.heldOutTranscriptsAuthorized === false && analysis.decision.numericalScoringAuthorized === false && analysis.decision.productionMutationAuthorized === false, "analysis authorization overreach");
console.log(JSON.stringify({ status: "passed", gateId: manifest.gateId, retiredExecutionGatePassed: analysis.decision.passed, debateCount: manifest.sample.debateCount, caseCount, fieldCount, mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, analysisSha256: sha256(analysisText) }, null, 2));
