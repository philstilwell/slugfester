#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V374_MANIFEST, adjudicationSemanticOption, assert, matchesV374Retired, semanticWinner } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const manifestText = await read(V374_MANIFEST);
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
  try { adjudicationOutputs[context.debateNumber] = await readJson(context.output); }
  catch { adjudicationOutputs[context.debateNumber] = null; }
}

const finalBundles = disagreement.comparisons.map((comparison) => {
  const votes = [comparison.passA, comparison.passB];
  let passC = null;
  if (!comparison.agreed) {
    const choice = adjudicationOutputs[comparison.debateNumber]?.bundles?.find((item) => item.bundleId === comparison.bundleId);
    if (choice) {
      passC = adjudicationSemanticOption(adjudicationMap, comparison.debateNumber, comparison.bundleId, choice.optionId).semanticTuple;
      votes.push(passC);
    }
  }
  const winner = semanticWinner(votes);
  return { bundleId: comparison.bundleId, debateNumber: comparison.debateNumber, votes: { passA: comparison.passA, passB: comparison.passB, passC }, resolved: Boolean(winner), finalSemanticTuple: winner?.value ?? null, supportingVotes: winner?.votes ?? 0, matchesRetiredExpected: winner ? matchesV374Retired(sealed, comparison.bundleId, winner.value) : null };
});
const t = manifest.thresholds;
const structural = {
  initialContextsCompleted: initial.contextsCompleted === t.validInitialContexts,
  initialContextsValid: initial.validOutputContexts === t.validInitialContexts,
  adjudicationContextsValid: adjudication.validOutputContexts === disagreement.adjudicationContexts.length,
  preInferenceSchemaRejections: initial.preInferenceSchemaRejections + adjudication.preInferenceSchemaRejections === 0,
  modelOutputRetries: initial.totalRetries + adjudication.totalRetries === 0,
  streamRecoveries: initial.sameRequestStreamRecoveries + adjudication.sameRequestStreamRecoveries === 0,
  invalidInitialBundles: initial.invalidBundleCount === t.initialInvalidBundlesMaximum,
  scoringFields: initial.scoringFieldCount + adjudication.scoringFieldCount === t.scoringFieldsMaximum,
  meteredApiCost: initial.meteredApiCostUsd + adjudication.meteredApiCostUsd === 0,
  transcriptionCost: initial.transcriptionCostUsd + adjudication.transcriptionCostUsd === 0
};
const semantic = {
  bundleCoverage: finalBundles.length === t.atomicBundles,
  initialAgreement: disagreement.counts.agreements >= t.initialAtomicBundleAgreementsMinimum,
  finalTwoVoteConsensus: finalBundles.filter((item) => item.resolved && item.supportingVotes >= 2).length === t.finalTwoVoteBundlesRequired,
  unresolvedBundles: finalBundles.filter((item) => !item.resolved).length === t.unresolvedBundlesMaximum
};
const passed = Object.values(structural).every(Boolean) && Object.values(semantic).every(Boolean);
assert(finalBundles.length <= t.atomicBundles, "analysis exceeds preregistered bundle universe");
const analysis = {
  schemaVersion: "3.7.4-disjoint-retired-atomic-analysis",
  analyzedAt: adjudication.completedAt,
  status: passed ? "disjoint-retired-atomic-pass" : "disjoint-retired-atomic-fail",
  warning: "This AI-only retired-case test measures repeatability, not human ground truth, participant performance, or production readiness.",
  sources: { gateManifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), initialDisagreementsSha256: sha256(disagreementText), adjudicationExecutionSha256: sha256(adjudicationText), sealedOptionMapSha256: sha256(sealedText), adjudicationOptionMapSha256: sha256(adjudicationMapText) },
  results: { initial: disagreement.counts, final: { bundles: finalBundles.length, resolved: finalBundles.filter((item) => item.resolved).length, matchesRetiredExpected: finalBundles.filter((item) => item.matchesRetiredExpected === true).length, differsFromRetiredExpected: finalBundles.filter((item) => item.matchesRetiredExpected === false).length, decisions: finalBundles } },
  gates: { structural, semantic },
  passed,
  decision: {
    largerRetiredWorkflowGateDesignAuthorized: passed,
    correctedBenchmarkKeyAuthorized: false,
    largerModelBatchAuthorized: false,
    heldOutAccessAuthorized: false,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  }
};
const text = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.artifacts.analysis), text);
console.log(text);
