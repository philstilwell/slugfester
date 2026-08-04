#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyCompoundField, canonicalEvidenceChoice, compoundFields, deriveDiagnostic, deriveReframe, derivedTuple,
  isDualOverrideEligible, sameSemantic, semanticValue, sha256, validateAnnotation
} from "./lib/v34-conservative-review.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;

function annotationFromReview(review) {
  return {
    caseId: review.caseId, moveId: review.moveId, originalTargetContact: review.originalTargetContact, targetEvidence: review.targetEvidence,
    connectedExample: review.connectedExample, connectionEvidence: review.connectionEvidence, scopeRelation: review.scopeRelation, scopeEvidence: review.scopeEvidence,
    burdenAdjustment: review.burdenAdjustment, burdenEvidence: review.burdenEvidence,
    componentContacts: review.componentReviews.map(({ componentId, contacted, evidence }) => ({ componentId, contacted, evidence })),
    relevantContraryMaterial: review.relevantContraryMaterial, contraryEvidence: review.contraryEvidence,
    defectType: review.defectType, defectCue: review.defectCue, consequenceStated: review.consequenceStated, consequenceCue: review.consequenceCue,
    malformedDemandExplained: review.malformedDemandExplained, malformedDemandCue: review.malformedDemandCue,
    replacementDemandStated: review.replacementDemandStated, replacementDemandCue: review.replacementDemandCue,
    burdenContact: review.burdenContact, rationale: review.rationale
  };
}

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

const rows = [], artifactAudits = [], semanticFieldRows = [];
let unresolvedFields = 0, dualOverridesApplied = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, goldText, aText, bText, terraText, solText] = await Promise.all([read(source.input.path), read(source.gold.path), read(source.passA.path), read(source.passB.path), read(outputs.reviews.terra), read(outputs.reviews.sol)]);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), passA = JSON.parse(aText), passB = JSON.parse(bText), terraArtifact = JSON.parse(terraText), solArtifact = JSON.parse(solText);
  const maps = {};
  for (const [key, values] of Object.entries({ A: passA.annotations, B: passB.annotations, K: gold.annotations, T: terraArtifact.reviews.map(annotationFromReview), S: solArtifact.reviews.map(annotationFromReview) })) maps[key] = new Map(values.map((item) => [item.caseId, item]));
  const challengeById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const [modelKey, artifact] of [["terra", terraArtifact], ["sol", solArtifact]]) {
    const findings = [];
    for (const review of artifact.reviews) {
      const challengeCase = challengeById.get(review.caseId), annotation = annotationFromReview(review), caseFindings = [];
      if (review.exampleClassification !== "none" && review.boundaryEvidence === null) caseFindings.push("validator-required-boundary-evidence-absent");
      if (!review.relevantContraryMaterial && review.contraryEvidence !== null) caseFindings.push("default-contrary-evidence-nonnull");
      if (review.relevantContraryMaterial && !review.originalTargetContact) caseFindings.push("contrary-material-without-original-target-contact");
      try { validateAnnotation(annotation, challengeCase, `${modelKey}.${review.caseId}`); } catch (error) { caseFindings.push(`base-annotation:${error.message}`); }
      if (caseFindings.length) findings.push({ caseId: review.caseId, findings: [...new Set(caseFindings)] });
    }
    artifactAudits.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, modelKey, reviewCaseCount: artifact.reviews.length, validUnderFrozenValidator: findings.length === 0, invalidCaseCount: findings.length, findings });
  }
  for (const challengeCase of input.cases) {
    const A = maps.A.get(challengeCase.caseId), B = maps.B.get(challengeCase.caseId), K = maps.K.get(challengeCase.caseId), T = maps.T.get(challengeCase.caseId), S = maps.S.get(challengeCase.caseId);
    const fieldMaps = Object.fromEntries(Object.entries({ A, B, K, T, S }).map(([key, annotation]) => [key, new Map(compoundFields(annotation))]));
    const F = structuredClone(A);
    for (const [fieldPath, aValue] of fieldMaps.A) {
      const bValue = fieldMaps.B.get(fieldPath), kValue = fieldMaps.K.get(fieldPath), tValue = fieldMaps.T.get(fieldPath), sValue = fieldMaps.S.get(fieldPath), rawAgreement = sameSemantic(fieldPath, aValue, bValue);
      let selected = aValue, disposition;
      if (!rawAgreement) {
        const matchesA = sameSemantic(fieldPath, tValue, aValue), matchesB = sameSemantic(fieldPath, tValue, bValue);
        if (matchesA !== matchesB) { selected = matchesA ? aValue : bValue; disposition = matchesA ? "terra-conflict-A" : "terra-conflict-B"; }
        else { unresolvedFields += 1; disposition = "unresolved-terra-conflict"; }
      } else {
        const tAlternative = !sameSemantic(fieldPath, tValue, aValue), sAlternative = !sameSemantic(fieldPath, sValue, aValue);
        if (isDualOverrideEligible(fieldPath) && tAlternative && sAlternative && sameSemantic(fieldPath, tValue, sValue)) {
          selected = canonicalEvidenceChoice(fieldPath, tValue, [tValue, sValue]); dualOverridesApplied += 1; disposition = "dual-confirmed-shared-override";
        } else disposition = "shared-retain";
      }
      applyCompoundField(F, fieldPath, selected);
      semanticFieldRows.push({ debateId: debate.debateId, caseId: challengeCase.caseId, fieldPath, rawAgreement, aExact: sameSemantic(fieldPath, aValue, kValue), bExact: sameSemantic(fieldPath, bValue, kValue), finalExact: sameSemantic(fieldPath, selected, kValue), disposition, goldJson: JSON.stringify(semanticValue(fieldPath, kValue)), simulatedFinalJson: JSON.stringify(semanticValue(fieldPath, selected)) });
    }
    F.rationale = "Semantic-only v3.4 postmortem simulation; not a valid or authorized classification lock.";
    let simulatedCoherenceValid = true, simulatedCoherenceError = null;
    try { validateAnnotation(F, challengeCase, `simulated.${challengeCase.caseId}`); } catch (error) { simulatedCoherenceValid = false; simulatedCoherenceError = error.message; }
    rows.push({ challengeCase, debateId: debate.debateId, A, B, K, T, S, F, simulatedCoherenceValid, simulatedCoherenceError });
  }
}

const rawPassAAccuracy = comparisonMetrics(rows, "A", "K"), rawPassBAccuracy = comparisonMetrics(rows, "B", "K"), terraReviewAccuracy = comparisonMetrics(rows, "T", "K"), solReviewAccuracy = comparisonMetrics(rows, "S", "K"), simulatedFinalAccuracy = comparisonMetrics(rows, "F", "K");
const diagnosticGoldPositive = rows.filter(({ K }) => deriveDiagnostic(K)), reframeGoldPositive = rows.filter(({ K }) => deriveReframe(K));
simulatedFinalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
simulatedFinalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));
const rawAgreements = semanticFieldRows.filter((item) => item.rawAgreement), sharedErrors = rawAgreements.filter((item) => !item.aExact), correctShared = rawAgreements.filter((item) => item.aExact), conflicts = semanticFieldRows.filter((item) => !item.rawAgreement);
const thresholds = manifest.thresholds;
const classificationGates = {
  finalOriginalTargetContactExact: simulatedFinalAccuracy.originalTargetContactExact >= thresholds.finalOriginalTargetContactExact,
  finalScopeExact: simulatedFinalAccuracy.scopeExact >= thresholds.finalScopeExact,
  finalBurdenAdjustmentExact: simulatedFinalAccuracy.burdenAdjustmentExact >= thresholds.finalBurdenAdjustmentExact,
  finalComponentContactMicroExact: simulatedFinalAccuracy.componentContactMicroExact >= thresholds.finalComponentContactMicroExact,
  finalCoverageExact: simulatedFinalAccuracy.coverageExact >= thresholds.finalCoverageExact,
  finalDefectTypeExact: simulatedFinalAccuracy.defectTypeExact >= thresholds.finalDefectTypeExact,
  finalConsequenceExact: simulatedFinalAccuracy.consequenceExact >= thresholds.finalConsequenceExact,
  finalDiagnosticExact: simulatedFinalAccuracy.diagnosticExact >= thresholds.finalDiagnosticExact,
  finalReframeExact: simulatedFinalAccuracy.reframeExact >= thresholds.finalReframeExact,
  finalBurdenRelevanceExact: simulatedFinalAccuracy.burdenRelevanceExact >= thresholds.finalBurdenRelevanceExact,
  finalExactDerivedTupleExact: simulatedFinalAccuracy.exactDerivedTupleExact >= thresholds.finalExactDerivedTupleExact,
  finalDiagnosticPositiveRecall: simulatedFinalAccuracy.diagnosticPositiveRecall >= thresholds.finalDiagnosticPositiveRecall,
  finalReframePositiveRecall: simulatedFinalAccuracy.reframePositiveRecall >= thresholds.finalReframePositiveRecall
};
const analysis = {
  schemaVersion: "3.4-failed-review-semantic-postmortem", analyzedAt: new Date().toISOString(), officialGateOutcome: "failed-before-final-lock",
  warning: "This diagnostic ignores review-artifact validation failures only to measure semantic tendencies. It is not an accepted merge, final lock, gate result, or authorization.",
  sources: { manifestSha256: sha256(manifestText) }, execution: { acceptedModelContexts: 6, modelOutputRetries: 0, preInferenceTransportRejections: manifest.preInferenceHarnessCorrection.transportAttemptsRejected, observedSameRequestStreamRecoveries: 1, unresolvedFields, dualOverridesApplied },
  artifactValidation: { artifactCount: artifactAudits.length, validArtifactCount: artifactAudits.filter((item) => item.validUnderFrozenValidator).length, invalidArtifactCount: artifactAudits.filter((item) => !item.validUnderFrozenValidator).length, artifacts: artifactAudits },
  semanticMonitoring: { rawPassAAccuracy, rawPassBAccuracy, terraReviewAccuracy, solReviewAccuracy, simulatedFinalAccuracy, simulatedCoherentCaseCount: rows.filter((item) => item.simulatedCoherenceValid).length, simulatedIncoherentCases: rows.filter((item) => !item.simulatedCoherenceValid).map((item) => ({ debateId: item.debateId, caseId: item.challengeCase.caseId, error: item.simulatedCoherenceError })) },
  reliability: {
    rawAgreementCount: rawAgreements.length, sharedRawErrorCount: sharedErrors.length,
    sharedRawErrorsCorrected: sharedErrors.filter((item) => item.finalExact).length,
    correctedSharedErrors: sharedErrors.filter((item) => item.finalExact).map(({ debateId, caseId, fieldPath, disposition, simulatedFinalJson, goldJson }) => ({ debateId, caseId, fieldPath, disposition, simulatedFinalJson, goldJson })),
    correctSharedRawValuesHarmed: correctShared.filter((item) => !item.finalExact).length,
    harmedCorrectSharedValues: correctShared.filter((item) => !item.finalExact).map(({ debateId, caseId, fieldPath, disposition, simulatedFinalJson, goldJson }) => ({ debateId, caseId, fieldPath, disposition, simulatedFinalJson, goldJson })),
    conflictCount: conflicts.length, conflictsCorrect: conflicts.filter((item) => item.finalExact).length, conflictAccuracy: mean(conflicts.map((item) => item.finalExact)),
    unresolvedConflicts: conflicts.filter((item) => item.disposition === "unresolved-terra-conflict").map(({ debateId, caseId, fieldPath, simulatedFinalJson, goldJson }) => ({ debateId, caseId, fieldPath, simulatedFinalJson, goldJson }))
  },
  classificationGates, simulatedClassificationThresholdsPassed: Object.values(classificationGates).every(Boolean),
  decision: { officialPassed: false, disjointRetiredConfirmationAuthorized: false, heldOutAccessAuthorized: false, numericalScoringAuthorized: false, productionMutationAuthorized: false }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${gateRoot}/semantic-only-postmortem.json`), outputText);
console.log(outputText);
