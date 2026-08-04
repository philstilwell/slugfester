#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { canonicalJson } from "./lib/v373-atomic-packets.mjs";
import { V373_EXECUTION_MANIFEST } from "./lib/v373-execution.mjs";

const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V373_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-model-execution" && manifest.correctionSmokeExecutionAuthorized, "execution manifest identity invalid");
assert(manifest.developmentLock.remainsImmutableAndModelExecutionBlocked && manifest.developmentLock.narrowLaterExecutionAuthorization, "development lock relationship invalid");
assert(sha256(await read(manifest.developmentLock.path)) === manifest.developmentLock.sha256, "development manifest hash invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
}
assert(manifest.executionPolicy.initialContexts === 6 && manifest.executionPolicy.adjudicationContextsMaximum === 3 && manifest.executionPolicy.attemptsPerContext === 1, "execution bounds invalid");
assert(manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "execution cost or retry lock invalid");
assert(manifest.thresholds.atomicBundles === 8 && manifest.thresholds.initialAtomicBundleAgreementsMinimum === 7 && manifest.thresholds.finalTwoVoteBundlesRequired === 8, "semantic thresholds invalid");

const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const disagreementText = await read(manifest.artifacts.initialDisagreements);
const disagreement = JSON.parse(disagreementText);
const adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap);
const adjudicationMap = JSON.parse(adjudicationMapText);
const adjudicationText = await read(manifest.artifacts.adjudicationExecution);
const adjudication = JSON.parse(adjudicationText);
assert(initial.results.length === 6 && initial.totalAttempts === 6 && initial.totalRetries === 0, "initial execution counts invalid");
assert(initial.contextsPlanned === 6 && initial.meteredApiCostUsd === 0 && initial.transcriptionCostUsd === 0, "initial execution scope invalid");
for (const [reviewerPass, debates] of Object.entries(manifest.initialContexts)) for (const [debateNumber, context] of Object.entries(debates)) {
  const result = initial.results.find((item) => item.reviewerPass === reviewerPass && item.debateNumber === debateNumber);
  assert(result, `${reviewerPass}.${debateNumber}: initial result missing`);
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `${reviewerPass}.${debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v373-atomic-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}
assert(disagreement.sources.executionManifestSha256 === sha256(manifestText) && disagreement.sources.initialExecutionSha256 === sha256(initialText), "disagreement provenance invalid");
assert(disagreement.counts.bundles <= 8 && disagreement.counts.agreements + disagreement.counts.disagreements === disagreement.counts.bundles, "disagreement counts invalid");
assert(adjudication.results.length === disagreement.adjudicationContexts.length && adjudication.totalRetries === 0, "adjudication execution counts invalid");
assert(adjudication.contextsPlanned <= 3 && adjudication.meteredApiCostUsd === 0 && adjudication.transcriptionCostUsd === 0, "adjudication scope invalid");
for (const context of disagreement.adjudicationContexts) {
  const result = adjudication.results.find((item) => item.debateNumber === context.debateNumber && item.reviewerPass === "pass-c");
  assert(result, `pass-c.${context.debateNumber}: adjudication result missing`);
  const packet = JSON.parse(await read(context.packet));
  const mapped = adjudicationMap.debates[context.debateNumber]?.bundles ?? [];
  assert(packet.bundles.length === context.bundleCount && mapped.length === context.bundleCount, `pass-c.${context.debateNumber}: bundle coverage invalid`);
  for (const bundle of packet.bundles) {
    const mapBundle = mapped.find((item) => item.bundleId === bundle.bundleId);
    assert(mapBundle && mapBundle.options.length === bundle.candidates.length, `${bundle.bundleId}: adjudication map coverage invalid`);
    assert(!canonicalJson(bundle).includes("matchesRetiredExpected") && !canonicalJson(bundle).includes("semanticTuple"), `${bundle.bundleId}: sealed origins leaked into model packet`);
  }
  if (result.status === "completed-valid") {
    const outputText = await read(context.output);
    assert(result.outputSha256 === sha256(outputText), `pass-c.${context.debateNumber}: output hash invalid`);
    execFileSync(process.execPath, ["scripts/validate-v373-atomic-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" });
  }
}

const analysisText = await read(manifest.artifacts.analysis);
const analysis = JSON.parse(analysisText);
assert(analysis.sources.executionManifestSha256 === sha256(manifestText), "analysis manifest provenance invalid");
assert(analysis.sources.initialExecutionSha256 === sha256(initialText) && analysis.sources.initialDisagreementsSha256 === sha256(disagreementText), "analysis initial provenance invalid");
assert(analysis.sources.adjudicationExecutionSha256 === sha256(adjudicationText) && analysis.sources.adjudicationOptionMapSha256 === sha256(adjudicationMapText), "analysis adjudication provenance invalid");
assert(analysis.results.final.bundles === disagreement.counts.bundles && analysis.results.final.resolved <= 8, "analysis bundle coverage invalid");
const expectedPassed = Object.values(analysis.gates.structural).every(Boolean) && Object.values(analysis.gates.semantic).every(Boolean);
assert(analysis.passed === expectedPassed && analysis.decision.disjointRetiredAtomicBundleTestPreregistrationAuthorized === expectedPassed, "analysis pass formula invalid");
assert(!analysis.decision.correctedBenchmarkKeyAuthorized && !analysis.decision.broaderModelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  correctionSmokePassed: analysis.passed,
  initial: analysis.results.initial,
  final: {
    resolved: analysis.results.final.resolved,
    matchesRetiredExpected: analysis.results.final.matchesRetiredExpected,
    differsFromRetiredExpected: analysis.results.final.differsFromRetiredExpected
  },
  decision: analysis.decision,
  analysisSha256: sha256(analysisText)
}, null, 2));
