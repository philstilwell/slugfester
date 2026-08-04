#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert } from "./lib/v373-atomic-packets.mjs";
import { adjudicationOption, matchesRetiredExpected, readJson, semanticWinner, V373_EXECUTION_MANIFEST } from "./lib/v373-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V373_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const disagreementText = await read(manifest.artifacts.initialDisagreements);
const disagreement = JSON.parse(disagreementText);
const adjudicationText = await read(manifest.artifacts.adjudicationExecution);
const adjudication = JSON.parse(adjudicationText);
const sealedText = await read(manifest.sealedOptionMap.path);
const sealed = JSON.parse(sealedText);
const adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap);
const adjudicationMap = JSON.parse(adjudicationMapText);

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
    if (choice) {
      passC = adjudicationOption(adjudicationMap, comparison.debateNumber, comparison.bundleId, choice.optionId).semanticTuple;
      votes.push(passC);
    }
  }
  const winner = semanticWinner(votes);
  const retiredMatch = winner ? matchesRetiredExpected(sealed, comparison.bundleId, winner.value) : null;
  return {
    bundleId: comparison.bundleId,
    debateNumber: comparison.debateNumber,
    votes: { passA: comparison.passA, passB: comparison.passB, passC },
    resolved: Boolean(winner),
    finalSemanticTuple: winner?.value ?? null,
    supportingVotes: winner?.votes ?? 0,
    matchesRetiredExpected: retiredMatch
  };
});

const thresholds = manifest.thresholds;
const structural = {
  initialContextsCompleted: initial.contextsCompleted === thresholds.validInitialContexts,
  initialContextsValid: initial.validOutputContexts === thresholds.validInitialContexts,
  adjudicationContextsValid: adjudication.validOutputContexts === disagreement.adjudicationContexts.length,
  preInferenceSchemaRejections: initial.preInferenceSchemaRejections + adjudication.preInferenceSchemaRejections === 0,
  modelOutputRetries: initial.totalRetries + adjudication.totalRetries === 0,
  streamRecoveries: initial.sameRequestStreamRecoveries + adjudication.sameRequestStreamRecoveries === 0,
  invalidInitialBundles: initial.invalidBundleCount === thresholds.initialInvalidBundlesMaximum,
  scoringFields: initial.scoringFieldCount + adjudication.scoringFieldCount === thresholds.scoringFieldsMaximum,
  meteredApiCost: initial.meteredApiCostUsd + adjudication.meteredApiCostUsd === 0,
  transcriptionCost: initial.transcriptionCostUsd + adjudication.transcriptionCostUsd === 0
};
const semantic = {
  bundleCoverage: finalBundles.length === thresholds.atomicBundles,
  initialAgreement: disagreement.counts.agreements >= thresholds.initialAtomicBundleAgreementsMinimum,
  finalTwoVoteConsensus: finalBundles.filter((item) => item.resolved && item.supportingVotes >= 2).length === thresholds.finalTwoVoteBundlesRequired,
  unresolvedBundles: finalBundles.filter((item) => !item.resolved).length === thresholds.unresolvedBundlesMaximum
};
const passed = Object.values(structural).every(Boolean) && Object.values(semantic).every(Boolean);
assert(finalBundles.length <= thresholds.atomicBundles, "analysis bundle coverage exceeds preregistered universe");

const analysis = {
  schemaVersion: "3.7.3-atomic-bundle-correction-smoke-analysis",
  analyzedAt: adjudication.completedAt,
  status: passed ? "correction-smoke-pass" : "correction-smoke-fail",
  warning: "This exposed, AI-only correction smoke tests repeatability of eight retired atomic bundles; it neither establishes human ground truth nor production readiness.",
  sources: {
    executionManifestSha256: sha256(manifestText),
    initialExecutionSha256: sha256(initialText),
    initialDisagreementsSha256: sha256(disagreementText),
    adjudicationExecutionSha256: sha256(adjudicationText),
    sealedOptionMapSha256: sha256(sealedText),
    adjudicationOptionMapSha256: sha256(adjudicationMapText)
  },
  results: {
    initial: disagreement.counts,
    final: {
      bundles: finalBundles.length,
      resolved: finalBundles.filter((item) => item.resolved).length,
      matchesRetiredExpected: finalBundles.filter((item) => item.matchesRetiredExpected === true).length,
      differsFromRetiredExpected: finalBundles.filter((item) => item.matchesRetiredExpected === false).length,
      decisions: finalBundles
    }
  },
  gates: { structural, semantic },
  passed,
  decision: {
    disjointRetiredAtomicBundleTestPreregistrationAuthorized: passed,
    correctedBenchmarkKeyAuthorized: false,
    broaderModelBatchAuthorized: false,
    heldOutAccessAuthorized: false,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  }
};
const analysisText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.artifacts.analysis), analysisText);
console.log(analysisText);
