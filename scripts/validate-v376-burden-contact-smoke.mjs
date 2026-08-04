#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, canonicalJson } from "./lib/v376-burden-contact.mjs";
import { V376_EXECUTION_MANIFEST } from "./lib/v376-execution.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8"), manifestText = await read(V376_EXECUTION_MANIFEST), manifest = JSON.parse(manifestText);
execFileSync(process.execPath, ["scripts/validate-v376-execution-lock.mjs"], { cwd: root, stdio: "ignore" });
const initialText = await read(manifest.artifacts.initialExecution), initial = JSON.parse(initialText), disagreementText = await read(manifest.artifacts.initialDisagreements), disagreement = JSON.parse(disagreementText), adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap), adjudicationMap = JSON.parse(adjudicationMapText), adjudicationText = await read(manifest.artifacts.adjudicationExecution), adjudication = JSON.parse(adjudicationText);
assert(initial.results.length === 6 && initial.totalAttempts === 6 && initial.totalRetries === 0 && initial.contextsPlanned === 6 && initial.meteredApiCostUsd === 0 && initial.transcriptionCostUsd === 0, "initial execution scope invalid");
for (const [reviewerPass, debates] of Object.entries(manifest.initialContexts)) for (const [debateNumber, context] of Object.entries(debates)) {
  const result = initial.results.find((item) => item.reviewerPass === reviewerPass && item.debateNumber === debateNumber); assert(result, `${reviewerPass}.${debateNumber}: result missing`);
  if (result.status === "completed-valid") { const outputText = await read(context.output); assert(result.outputSha256 === sha256(outputText), `${reviewerPass}.${debateNumber}: output hash invalid`); execFileSync(process.execPath, ["scripts/validate-v376-burden-contact-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" }); }
}
assert(disagreement.sources.executionManifestSha256 === sha256(manifestText) && disagreement.sources.initialExecutionSha256 === sha256(initialText), "disagreement provenance invalid");
assert(disagreement.counts.compositeCases <= 8 && disagreement.counts.agreements + disagreement.counts.disagreements === disagreement.counts.compositeCases, "disagreement counts invalid");
assert(adjudication.results.length === disagreement.adjudicationContexts.length && adjudication.contextsPlanned <= 3 && adjudication.totalRetries === 0 && adjudication.meteredApiCostUsd === 0 && adjudication.transcriptionCostUsd === 0, "adjudication execution invalid");
for (const context of disagreement.adjudicationContexts) {
  const result = adjudication.results.find((item) => item.debateNumber === context.debateNumber && item.reviewerPass === "pass-c"); assert(result, `pass-c.${context.debateNumber}: result missing`);
  const packet = JSON.parse(await read(context.packet)), mapBundles = adjudicationMap.debates[context.debateNumber]?.bundles ?? [];
  assert(packet.bundles.length === context.bundleCount && mapBundles.length === context.bundleCount && !canonicalJson(packet).includes("semanticTuple") && !canonicalJson(packet).includes("matchesDesignFixture"), `pass-c.${context.debateNumber}: coverage or leakage invalid`);
  if (result.status === "completed-valid") { const outputText = await read(context.output); assert(result.outputSha256 === sha256(outputText), `pass-c.${context.debateNumber}: output hash invalid`); execFileSync(process.execPath, ["scripts/validate-v376-burden-contact-output.mjs", context.output, context.packet, context.schema], { cwd: root, stdio: "ignore" }); }
}
const analysisText = await read(manifest.artifacts.analysis), analysis = JSON.parse(analysisText);
assert(analysis.sources.executionManifestSha256 === sha256(manifestText) && analysis.sources.initialExecutionSha256 === sha256(initialText) && analysis.sources.initialDisagreementsSha256 === sha256(disagreementText) && analysis.sources.adjudicationExecutionSha256 === sha256(adjudicationText) && analysis.sources.adjudicationOptionMapSha256 === sha256(adjudicationMapText), "analysis provenance invalid");
const expectedPassed = Object.values(analysis.gates.structural).every(Boolean) && Object.values(analysis.gates.semantic).every(Boolean);
assert(analysis.passed === expectedPassed && analysis.decision.caseDisjointBurdenContactTestPreregistrationAuthorized === expectedPassed, "analysis pass formula invalid");
assert(!analysis.decision.benchmarkMutationAuthorized && !analysis.decision.largerModelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, burdenContactSmokePassed: analysis.passed, initial: analysis.results.initial, final: { resolved: analysis.results.final.resolved, matchesDesignFixture: analysis.results.final.matchesDesignFixture, differsFromDesignFixture: analysis.results.final.differsFromDesignFixture, contactCounts: analysis.results.final.contactCounts }, decision: analysis.decision, analysisSha256: sha256(analysisText) }, null, 2));
