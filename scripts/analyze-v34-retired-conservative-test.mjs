#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, sameSemantic, semanticValue, sha256, validateReviewArtifact
} from "./lib/v34-conservative-review.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test", shouldWrite = process.argv.includes("--write");
const manifestPath = `${gateRoot}/gate-manifest.json`, outputPath = `${gateRoot}/reliability-analysis.json`, reportPath = `${gateRoot}/workflow-assessment.md`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath), manifest = JSON.parse(manifestText);
const [workflowText, rubricText, manualText, schemaText] = await Promise.all([read("docs/assessment-workflow-v3.4.md"), read("docs/reassessment-rubric-v3.4.md"), read(`${gateRoot}/review-manual.md`), read(`${gateRoot}/review-schema.json`)]);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;

function comparisonMetrics(rows, leftKey, rightKey) {
  const componentPairs = rows.flatMap(({ [leftKey]: left, [rightKey]: right }) => left.componentContacts.map((item, index) => [item.contacted, right.componentContacts[index].contacted]));
  const exact = (selector) => mean(rows.map((row) => selector(row[leftKey], row.challengeCase) === selector(row[rightKey], row.challengeCase)));
  return {
    originalTargetContactExact: exact((item) => item.originalTargetContact), connectedExampleExact: exact((item) => item.connectedExample), scopeExact: exact((item) => item.scopeRelation), burdenAdjustmentExact: exact((item) => item.burdenAdjustment),
    componentContactMicroExact: mean(componentPairs.map(([left, right]) => left === right)), coverageExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).coverage),
    defectTypeExact: exact((item) => item.defectType), consequenceExact: exact((item) => item.consequenceStated), diagnosticExact: exact(deriveDiagnostic), reframeExact: exact(deriveReframe),
    burdenRelevanceExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).burdenRelevance), exactDerivedTupleExact: exact((item, challengeCase) => JSON.stringify(derivedTuple(challengeCase, item)))
  };
}

const rows = [], stats = [];
let semanticFieldCount = 0, mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, goldText, passAText, passBText, packetText, terraText, solText, lockText] = await Promise.all([read(source.input.path), read(source.gold.path), read(source.passA.path), read(source.passB.path), read(outputs.reviewPacket), read(outputs.reviews.terra), read(outputs.reviews.sol), read(outputs.finalLock)]);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), passA = JSON.parse(passAText), passB = JSON.parse(passBText), packet = JSON.parse(packetText), lock = JSON.parse(lockText);
  const sourceTexts = { packetSha256: packetText, workflowSha256: workflowText, rubricSha256: rubricText, manualSha256: manualText, schemaSha256: schemaText };
  const terra = validateReviewArtifact(JSON.parse(terraText), packet, "terra", sourceTexts), sol = validateReviewArtifact(JSON.parse(solText), packet, "sol", sourceTexts);
  const maps = Object.fromEntries(Object.entries({ A: passA.annotations, B: passB.annotations, K: gold.annotations, T: terra, S: sol, F: lock.cases.map((item) => item.annotation) }).map(([key, values]) => [key, new Map(values.map((item) => [item.caseId, item]))]));
  for (const challengeCase of input.cases) rows.push({ challengeCase, debateId: debate.debateId, lane: debate.lane, ...Object.fromEntries(Object.entries(maps).map(([key, map]) => [key, map.get(challengeCase.caseId)])) });
  semanticFieldCount += input.cases.reduce((sum, item) => sum + compoundFields(maps.A.get(item.caseId)).length, 0);
  mediumOrLowMoveCount += source.sourceAudit.mediumOrLowMoveCount; audioVerifiedMediumOrLowMoveCount += source.sourceAudit.audioVerifiedMediumOrLowMoveCount;
  stats.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, role: debate.role, ...lock.audit, finalLockSha256: sha256(lockText) });
}

const rawPassAAccuracy = comparisonMetrics(rows, "A", "K"), rawPassBAccuracy = comparisonMetrics(rows, "B", "K"), terraReviewAccuracy = comparisonMetrics(rows, "T", "K"), solReviewAccuracy = comparisonMetrics(rows, "S", "K"), finalAccuracy = comparisonMetrics(rows, "F", "K"), crossModelReviewAgreement = comparisonMetrics(rows, "T", "S");
const diagnosticGoldPositive = rows.filter(({ K }) => deriveDiagnostic(K)), reframeGoldPositive = rows.filter(({ K }) => deriveReframe(K));
finalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
finalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));

const semanticRows = rows.flatMap((row) => {
  const maps = Object.fromEntries(["A", "B", "K", "T", "S", "F"].map((key) => [key, new Map(compoundFields(row[key]))]));
  return [...maps.A].map(([fieldPath, aValue]) => {
    const values = Object.fromEntries(["B", "K", "T", "S", "F"].map((key) => [key, maps[key].get(fieldPath)]));
    return { debateId: row.debateId, caseId: row.challengeCase.caseId, fieldPath, rawAgreement: sameSemantic(fieldPath, aValue, values.B), aExact: sameSemantic(fieldPath, aValue, values.K), bExact: sameSemantic(fieldPath, values.B, values.K), terraExact: sameSemantic(fieldPath, values.T, values.K), solExact: sameSemantic(fieldPath, values.S, values.K), finalExact: sameSemantic(fieldPath, values.F, values.K), finalJson: JSON.stringify(semanticValue(fieldPath, values.F)), goldJson: JSON.stringify(semanticValue(fieldPath, values.K)) };
  });
});
const rawAgreements = semanticRows.filter((item) => item.rawAgreement), sharedErrors = rawAgreements.filter((item) => !item.aExact), correctShared = rawAgreements.filter((item) => item.aExact), conflicts = semanticRows.filter((item) => !item.rawAgreement);
const totals = (key) => stats.reduce((sum, item) => sum + item[key], 0);
const execution = {
  unresolvedFields: totals("unresolvedFields"), dualOverridesApplied: totals("dualOverridesApplied"), unilateralSharedOverridesApplied: totals("unilateralSharedOverridesApplied"),
  unilateralOverrideAttemptsRejected: totals("unilateralOverrideAttemptsRejected"), ineligibleConvergencesRejected: totals("ineligibleConvergencesRejected"), invalidDualOverrides: totals("invalidDualOverrides"),
  coherenceFallbackCases: totals("coherenceFallbackCases"), modelSchemaOrInvariantRetries: totals("modelSchemaOrInvariantRetries"), contextsExecuted: manifest.models.plannedContexts
};
const thresholds = manifest.thresholds;
const gates = {
  finalOriginalTargetContactExact: finalAccuracy.originalTargetContactExact >= thresholds.finalOriginalTargetContactExact,
  finalScopeExact: finalAccuracy.scopeExact >= thresholds.finalScopeExact,
  finalBurdenAdjustmentExact: finalAccuracy.burdenAdjustmentExact >= thresholds.finalBurdenAdjustmentExact,
  finalComponentContactMicroExact: finalAccuracy.componentContactMicroExact >= thresholds.finalComponentContactMicroExact,
  finalCoverageExact: finalAccuracy.coverageExact >= thresholds.finalCoverageExact,
  finalDefectTypeExact: finalAccuracy.defectTypeExact >= thresholds.finalDefectTypeExact,
  finalConsequenceExact: finalAccuracy.consequenceExact >= thresholds.finalConsequenceExact,
  finalDiagnosticExact: finalAccuracy.diagnosticExact >= thresholds.finalDiagnosticExact,
  finalReframeExact: finalAccuracy.reframeExact >= thresholds.finalReframeExact,
  finalBurdenRelevanceExact: finalAccuracy.burdenRelevanceExact >= thresholds.finalBurdenRelevanceExact,
  finalExactDerivedTupleExact: finalAccuracy.exactDerivedTupleExact >= thresholds.finalExactDerivedTupleExact,
  finalDiagnosticPositiveRecall: finalAccuracy.diagnosticPositiveRecall >= thresholds.finalDiagnosticPositiveRecall,
  finalReframePositiveRecall: finalAccuracy.reframePositiveRecall >= thresholds.finalReframePositiveRecall,
  unresolvedFields: execution.unresolvedFields <= thresholds.unresolvedFieldsMaximum,
  unilateralSharedOverrides: execution.unilateralSharedOverridesApplied <= thresholds.unilateralSharedOverridesMaximum,
  invalidDualOverrides: execution.invalidDualOverrides <= thresholds.invalidDualOverridesMaximum,
  modelSchemaOrInvariantRetries: execution.modelSchemaOrInvariantRetries <= thresholds.modelSchemaOrInvariantRetriesMaximum,
  mediumLowAudioVerificationRate: (mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1) >= thresholds.mediumLowAudioVerificationRate
};
const passed = Object.values(gates).every(Boolean);
const analysis = {
  schemaVersion: "3.4-retired-conservative-analysis", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion, analyzedAt: new Date().toISOString(),
  sources: { manifestPath, manifestSha256: sha256(manifestText) }, sample: { debateCount: manifest.sample.debateCount, caseCount: rows.length, semanticFieldCount },
  rawPassAAccuracy, rawPassBAccuracy, reviewerMonitoring: { terraReviewAccuracy, solReviewAccuracy, crossModelReviewAgreement }, finalAccuracy,
  semanticReliability: {
    rawAgreementCount: rawAgreements.length, sharedRawErrorCount: sharedErrors.length, sharedRawErrorsCorrected: sharedErrors.filter((item) => item.finalExact).length,
    sharedRawErrorCorrectionRate: mean(sharedErrors.map((item) => item.finalExact)), correctSharedRawCount: correctShared.length, correctSharedRawValuesHarmed: correctShared.filter((item) => !item.finalExact).length,
    semanticConflictCount: conflicts.length, conflictsWithCorrectCandidate: conflicts.filter((item) => item.aExact || item.bExact).length, finalCorrectOnConflicts: conflicts.filter((item) => item.finalExact).length,
    finalConflictAccuracy: mean(conflicts.map((item) => item.finalExact)), dualOverridesCorrect: sharedErrors.filter((item) => item.finalExact).length, dualOverridesIncorrect: correctShared.filter((item) => !item.finalExact).length
  },
  execution, debates: stats, sourceGate: { mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, audioVerificationRate: mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1 }, thresholds, gates,
  decision: { passed, retiredDevelopmentTestPassed: passed, disjointRetiredConfirmationAuthorized: passed, heldOutGatePreregistrationAuthorized: false, heldOutTranscriptsAuthorized: false, numericalScoringAuthorized: false, productionMutationAuthorized: false, nextStep: passed ? "Preregister and run one disjoint retired confirmation of the unchanged v3.4 architecture; do not open held-out material yet." : "Freeze v3.4 as failed; do not open held-out material, score participants, or mutate production debates." }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
const pct = (value) => `${(100 * value).toFixed(1)}%`;
const failedGates = Object.entries(gates).filter(([, value]) => !value).map(([key]) => key);
const report = `# v3.4 retired conservative dual-confirmation assessment\n\n## Outcome\n\n${passed ? "**PASS.** The v3.4 retired-development test met every frozen classification and operational gate." : "**FAIL.** The v3.4 retired-development test did not meet every frozen classification and operational gate."}\n\nThis was a classification-only test on the same 13 retired cases. It executed six new isolated reviews, reused the frozen local transcript/audio chain, incurred no metered API charge, and produced no participant-performance scores or assessment prose.\n\n## Final accuracy\n\n- Target contact: ${pct(finalAccuracy.originalTargetContactExact)}\n- Scope: ${pct(finalAccuracy.scopeExact)}\n- Component contact: ${pct(finalAccuracy.componentContactMicroExact)}\n- Coverage: ${pct(finalAccuracy.coverageExact)}\n- Defect type: ${pct(finalAccuracy.defectTypeExact)}\n- Consequence: ${pct(finalAccuracy.consequenceExact)}\n- Diagnostic: ${pct(finalAccuracy.diagnosticExact)}\n- Reframe: ${pct(finalAccuracy.reframeExact)}\n- Burden relevance: ${pct(finalAccuracy.burdenRelevanceExact)}\n- Exact derived tuple: ${pct(finalAccuracy.exactDerivedTupleExact)}\n- Diagnostic positive recall: ${pct(finalAccuracy.diagnosticPositiveRecall)}\n- Reframe positive recall: ${pct(finalAccuracy.reframePositiveRecall)}\n\n## Conservative-policy behavior\n\nThe workflow corrected ${analysis.semanticReliability.sharedRawErrorsCorrected} of ${sharedErrors.length} shared raw errors while harming ${analysis.semanticReliability.correctSharedRawValuesHarmed} of ${correctShared.length} initially correct shared values. It resolved ${conflicts.length} raw conflicts with ${pct(analysis.semanticReliability.finalConflictAccuracy)} gold accuracy. ${execution.dualOverridesApplied} shared fields received dual-confirmed overrides; ${execution.unilateralOverrideAttemptsRejected} unilateral attempts were rejected. Unresolved fields: ${execution.unresolvedFields}. Schema or invariant retries: ${execution.modelSchemaOrInvariantRetries}.\n\n## Gate failures\n\n${failedGates.length ? failedGates.map((item) => `- ${item}`).join("\n") : "None."}\n\n## Recommendation\n\n${analysis.decision.nextStep}\n`;
if (shouldWrite) { await writeFile(path.resolve(root, outputPath), outputText); await writeFile(path.resolve(root, reportPath), report); }
console.log(outputText);
