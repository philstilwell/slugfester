#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert } from "./lib/v383-burden-contact.mjs";
import { V383_EXECUTION_MANIFEST, adjudicationV383Option, matchesV383ProvisionalAid, readV383Json, v383SemanticWinner } from "./lib/v383-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V383_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const disagreementText = await read(manifest.artifacts.initialDisagreements);
const disagreement = JSON.parse(disagreementText);
const adjudicationText = await read(manifest.artifacts.adjudicationExecution);
const adjudication = JSON.parse(adjudicationText);
const sealedText = await read(manifest.packetConstruction.sealedOptionMap);
const sealed = JSON.parse(sealedText);
const adjudicationMapText = await read(manifest.artifacts.adjudicationOptionMap);
const adjudicationMap = JSON.parse(adjudicationMapText);
const adjudicationOutputs = {};
for (const context of disagreement.adjudicationContexts) {
  try { adjudicationOutputs[context.debateNumber] = await readV383Json(root, context.output); }
  catch { adjudicationOutputs[context.debateNumber] = null; }
}

const finalBundles = disagreement.comparisons.map((comparison) => {
  const votes = [comparison.passA, comparison.passB];
  let passC = null;
  if (!comparison.agreed) {
    const choice = adjudicationOutputs[comparison.debateNumber]?.bundles?.find((item) => item.bundleId === comparison.bundleId);
    if (choice) {
      passC = adjudicationV383Option(adjudicationMap, comparison.debateNumber, comparison.bundleId, choice.optionId).semanticTuple;
      votes.push(passC);
    }
  }
  const winner = v383SemanticWinner(votes);
  return {
    bundleId: comparison.bundleId,
    debateNumber: comparison.debateNumber,
    votes: { passA: comparison.passA, passB: comparison.passB, passC },
    resolved: Boolean(winner),
    finalSemanticTuple: winner?.value ?? null,
    supportingVotes: winner?.votes ?? 0,
    matchesProvisionalAid: winner ? matchesV383ProvisionalAid(sealed, comparison.bundleId, winner.value) : null
  };
});

const t = manifest.thresholds;
const allResults = [...initial.results, ...adjudication.results];
const structural = {
  initialContextsCompleted: initial.contextsCompleted === t.validInitialContexts,
  initialContextsValid: initial.validOutputContexts === t.validInitialContexts,
  adjudicationContextsValid: adjudication.validOutputContexts === disagreement.adjudicationContexts.length,
  timedOutContexts: initial.timedOutContexts + adjudication.timedOutContexts === 0,
  preInferenceSchemaRejections: initial.preInferenceSchemaRejections + adjudication.preInferenceSchemaRejections === 0,
  modelOutputRetries: initial.totalRetries + adjudication.totalRetries === 0,
  streamRecoveryPolicy: allResults.every((item) => item.sameRequestStreamRecoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext && item.transportPolicyPassed !== false),
  invalidBundles: initial.invalidItemCount + adjudication.invalidItemCount === t.initialInvalidBundlesMaximum,
  audioVerificationComplete: manifest.audioPolicy.pendingAudioVerifications === 0,
  scoringFields: initial.scoringFieldCount + adjudication.scoringFieldCount === t.scoringFieldsMaximum,
  meteredApiCost: initial.meteredApiCostUsd + adjudication.meteredApiCostUsd === 0,
  transcriptionCost: initial.transcriptionCostUsd + adjudication.transcriptionCostUsd === 0
};
const finalContactCounts = {
  noContact: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact === null).length,
  support: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.polarity === "support").length,
  attack: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.polarity === "attack").length,
  motion: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.tier === "motion").length,
  central: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.tier === "central").length,
  subsidiary: finalBundles.filter((item) => item.finalSemanticTuple?.burdenContact?.tier === "subsidiary").length
};
const semantic = {
  bundleCoverage: finalBundles.length === t.compositeCases,
  minimumInitialAgreement: disagreement.counts.agreements >= t.initialCompositeAgreementsMinimum,
  maximumInitialDisagreement: disagreement.counts.disagreements <= t.initialDisagreementsMaximum,
  finalTwoVoteConsensus: finalBundles.filter((item) => item.resolved && item.supportingVotes >= 2).length === t.finalTwoVoteBundlesRequired,
  unresolvedBundles: finalBundles.filter((item) => !item.resolved).length === t.unresolvedBundlesMaximum,
  finalCategoryCoverage: Object.entries(t.finalCategoryMinimums).every(([key, minimum]) => finalContactCounts[key] >= minimum)
};
assert(finalBundles.length <= t.compositeCases, "analysis exceeds frozen composite universe");
const passed = Object.values(structural).every(Boolean) && Object.values(semantic).every(Boolean);
const analysis = {
  schemaVersion: "3.8.3-heldout-burden-contact-classification-analysis",
  analyzedAt: adjudication.completedAt,
  status: passed ? "heldout-burden-contact-classification-pass" : "heldout-burden-contact-classification-fail",
  warning: "This AI-only held-out gate measures repeatability of composite burden-contact choices. It does not establish human ground truth, numerical-scoring validity, assessment-prose validity, or production readiness.",
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
      compositeCases: finalBundles.length,
      resolved: finalBundles.filter((item) => item.resolved).length,
      matchesProvisionalAid: finalBundles.filter((item) => item.matchesProvisionalAid === true).length,
      differsFromProvisionalAid: finalBundles.filter((item) => item.matchesProvisionalAid === false).length,
      contactCounts: finalContactCounts,
      decisions: finalBundles
    }
  },
  gates: { structural, semantic },
  passed,
  decision: {
    scoreDerivationAndAssessmentReconstructionGatePreregistrationAuthorized: passed,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    benchmarkMutationAuthorized: false,
    productionMutationAuthorized: false,
    all195DebatesAuthorized: false
  }
};
if (shouldWrite) await writeFile(path.resolve(root, manifest.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, passed, initialAgreements: disagreement.counts.agreements, initialDisagreements: disagreement.counts.disagreements, finalResolved: analysis.results.final.resolved, finalContactCounts, decision: analysis.decision }, null, 2));
