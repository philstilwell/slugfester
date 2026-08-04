#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V35_RUBRIC, V35_WORKFLOW, assert, sha256, validateAnnotation } from "./lib/v35-semantic-compiler.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.5/v34-six-review-replay";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-replay" && manifest.workflowVersion === V35_WORKFLOW && manifest.rubricVersion === V35_RUBRIC, "manifest identity invalid");
assert(manifest.calibrationOnly && manifest.retrospectiveDevelopmentFixture && manifest.modelContextsExecuted === 0 && manifest.meteredApiCostUsd === 0 && manifest.transcriptionCostUsd === 0, "manifest scope or cost invalid");
assert(!manifest.heldOutMaterialOpened && !manifest.numericalScoringAuthorized && !manifest.productionMutationAuthorized, "manifest authorizes prohibited work");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `decision-source hash mismatch: ${file}`);

let compiledArtifacts = 0, compiledCases = 0, replayCases = 0, mediumLow = 0, verifiedMediumLow = 0;
for (const debate of manifest.sample.debates) {
  for (const source of [...Object.values(debate.fixtures), debate.gold]) assert(sha256(await read(source.path)) === source.sha256, `${debate.debateId}: frozen fixture hash mismatch at ${source.path}`);
  const input = JSON.parse(await read(debate.fixtures.input.path));
  const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const reviewerKey of ["terra", "sol"]) {
    const artifact = JSON.parse(await read(manifest.outputs[debate.debateId].compiledReviews[reviewerKey]));
    assert(artifact.schemaVersion === "3.5-compiled-v34-review" && artifact.workflowVersion === V35_WORKFLOW && artifact.rubricVersion === V35_RUBRIC, `${debate.debateId}.${reviewerKey}: compiled identity invalid`);
    assert(artifact.source.manifestSha256 === sha256(manifestText) && artifact.audit.discretionaryRepairs === 0 && artifact.audit.fallbacks === 0 && !artifact.audit.scoreFieldsPresent && artifact.audit.modelContextsExecuted === 0, `${debate.debateId}.${reviewerKey}: compiled audit invalid`);
    for (const item of artifact.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.${reviewerKey}.${item.caseId}`);
    compiledArtifacts += 1; compiledCases += artifact.cases.length;
  }
  const lock = JSON.parse(await read(manifest.outputs[debate.debateId].replayLock));
  assert(lock.schemaVersion === "3.5-retrospective-replay-lock" && lock.audit.discretionaryRepairs === 0 && lock.audit.fallbacks === 0 && !lock.audit.scoreFieldsPresent && !lock.audit.productionMutation, `${debate.debateId}: lock identity/audit invalid`);
  for (const item of lock.cases) validateAnnotation(item.annotation, caseById.get(item.caseId), `${debate.debateId}.lock.${item.caseId}`);
  replayCases += lock.cases.length;
  const audit = JSON.parse(await read(debate.fixtures.sourceAudit.path));
  assert(audit.audioVerificationRate === 1 && audit.mediumOrLowMoveCount === audit.audioVerifiedMediumOrLowMoveCount, `${debate.debateId}: medium/low audio verification incomplete`);
  for (const verified of audit.verifiedMoves) {
    const bytes = await readFile(path.resolve(root, verified.path));
    assert(createHash("sha256").update(bytes).digest("hex") === verified.sha256, `${verified.moveId}: audio verification hash mismatch`);
  }
  const [transcriptText, eventsText, sourceManifestText] = await Promise.all([read(audit.transcriptPath), read(audit.eventsPath), read(audit.manifestPath)]);
  assert(sha256(transcriptText) === audit.transcriptSha256 && sha256(eventsText) === audit.eventsSha256 && sha256(sourceManifestText) === audit.manifestSha256, `${debate.debateId}: transcript chain mismatch`);
  mediumLow += audit.mediumOrLowMoveCount; verifiedMediumLow += audit.audioVerifiedMediumOrLowMoveCount;
}

execFileSync(process.execPath, ["scripts/test-v35-semantic-compiler.mjs"], { cwd: root, stdio: "ignore" });
execFileSync(process.execPath, ["scripts/replay-v35-compiler.mjs"], { cwd: root, stdio: "ignore" });
execFileSync(process.execPath, ["scripts/analyze-v35-compiler-replay.mjs"], { cwd: root, stdio: "ignore" });
const summaryText = await read(manifest.replaySummaryPath), summary = JSON.parse(summaryText);
const analysisText = await read(manifest.semanticAnalysisPath), analysis = JSON.parse(analysisText);
assert(summary.sources.manifestSha256 === sha256(manifestText) && analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sources.replaySummarySha256 === sha256(summaryText), "summary/analysis provenance invalid");
assert(compiledArtifacts === manifest.compilerGateThresholds.compiledArtifactCount && compiledCases === manifest.compilerGateThresholds.compiledReviewCaseCount && replayCases === manifest.compilerGateThresholds.replayLockCaseCount, "aggregate structural counts invalid");
assert(mediumLow > 0 && mediumLow === verifiedMediumLow, "aggregate audio verification gate invalid");
assert(analysis.decision.compilerPassed === Object.values(analysis.compiler.gates).every(Boolean) && analysis.decision.semanticReady === Object.values(analysis.semanticGates).every(Boolean), "analysis decision mismatch");
assert(analysis.decision.disjointRetiredModelTestAuthorized === (analysis.decision.compilerPassed && analysis.decision.semanticReady), "authorization formula mismatch");
assert(!analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes next work");
console.log(JSON.stringify({ status: "passed", compilerPassed: analysis.decision.compilerPassed, semanticReady: analysis.decision.semanticReady, compiledArtifacts, compiledCases, replayCases, mediumLow, verifiedMediumLow, analysisSha256: sha256(analysisText) }, null, 2));
