#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V34_ALLOWED_INPUTS, V34_MODELS, V34_RUBRIC, V34_WORKFLOW, assert, canonicalJson, compoundFields,
  isDualOverrideEligible, sameSemantic, semanticValue, sha256
} from "./lib/v34-conservative-review.mjs";

const root = process.cwd();
const priorRoot = "docs/calibration/v3.2/retired-three-debate-test";
const gateRoot = "docs/calibration/v3.4/retired-three-debate-test";
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const frozenAt = valueAfter("--frozen-at", new Date().toISOString());
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO date-time");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const writeJson = async (file, value) => {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(path.dirname(path.resolve(root, file)), { recursive: true });
  await writeFile(path.resolve(root, file), text);
  return text;
};

const span = { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["startChar", "endChar", "text"], properties: { startChar: { type: "integer" }, endChar: { type: "integer" }, text: { type: "string" } } }] };
const componentReview = {
  type: "object", additionalProperties: false, required: ["componentId", "contacted", "evidence", "contactMode", "licenseText"],
  properties: { componentId: { type: "string" }, contacted: { type: "boolean" }, evidence: span, contactMode: { type: "string", enum: ["none", "exact-proposition", "explicit-global-assent", "denial", "restriction", "distinction", "explanation", "warrant-challenge"] }, licenseText: span }
};
const burdenContact = {
  type: "object", additionalProperties: false, required: ["tier", "bridgeId", "evidence"],
  properties: { tier: { type: "string", enum: ["none", "subsidiary", "central", "motion"] }, bridgeId: { type: ["string", "null"] }, evidence: span }
};
const reviewRequired = [
  "caseId", "moveId", "originalTargetContact", "targetEvidence", "connectedExample", "connectionEvidence", "exampleClassification", "boundaryEvidence",
  "scopeRelation", "scopeEvidence", "burdenAdjustment", "burdenEvidence", "componentReviews", "relevantContraryMaterial", "contraryEvidence", "contraryClassification",
  "defectCuePresent", "defectType", "defectCue", "consequenceCuePresent", "consequenceStated", "consequenceCue", "consequenceClauseDistinct",
  "malformedDemandExplained", "malformedDemandCue", "replacementDemandStated", "replacementDemandCue", "burdenContact", "rationale"
];
const caseReview = {
  type: "object", additionalProperties: false, required: reviewRequired,
  properties: {
    caseId: { type: "string" }, moveId: { type: "string" }, originalTargetContact: { type: "boolean" }, targetEvidence: span,
    connectedExample: { type: "boolean" }, connectionEvidence: span, exampleClassification: { type: "string", enum: ["none", "inside-locked-target", "distinct-connected-example"] }, boundaryEvidence: span,
    scopeRelation: { type: "string", enum: ["same", "narrowed", "strengthened", "modality-shift"] }, scopeEvidence: span,
    burdenAdjustment: { type: "string", enum: ["retained", "reassigned", "replaced"] }, burdenEvidence: span,
    componentReviews: { type: "array", items: componentReview }, relevantContraryMaterial: { type: "boolean" }, contraryEvidence: span,
    contraryClassification: { type: "string", enum: ["none", "component-contact-precludes-contrary", "relevant-no-component"] },
    defectCuePresent: { type: "boolean" }, defectType: { type: "string", enum: ["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"] }, defectCue: span,
    consequenceCuePresent: { type: "boolean" }, consequenceStated: { type: "boolean" }, consequenceCue: span, consequenceClauseDistinct: { type: "boolean" },
    malformedDemandExplained: { type: "boolean" }, malformedDemandCue: span, replacementDemandStated: { type: "boolean" }, replacementDemandCue: span,
    burdenContact, rationale: { type: "string" }
  }
};
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "slugfester-v3.4-isolated-review", type: "object", additionalProperties: false,
  required: ["schemaVersion", "workflowVersion", "rubricVersion", "reviewerKey", "model", "calibrationOnly", "completedAt", "isolation", "source", "reviews", "audit"],
  properties: {
    schemaVersion: { type: "string", const: "3.4-isolated-review" }, workflowVersion: { type: "string", const: V34_WORKFLOW }, rubricVersion: { type: "string", const: V34_RUBRIC },
    reviewerKey: { type: "string", enum: Object.keys(V34_MODELS) }, model: { type: "string", enum: Object.values(V34_MODELS) }, calibrationOnly: { type: "boolean", const: true }, completedAt: { type: "string" },
    isolation: { type: "object", additionalProperties: false, required: ["method", "allowedInputs", "rawValuesUnavailable", "agreementStatusUnavailable", "goldUnavailable", "scoresUnavailable", "legacyMaterialUnavailable", "statement"], properties: { method: { type: "string", const: "fresh-ephemeral-v3.4-review" }, allowedInputs: { type: "array", items: { type: "string" } }, rawValuesUnavailable: { type: "boolean", const: true }, agreementStatusUnavailable: { type: "boolean", const: true }, goldUnavailable: { type: "boolean", const: true }, scoresUnavailable: { type: "boolean", const: true }, legacyMaterialUnavailable: { type: "boolean", const: true }, statement: { type: "string" } } },
    source: { type: "object", additionalProperties: false, required: ["packetPath", "packetSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], properties: { packetPath: { type: "string", const: "review-packet.json" }, packetSha256: { type: "string" }, workflowSha256: { type: "string" }, rubricSha256: { type: "string" }, manualSha256: { type: "string" }, schemaSha256: { type: "string" } } },
    reviews: { type: "array", items: caseReview },
    audit: { type: "object", additionalProperties: false, required: ["caseCount", "allCasesReviewedOnce", "componentSetErrors", "evidenceErrors", "stagedDiagnosticErrors", "boundaryErrors", "derivedFieldsPresent", "scoreFieldsPresent"], properties: { caseCount: { type: "integer" }, allCasesReviewedOnce: { type: "boolean", const: true }, componentSetErrors: { type: "integer", const: 0 }, evidenceErrors: { type: "integer", const: 0 }, stagedDiagnosticErrors: { type: "integer", const: 0 }, boundaryErrors: { type: "integer", const: 0 }, derivedFieldsPresent: { type: "boolean", const: false }, scoreFieldsPresent: { type: "boolean", const: false } } }
  }
};
const schemaPath = `${gateRoot}/review-schema.json`;
const schemaText = await writeJson(schemaPath, schema);

const priorManifestText = await read(`${priorRoot}/gate-manifest.json`);
const priorManifest = JSON.parse(priorManifestText);
for (const [file, digest] of Object.entries(priorManifest.sourceHashes)) assert(sha256(await read(file)) === digest, `v3.2 frozen source changed: ${file}`);

const outputs = {}, debates = [], retrospectiveRows = [];
let totalCases = 0, totalFields = 0, rawAgreementCount = 0, rawConflictCount = 0, sharedErrorCount = 0, sharedComponentErrorCount = 0, componentCount = 0;
for (const priorDebate of priorManifest.sample.debates) {
  const priorOutputs = priorManifest.outputs[priorDebate.debateId];
  const [inputText, goldText, auditText, passAText, passBText] = await Promise.all([read(priorDebate.path), read(priorDebate.gold.path), read(priorDebate.sourceAudit.path), read(priorOutputs.passA), read(priorOutputs.passB)]);
  assert(sha256(inputText) === priorDebate.sha256 && sha256(goldText) === priorDebate.gold.sha256 && sha256(auditText) === priorDebate.sourceAudit.sha256, `${priorDebate.debateId}: frozen source chain mismatch`);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), passA = JSON.parse(passAText), passB = JSON.parse(passBText);
  const packet = {
    schemaVersion: "3.4-blind-review-packet", workflowVersion: V34_WORKFLOW, rubricVersion: V34_RUBRIC,
    debateId: input.debateId, debateNumber: input.debateNumber, calibrationOnly: true,
    blindness: { rawValuesAbsent: true, rawModelIdentitiesAbsent: true, agreementStatusAbsent: true, goldAbsent: true, scoresAbsent: true, legacyMaterialAbsent: true },
    cases: input.cases, caseCount: input.caseCount
  };
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item])), bById = new Map(passB.annotations.map((item) => [item.caseId, item])), kById = new Map(gold.annotations.map((item) => [item.caseId, item]));
  const fields = [];
  for (const challengeCase of input.cases) {
    const fieldsB = new Map(compoundFields(bById.get(challengeCase.caseId))), fieldsK = new Map(compoundFields(kById.get(challengeCase.caseId)));
    for (const [fieldPath, candidateA] of compoundFields(aById.get(challengeCase.caseId))) {
      const candidateB = fieldsB.get(fieldPath), goldValue = fieldsK.get(fieldPath), rawAgreement = sameSemantic(fieldPath, candidateA, candidateB), aGold = sameSemantic(fieldPath, candidateA, goldValue), bGold = sameSemantic(fieldPath, candidateB, goldValue);
      fields.push({ caseId: challengeCase.caseId, fieldPath, rawAgreement, dualOverrideEligible: isDualOverrideEligible(fieldPath), candidateACompoundJson: canonicalJson(candidateA), candidateASemanticJson: canonicalJson(semanticValue(fieldPath, candidateA)), candidateBCompoundJson: canonicalJson(candidateB), candidateBSemanticJson: canonicalJson(semanticValue(fieldPath, candidateB)) });
      retrospectiveRows.push({ debateId: input.debateId, caseId: challengeCase.caseId, fieldPath, rawAgreement, aGold, bGold });
      totalFields += 1;
      if (fieldPath.startsWith("componentContact.")) componentCount += 1;
      if (rawAgreement) {
        rawAgreementCount += 1;
        if (!aGold) { sharedErrorCount += 1; if (fieldPath.startsWith("componentContact.")) sharedComponentErrorCount += 1; }
      } else rawConflictCount += 1;
    }
  }
  const seal = { schemaVersion: "3.4-hidden-raw-field-seal", debateId: input.debateId, debateNumber: input.debateNumber, modelVisible: false, fields, fieldCount: fields.length };
  const packetPath = `${gateRoot}/review-packets/${input.debateId}.json`, sealPath = `${gateRoot}/raw-field-seals/${input.debateId}.json`;
  const packetText = await writeJson(packetPath, packet), sealText = await writeJson(sealPath, seal);
  outputs[input.debateId] = {
    reviewPacket: packetPath, rawFieldSeal: sealPath,
    reviews: Object.fromEntries(Object.keys(V34_MODELS).map((key) => [key, `${gateRoot}/reviews/${key}/${input.debateId}.json`])),
    finalLock: `${gateRoot}/final-locks/${input.debateId}.json`
  };
  debates.push({
    debateNumber: input.debateNumber, debateId: input.debateId, lane: priorDebate.lane, role: priorDebate.role, caseCount: input.caseCount,
    v32: { input: { path: priorDebate.path, sha256: sha256(inputText) }, gold: { path: priorDebate.gold.path, sha256: sha256(goldText) }, sourceAudit: { path: priorDebate.sourceAudit.path, sha256: sha256(auditText), mediumOrLowMoveCount: priorDebate.sourceAudit.mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount: priorDebate.sourceAudit.audioVerifiedMediumOrLowMoveCount }, passA: { path: priorOutputs.passA, sha256: sha256(passAText), model: "5.6 Terra" }, passB: { path: priorOutputs.passB, sha256: sha256(passBText), model: "5.6 Sol" } },
    reviewPacket: { path: packetPath, sha256: sha256(packetText), caseCount: packet.caseCount }, rawFieldSeal: { path: sealPath, sha256: sha256(sealText), fieldCount: fields.length }
  });
  totalCases += input.caseCount;
}

const sharedLockedComponentCeiling = (componentCount - sharedComponentErrorCount) / componentCount;
const retrospective = {
  schemaVersion: "3.4-retrospective-feasibility", computedBeforeModelReviews: true, modelVisible: false,
  semanticFieldCount: totalFields, rawAgreementCount, rawConflictCount, sharedRawErrorCount: sharedErrorCount,
  componentFieldCount: componentCount, sharedComponentErrorCount, sharedLockedComponentCeiling,
  frozenComponentThreshold: priorManifest.thresholds.finalComponentContactMicroExact,
  allSharedValuesLockedWouldBeReachable: sharedLockedComponentCeiling >= priorManifest.thresholds.finalComponentContactMicroExact,
  conclusion: "A default shared lock cannot reach the frozen component threshold; a conservative dual-confirmation exception is required for a meaningful test."
};
const retrospectivePath = `${gateRoot}/retrospective-feasibility.json`;
const retrospectiveText = await writeJson(retrospectivePath, retrospective);
assert(retrospective.allSharedValuesLockedWouldBeReachable === false, "retrospective fixture unexpectedly permits an all-shared lock");
const preflightPath = `${gateRoot}/preflight-schema-rejection.json`;
const preflightText = await read(preflightPath);

const sourcePaths = [
  "docs/assessment-workflow-v3.4.md", "docs/reassessment-rubric-v3.4.md", `${gateRoot}/review-manual.md`, schemaPath,
  "scripts/lib/v34-conservative-review.mjs", "scripts/build-v34-retired-conservative-test.mjs", "scripts/test-v34-conservative-review.mjs",
  "scripts/validate-v34-isolated-review.mjs", "scripts/merge-v34-conservative-locks.mjs", "scripts/analyze-v34-retired-conservative-test.mjs",
  "scripts/validate-v34-retired-conservative-test.mjs", "scripts/run-v34-retired-conservative-test.mjs"
];
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await read(file));
const manifest = {
  schemaVersion: "3.4-retired-conservative-gate-manifest", gateId: "v3.4-retired-three-debate-conservative-dual-confirmation", status: "frozen-before-v3.4-reviews", frozenAt,
  calibrationOnly: true, rawPassesReusedWithoutRerun: true, heldOutTranscriptsOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false,
  workflowVersion: V34_WORKFLOW, rubricVersion: V34_RUBRIC,
  models: { reviewers: V34_MODELS, reasoningEffort: "Extra High", contextsPerDebate: 2, plannedContexts: debates.length * 2 },
  architecture: { completeBlindReviews: true, rawComparisonModelVisible: false, terraLeadingConflictArbiter: true, solConflictOverrideAllowed: false, sharedRetainedByDefault: true, dualConfirmationRequiredForSharedOverride: true, fragileSharedFieldsEligible: true, burdenSharedFieldsEligible: false, modelSchemaOrInvariantRetriesMaximum: 0, scoresBeforeFinalLockProhibited: true },
  sample: { selectionInheritedFromFrozenV32: true, allDebatesRetired: true, debateCount: debates.length, caseCount: totalCases, semanticFieldCount: totalFields, debates },
  thresholds: { ...priorManifest.thresholds, unresolvedFieldsMaximum: 0, unilateralSharedOverridesMaximum: 0, invalidDualOverridesMaximum: 0, modelSchemaOrInvariantRetriesMaximum: 0 },
  stopRule: { ifPasses: "authorize-one-disjoint-retired-confirmation-only", ifFails: "stop-without-held-out-access-or-scoring" },
  isolation: { allowedInputs: V34_ALLOWED_INPUTS, prohibitedInputs: ["raw values", "raw model identities", "agreement/conflict flags", "raw field seals", "gold keys", "legacy assessments", "numerical scores", "Overall Commentary", "AI Extension", "production debate objects"] },
  priorV32: { manifestPath: `${priorRoot}/gate-manifest.json`, manifestSha256: sha256(priorManifestText) },
  retrospectiveFixture: { path: retrospectivePath, sha256: sha256(retrospectiveText) },
  preInferenceHarnessCorrection: { path: preflightPath, sha256: sha256(preflightText), transportAttemptsRejected: 6, modelInferencesCompleted: 0, reviewOutputsProduced: 0 },
  dryFixtureResultPath: `${gateRoot}/dry-fixture-results.json`, executionResultPath: `${gateRoot}/model-execution.json`, outputs, sourceHashes, schemaSha256: sha256(schemaText)
};
const manifestText = await writeJson(`${gateRoot}/gate-manifest.json`, manifest);
console.log(JSON.stringify({ status: "frozen", gateId: manifest.gateId, frozenAt, debateCount: debates.length, caseCount: totalCases, semanticFieldCount: totalFields, plannedModelContexts: manifest.models.plannedContexts, sharedLockedComponentCeiling, manifestSha256: sha256(manifestText) }, null, 2));
