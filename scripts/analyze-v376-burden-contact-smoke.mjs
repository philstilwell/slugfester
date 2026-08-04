#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert } from "./lib/v376-burden-contact.mjs";
import { V376_EXECUTION_MANIFEST, adjudicationOption, matchesDesignFixture, readJson, semanticWinner } from "./lib/v376-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V376_EXECUTION_MANIFEST), manifest = JSON.parse(manifestText), initialText = await read(manifest.artifacts.initialExecution), initial = JSON.parse(initialText), disagreementText = await read(manifest.artifacts.initialDisagreements), disagreement = JSON.parse(disagreementText), adjudicationText = await read(manifest.artifacts.adjudicationExecution), adjudication = JSON.parse(adjudicationText), sealedText = await read(manifest.sealedOptionMap.path), sealed = JSON.parse(sealedText), adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap), adjudicationMap = JSON.parse(adjudicationMapText);
const adjudicationOutputs = {};
for (const context of disagreement.adjudicationContexts) {
  try { adjudicationOutputs[context.debateNumber] = await readJson(root, context.output); }
  catch { adjudicationOutputs[context.debateNumber] = null; }
}
const finalBundles = disagreement.comparisons.map((comparison) => {
  const votes = [comparison.passA, comparison.passB];
  let passC = null;
  if (!comparison.agreed) {
    const choice = adjudicationOutputs[comparison.debateNumber]?.bundles?.find((item) => item.bundleId === comparison.bundleId);
    if (choice) { passC = adjudicationOption(adjudicationMap, comparison.debateNumber, comparison.bundleId, choice.optionId).semanticTuple; votes.push(passC); }
  }
  const winner = semanticWinner(votes);
  return { bundleId: comparison.bundleId, debateNumber: comparison.debateNumber, votes: { passA: comparison.passA, passB: comparison.passB, passC }, resolved: Boolean(winner), finalSemanticTuple: winner?.value ?? null, supportingVotes: winner?.votes ?? 0, matchesDesignFixture: winner ? matchesDesignFixture(sealed, comparison.bundleId, winner.value) : null };
});
const t = manifest.thresholds;
const structural = { initialContextsCompleted: initial.contextsCompleted === t.validInitialContexts, initialContextsValid: initial.validOutputContexts === t.validInitialContexts, adjudicationContextsValid: adjudication.validOutputContexts === disagreement.adjudicationContexts.length, preInferenceSchemaRejections: initial.preInferenceSchemaRejections + adjudication.preInferenceSchemaRejections === 0, modelOutputRetries: initial.totalRetries + adjudication.totalRetries === 0, streamRecoveries: initial.sameRequestStreamRecoveries + adjudication.sameRequestStreamRecoveries === 0, invalidInitialBundles: initial.invalidBundleCount === t.initialInvalidBundlesMaximum, scoringFields: initial.scoringFieldCount + adjudication.scoringFieldCount === t.scoringFieldsMaximum, meteredApiCost: initial.meteredApiCostUsd + adjudication.meteredApiCostUsd === 0, transcriptionCost: initial.transcriptionCostUsd + adjudication.transcriptionCostUsd === 0 };
const semantic = { bundleCoverage: finalBundles.length === t.compositeCases, perfectInitialAgreement: disagreement.counts.agreements === t.initialCompositeAgreementsRequired, finalTwoVoteConsensus: finalBundles.filter((item) => item.resolved && item.supportingVotes >= 2).length === t.finalTwoVoteBundlesRequired, unresolvedBundles: finalBundles.filter((item) => !item.resolved).length === t.unresolvedBundlesMaximum };
const passed = Object.values(structural).every(Boolean) && Object.values(semantic).every(Boolean);
assert(finalBundles.length <= t.compositeCases, "analysis exceeds frozen composite universe");
const finalContactCounts = { none: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact === null).length, support: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.polarity === "support").length, attack: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.polarity === "attack").length };
const analysis = { schemaVersion: "3.7.6-burden-contact-decomposition-analysis", analyzedAt: adjudication.completedAt, status: passed ? "burden-contact-smoke-pass" : "burden-contact-smoke-fail", warning: "This exposed AI-only correction smoke tests repeatability of composite burden-contact choices on known development cases; it does not establish human ground truth, generalization, participant performance, or production readiness.", sources: { executionManifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), initialDisagreementsSha256: sha256(disagreementText), adjudicationExecutionSha256: sha256(adjudicationText), sealedOptionMapSha256: sha256(sealedText), adjudicationOptionMapSha256: sha256(adjudicationMapText) }, results: { initial: disagreement.counts, final: { compositeCases: finalBundles.length, resolved: finalBundles.filter((item) => item.resolved).length, matchesDesignFixture: finalBundles.filter((item) => item.matchesDesignFixture === true).length, differsFromDesignFixture: finalBundles.filter((item) => item.matchesDesignFixture === false).length, contactCounts: finalContactCounts, decisions: finalBundles } }, gates: { structural, semantic }, passed, decision: { caseDisjointBurdenContactTestPreregistrationAuthorized: passed, benchmarkMutationAuthorized: false, largerModelBatchAuthorized: false, heldOutAccessAuthorized: false, numericalParticipantScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false } };
const analysisText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.artifacts.analysis), analysisText);
console.log(analysisText);
