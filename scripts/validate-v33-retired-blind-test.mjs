#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V33_MODELS, V33_RUBRIC, V33_WORKFLOW, assert, compoundFields, sha256, validateAnnotation
} from "./lib/v33-blind-bundles.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.3-retired-blind-gate-manifest" && manifest.workflowVersion === V33_WORKFLOW && manifest.rubricVersion === V33_RUBRIC, "manifest identity invalid");
assert(manifest.status === "frozen-before-v3.3-adjudications" && manifest.calibrationOnly && manifest.rawPassesReusedWithoutRerun && !manifest.heldOutTranscriptsOpened && !manifest.numericalScoringAuthorized && !manifest.productionMutationAuthorized, "manifest stop rule invalid");
assert(manifest.architecture.blindDecisionPrecedesCandidateMapping && !manifest.architecture.candidateSealsModelVisible && manifest.architecture.noCrossModelFieldBlending && manifest.architecture.modelSchemaOrInvariantRetriesMaximum === 0, "manifest architecture invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen source hash mismatch: ${file}`);
const priorManifestText = await read(manifest.priorV32.manifestPath);
assert(sha256(priorManifestText) === manifest.priorV32.manifestSha256, "prior v3.2 manifest changed");
const fixture = JSON.parse(await read(manifest.dryFixtureResultPath));
assert(fixture.passed && fixture.modelSchemaOrInvariantRetries === 0 && fixture.modelContextsExecuted === 0, "dry fixture gate invalid");

let caseCount = 0, fieldCount = 0, mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0;
const seenRoles = new Set();
for (const debate of manifest.sample.debates) {
  seenRoles.add(debate.role);
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, goldText, auditText, passAText, passBText, packetText, sealText] = await Promise.all([read(source.input.path), read(source.gold.path), read(source.sourceAudit.path), read(source.passA.path), read(source.passB.path), read(outputs.blindPacket), read(outputs.candidateSeal)]);
  assert(sha256(inputText) === source.input.sha256 && sha256(goldText) === source.gold.sha256 && sha256(auditText) === source.sourceAudit.sha256 && sha256(passAText) === source.passA.sha256 && sha256(passBText) === source.passB.sha256, `${debate.debateId}: reused v3.2 artifact changed`);
  assert(sha256(packetText) === debate.blindPacket.sha256 && sha256(sealText) === debate.candidateSeal.sha256, `${debate.debateId}: packet/seal changed`);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), packet = JSON.parse(packetText), seal = JSON.parse(sealText), sourceAudit = JSON.parse(auditText);
  assert(packet.blindness.candidateValuesAbsent && packet.blindness.rawModelIdentitiesAbsent && packet.blindness.agreementStatusAbsent && seal.modelVisible === false, `${debate.debateId}: blind boundary invalid`);
  assert(packet.decisionCount === seal.fieldCount && packet.decisionCount === debate.blindPacket.decisionCount, `${debate.debateId}: routed field count mismatch`);
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const annotation of gold.annotations) validateAnnotation(annotation, caseById.get(annotation.caseId), `${debate.debateId}.gold.${annotation.caseId}`);
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", source.passA.path, source.input.path], { cwd: root, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", source.passB.path, source.input.path], { cwd: root, stdio: "ignore" });
  for (const modelKey of Object.keys(V33_MODELS)) {
    execFileSync(process.execPath, ["scripts/validate-v33-blind-adjudication.mjs", outputs.adjudications[modelKey], outputs.blindPacket, modelKey, source.passA.path, source.input.path], { cwd: root, stdio: "ignore" });
    const [adjudicationText, mappingText, lockText] = await Promise.all([read(outputs.adjudications[modelKey]), read(outputs.mappingResults[modelKey]), read(outputs.finalLocks[modelKey])]);
    const mapping = JSON.parse(mappingText), lock = JSON.parse(lockText);
    assert(mapping.sources.manifestSha256 === sha256(manifestText) && mapping.sources.packetSha256 === sha256(packetText) && mapping.sources.candidateSealSha256 === sha256(sealText) && mapping.sources.adjudicationSha256 === sha256(adjudicationText), `${debate.debateId}.${modelKey}: mapping provenance invalid`);
    assert(lock.sources.manifestSha256 === sha256(manifestText) && lock.sources.inputSha256 === sha256(inputText) && lock.sources.v32PassASha256 === sha256(passAText) && lock.sources.v32PassBSha256 === sha256(passBText) && lock.sources.packetSha256 === sha256(packetText) && lock.sources.adjudicationSha256 === sha256(adjudicationText) && lock.sources.mappingSha256 === sha256(mappingText), `${debate.debateId}.${modelKey}: lock provenance invalid`);
    assert(lock.audit.routedFieldCount === packet.decisionCount && lock.audit.unflaggedAlterations === 0 && lock.audit.participantPerformanceScoresPresent === false && lock.audit.modelSchemaOrInvariantRetries === 0, `${debate.debateId}.${modelKey}: lock audit invalid`);
    for (const item of lock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.${modelKey}.final.${item.caseId}`);
  }
  assert(sourceAudit.audioVerificationRate === 1 && sourceAudit.mediumOrLowMoveCount === sourceAudit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: audio verification incomplete`);
  for (const verified of sourceAudit.verifiedMoves) {
    const bytes = await readFile(path.resolve(root, verified.path));
    assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio hash mismatch`);
  }
  const [transcriptText, eventsText, captionManifestText] = await Promise.all([read(sourceAudit.transcriptPath), read(sourceAudit.eventsPath), read(sourceAudit.manifestPath)]);
  assert(sha256(transcriptText) === sourceAudit.transcriptSha256 && sha256(eventsText) === sourceAudit.eventsSha256 && sha256(captionManifestText) === sourceAudit.manifestSha256, `${debate.debateId}: transcript chain mismatch`);
  caseCount += input.caseCount;
  fieldCount += input.cases.reduce((sum, item) => sum + compoundFields(JSON.parse(passAText).annotations.find((annotation) => annotation.caseId === item.caseId)).length, 0);
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
}
assert(seenRoles.has("straightforward-dyadic") && seenRoles.has("difficult-dyadic-reframe") && seenRoles.has("multi-speaker"), "sample role coverage invalid");
assert(caseCount === manifest.sample.caseCount && fieldCount > manifest.sample.decisionCount && mediumOrLowMoveCount > 0 && mediumOrLowMoveCount === audioVerifiedMediumOrLowMoveCount, "aggregate source gate invalid");
const analysisText = await read(`${gateRoot}/reliability-analysis.json`), analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sample.caseCount === caseCount && analysis.sample.semanticFieldCount === fieldCount, "analysis source mismatch");
for (const modelKey of Object.keys(V33_MODELS)) assert(Object.values(analysis.variants[modelKey].gates).every(Boolean) === analysis.variants[modelKey].passed, `${modelKey}: decision mismatch`);
const qualifying = Object.keys(V33_MODELS).filter((key) => analysis.variants[key].passed);
const expectedSelection = qualifying.includes("terra") ? "terra" : qualifying.length === 1 ? qualifying[0] : null;
assert(analysis.decision.selectedModelKey === expectedSelection && analysis.decision.passed === (expectedSelection !== null), "selection rule mismatch");
assert(!analysis.decision.heldOutGatePreregistrationAuthorized && !analysis.decision.heldOutTranscriptsAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.productionMutationAuthorized, "analysis authorization overreach");
console.log(JSON.stringify({ status: "passed", gateId: manifest.gateId, retiredBakeoffPassed: analysis.decision.passed, selectedModel: analysis.decision.selectedModel, debateCount: manifest.sample.debateCount, caseCount, fieldCount, routedDecisionCount: manifest.sample.decisionCount, modelContextsExecuted: manifest.models.plannedContexts, modelSchemaOrInvariantRetries: 0, mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, analysisSha256: sha256(analysisText) }, null, 2));
