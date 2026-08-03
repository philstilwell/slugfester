#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V31_FAMILIES, V31_MODEL, V31_PASS_INPUTS, V31_RUBRIC, V31_VERIFY_INPUTS,
  V31_WORKFLOW, assert, compoundFields, defaultAnnotation, fieldFamily, fieldPrompt, sha256
} from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const v30Root = "docs/calibration/v3.0/retired-three-debate-test";
const workflowPath = "docs/assessment-workflow-v3.1.md";
const rubricPath = "docs/reassessment-rubric-v3.1.md";
const manualPath = `${gateRoot}/annotation-manual.md`;
const verificationManualPath = `${gateRoot}/verification-manual.md`;
const passSchemaPath = `${gateRoot}/consensus-pass-schema.json`;
const verificationSchemaPath = `${gateRoot}/field-verification-schema.json`;
const manifestPath = `${gateRoot}/gate-manifest.json`;
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};
const frozenAt = valueAfter("--frozen-at", new Date().toISOString());
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO date-time");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const makeStructuredOutputCompatible = (node) => {
  if (!node || typeof node !== "object") return;
  for (const keyword of ["uniqueItems", "minItems", "maxItems", "minimum", "maximum", "minLength", "pattern", "format"]) delete node[keyword];
  if (Object.hasOwn(node, "const") && !node.type) node.type = node.const === null ? "null" : Array.isArray(node.const) ? "array" : typeof node.const;
  if (Array.isArray(node.enum) && !node.type && node.enum.length && node.enum.every((item) => typeof item === "string")) node.type = "string";
  for (const value of Object.values(node)) makeStructuredOutputCompatible(value);
};

const v30ManifestText = await read(`${v30Root}/gate-manifest.json`);
const v30Manifest = JSON.parse(v30ManifestText);
const baseSchema = JSON.parse(await read(`${v30Root}/consensus-pass-schema.json`));
baseSchema.$id = "slugfester-v3.1-consensus-pass";
baseSchema.properties.schemaVersion.const = "3.1-consensus-pass";
baseSchema.properties.workflowVersion.const = V31_WORKFLOW;
baseSchema.properties.rubricVersion.const = V31_RUBRIC;
baseSchema.properties.model.const = V31_MODEL;
baseSchema.properties.isolation.properties.method.const = "fresh-ephemeral-v3.1-consensus-pass";
makeStructuredOutputCompatible(baseSchema);
const passSchemaText = `${JSON.stringify(baseSchema, null, 2)}\n`;

const verificationSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v3.1-field-family-verification",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "family", "completedAt", "isolation", "source", "judgments", "audit"],
  properties: {
    schemaVersion: { const: "3.1-field-family-verification" },
    workflowVersion: { const: V31_WORKFLOW },
    rubricVersion: { const: V31_RUBRIC },
    model: { const: V31_MODEL },
    debateId: { type: "string", minLength: 1 },
    debateNumber: { type: "string", minLength: 1 },
    family: { enum: V31_FAMILIES },
    completedAt: { type: "string", format: "date-time" },
    isolation: {
      type: "object", additionalProperties: false,
      required: ["method", "allowedInputs", "goldUnavailable", "rawPassesUnavailable", "agreementStatusUnavailable", "otherFamiliesUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"],
      properties: {
        method: { const: "fresh-ephemeral-v3.1-field-family-verification" },
        allowedInputs: { type: "array", minItems: 5, maxItems: 5, uniqueItems: true, items: { type: "string" } },
        goldUnavailable: { const: true }, rawPassesUnavailable: { const: true }, agreementStatusUnavailable: { const: true }, otherFamiliesUnavailable: { const: true },
        legacyMaterialUnavailable: { const: true }, numericalScoresUnavailable: { const: true }, statement: { type: "string", minLength: 50 }
      }
    },
    source: {
      type: "object", additionalProperties: false,
      required: ["fieldPacketPath", "fieldPacketSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"],
      properties: {
        fieldPacketPath: { const: "field-packet.json" }, fieldPacketSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        workflowSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, rubricSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        manualSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, schemaSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }
      }
    },
    judgments: {
      type: "array", minItems: 1,
      items: {
        type: "object", additionalProperties: false, required: ["caseId", "fieldPath", "resolvedJson", "rationale"],
        properties: { caseId: { type: "string", minLength: 1 }, fieldPath: { type: "string", minLength: 1 }, resolvedJson: { type: "string", minLength: 2 }, rationale: { type: "string", minLength: 60 } }
      }
    },
    audit: {
      type: "object", additionalProperties: false, required: ["judgmentCount", "allFieldsJudgedOnce", "unexpectedFieldsAdded", "scoresPresent"],
      properties: { judgmentCount: { type: "integer", minimum: 1 }, allFieldsJudgedOnce: { const: true }, unexpectedFieldsAdded: { const: 0 }, scoresPresent: { const: false } }
    }
  }
};
makeStructuredOutputCompatible(verificationSchema);
const verificationSchemaText = `${JSON.stringify(verificationSchema, null, 2)}\n`;

for (const directory of ["inputs", "gold", "source-audit", "pass-a", "pass-b", "semantic-disagreements", "field-packets", "verifications", "final-locks", "scoring-inputs"]) {
  await mkdir(path.resolve(root, gateRoot, directory), { recursive: true });
}
for (const family of V31_FAMILIES) {
  await mkdir(path.resolve(root, gateRoot, "field-packets", family), { recursive: true });
  await mkdir(path.resolve(root, gateRoot, "verifications", family), { recursive: true });
}
await writeFile(path.resolve(root, passSchemaPath), passSchemaText);
await writeFile(path.resolve(root, verificationSchemaPath), verificationSchemaText);

const debates = [];
const outputs = {};
for (const oldDebate of v30Manifest.sample.debates) {
  const [oldInputText, oldGoldText, oldSourceAuditText] = await Promise.all([read(oldDebate.path), read(oldDebate.gold.path), read(oldDebate.sourceAudit.path)]);
  const input = JSON.parse(oldInputText);
  input.schemaVersion = "3.1-retired-debate-input";
  input.workflowVersion = V31_WORKFLOW;
  input.rubricVersion = V31_RUBRIC;
  const inputPath = `${gateRoot}/inputs/${oldDebate.debateId}.json`;
  const inputText = `${JSON.stringify(input, null, 2)}\n`;
  await writeFile(path.resolve(root, inputPath), inputText);

  const gold = JSON.parse(oldGoldText);
  gold.schemaVersion = "3.1-retired-gold-key";
  gold.workflowVersion = V31_WORKFLOW;
  gold.rubricVersion = V31_RUBRIC;
  gold.inputSha256 = sha256(inputText);
  gold.constructedBeforeV31Passes = true;
  const goldPath = `${gateRoot}/gold/${oldDebate.debateId}.json`;
  const goldText = `${JSON.stringify(gold, null, 2)}\n`;
  await writeFile(path.resolve(root, goldPath), goldText);

  const sourceAudit = JSON.parse(oldSourceAuditText);
  sourceAudit.schemaVersion = "3.1-retired-source-audit";
  const sourceAuditPath = `${gateRoot}/source-audit/${oldDebate.debateId}.json`;
  const sourceAuditText = `${JSON.stringify(sourceAudit, null, 2)}\n`;
  await writeFile(path.resolve(root, sourceAuditPath), sourceAuditText);

  const packetPaths = {};
  const packetHashes = {};
  for (const family of V31_FAMILIES) {
    const cases = input.cases.map((challengeCase) => {
      const fields = compoundFields(defaultAnnotation(challengeCase))
        .filter(([fieldPath]) => fieldFamily(fieldPath) === family)
        .map(([fieldPath]) => ({ fieldPath, question: fieldPrompt(fieldPath, challengeCase) }));
      return { caseId: challengeCase.caseId, moveId: challengeCase.moveId, lockedCase: structuredClone(challengeCase), fields };
    });
    const packet = {
      schemaVersion: "3.1-field-family-packet", workflowVersion: V31_WORKFLOW, rubricVersion: V31_RUBRIC, model: V31_MODEL,
      gateId: "v3.1-retired-three-debate-focused-verification-test", debateId: oldDebate.debateId, debateNumber: oldDebate.debateNumber,
      lane: oldDebate.lane, family, calibrationOnly: true, builtFromInputSha256: sha256(inputText), caseCount: cases.length,
      fieldCount: cases.reduce((sum, item) => sum + item.fields.length, 0), cases,
      exclusions: { rawPassValuesIncluded: false, rawPassRationalesIncluded: false, agreementStatusIncluded: false, goldIncluded: false, legacyMaterialIncluded: false, numericalScoresIncluded: false }
    };
    const packetPath = `${gateRoot}/field-packets/${family}/${oldDebate.debateId}.json`;
    const packetText = `${JSON.stringify(packet, null, 2)}\n`;
    await writeFile(path.resolve(root, packetPath), packetText);
    packetPaths[family] = packetPath;
    packetHashes[family] = sha256(packetText);
  }

  const record = {
    debateNumber: oldDebate.debateNumber, debateId: oldDebate.debateId, lane: oldDebate.lane, role: oldDebate.role, inventoryPath: oldDebate.inventoryPath,
    path: inputPath, sha256: sha256(inputText), caseCount: input.caseCount,
    gold: { path: goldPath, sha256: sha256(goldText), annotationCount: gold.annotations.length },
    sourceAudit: { path: sourceAuditPath, sha256: sha256(sourceAuditText), mediumOrLowMoveCount: sourceAudit.mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount: sourceAudit.audioVerifiedMediumOrLowMoveCount },
    fieldPackets: Object.fromEntries(V31_FAMILIES.map((family) => [family, { path: packetPaths[family], sha256: packetHashes[family] }]))
  };
  debates.push(record);
  outputs[oldDebate.debateId] = {
    passA: `${gateRoot}/pass-a/${oldDebate.debateId}.json`, passB: `${gateRoot}/pass-b/${oldDebate.debateId}.json`,
    semanticDisagreements: `${gateRoot}/semantic-disagreements/${oldDebate.debateId}.json`,
    verifications: Object.fromEntries(V31_FAMILIES.map((family) => [family, `${gateRoot}/verifications/${family}/${oldDebate.debateId}.json`])),
    finalLock: `${gateRoot}/final-locks/${oldDebate.debateId}.json`, scoringInput: `${gateRoot}/scoring-inputs/${oldDebate.debateId}.json`
  };
}

const sourcePaths = [
  workflowPath, rubricPath, manualPath, verificationManualPath, passSchemaPath, verificationSchemaPath,
  "scripts/lib/v31-verification.mjs", "scripts/build-v31-retired-verification-test.mjs", "scripts/validate-v31-consensus-pass.mjs",
  "scripts/extract-v31-semantic-disagreements.mjs", "scripts/validate-v31-field-verification.mjs", "scripts/merge-v31-verification-locks.mjs",
  "scripts/analyze-v31-retired-verification-test.mjs", "scripts/validate-v31-retired-verification-test.mjs", "scripts/run-v31-retired-verification-test.mjs"
];
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await read(file));
const thresholds = structuredClone(v30Manifest.thresholds);
const manifest = {
  schemaVersion: "3.1-retired-verification-gate-manifest", gateId: "v3.1-retired-three-debate-focused-verification-test",
  status: "frozen-before-v3.1-passes", frozenAt, calibrationOnly: true, heldOutTranscriptsOpened: false,
  numericalScoringAuthorized: false, productionMutationAuthorized: false, workflowVersion: V31_WORKFLOW, rubricVersion: V31_RUBRIC, model: V31_MODEL,
  architecture: {
    rawPassesPerDebate: 2, passIsolation: "fresh-ephemeral-allowlisted-workspace", disagreementExtraction: "semantic-values-separated-from-evidence",
    focusedVerificationFamiliesPerDebate: V31_FAMILIES.length, verificationScope: "all-compound-primitives-in-four-blinded-families",
    verifierSeesRawValues: false, finalSemanticAuthority: "focused-verifier", evidenceCanonicalization: "shortest-valid-matching-semantic-span",
    finalLockMerge: "deterministic", scoresBeforeFinalLockProhibited: true
  },
  sample: { selectionFrozenBeforePasses: true, allDebatesRetired: true, debates, debateCount: debates.length, caseCount: debates.reduce((sum, item) => sum + item.caseCount, 0) },
  goldProvenance: { priorV30ManifestPath: `${v30Root}/gate-manifest.json`, priorV30ManifestSha256: sha256(v30ManifestText), constructedBeforeV31Passes: true },
  thresholds,
  passIsolation: {
    passAllowedInputs: V31_PASS_INPUTS, verificationAllowedInputs: V31_VERIFY_INPUTS,
    prohibitedInputs: ["gold keys", "other raw pass", "raw candidate values", "agreement status", "other verification families", "legacy assessment", "numerical scores", "Overall Commentary", "AI Extension", "production debate objects"]
  },
  outputs, sourceHashes
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(path.resolve(root, manifestPath), manifestText);
console.log(JSON.stringify({ status: "frozen", gateId: manifest.gateId, frozenAt, debateCount: debates.length, caseCount: manifest.sample.caseCount, verifierContextCount: debates.length * V31_FAMILIES.length, manifestSha256: sha256(manifestText) }, null, 2));
