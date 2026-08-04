#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V374_MANIFEST, assert, canonicalJson } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V374_MANIFEST);
const manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-model-execution" && manifest.executionAuthorizedByThisPreregistration && manifest.retiredCaseTest, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
assert(manifest.disjointness.caseIdOverlapWithV373 === 0 && manifest.disjointness.bundleIdOverlapWithV373 === 0 && manifest.disjointness.debateContainerOverlapWithV373 === 3, "disjointness statement invalid");
assert(manifest.thresholds.atomicBundles === 12 && manifest.thresholds.initialAtomicBundleAgreementsMinimum === 11 && manifest.thresholds.finalTwoVoteBundlesRequired === 12, "thresholds invalid");
const dryText = await read(manifest.dryFixture.path);
const dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.adjudicationDisagreementBranchVerified && dry.caseOverlapWithV373 === 0, "dry fixture invalid");
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const disagreementText = await read(manifest.artifacts.initialDisagreements);
const disagreement = JSON.parse(disagreementText);
const adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap);
const adjudicationMap = JSON.parse(adjudicationMapText);
const adjudicationText = await read(manifest.artifacts.adjudicationExecution);
const adjudication = JSON.parse(adjudicationText);
assert(initial.results.length === 6 && initial.totalAttempts === 6 && initial.totalRetries === 0 && initial.meteredApiCostUsd === 0, "initial execution counts invalid");
for (const [reviewerPass, debates] of Object.entries(manifest.initialContexts)) for (const [debateNumber, context] of Object.entries(debates)) {
  const result = initial.results.find((item) => item.reviewerPass === reviewerPass && item.debateNumber === debateNumber);
  assert(result, `${reviewerPass}.${debateNumber}: result missing`);
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `${reviewerPass}.${debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v374-atomic-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}
assert(disagreement.sources.gateManifestSha256 === sha256(manifestText) && disagreement.sources.initialExecutionSha256 === sha256(initialText), "disagreement provenance invalid");
assert(disagreement.counts.bundles <= 12 && disagreement.counts.agreements + disagreement.counts.disagreements === disagreement.counts.bundles, "disagreement counts invalid");
assert(adjudication.results.length === disagreement.adjudicationContexts.length && adjudication.contextsPlanned <= 3 && adjudication.totalRetries === 0 && adjudication.meteredApiCostUsd === 0, "adjudication execution invalid");
for (const context of disagreement.adjudicationContexts) {
  const result = adjudication.results.find((item) => item.debateNumber === context.debateNumber && item.reviewerPass === "pass-c");
  assert(result, `pass-c.${context.debateNumber}: result missing`);
  const packet = JSON.parse(await read(context.packet));
  const mapBundles = adjudicationMap.debates[context.debateNumber]?.bundles ?? [];
  assert(packet.bundles.length === context.bundleCount && mapBundles.length === context.bundleCount, `pass-c.${context.debateNumber}: coverage invalid`);
  assert(!canonicalJson(packet).includes("semanticTuple") && !canonicalJson(packet).includes("matchesRetiredExpected"), `pass-c.${context.debateNumber}: sealed origins leaked`);
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `pass-c.${context.debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v374-atomic-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}
const analysisText = await read(manifest.artifacts.analysis);
const analysis = JSON.parse(analysisText);
assert(analysis.sources.gateManifestSha256 === sha256(manifestText) && analysis.sources.initialExecutionSha256 === sha256(initialText) && analysis.sources.initialDisagreementsSha256 === sha256(disagreementText), "analysis initial provenance invalid");
assert(analysis.sources.adjudicationExecutionSha256 === sha256(adjudicationText) && analysis.sources.adjudicationOptionMapSha256 === sha256(adjudicationMapText), "analysis adjudication provenance invalid");
const expectedPassed = Object.values(analysis.gates.structural).every(Boolean) && Object.values(analysis.gates.semantic).every(Boolean);
assert(analysis.passed === expectedPassed && analysis.decision.largerRetiredWorkflowGateDesignAuthorized === expectedPassed, "analysis pass formula invalid");
assert(!analysis.decision.correctedBenchmarkKeyAuthorized && !analysis.decision.largerModelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, disjointRetiredAtomicTestPassed: analysis.passed, initial: analysis.results.initial, final: { resolved: analysis.results.final.resolved, matchesRetiredExpected: analysis.results.final.matchesRetiredExpected, differsFromRetiredExpected: analysis.results.final.differsFromRetiredExpected }, decision: analysis.decision, analysisSha256: sha256(analysisText) }, null, 2));
