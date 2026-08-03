#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V31_FAMILIES, V31_MODEL, V31_RUBRIC, V31_WORKFLOW, assert, compoundFields, sha256, validateAnnotation
} from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const analysisPath = `${gateRoot}/reliability-analysis.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.1-retired-verification-gate-manifest" && manifest.workflowVersion === V31_WORKFLOW && manifest.rubricVersion === V31_RUBRIC && manifest.model === V31_MODEL, "manifest identity invalid");
assert(manifest.status === "frozen-before-v3.1-passes" && manifest.calibrationOnly === true && manifest.heldOutTranscriptsOpened === false && manifest.numericalScoringAuthorized === false && manifest.productionMutationAuthorized === false, "manifest stop rule invalid");
assert(manifest.sample.debateCount === 3 && manifest.sample.allDebatesRetired === true && manifest.sample.selectionFrozenBeforePasses === true, "manifest sample invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen source hash mismatch: ${file}`);
let caseCount = 0;
let fieldCount = 0;
let mediumOrLowMoveCount = 0;
let audioVerifiedMediumOrLowMoveCount = 0;
const seenRoles = new Set();
for (const debate of manifest.sample.debates) {
  seenRoles.add(debate.role);
  const outputs = manifest.outputs[debate.debateId];
  const verificationTexts = await Promise.all(V31_FAMILIES.map((family) => read(outputs.verifications[family])));
  const [inputText, goldText, sourceAuditText, passAText, passBText, disagreementText, finalLockText, scoringInputText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(debate.sourceAudit.path), read(outputs.passA), read(outputs.passB),
    read(outputs.semanticDisagreements), read(outputs.finalLock), read(outputs.scoringInput)
  ]);
  assert(sha256(inputText) === debate.sha256 && sha256(goldText) === debate.gold.sha256 && sha256(sourceAuditText) === debate.sourceAudit.sha256, `${debate.debateId}: frozen artifact hash mismatch`);
  for (const family of V31_FAMILIES) assert(sha256(await read(debate.fieldPackets[family].path)) === debate.fieldPackets[family].sha256, `${debate.debateId}: frozen ${family} packet mismatch`);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), sourceAudit = JSON.parse(sourceAuditText);
  const passA = JSON.parse(passAText), passB = JSON.parse(passBText), disagreement = JSON.parse(disagreementText);
  const finalLock = JSON.parse(finalLockText), scoringInput = JSON.parse(scoringInputText);
  const verifications = verificationTexts.map(JSON.parse);
  assert(input.caseCount === debate.caseCount && gold.annotations.length === input.caseCount && passA.annotations.length === input.caseCount && passB.annotations.length === input.caseCount && finalLock.cases.length === input.caseCount, `${debate.debateId}: case count mismatch`);
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const annotation of gold.annotations) validateAnnotation(annotation, caseById.get(annotation.caseId), `${debate.debateId}.gold.${annotation.caseId}`);
  for (const item of finalLock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.final.${item.caseId}`);
  assert(new Set(verifications.map((item) => item.family)).size === V31_FAMILIES.length, `${debate.debateId}: family coverage mismatch`);
  const verifiedFields = verifications.reduce((sum, item) => sum + item.judgments.length, 0);
  assert(verifiedFields === disagreement.fieldCount && finalLock.audit.compoundFieldCount === disagreement.fieldCount && finalLock.audit.focusedJudgmentCount === disagreement.fieldCount && finalLock.audit.unresolvedFields === 0 && finalLock.audit.participantPerformanceScoresPresent === false, `${debate.debateId}: focused merge audit invalid`);
  assert(scoringInput.finalLockSha256 === sha256(finalLockText) && scoringInput.builtOnlyAfterValidatedFocusedVerification === true && scoringInput.numericalScoresPresent === false, `${debate.debateId}: scoring boundary invalid`);
  assert(sourceAudit.audioVerificationRate === 1 && sourceAudit.mediumOrLowMoveCount === sourceAudit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: audio gate invalid`);
  for (const verified of sourceAudit.verifiedMoves) {
    const bytes = await readFile(path.resolve(root, verified.path));
    assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio hash mismatch`);
  }
  const [transcriptText, eventsText, captionManifestText] = await Promise.all([read(sourceAudit.transcriptPath), read(sourceAudit.eventsPath), read(sourceAudit.manifestPath)]);
  assert(sha256(transcriptText) === sourceAudit.transcriptSha256 && sha256(eventsText) === sourceAudit.eventsSha256 && sha256(captionManifestText) === sourceAudit.manifestSha256, `${debate.debateId}: transcript chain mismatch`);
  for (const challengeCase of input.cases) fieldCount += compoundFields(passA.annotations.find((item) => item.caseId === challengeCase.caseId)).length;
  caseCount += input.caseCount;
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
}
assert(seenRoles.has("straightforward-dyadic") && seenRoles.has("difficult-dyadic-reframe") && seenRoles.has("multi-speaker"), "sample role coverage invalid");
assert(caseCount === manifest.sample.caseCount && mediumOrLowMoveCount > 0 && mediumOrLowMoveCount === audioVerifiedMediumOrLowMoveCount, "aggregate source gate invalid");
const analysisText = await read(analysisPath);
const analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sample.caseCount === caseCount && analysis.sample.semanticFieldCount === fieldCount, "analysis source mismatch");
assert(Object.values(analysis.gates).every(Boolean) === analysis.decision.passed, "analysis decision mismatch");
assert(analysis.decision.heldOutTranscriptsAuthorized === false && analysis.decision.numericalScoringAuthorized === false && analysis.decision.productionMutationAuthorized === false, "analysis authorization overreach");
console.log(JSON.stringify({ status: "passed", gateId: manifest.gateId, retiredExecutionGatePassed: analysis.decision.passed, debateCount: manifest.sample.debateCount, caseCount, fieldCount, mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, analysisSha256: sha256(analysisText) }, null, 2));
