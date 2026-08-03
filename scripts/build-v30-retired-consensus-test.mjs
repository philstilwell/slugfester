#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V30_MODEL, V30_RUBRIC, V30_WORKFLOW, assert, sha256 } from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const priorRoot = "docs/calibration/v2.9/development/attempt-2";
const workflowPath = "docs/assessment-workflow-v3.0.md";
const rubricPath = "docs/reassessment-rubric-v3.0.md";
const manualPath = `${gateRoot}/annotation-manual.md`;
const adjudicationManualPath = `${gateRoot}/adjudication-manual.md`;
const passSchemaPath = `${gateRoot}/consensus-pass-schema.json`;
const adjudicationSchemaPath = `${gateRoot}/dispute-adjudication-schema.json`;
const manifestPath = `${gateRoot}/gate-manifest.json`;
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};
const frozenAt = valueAfter("--frozen-at", new Date().toISOString());
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO date-time");

const debates = [
  {
    debateNumber: "62",
    debateId: "pageau-folley-logos-meaning-resurrection-2026",
    lane: "dyadic",
    role: "straightforward-dyadic",
    inventoryPath: "docs/calibration/v2.7/held-out-gates/dyadic/inventories/pageau-folley-logos-meaning-resurrection-2026.json"
  },
  {
    debateNumber: "185",
    debateId: "dennett-caruso-free-will-responsibility-2021",
    lane: "dyadic",
    role: "difficult-dyadic-reframe",
    inventoryPath: "docs/calibration/v2.5/held-out-gate/inventories/dennett-caruso-free-will-responsibility-2021.json"
  },
  {
    debateNumber: "154",
    debateId: "koukl-oconnor-kanojia-nonbelief-harm-2025",
    lane: "multi-speaker",
    role: "multi-speaker",
    inventoryPath: "docs/calibration/v2.7/held-out-gates/multi-speaker/inventories/koukl-oconnor-kanojia-nonbelief-harm-2025.json"
  }
];

const read = async (relativePath) => readFile(path.resolve(root, relativePath), "utf8");
const [priorInputText, priorKeyText, priorManifestText, priorCandidateAText, priorCandidateBText, priorKeyLedgerText, baseSchemaText] = await Promise.all([
  read(`${priorRoot}/challenge-input.json`),
  read(`${priorRoot}/challenge-key.json`),
  read(`${priorRoot}/challenge-manifest.json`),
  read(`${priorRoot}/key-candidate-a.json`),
  read(`${priorRoot}/key-candidate-b.json`),
  read(`${priorRoot}/key-adjudication-ledger.md`),
  read(`${priorRoot}/challenge-annotation-schema.json`)
]);
const priorInput = JSON.parse(priorInputText);
const priorKey = JSON.parse(priorKeyText);
const priorKeyById = new Map(priorKey.annotations.map((item) => [item.caseId, item]));
const makeStructuredOutputCompatible = (node) => {
  if (!node || typeof node !== "object") return;
  for (const keyword of ["uniqueItems", "minItems", "maxItems", "minimum", "maximum", "minLength", "pattern", "format"]) delete node[keyword];
  if (Object.hasOwn(node, "const") && !node.type) {
    node.type = node.const === null ? "null" : Array.isArray(node.const) ? "array" : typeof node.const;
  }
  if (Array.isArray(node.enum) && !node.type && node.enum.length && node.enum.every((item) => typeof item === "string")) node.type = "string";
  for (const value of Object.values(node)) makeStructuredOutputCompatible(value);
};

const passSchema = JSON.parse(baseSchemaText);
passSchema.$id = "slugfester-v3.0-consensus-pass";
passSchema.properties.schemaVersion.const = "3.0-consensus-pass";
passSchema.properties.workflowVersion.const = V30_WORKFLOW;
passSchema.properties.rubricVersion.const = V30_RUBRIC;
passSchema.properties.pass.enum = ["A", "B"];
passSchema.properties.model.const = V30_MODEL;
passSchema.properties.isolation = {
  type: "object",
  additionalProperties: false,
  required: ["method", "allowedInputs", "goldUnavailable", "otherPassUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"],
  properties: {
    method: { const: "fresh-ephemeral-v3.0-consensus-pass" },
    allowedInputs: { type: "array", minItems: 5, maxItems: 5, uniqueItems: true, items: { type: "string" } },
    goldUnavailable: { const: true },
    otherPassUnavailable: { const: true },
    legacyMaterialUnavailable: { const: true },
    numericalScoresUnavailable: { const: true },
    statement: { type: "string", minLength: 50 }
  }
};
passSchema.properties.source = {
  type: "object",
  additionalProperties: false,
  required: ["inputPath", "inputSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"],
  properties: {
    inputPath: { const: "input.json" },
    inputSha256: { $ref: "#/$defs/digest" },
    workflowSha256: { $ref: "#/$defs/digest" },
    rubricSha256: { $ref: "#/$defs/digest" },
    manualSha256: { $ref: "#/$defs/digest" },
    schemaSha256: { $ref: "#/$defs/digest" }
  }
};
passSchema.properties.annotations.minItems = 1;
passSchema.properties.audit.properties.caseCount.minimum = 1;
makeStructuredOutputCompatible(passSchema);
const passSchemaText = `${JSON.stringify(passSchema, null, 2)}\n`;

const adjudicationSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v3.0-dispute-adjudication",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "completedAt", "isolation", "source", "resolutions", "audit"],
  properties: {
    schemaVersion: { const: "3.0-dispute-adjudication" },
    workflowVersion: { const: V30_WORKFLOW },
    rubricVersion: { const: V30_RUBRIC },
    model: { const: V30_MODEL },
    debateId: { type: "string", minLength: 1 },
    debateNumber: { type: "string", minLength: 1 },
    completedAt: { type: "string", format: "date-time" },
    isolation: {
      type: "object", additionalProperties: false,
      required: ["method", "allowedInputs", "goldUnavailable", "completePassesUnavailable", "nondisputedFieldsUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"],
      properties: {
        method: { const: "fresh-ephemeral-v3.0-dispute-only-adjudication" },
        allowedInputs: { type: "array", minItems: 5, maxItems: 5, uniqueItems: true, items: { type: "string" } },
        goldUnavailable: { const: true }, completePassesUnavailable: { const: true }, nondisputedFieldsUnavailable: { const: true },
        legacyMaterialUnavailable: { const: true }, numericalScoresUnavailable: { const: true }, statement: { type: "string", minLength: 50 }
      }
    },
    source: {
      type: "object", additionalProperties: false,
      required: ["disputePacketPath", "disputePacketSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"],
      properties: {
        disputePacketPath: { const: "dispute-packet.json" },
        disputePacketSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, workflowSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        rubricSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, manualSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, schemaSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }
      }
    },
    resolutions: {
      type: "array", minItems: 1,
      items: {
        type: "object", additionalProperties: false,
        required: ["disputeId", "caseId", "fieldPath", "selection", "resolvedJson", "rationale"],
        properties: {
          disputeId: { type: "string", minLength: 1 }, caseId: { type: "string", minLength: 1 }, fieldPath: { type: "string", minLength: 1 },
          selection: { enum: ["A", "B", "novel"] }, resolvedJson: { type: "string", minLength: 2 }, rationale: { type: "string", minLength: 60 }
        }
      }
    },
    audit: {
      type: "object", additionalProperties: false,
      required: ["disputeCount", "allDisputesResolvedOnce", "unexpectedFieldsAdded", "scoresPresent"],
      properties: { disputeCount: { type: "integer", minimum: 1 }, allDisputesResolvedOnce: { const: true }, unexpectedFieldsAdded: { const: 0 }, scoresPresent: { const: false } }
    }
  }
};
makeStructuredOutputCompatible(adjudicationSchema);
const adjudicationSchemaText = `${JSON.stringify(adjudicationSchema, null, 2)}\n`;

await mkdir(path.resolve(root, gateRoot), { recursive: true });
for (const directory of ["inputs", "gold", "source-audit", "pass-a", "pass-b", "dispute-packets", "adjudications", "final-locks", "scoring-inputs"]) {
  await mkdir(path.resolve(root, gateRoot, directory), { recursive: true });
}
await writeFile(path.resolve(root, passSchemaPath), passSchemaText);
await writeFile(path.resolve(root, adjudicationSchemaPath), adjudicationSchemaText);

const inputRecords = [];
const goldRecords = [];
const sourceRecords = [];
for (const debate of debates) {
  const inventoryText = await read(debate.inventoryPath);
  const inventory = JSON.parse(inventoryText);
  assert(inventory.debateId === debate.debateId && inventory.debateNumber === debate.debateNumber, `${debate.debateId}: inventory identity mismatch`);
  const selectedCases = priorInput.cases.filter((item) => item.debateId === debate.debateId);
  assert(selectedCases.length >= 3, `${debate.debateId}: too few retired cases`);
  const moveById = new Map(inventory.moves.map((item) => [item.moveId, item]));
  const cases = selectedCases.map((item) => {
    const move = moveById.get(item.moveId);
    assert(move, `${item.caseId}: missing source inventory move`);
    return {
      ...structuredClone(item),
      sourceMetadata: {
        timestamp: move.timestamp,
        sourceSpan: move.sourceSpan,
        speakerAttributionConfidence: move.speakerAttributionConfidence,
        audioChecked: move.audioChecked,
        audioVerification: move.audioVerification
      }
    };
  });
  const input = {
    schemaVersion: "3.0-retired-debate-input",
    workflowVersion: V30_WORKFLOW,
    rubricVersion: V30_RUBRIC,
    calibrationOnly: true,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    lane: debate.lane,
    sampleRole: debate.role,
    source: structuredClone(inventory.source),
    caseCount: cases.length,
    cases
  };
  const inputRelativePath = `${gateRoot}/inputs/${debate.debateId}.json`;
  const inputText = `${JSON.stringify(input, null, 2)}\n`;
  await writeFile(path.resolve(root, inputRelativePath), inputText);

  const annotations = cases.map((item) => {
    const annotation = priorKeyById.get(item.caseId);
    assert(annotation, `${item.caseId}: missing prior gold annotation`);
    return structuredClone(annotation);
  });
  const gold = {
    schemaVersion: "3.0-retired-gold-key",
    workflowVersion: V30_WORKFLOW,
    rubricVersion: V30_RUBRIC,
    calibrationOnly: true,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    constructedBeforeV30Passes: true,
    independence: {
      method: "two-independent-5.6-Sol-key-candidates-plus-fresh-adjudicator",
      candidateASha256: sha256(priorCandidateAText),
      candidateBSha256: sha256(priorCandidateBText),
      adjudicationLedgerSha256: sha256(priorKeyLedgerText),
      priorKeySha256: sha256(priorKeyText),
      statement: "The v2.9.1 gold key was independently constructed and adjudicated before the v3.0 sample or passes existed."
    },
    inputSha256: sha256(inputText),
    annotations
  };
  const goldRelativePath = `${gateRoot}/gold/${debate.debateId}.json`;
  const goldText = `${JSON.stringify(gold, null, 2)}\n`;
  await writeFile(path.resolve(root, goldRelativePath), goldText);

  const localSourceFiles = [inventory.source.transcriptPath, inventory.source.eventsPath, inventory.source.manifestPath];
  const localSourceTexts = await Promise.all(localSourceFiles.map(read));
  const expectedSourceHashes = [inventory.source.transcriptSha256, inventory.source.eventsSha256, inventory.source.manifestSha256];
  localSourceTexts.forEach((text, index) => assert(sha256(text) === expectedSourceHashes[index], `${debate.debateId}: local source hash mismatch for ${localSourceFiles[index]}`));
  const mediumLowMoves = inventory.moves.filter((item) => ["medium", "low"].includes(item.speakerAttributionConfidence));
  const verifiedMoves = [];
  for (const move of mediumLowMoves) {
    assert(move.audioChecked === true && move.audioVerification?.status === "verified", `${move.moveId}: medium/low move lacks audio verification`);
    const audioBytes = await readFile(path.resolve(root, move.audioVerification.path));
    assert(createHash("sha256").update(audioBytes).digest("hex") === move.audioVerification.sha256, `${move.moveId}: audio verification hash mismatch`);
    assert(move.audioVerification.resolvedSpeaker === move.speaker, `${move.moveId}: resolved speaker mismatch`);
    verifiedMoves.push({ moveId: move.moveId, speaker: move.speaker, confidence: move.speakerAttributionConfidence, ...structuredClone(move.audioVerification) });
  }
  const sourceAudit = {
    schemaVersion: "3.0-retired-source-audit",
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    inventoryPath: debate.inventoryPath,
    inventorySha256: sha256(inventoryText),
    transcriptPath: inventory.source.transcriptPath,
    transcriptSha256: inventory.source.transcriptSha256,
    eventsPath: inventory.source.eventsPath,
    eventsSha256: inventory.source.eventsSha256,
    manifestPath: inventory.source.manifestPath,
    manifestSha256: inventory.source.manifestSha256,
    mediumOrLowMoveCount: mediumLowMoves.length,
    audioVerifiedMediumOrLowMoveCount: verifiedMoves.length,
    audioVerificationRate: mediumLowMoves.length ? verifiedMoves.length / mediumLowMoves.length : 1,
    verifiedMoves
  };
  const sourceAuditRelativePath = `${gateRoot}/source-audit/${debate.debateId}.json`;
  const sourceAuditText = `${JSON.stringify(sourceAudit, null, 2)}\n`;
  await writeFile(path.resolve(root, sourceAuditRelativePath), sourceAuditText);
  inputRecords.push({ path: inputRelativePath, sha256: sha256(inputText), caseCount: cases.length });
  goldRecords.push({ path: goldRelativePath, sha256: sha256(goldText), annotationCount: annotations.length });
  sourceRecords.push({ path: sourceAuditRelativePath, sha256: sha256(sourceAuditText), mediumOrLowMoveCount: mediumLowMoves.length, audioVerifiedMediumOrLowMoveCount: verifiedMoves.length });
}

const hashPaths = [
  workflowPath, rubricPath, manualPath, adjudicationManualPath, passSchemaPath, adjudicationSchemaPath,
  "scripts/lib/v30-consensus.mjs", "scripts/build-v30-retired-consensus-test.mjs",
  "scripts/validate-v30-consensus-pass.mjs", "scripts/extract-v30-consensus-disputes.mjs",
  "scripts/validate-v30-consensus-adjudication.mjs", "scripts/merge-v30-consensus-locks.mjs",
  "scripts/analyze-v30-retired-consensus-test.mjs", "scripts/validate-v30-retired-consensus-test.mjs"
];
const sourceHashes = {};
for (const file of hashPaths) sourceHashes[file] = sha256(await read(file));
const manifest = {
  schemaVersion: "3.0-retired-consensus-gate-manifest",
  gateId: "v3.0-retired-three-debate-consensus-test",
  status: "frozen-before-v3.0-passes",
  frozenAt,
  calibrationOnly: true,
  heldOutTranscriptsOpened: false,
  numericalScoringAuthorized: false,
  productionMutationAuthorized: false,
  workflowVersion: V30_WORKFLOW,
  rubricVersion: V30_RUBRIC,
  model: V30_MODEL,
  architecture: {
    rawPassesPerDebate: 2,
    passIsolation: "fresh-ephemeral-allowlisted-workspace",
    disagreementExtraction: "canonical-compound-field-json-equality",
    adjudicationPassesPerDebate: 1,
    adjudicationScope: "disputed-fields-only",
    finalLockMerge: "deterministic",
    scoresBeforeFinalLockProhibited: true
  },
  sample: {
    selectionFrozenBeforePasses: true,
    allDebatesRetired: true,
    debates: debates.map((debate, index) => ({ ...debate, ...inputRecords[index], gold: goldRecords[index], sourceAudit: sourceRecords[index] })),
    debateCount: debates.length,
    caseCount: inputRecords.reduce((sum, item) => sum + item.caseCount, 0)
  },
  goldProvenance: {
    priorManifestPath: `${priorRoot}/challenge-manifest.json`,
    priorManifestSha256: sha256(priorManifestText),
    priorKeyPath: `${priorRoot}/challenge-key.json`,
    priorKeySha256: sha256(priorKeyText),
    constructedBeforeV30Passes: true
  },
  thresholds: {
    finalOriginalTargetContactExact: 0.95,
    finalScopeExact: 0.90,
    finalBurdenAdjustmentExact: 0.95,
    finalComponentContactMicroExact: 0.90,
    finalCoverageExact: 0.85,
    finalDefectTypeExact: 0.85,
    finalConsequenceExact: 0.90,
    finalDiagnosticExact: 0.90,
    finalReframeExact: 0.90,
    finalBurdenRelevanceExact: 0.90,
    finalExactDerivedTupleExact: 0.80,
    finalDiagnosticPositiveRecall: 0.80,
    finalReframePositiveRecall: 1.00,
    unresolvedDisputesMaximum: 0,
    nondisputedAlterationsMaximum: 0,
    mediumLowAudioVerificationRate: 1.00
  },
  passIsolation: {
    passAllowedInputs: ["workflow.md", "rubric.md", "manual.md", "schema.json", "input.json"],
    adjudicationAllowedInputs: ["workflow.md", "rubric.md", "manual.md", "schema.json", "dispute-packet.json"],
    prohibitedInputs: ["gold keys", "other raw pass", "legacy assessment", "numerical scores", "Overall Commentary", "AI Extension", "production debate objects"]
  },
  outputs: Object.fromEntries(debates.map((debate) => [debate.debateId, {
    passA: `${gateRoot}/pass-a/${debate.debateId}.json`,
    passB: `${gateRoot}/pass-b/${debate.debateId}.json`,
    disputePacket: `${gateRoot}/dispute-packets/${debate.debateId}.json`,
    adjudication: `${gateRoot}/adjudications/${debate.debateId}.json`,
    finalLock: `${gateRoot}/final-locks/${debate.debateId}.json`,
    scoringInput: `${gateRoot}/scoring-inputs/${debate.debateId}.json`
  }])),
  sourceHashes
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(path.resolve(root, manifestPath), manifestText);
console.log(JSON.stringify({ status: "frozen", gateId: manifest.gateId, frozenAt, debateCount: debates.length, caseCount: manifest.sample.caseCount, mediumOrLowMoveCount: sourceRecords.reduce((sum, item) => sum + item.mediumOrLowMoveCount, 0), manifestSha256: sha256(manifestText) }, null, 2));
