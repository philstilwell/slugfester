#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V34_MODELS, V34_RUBRIC, V34_WORKFLOW, assert, compoundFields, sha256, validateAnnotation } from "./lib/v34-conservative-review.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.4-retired-conservative-gate-manifest" && manifest.workflowVersion === V34_WORKFLOW && manifest.rubricVersion === V34_RUBRIC, "manifest identity invalid");
assert(manifest.status === "frozen-before-v3.4-reviews" && manifest.calibrationOnly && manifest.rawPassesReusedWithoutRerun && !manifest.heldOutTranscriptsOpened && !manifest.numericalScoringAuthorized && !manifest.productionMutationAuthorized, "manifest scope invalid");
assert(manifest.architecture.completeBlindReviews && !manifest.architecture.rawComparisonModelVisible && manifest.architecture.terraLeadingConflictArbiter && !manifest.architecture.solConflictOverrideAllowed && manifest.architecture.dualConfirmationRequiredForSharedOverride && !manifest.architecture.burdenSharedFieldsEligible && manifest.architecture.modelSchemaOrInvariantRetriesMaximum === 0, "manifest architecture invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen source hash mismatch: ${file}`);
assert(sha256(await read(manifest.priorV32.manifestPath)) === manifest.priorV32.manifestSha256, "prior v3.2 manifest changed");
const retrospective = JSON.parse(await read(manifest.retrospectiveFixture.path));
assert(sha256(await read(manifest.retrospectiveFixture.path)) === manifest.retrospectiveFixture.sha256 && retrospective.computedBeforeModelReviews && !retrospective.modelVisible && !retrospective.allSharedValuesLockedWouldBeReachable, "retrospective fixture invalid");
const preflight = JSON.parse(await read(manifest.preInferenceHarnessCorrection.path));
assert(sha256(await read(manifest.preInferenceHarnessCorrection.path)) === manifest.preInferenceHarnessCorrection.sha256 && preflight.transportAttemptsRejected === 6 && preflight.modelInferencesCompleted === 0 && preflight.reviewOutputsProduced === 0, "pre-inference correction record invalid");
const fixture = JSON.parse(await read(manifest.dryFixtureResultPath));
assert(fixture.passed && fixture.modelContextsExecuted === 0 && fixture.modelSchemaOrInvariantRetries === 0, "dry fixture gate invalid");
const execution = JSON.parse(await read(manifest.executionResultPath));
assert(execution.contextsPlanned === manifest.models.plannedContexts && execution.contextsCompleted === manifest.models.plannedContexts && execution.contextsFailed === 0 && execution.totalRetries === 0 && execution.meteredApiCostUsd === 0, "model execution invalid");

let caseCount = 0, fieldCount = 0, mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0;
const roles = new Set();
for (const debate of manifest.sample.debates) {
  roles.add(debate.role);
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, goldText, auditText, passAText, passBText, packetText, sealText, terraText, solText, lockText] = await Promise.all([read(source.input.path), read(source.gold.path), read(source.sourceAudit.path), read(source.passA.path), read(source.passB.path), read(outputs.reviewPacket), read(outputs.rawFieldSeal), read(outputs.reviews.terra), read(outputs.reviews.sol), read(outputs.finalLock)]);
  assert(sha256(inputText) === source.input.sha256 && sha256(goldText) === source.gold.sha256 && sha256(auditText) === source.sourceAudit.sha256 && sha256(passAText) === source.passA.sha256 && sha256(passBText) === source.passB.sha256, `${debate.debateId}: frozen v3.2 source changed`);
  assert(sha256(packetText) === debate.reviewPacket.sha256 && sha256(sealText) === debate.rawFieldSeal.sha256, `${debate.debateId}: packet or seal changed`);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), audit = JSON.parse(auditText), packet = JSON.parse(packetText), seal = JSON.parse(sealText), lock = JSON.parse(lockText);
  assert(packet.blindness.rawValuesAbsent && packet.blindness.agreementStatusAbsent && packet.blindness.goldAbsent && seal.modelVisible === false, `${debate.debateId}: blindness invalid`);
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", source.passA.path, source.input.path], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", source.passB.path, source.input.path], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v34-isolated-review.mjs", outputs.reviews.terra, outputs.reviewPacket, "terra"], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v34-isolated-review.mjs", outputs.reviews.sol, outputs.reviewPacket, "sol"], { cwd: root, stdio: "ignore" });
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const annotation of gold.annotations) validateAnnotation(annotation, caseById.get(annotation.caseId), `${debate.debateId}.gold.${annotation.caseId}`);
  assert(lock.sources.manifestSha256 === sha256(manifestText) && lock.sources.inputSha256 === sha256(inputText) && lock.sources.v32PassASha256 === sha256(passAText) && lock.sources.v32PassBSha256 === sha256(passBText) && lock.sources.packetSha256 === sha256(packetText) && lock.sources.sealSha256 === sha256(sealText) && lock.sources.terraReviewSha256 === sha256(terraText) && lock.sources.solReviewSha256 === sha256(solText), `${debate.debateId}: final-lock provenance invalid`);
  assert(lock.audit.unilateralSharedOverridesApplied === 0 && lock.audit.modelSchemaOrInvariantRetries === 0 && lock.audit.participantPerformanceScoresPresent === false, `${debate.debateId}: final-lock audit invalid`);
  for (const item of lock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.final.${item.caseId}`);
  assert(audit.audioVerificationRate === 1 && audit.mediumOrLowMoveCount === audit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: audio verification incomplete`);
  for (const verified of audit.verifiedMoves) { const bytes = await readFile(path.resolve(root, verified.path)); assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio hash mismatch`); }
  const [transcriptText, eventsText, captionsText] = await Promise.all([read(audit.transcriptPath), read(audit.eventsPath), read(audit.manifestPath)]);
  assert(sha256(transcriptText) === audit.transcriptSha256 && sha256(eventsText) === audit.eventsSha256 && sha256(captionsText) === audit.manifestSha256, `${debate.debateId}: transcript chain mismatch`);
  caseCount += input.caseCount; fieldCount += seal.fieldCount; mediumOrLowMoveCount += audit.mediumOrLowMoveCount; audioVerifiedMediumOrLowMoveCount += audit.audioVerifiedMediumOrLowMoveCount;
}
assert(roles.has("straightforward-dyadic") && roles.has("difficult-dyadic-reframe") && roles.has("multi-speaker"), "sample role coverage invalid");
assert(caseCount === manifest.sample.caseCount && fieldCount === manifest.sample.semanticFieldCount && mediumOrLowMoveCount > 0 && mediumOrLowMoveCount === audioVerifiedMediumOrLowMoveCount, "aggregate source gate invalid");
const analysisText = await read(`${gateRoot}/reliability-analysis.json`), analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sample.caseCount === caseCount && analysis.sample.semanticFieldCount === fieldCount, "analysis provenance invalid");
assert(analysis.decision.passed === Object.values(analysis.gates).every(Boolean) && analysis.decision.disjointRetiredConfirmationAuthorized === analysis.decision.passed, "analysis gate decision invalid");
assert(!analysis.decision.heldOutGatePreregistrationAuthorized && !analysis.decision.heldOutTranscriptsAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.productionMutationAuthorized, "analysis authorization overreach");
console.log(JSON.stringify({ status: "passed", gateId: manifest.gateId, retiredDevelopmentTestPassed: analysis.decision.passed, debateCount: manifest.sample.debateCount, caseCount, semanticFieldCount: fieldCount, modelContextsExecuted: execution.contextsCompleted, modelSchemaOrInvariantRetries: execution.totalRetries, mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, analysisSha256: sha256(analysisText) }, null, 2));
