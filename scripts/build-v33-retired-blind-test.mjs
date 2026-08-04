#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V33_ALLOWED_INPUTS, V33_MODELS, V33_RUBRIC, V33_WORKFLOW, assert, bundleKind,
  canonicalJson, decisionPacket, routedFields, semanticValue, sha256
} from "./lib/v33-blind-bundles.mjs";

const root = process.cwd();
const priorRoot = "docs/calibration/v3.2/retired-three-debate-test";
const gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};
const frozenAt = valueAfter("--frozen-at", new Date().toISOString());
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO date-time");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const writeJson = async (file, value) => {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(path.dirname(path.resolve(root, file)), { recursive: true });
  await writeFile(path.resolve(root, file), text);
  return text;
};

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v3.3-blind-bundle-adjudication",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "isolationStatement", "bundles", "audit"],
  properties: {
    schemaVersion: { type: "string", enum: ["3.3-blind-bundle-adjudication"] },
    workflowVersion: { type: "string", enum: [V33_WORKFLOW] },
    rubricVersion: { type: "string", enum: [V33_RUBRIC] },
    model: { type: "string", enum: Object.values(V33_MODELS) },
    debateId: { type: "string" }, debateNumber: { type: "string" }, isolationStatement: { type: "string" },
    bundles: {
      type: "array", items: {
        type: "object", additionalProperties: false, required: ["bundleId", "decisions"],
        properties: {
          bundleId: { type: "string" }, decisions: {
            type: "array", items: {
              type: "object", additionalProperties: false,
              required: ["decisionId", "fieldPath", "semanticJson", "evidenceText", "rationale"],
              properties: {
                decisionId: { type: "string" }, fieldPath: { type: "string" }, semanticJson: { type: "string" },
                evidenceText: { anyOf: [{ type: "string" }, { type: "null" }] }, rationale: { type: "string" }
              }
            }
          }
        }
      }
    },
    audit: {
      type: "object", additionalProperties: false,
      required: ["bundleCount", "decisionCount", "allDecisionsMadeOnce", "candidateDataSeen", "scoresSeen"],
      properties: {
        bundleCount: { type: "integer" }, decisionCount: { type: "integer" },
        allDecisionsMadeOnce: { type: "boolean" }, candidateDataSeen: { type: "boolean" }, scoresSeen: { type: "boolean" }
      }
    }
  }
};
const schemaPath = `${gateRoot}/blind-adjudication-schema.json`;
const schemaText = await writeJson(schemaPath, schema);

const priorManifestText = await read(`${priorRoot}/gate-manifest.json`);
const priorManifest = JSON.parse(priorManifestText);
for (const [file, digest] of Object.entries(priorManifest.sourceHashes)) assert(sha256(await read(file)) === digest, `v3.2 frozen source changed: ${file}`);

const outputs = {}, debates = [];
let globalFieldOrdinal = 0, totalBundleCount = 0, totalDecisionCount = 0, xFromA = 0, xFromB = 0;
for (const priorDebate of priorManifest.sample.debates) {
  const priorOutputs = priorManifest.outputs[priorDebate.debateId];
  const [inputText, goldText, sourceAuditText, passAText, passBText] = await Promise.all([
    read(priorDebate.path), read(priorDebate.gold.path), read(priorDebate.sourceAudit.path), read(priorOutputs.passA), read(priorOutputs.passB)
  ]);
  assert(sha256(inputText) === priorDebate.sha256 && sha256(goldText) === priorDebate.gold.sha256 && sha256(sourceAuditText) === priorDebate.sourceAudit.sha256, `${priorDebate.debateId}: v3.2 frozen chain mismatch`);
  const input = JSON.parse(inputText), passA = JSON.parse(passAText), passB = JSON.parse(passBText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  const packetCases = [], bundles = [], sealFields = [];
  for (const challengeCase of input.cases) {
    packetCases.push({ caseId: challengeCase.caseId, lockedCase: challengeCase });
    const routed = routedFields(challengeCase, aById.get(challengeCase.caseId), bById.get(challengeCase.caseId));
    const grouped = new Map();
    for (const item of routed) {
      const kind = bundleKind(item.fieldPath);
      if (!grouped.has(kind)) grouped.set(kind, []);
      const decision = decisionPacket(item.fieldPath, challengeCase, globalFieldOrdinal);
      grouped.get(kind).push(decision);
      const xIsA = globalFieldOrdinal % 2 === 0;
      if (xIsA) xFromA += 1; else xFromB += 1;
      sealFields.push({
        decisionId: decision.decisionId, caseId: challengeCase.caseId, fieldPath: item.fieldPath, ordinal: globalFieldOrdinal,
        rawAgreement: !item.conflict,
        X: { rawPass: xIsA ? "A" : "B", model: xIsA ? "5.6 Terra" : "5.6 Sol", compoundJson: canonicalJson(xIsA ? item.candidateA : item.candidateB), semanticJson: canonicalJson(semanticValue(item.fieldPath, xIsA ? item.candidateA : item.candidateB)) },
        Y: { rawPass: xIsA ? "B" : "A", model: xIsA ? "5.6 Sol" : "5.6 Terra", compoundJson: canonicalJson(xIsA ? item.candidateB : item.candidateA), semanticJson: canonicalJson(semanticValue(item.fieldPath, xIsA ? item.candidateB : item.candidateA)) }
      });
      globalFieldOrdinal += 1;
    }
    for (const kind of ["targeting-coverage", "diagnostic", "reframe", "burden-adjustment", "burden-contact"]) {
      if (!grouped.has(kind)) continue;
      bundles.push({ bundleId: `${challengeCase.caseId}::${kind}`, caseId: challengeCase.caseId, kind, decisions: grouped.get(kind) });
    }
  }
  const packet = {
    schemaVersion: "3.3-blind-bundle-packet", workflowVersion: V33_WORKFLOW, rubricVersion: V33_RUBRIC,
    debateId: priorDebate.debateId, debateNumber: priorDebate.debateNumber, calibrationOnly: true,
    blindness: { candidateValuesAbsent: true, rawModelIdentitiesAbsent: true, agreementStatusAbsent: true, goldAbsent: true, scoresAbsent: true, legacyMaterialAbsent: true },
    cases: packetCases, bundles, bundleCount: bundles.length, decisionCount: bundles.reduce((sum, item) => sum + item.decisions.length, 0)
  };
  const seal = {
    schemaVersion: "3.3-sealed-candidate-map", debateId: priorDebate.debateId, debateNumber: priorDebate.debateNumber,
    modelVisible: false, counterbalanceRule: "even global ordinal maps raw A to X; odd global ordinal maps raw B to X",
    sources: { v32PassAPath: priorOutputs.passA, v32PassASha256: sha256(passAText), v32PassBPath: priorOutputs.passB, v32PassBSha256: sha256(passBText) },
    fields: sealFields, fieldCount: sealFields.length
  };
  const blindPacket = `${gateRoot}/blind-packets/${priorDebate.debateId}.json`;
  const candidateSeal = `${gateRoot}/candidate-seals/${priorDebate.debateId}.json`;
  const packetText = await writeJson(blindPacket, packet), sealText = await writeJson(candidateSeal, seal);
  outputs[priorDebate.debateId] = {
    blindPacket, candidateSeal,
    adjudications: Object.fromEntries(Object.keys(V33_MODELS).map((key) => [key, `${gateRoot}/adjudications/${key}/${priorDebate.debateId}.json`])),
    mappingResults: Object.fromEntries(Object.keys(V33_MODELS).map((key) => [key, `${gateRoot}/mapping-results/${key}/${priorDebate.debateId}.json`])),
    finalLocks: Object.fromEntries(Object.keys(V33_MODELS).map((key) => [key, `${gateRoot}/final-locks/${key}/${priorDebate.debateId}.json`]))
  };
  debates.push({
    debateNumber: priorDebate.debateNumber, debateId: priorDebate.debateId, lane: priorDebate.lane, role: priorDebate.role, caseCount: priorDebate.caseCount,
    v32: {
      input: { path: priorDebate.path, sha256: sha256(inputText) }, gold: { path: priorDebate.gold.path, sha256: sha256(goldText) },
      sourceAudit: { path: priorDebate.sourceAudit.path, sha256: sha256(sourceAuditText), mediumOrLowMoveCount: priorDebate.sourceAudit.mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount: priorDebate.sourceAudit.audioVerifiedMediumOrLowMoveCount },
      passA: { path: priorOutputs.passA, sha256: sha256(passAText), model: "5.6 Terra" }, passB: { path: priorOutputs.passB, sha256: sha256(passBText), model: "5.6 Sol" }
    },
    blindPacket: { path: blindPacket, sha256: sha256(packetText), bundleCount: packet.bundleCount, decisionCount: packet.decisionCount },
    candidateSeal: { path: candidateSeal, sha256: sha256(sealText), fieldCount: seal.fieldCount }
  });
  totalBundleCount += packet.bundleCount;
  totalDecisionCount += packet.decisionCount;
}

const sourcePaths = [
  "docs/assessment-workflow-v3.3.md", "docs/reassessment-rubric-v3.3.md", `${gateRoot}/blind-adjudication-manual.md`, schemaPath,
  "scripts/lib/v33-blind-bundles.mjs", "scripts/build-v33-retired-blind-test.mjs", "scripts/test-v33-blind-bundles.mjs",
  "scripts/validate-v33-blind-adjudication.mjs", "scripts/map-v33-blind-adjudications.mjs", "scripts/merge-v33-blind-locks.mjs",
  "scripts/analyze-v33-retired-blind-test.mjs", "scripts/validate-v33-retired-blind-test.mjs", "scripts/run-v33-retired-blind-test.mjs"
];
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await read(file));
const manifest = {
  schemaVersion: "3.3-retired-blind-gate-manifest", gateId: "v3.3-retired-three-debate-anonymous-bundle-bakeoff",
  status: "frozen-before-v3.3-adjudications", frozenAt, calibrationOnly: true, rawPassesReusedWithoutRerun: true,
  heldOutTranscriptsOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false,
  workflowVersion: V33_WORKFLOW, rubricVersion: V33_RUBRIC,
  models: { variants: V33_MODELS, reasoningEffort: "Extra High", contextsPerDebate: 2, plannedContexts: debates.length * 2 },
  architecture: {
    blindDecisionPrecedesCandidateMapping: true, candidateSealsModelVisible: false, candidateOrderCounterbalanced: true,
    bundles: ["targeting-coverage", "diagnostic", "reframe", "burden-adjustment-conflicts", "burden-contact-conflicts"],
    allFragileAgreementsRouted: true, conflictsRouted: true, noCrossModelFieldBlending: true,
    modelSchemaOrInvariantRetriesMaximum: 0, scoresBeforeFinalLockProhibited: true
  },
  sample: { selectionInheritedFromFrozenV32: true, allDebatesRetired: true, debateCount: debates.length, caseCount: debates.reduce((sum, item) => sum + item.caseCount, 0), bundleCount: totalBundleCount, decisionCount: totalDecisionCount, debates },
  candidateCounterbalance: { xFromRawA: xFromA, xFromRawB: xFromB, difference: Math.abs(xFromA - xFromB) },
  thresholds: { ...priorManifest.thresholds, unmappedFieldsMaximum: 0, modelSchemaOrInvariantRetriesMaximum: 0 },
  selectionRule: { ifOnlyOneQualifies: "advance-that-model-to-disjoint-retired-confirmation", ifBothQualify: "advance-terra-to-disjoint-retired-confirmation", ifNeitherQualifies: "stop-without-held-out-access", fieldLevelBlendingProhibited: true },
  isolation: { allowedInputs: V33_ALLOWED_INPUTS, prohibitedInputs: ["candidate seals", "raw pass values", "raw model identities", "agreement/conflict flags", "gold keys", "legacy assessments", "numerical scores", "Overall Commentary", "AI Extension", "production debate objects"] },
  priorV32: { manifestPath: `${priorRoot}/gate-manifest.json`, manifestSha256: sha256(priorManifestText), reliabilityAnalysisPath: `${priorRoot}/reliability-analysis.json`, developmentFailureAccepted: true },
  dryFixtureResultPath: `${gateRoot}/dry-fixture-results.json`, executionResultPath: `${gateRoot}/model-execution.json`, outputs, sourceHashes, schemaSha256: sha256(schemaText)
};
const manifestText = await writeJson(`${gateRoot}/gate-manifest.json`, manifest);
console.log(JSON.stringify({ status: "frozen", gateId: manifest.gateId, frozenAt, debateCount: debates.length, caseCount: manifest.sample.caseCount, bundleCount: totalBundleCount, decisionCount: totalDecisionCount, plannedModelContexts: debates.length * 2, candidateCounterbalance: manifest.candidateCounterbalance, manifestSha256: sha256(manifestText) }, null, 2));
