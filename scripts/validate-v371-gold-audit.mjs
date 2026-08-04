#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V371_ROOT}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-model-execution" && manifest.AIOnlyAudit && manifest.candidateOriginsModelBlind, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const initialText = await read(manifest.initialExecutionPath), initial = JSON.parse(initialText);
const disagreementText = await read(manifest.initialDisagreementPath), disagreement = JSON.parse(disagreementText);
const adjudicationText = await read(manifest.adjudicationExecutionPath), adjudication = JSON.parse(adjudicationText);
assert(initial.results.length === 6 && initial.totalAttempts === 6 && initial.totalRetries === 0, "initial execution counts invalid");
assert(adjudication.results.length === disagreement.adjudicationContexts.length && adjudication.totalRetries === 0, "adjudication execution counts invalid");
for (const [reviewerPass, debates] of Object.entries(manifest.initialContexts)) for (const [debateNumber, context] of Object.entries(debates)) {
  const result = initial.results.find((item) => item.reviewerPass === reviewerPass && item.debateNumber === debateNumber);
  assert(result, `${reviewerPass}.${debateNumber}: result missing`);
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `${reviewerPass}.${debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v371-audit-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}
for (const context of disagreement.adjudicationContexts) {
  const result = adjudication.results.find((item) => item.debateNumber === context.debateNumber);
  assert(result, `pass-c.${context.debateNumber}: result missing`);
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `pass-c.${context.debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v371-audit-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}
const analysisText = await read(manifest.analysisPath), analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sources.initialExecutionSha256 === sha256(initialText) && analysis.sources.disagreementSha256 === sha256(disagreementText) && analysis.sources.adjudicationExecutionSha256 === sha256(adjudicationText), "analysis provenance invalid");
assert(analysis.results.final.fields === 14 && analysis.results.final.resolved <= 14, "analysis decision coverage invalid");
const expectedPassed = Object.values(analysis.gates.structural).every(Boolean) && Object.values(analysis.gates.semantic).every(Boolean);
assert(analysis.passed === expectedPassed && analysis.decision.correctedBenchmarkKeyAuthorized === expectedPassed && analysis.decision.freshRetiredSemanticComparisonPreregistrationAuthorized === expectedPassed, "analysis pass formula invalid");
assert(!analysis.decision.currentTerraProductionSelectionAuthorized && !analysis.decision.currentSolProductionSelectionAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, benchmarkAuditPassed: analysis.passed, initial: analysis.results.initial, final: { resolved: analysis.results.final.resolved, changedFromRetired: analysis.results.final.changedFromRetired }, replayAgainstAuditedKey: analysis.results.replayAgainstAuditedKey, decision: analysis.decision, analysisSha256: sha256(analysisText) }, null, 2));
