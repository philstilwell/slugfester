#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { expectedCard, loadV37Sources, semanticAssertions, V37_FAMILIES } from "./lib/v37-retired-semantic.mjs";
import { assert, canonicalJson, semanticOptionMap, V371_AUDIT_SOURCE, V371_DEBATES, V371_INITIAL_PASSES, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V371_ROOT}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const initialText = await read(manifest.initialExecutionPath), initial = JSON.parse(initialText);
const disagreementText = await read(manifest.initialDisagreementPath), disagreement = JSON.parse(disagreementText);
const adjudicationText = await read(manifest.adjudicationExecutionPath), adjudication = JSON.parse(adjudicationText);
const sealedMapText = await read(manifest.sealedOptionMap.path), sealedMap = JSON.parse(sealedMapText);
const adjudicationMapText = await read(manifest.adjudicationOptionMapPath), adjudicationMap = JSON.parse(adjudicationMapText);
const auditSource = JSON.parse(await read(V371_AUDIT_SOURCE));
const retiredByKey = new Map([...auditSource.consensusAgainstRetiredGold, ...auditSource.crossModelDisagreements].map((item) => [item.key, item.retiredExpected]));
const mapByAuditId = new Map(Object.values(sealedMap.passes["pass-a"]).flatMap((debate) => debate.decisions.map((item) => [item.auditId, item])));

const initialOutputs = {}, initialSemanticMaps = {};
for (const reviewerPass of V371_INITIAL_PASSES) {
  initialOutputs[reviewerPass] = {};
  initialSemanticMaps[reviewerPass] = {};
  for (const debateNumber of V371_DEBATES) {
    try {
      initialOutputs[reviewerPass][debateNumber] = JSON.parse(await read(manifest.outputs.initial[reviewerPass][debateNumber]));
      initialSemanticMaps[reviewerPass][debateNumber] = semanticOptionMap(sealedMap, debateNumber, reviewerPass);
    } catch { initialOutputs[reviewerPass][debateNumber] = null; }
  }
}

const adjudicationOutputs = {};
for (const context of disagreement.adjudicationContexts) {
  try { adjudicationOutputs[context.debateNumber] = JSON.parse(await read(context.output)); }
  catch { adjudicationOutputs[context.debateNumber] = null; }
}

const finalDecisions = [];
for (const comparison of disagreement.comparisons) {
  const mapping = mapByAuditId.get(comparison.auditId);
  assert(mapping, `${comparison.auditId}: sealed mapping missing`);
  const votes = [comparison.passA, comparison.passB];
  let passC = null;
  if (!comparison.agreed) {
    const output = adjudicationOutputs[comparison.debateNumber];
    const decision = output?.decisions.find((item) => item.auditId === comparison.auditId);
    const option = adjudicationMap.debates[comparison.debateNumber]?.decisions.find((item) => item.auditId === comparison.auditId)?.options.find((item) => item.optionId === decision?.optionId);
    if (option) { passC = option.semanticValue; votes.push(passC); }
  }
  const voteCounts = [];
  for (const value of votes) {
    const existing = voteCounts.find((item) => canonicalJson(item.value) === canonicalJson(value));
    if (existing) existing.votes += 1; else voteCounts.push({ value, votes: 1 });
  }
  voteCounts.sort((left, right) => right.votes - left.votes);
  const winner = voteCounts[0]?.votes >= 2 ? voteCounts[0] : null;
  const retiredExpected = retiredByKey.get(mapping.key);
  finalDecisions.push({
    auditId: comparison.auditId,
    key: mapping.key,
    debateNumber: comparison.debateNumber,
    family: mapping.family,
    caseId: mapping.caseId,
    fieldPath: mapping.fieldPath,
    retiredExpected,
    votes: { passA: comparison.passA, passB: comparison.passB, passC },
    resolved: Boolean(winner),
    finalValue: winner?.value ?? null,
    supportingVotes: winner?.votes ?? 0,
    changesRetiredExpected: Boolean(winner) && canonicalJson(winner.value) !== canonicalJson(retiredExpected)
  });
}

const structuralGates = {
  initialContextsCompleted: initial.contextsCompleted === manifest.thresholds.initialContexts,
  initialContextsValid: initial.validOutputContexts === manifest.thresholds.initialContexts,
  adjudicationContextsValid: adjudication.validOutputContexts === disagreement.adjudicationContexts.length,
  preInferenceSchemaRejections: initial.preInferenceSchemaRejections + adjudication.preInferenceSchemaRejections === 0,
  modelOutputRetries: initial.totalRetries + adjudication.totalRetries === 0,
  streamRecoveries: initial.sameRequestStreamRecoveries + adjudication.sameRequestStreamRecoveries === 0,
  scoringFields: initial.scoringFieldCount + adjudication.scoringFieldCount === 0,
  meteredApiCost: initial.meteredApiCostUsd + adjudication.meteredApiCostUsd === 0,
  transcriptionCost: initial.transcriptionCostUsd + adjudication.transcriptionCostUsd === 0
};
const semanticGates = {
  assertionCoverage: finalDecisions.length === manifest.thresholds.disputedFields,
  initialAgreement: disagreement.counts.agreements >= manifest.thresholds.initialAgreementMinimum,
  twoVoteConsensus: finalDecisions.filter((item) => item.resolved && item.supportingVotes >= 2).length === manifest.thresholds.disputedFields,
  unresolvedFields: finalDecisions.filter((item) => !item.resolved).length === 0
};
const passed = Object.values(structuralGates).every(Boolean) && Object.values(semanticGates).every(Boolean);

const { fixtures } = await loadV37Sources(root);
const v37Manifest = JSON.parse(await read(manifest.v37.manifestPath));
const expectedMap = new Map(), actualMaps = { terra: new Map(), sol: new Map() };
for (const family of V37_FAMILIES) {
  const packet = JSON.parse(await read(v37Manifest.families[family].packet));
  for (let index = 0; index < packet.cases.length; index += 1) {
    const packetCase = packet.cases[index], expected = expectedCard(family, fixtures.get(packetCase.caseId), packetCase);
    for (const assertion of semanticAssertions(family, expected)) expectedMap.set(`${family}::${packetCase.caseId}::${assertion.fieldPath}`, assertion.value);
  }
  for (const modelKey of v37Manifest.modelKeys) {
    const output = JSON.parse(await read(v37Manifest.outputs[family][modelKey]));
    for (let index = 0; index < packet.cases.length; index += 1) for (const assertion of semanticAssertions(family, output.cards[index])) actualMaps[modelKey].set(`${family}::${packet.cases[index].caseId}::${assertion.fieldPath}`, assertion.value);
  }
}
if (passed) for (const decision of finalDecisions) expectedMap.set(decision.key, decision.finalValue);

function replay(modelKey) {
  const comparisons = [...expectedMap.entries()].map(([key, expected]) => {
    const actual = actualMaps[modelKey].get(key), [family, caseId, ...fieldParts] = key.split("::");
    return { key, family, caseId, fieldPath: fieldParts.join("::"), expected, actual, matched: canonicalJson(expected) === canonicalJson(actual) };
  });
  const target = comparisons.filter((item) => item.family === "target"), nonTarget = comparisons.filter((item) => item.family !== "target"), burden = comparisons.filter((item) => item.family === "burden");
  return { assertions: comparisons.length, matches: comparisons.filter((item) => item.matched).length, targetMatches: target.filter((item) => item.matched).length, nonTargetMatches: nonTarget.filter((item) => item.matched).length, burdenMatches: burden.filter((item) => item.matched).length, mismatches: comparisons.filter((item) => !item.matched) };
}
const replayResults = { terra: replay("terra"), sol: replay("sol") };
const analysis = {
  schemaVersion: "3.7.1-gold-blind-audit-analysis",
  analyzedAt: adjudication.completedAt,
  status: passed ? "benchmark-audit-pass" : "benchmark-audit-fail",
  warning: "This AI-only calibration audit may correct a retired development key but does not establish human ground truth or production model readiness.",
  sources: { manifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), disagreementSha256: sha256(disagreementText), adjudicationExecutionSha256: sha256(adjudicationText), sealedOptionMapSha256: sha256(sealedMapText), adjudicationOptionMapSha256: sha256(adjudicationMapText) },
  results: {
    initial: disagreement.counts,
    final: { fields: finalDecisions.length, resolved: finalDecisions.filter((item) => item.resolved).length, changedFromRetired: finalDecisions.filter((item) => item.changesRetiredExpected).length, retainedFromRetired: finalDecisions.filter((item) => item.resolved && !item.changesRetiredExpected).length, decisions: finalDecisions },
    replayAgainstAuditedKey: replayResults
  },
  gates: { structural: structuralGates, semantic: semanticGates },
  passed,
  decision: {
    correctedBenchmarkKeyAuthorized: passed,
    freshRetiredSemanticComparisonPreregistrationAuthorized: passed,
    currentTerraProductionSelectionAuthorized: false,
    currentSolProductionSelectionAuthorized: false,
    heldOutAccessAuthorized: false,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.analysisPath), outputText);
console.log(outputText);
