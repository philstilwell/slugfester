#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import { buildV222InventorySectionSchema } from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ROUTE_ANALYSIS = `${ROOT}/route-analysis.json`;
const ROUTE_EXECUTION = `${ROOT}/route-model-execution.json`;
const SECTION_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2.2.2-inventory-sections.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-inventory-section-preparation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  assertV4(
    !(await exists(SECTION_PREPARATION)),
    `${SECTION_PREPARATION} already exists`
  );
}

const [preparationBytes, analysisBytes, executionBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(ROUTE_ANALYSIS),
  readFile(ROUTE_EXECUTION),
]);
const preparation = JSON.parse(preparationBytes);
const analysis = JSON.parse(analysisBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  preparation.status ===
      "ten-v2.2.2-exact-route-packets-and-section-prototypes-frozen" &&
    preparation.contexts?.length === 10 &&
    analysis.status ===
      "v2.2.2-route-gate-passed-exact-section-packet-preparation-authorized" &&
    analysis.routes?.length === 10 &&
    analysis.authorization?.exactSectionPacketPreparation === true &&
    analysis.authorization?.sectionModelExecution === false &&
    execution.status === "ten-v2.2.2-route-contexts-passed" &&
    execution.validContexts === 10 &&
    execution.invalidContexts === 0 &&
    execution.attempts === 10 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.scoresDerived === 0 &&
    analysis.nextAuthorizedAction ===
      "prepare-and-freeze-ten-exact-v2.2.2-section-packets-model-free-only",
  "passing route gate does not authorize section packet preparation"
);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const guideBytes = await readFile(preparation.inputs.guide);
const sourcePreparation = JSON.parse(
  await readFile(preparation.inputs.sourcePreparation)
);
const chronologyGuideBytes = await readFile(
  sourcePreparation.inputs.chronologyFallbackGuide
);
const manualBytes = await readFile(sourcePreparation.inputs.inventoryManual);
const contexts = [];
const pendingWrites = [];
for (const prepared of preparation.contexts) {
  const routeRecord = analysis.routes.find(
    (route) => route.debateNumber === prepared.debateNumber
  );
  assertV4(routeRecord, `${prepared.debateNumber}: accepted route missing`);
  const [routeBytes, planSchemaBytes, sourcePacketBytes, censusBytes] =
    await Promise.all([
      readFile(routeRecord.output),
      readFile(prepared.sourceContext.planSchema),
      readFile(prepared.sourceContext.inventorySourcePacket),
      readFile(prepared.sourceContext.candidateCensus),
    ]);
  assertV4(
    sha256(routeBytes) === routeRecord.outputSha256 &&
      sha256(planSchemaBytes) === prepared.sourceContext.planSchemaSha256 &&
      sha256(sourcePacketBytes) ===
        prepared.sourceContext.inventorySourcePacketSha256 &&
      sha256(censusBytes) === prepared.sourceContext.candidateCensusSha256,
    `${prepared.debateNumber}: section source drifted`
  );
  const routeOutput = JSON.parse(routeBytes);
  const sectionSchema = buildV222InventorySectionSchema(
    JSON.parse(planSchemaBytes),
    routeOutput.routes
  );
  const sectionSchemaAudit = auditDecomposedStrictSchema(sectionSchema);
  const sectionSchemaBytes = compactJsonBytes(sectionSchema);
  const sectionSchemaPath = prepared.exactSectionSchema;
  const sectionPacketPath = prepared.exactSectionPacket;
  const copiedInputs = [
    {
      role: "inventory-source-packet",
      path: prepared.sourceContext.inventorySourcePacket,
      sha256: sha256(sourcePacketBytes),
      bytes: sourcePacketBytes.length,
    },
    {
      role: "complete-candidate-census",
      path: prepared.sourceContext.candidateCensus,
      sha256: sha256(censusBytes),
      bytes: censusBytes.length,
    },
    {
      role: "chronology-fallback-inventory-guide",
      path: sourcePreparation.inputs.chronologyFallbackGuide,
      sha256: sha256(chronologyGuideBytes),
      bytes: chronologyGuideBytes.length,
    },
    {
      role: "inventory-manual",
      path: sourcePreparation.inputs.inventoryManual,
      sha256: sha256(manualBytes),
      bytes: manualBytes.length,
    },
    {
      role: "route-section-plan-guide",
      path: preparation.inputs.guide,
      sha256: sha256(guideBytes),
      bytes: guideBytes.length,
    },
    {
      role: "immutable-inventory-routes",
      path: routeRecord.output,
      sha256: sha256(routeBytes),
      bytes: routeBytes.length,
    },
    {
      role: "strict-section-output-schema",
      path: sectionSchemaPath,
      sha256: sha256(sectionSchemaBytes),
      bytes: sectionSchemaBytes.length,
    },
  ];
  const copiedInputBytes = copiedInputs.reduce(
    (sum, input) => sum + input.bytes,
    0
  );
  assertV4(
    copiedInputBytes <= 115000 &&
      copiedInputBytes <= prepared.sectionMaximumCopiedInputBytes &&
      sectionSchema.properties.inventoryRoutesSha256.const ===
        routeRecord.inventoryRoutesSha256,
    `${prepared.debateNumber}: exact section packet bound drifted`
  );
  const packet = {
    schemaVersion:
      "1.0-score-stability-v2.2.2-candidate-census-section-packet",
    protocolId: preparation.protocolId,
    stage: "inventory-sections",
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
    },
    isolation: {
      freshContextRequired: true,
      oneDebateOnly: true,
      scoreBlind: true,
      inventoryRoutesImmutable: true,
      routeExecutionMetadataUnavailable: true,
      otherDebateRoutesUnavailable: true,
      candidateEvidenceExcerptsUnavailable: true,
      candidateSelectionUnavailable: true,
      priorAndOtherJudgmentsUnavailable: true,
      failedV221PlanOutputsUnavailable: true,
      failedV221ExecutionMetadataUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    inventoryRoutesSha256: routeRecord.inventoryRoutesSha256,
    copiedInputs,
    copiedInputBytes,
    maximumCopiedInputBytes: 115000,
    writableDomains: ["sections"],
    output: prepared.sectionOutput,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  };
  const packetBytes = jsonBytes(packet);
  pendingWrites.push(
    { file: sectionSchemaPath, bytes: sectionSchemaBytes },
    { file: sectionPacketPath, bytes: packetBytes }
  );
  contexts.push({
    contextIndex: contexts.length,
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    routeOutput: routeRecord.output,
    routeOutputSha256: routeRecord.outputSha256,
    inventoryRoutesSha256: routeRecord.inventoryRoutesSha256,
    sectionSchema: sectionSchemaPath,
    sectionSchemaSha256: sha256(sectionSchemaBytes),
    sectionSchemaBytes: sectionSchemaBytes.length,
    sectionSchemaStrictObjectsAudited: sectionSchemaAudit.objectsAudited,
    sectionPacket: sectionPacketPath,
    sectionPacketSha256: sha256(packetBytes),
    sectionPacketBytes: packetBytes.length,
    sectionCopiedInputBytes: copiedInputBytes,
    sectionOutput: prepared.sectionOutput,
    composedPlanOutput: prepared.composedPlanOutput,
    exactSectionSchemaFrozen: true,
    exactSectionPacketFrozen: true,
    sourceContext: structuredClone(prepared.sourceContext),
  });
}
assertV4(
  contexts.length === 10 &&
    contexts.every(
      (context) =>
        context.exactSectionSchemaFrozen && context.exactSectionPacketFrozen
    ),
  "exact section packet cardinality drifted"
);

const futureOutputs = [
  `${ROOT}/section-execution-preparation-manifest.json`,
  `${ROOT}/section-execution-activation.json`,
  `${ROOT}/section-model-execution.json`,
  `${ROOT}/plan-analysis.json`,
  ...contexts.flatMap((context) => [
    context.sectionOutput,
    context.composedPlanOutput,
  ]),
];
for (const output of futureOutputs) {
  assertV4(!(await exists(output)), `future output already exists: ${output}`);
}
const sourceFiles = [
  PREPARATION,
  ROUTE_ANALYSIS,
  ROUTE_EXECUTION,
  SCRIPT,
  TEST,
  preparation.inputs.guide,
  sourcePreparation.inputs.chronologyFallbackGuide,
  sourcePreparation.inputs.inventoryManual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs",
  ...contexts.flatMap((context) => [
    context.routeOutput,
    context.sourceContext.inventorySourcePacket,
    context.sourceContext.candidateCensus,
    context.sourceContext.planSchema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const sectionPreparation = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-exact-section-packet-preparation",
  protocolId: preparation.protocolId,
  status: shouldWrite
    ? "ten-exact-v2.2.2-section-packets-frozen-not-authorized"
    : "preview",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  failedGateDisposition: structuredClone(preparation.failedGateDisposition),
  proposedPolicy: {
    ...structuredClone(preparation.proposedPolicy),
    promoted: false,
  },
  model: structuredClone(preparation.model),
  inputs: {
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    routeAnalysis: ROUTE_ANALYSIS,
    routeAnalysisSha256: sha256(analysisBytes),
    routeExecution: ROUTE_EXECUTION,
    routeExecutionSha256: sha256(executionBytes),
  },
  contexts,
  sourceHashes,
  totals: {
    debates: 10,
    acceptedRoutes: 10,
    exactSectionSchemasFrozen: 10,
    exactSectionPacketsFrozen: 10,
    sectionModelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  authorization: {
    sectionExecutionManifestPreparation: true,
    sectionExecutionActivation: false,
    sectionModelExecution: false,
    planComposition: false,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    scoreDerivation: false,
    policyPromotion: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-v2.2.2-section-execution-manifest-model-free-only",
};
if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(SECTION_PREPARATION, jsonBytes(sectionPreparation));
}
console.log(
  JSON.stringify(
    {
      status: sectionPreparation.status,
      debates: 10,
      exactSectionSchemasFrozen: 10,
      exactSectionPacketsFrozen: 10,
      maximumSectionCopiedInputBytes: Math.max(
        ...contexts.map((context) => context.sectionCopiedInputBytes)
      ),
      sectionModelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: sectionPreparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
