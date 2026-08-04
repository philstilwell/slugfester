#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_ADJUDICATION_INPUTS, V32_ADJUDICATOR_MODEL, V32_PASS_INPUTS, V32_PASS_MODELS,
  V32_RUBRIC, V32_WORKFLOW, assert, sha256
} from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const priorRoot = "docs/calibration/v3.1/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
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
  await writeFile(path.resolve(root, file), text);
  return text;
};
const makeStructuredOutputCompatible = (node) => {
  if (!node || typeof node !== "object") return;
  for (const keyword of ["uniqueItems", "minItems", "maxItems", "minimum", "maximum", "minLength", "pattern", "format"]) delete node[keyword];
  if (Object.hasOwn(node, "const") && !node.type) node.type = node.const === null ? "null" : Array.isArray(node.const) ? "array" : typeof node.const;
  if (Array.isArray(node.enum) && !node.type && node.enum.length && node.enum.every((item) => typeof item === "string")) node.type = "string";
  for (const value of Object.values(node)) makeStructuredOutputCompatible(value);
};

for (const directory of ["inputs", "gold", "source-audit", "pass-a", "pass-b", "dispute-packets", "adjudications", "final-locks", "scoring-inputs"]) {
  await mkdir(path.resolve(root, gateRoot, directory), { recursive: true });
}

const passSchema = JSON.parse(await read(`${priorRoot}/consensus-pass-schema.json`));
passSchema.$id = "slugfester-v3.2-hybrid-pass";
passSchema.properties.schemaVersion.const = "3.2-hybrid-pass";
passSchema.properties.workflowVersion.const = V32_WORKFLOW;
passSchema.properties.rubricVersion.const = V32_RUBRIC;
delete passSchema.properties.model.const;
passSchema.properties.model.enum = Object.values(V32_PASS_MODELS);
passSchema.properties.isolation.properties.method.const = "fresh-ephemeral-v3.2-hybrid-pass";
makeStructuredOutputCompatible(passSchema);
const passSchemaPath = `${gateRoot}/hybrid-pass-schema.json`;
const passSchemaText = await writeJson(passSchemaPath, passSchema);

const adjudicationSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "slugfester-v3.2-risk-adjudication",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "completedAt", "isolation", "source", "resolutions", "audit"],
  properties: {
    schemaVersion: { const: "3.2-risk-adjudication" }, workflowVersion: { const: V32_WORKFLOW }, rubricVersion: { const: V32_RUBRIC }, model: { const: V32_ADJUDICATOR_MODEL },
    debateId: { type: "string", minLength: 1 }, debateNumber: { type: "string", minLength: 1 }, completedAt: { type: "string", format: "date-time" },
    isolation: {
      type: "object", additionalProperties: false,
      required: ["method", "allowedInputs", "goldUnavailable", "completePassesUnavailable", "unflaggedFieldsUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"],
      properties: {
        method: { const: "fresh-ephemeral-v3.2-risk-adjudication" }, allowedInputs: { type: "array", items: { type: "string" } },
        goldUnavailable: { const: true }, completePassesUnavailable: { const: true }, unflaggedFieldsUnavailable: { const: true },
        legacyMaterialUnavailable: { const: true }, numericalScoresUnavailable: { const: true }, statement: { type: "string", minLength: 50 }
      }
    },
    source: {
      type: "object", additionalProperties: false,
      required: ["disputePacketPath", "disputePacketSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"],
      properties: {
        disputePacketPath: { const: "dispute-packet.json" }, disputePacketSha256: { type: "string" }, workflowSha256: { type: "string" },
        rubricSha256: { type: "string" }, manualSha256: { type: "string" }, schemaSha256: { type: "string" }
      }
    },
    resolutions: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["disputeId", "caseId", "fieldPath", "selection", "resolvedJson", "rationale"],
        properties: {
          disputeId: { type: "string" }, caseId: { type: "string" }, fieldPath: { type: "string" },
          selection: { enum: ["A", "B", "retain", "override"] }, resolvedJson: { type: "string" }, rationale: { type: "string" }
        }
      }
    },
    audit: {
      type: "object", additionalProperties: false,
      required: ["disputeCount", "allDisputesResolvedOnce", "unexpectedFieldsAdded", "scoresPresent"],
      properties: { disputeCount: { type: "integer" }, allDisputesResolvedOnce: { const: true }, unexpectedFieldsAdded: { const: 0 }, scoresPresent: { const: false } }
    }
  }
};
makeStructuredOutputCompatible(adjudicationSchema);
const adjudicationSchemaPath = `${gateRoot}/risk-adjudication-schema.json`;
const adjudicationSchemaText = await writeJson(adjudicationSchemaPath, adjudicationSchema);

const priorManifestText = await read(`${priorRoot}/gate-manifest.json`);
const priorManifest = JSON.parse(priorManifestText);
const debates = [];
const outputs = {};
for (const priorDebate of priorManifest.sample.debates) {
  const priorInput = JSON.parse(await read(priorDebate.path));
  priorInput.schemaVersion = "3.2-retired-debate-input";
  priorInput.workflowVersion = V32_WORKFLOW;
  priorInput.rubricVersion = V32_RUBRIC;
  const inputPath = `${gateRoot}/inputs/${priorDebate.debateId}.json`;
  const inputText = await writeJson(inputPath, priorInput);

  const priorGold = JSON.parse(await read(priorDebate.gold.path));
  priorGold.schemaVersion = "3.2-retired-gold-key";
  priorGold.workflowVersion = V32_WORKFLOW;
  priorGold.rubricVersion = V32_RUBRIC;
  priorGold.constructedBeforeV32Passes = true;
  priorGold.inputSha256 = sha256(inputText);
  const goldPath = `${gateRoot}/gold/${priorDebate.debateId}.json`;
  const goldText = await writeJson(goldPath, priorGold);

  const sourceAudit = JSON.parse(await read(priorDebate.sourceAudit.path));
  sourceAudit.schemaVersion = "3.2-retired-source-audit";
  const sourceAuditPath = `${gateRoot}/source-audit/${priorDebate.debateId}.json`;
  const sourceAuditText = await writeJson(sourceAuditPath, sourceAudit);

  debates.push({
    debateNumber: priorDebate.debateNumber, debateId: priorDebate.debateId, lane: priorDebate.lane, role: priorDebate.role,
    inventoryPath: priorDebate.inventoryPath, path: inputPath, sha256: sha256(inputText), caseCount: priorDebate.caseCount,
    gold: { path: goldPath, sha256: sha256(goldText), annotationCount: priorGold.annotations.length },
    sourceAudit: { path: sourceAuditPath, sha256: sha256(sourceAuditText), mediumOrLowMoveCount: sourceAudit.mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount: sourceAudit.audioVerifiedMediumOrLowMoveCount }
  });
  outputs[priorDebate.debateId] = {
    passA: `${gateRoot}/pass-a/${priorDebate.debateId}.json`, passB: `${gateRoot}/pass-b/${priorDebate.debateId}.json`,
    disputePacket: `${gateRoot}/dispute-packets/${priorDebate.debateId}.json`, adjudication: `${gateRoot}/adjudications/${priorDebate.debateId}.json`,
    finalLock: `${gateRoot}/final-locks/${priorDebate.debateId}.json`, scoringInput: `${gateRoot}/scoring-inputs/${priorDebate.debateId}.json`
  };
}

const sourcePaths = [
  "docs/assessment-workflow-v3.2.md", "docs/reassessment-rubric-v3.2.md", `${gateRoot}/annotation-manual.md`, `${gateRoot}/adjudication-manual.md`,
  passSchemaPath, adjudicationSchemaPath, "scripts/lib/v32-risk-adjudication.mjs", "scripts/build-v32-retired-hybrid-test.mjs",
  "scripts/validate-v32-hybrid-pass.mjs", "scripts/extract-v32-risk-disputes.mjs", "scripts/validate-v32-risk-adjudication.mjs",
  "scripts/merge-v32-hybrid-locks.mjs", "scripts/analyze-v32-retired-hybrid-test.mjs", "scripts/validate-v32-retired-hybrid-test.mjs", "scripts/run-v32-retired-hybrid-test.mjs"
];
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await read(file));
const manifest = {
  schemaVersion: "3.2-retired-hybrid-gate-manifest", gateId: "v3.2-retired-three-debate-hybrid-risk-test", status: "frozen-before-v3.2-passes", frozenAt,
  calibrationOnly: true, developmentInformedByPriorRetiredFailures: true, heldOutTranscriptsOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false,
  workflowVersion: V32_WORKFLOW, rubricVersion: V32_RUBRIC,
  models: { passA: V32_PASS_MODELS.A, passB: V32_PASS_MODELS.B, adjudicator: V32_ADJUDICATOR_MODEL, reasoningEffort: "Extra High" },
  architecture: {
    completePassesPerDebate: 2, adjudicationsPerDebate: 1, semanticEvidenceSeparation: true,
    disputeScope: "semantic-conflicts-plus-deterministic-high-risk-agreements-and-dependency-companions",
    conflictCandidateSpace: "A-or-B-only", sharedAgreementDefault: "retain", unflaggedAgreementMutable: false,
    evidenceCanonicalization: "shortest-valid-matching-semantic-span", scoresBeforeFinalLockProhibited: true
  },
  sample: { selectionFrozenBeforePasses: true, allDebatesRetired: true, debates, debateCount: debates.length, caseCount: debates.reduce((sum, item) => sum + item.caseCount, 0) },
  goldProvenance: { priorV31ManifestPath: `${priorRoot}/gate-manifest.json`, priorV31ManifestSha256: sha256(priorManifestText), constructedBeforeV32Passes: true },
  thresholds: structuredClone(priorManifest.thresholds),
  passIsolation: {
    passAllowedInputs: V32_PASS_INPUTS, adjudicationAllowedInputs: V32_ADJUDICATION_INPUTS,
    prohibitedInputs: ["gold keys", "other complete pass", "unflagged fields", "legacy assessment", "numerical scores", "Overall Commentary", "AI Extension", "production debate objects"]
  },
  outputs, sourceHashes,
  schemaHashes: { pass: sha256(passSchemaText), adjudication: sha256(adjudicationSchemaText) }
};
const manifestText = await writeJson(manifestPath, manifest);
console.log(JSON.stringify({ status: "frozen", gateId: manifest.gateId, frozenAt, debateCount: debates.length, caseCount: manifest.sample.caseCount, plannedModelContexts: debates.length * 3, manifestSha256: sha256(manifestText) }, null, 2));
