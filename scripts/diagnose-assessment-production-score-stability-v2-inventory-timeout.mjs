#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const BASE =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory";
const RECOVERY =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery";
const EXECUTION_MANIFEST = `${BASE}/execution-manifest.json`;
const EXECUTION = `${BASE}/model-execution.json`;
const PREPARATION = `${BASE}/preparation-manifest.json`;
const OUTPUT = `${RECOVERY}/timeout-diagnosis.json`;
const HISTORICAL_TIMEOUT =
  "docs/calibration/v4.2.21.14/narrow-primary-successor/timeout-analysis.json";
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2-inventory-timeout.mjs";
const COLUMN_ORDER = Object.freeze([
  "qualifiedCandidateId",
  "side",
  "speaker",
  "discoveryMoveKindAdvisory",
  "proposedProposition",
  "sourceSpan.startEvent",
  "sourceSpan.endEvent",
  "loadBearingLevel",
  "loadBearingReason",
  "responseIntent.kind",
  "responseIntent.earlierTargetDescription",
  "contextSummary",
  "candidateEvidence.excerpt",
  "candidateEvidence.sourceExact",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const getPath = (value, dottedPath) =>
  dottedPath.split(".").reduce((current, key) => current[key], value);
function setPath(value, dottedPath, fieldValue) {
  const keys = dottedPath.split(".");
  let current = value;
  for (let index = 0; index < keys.length - 1; index += 1) {
    current[keys[index]] ??= {};
    current = current[keys[index]];
  }
  current[keys.at(-1)] = fieldValue;
}

function buildColumnarTransport(source) {
  return {
    schemaVersion: "1.0-lossless-columnar-candidate-evidence-transport",
    sourceSchemaVersion: source.schemaVersion,
    protocolId: source.protocolId,
    debateNumber: source.debateNumber,
    debateId: source.debateId,
    candidateCount: source.candidateCount,
    completeSourceDiscovery: structuredClone(source.completeSourceDiscovery),
    transportPolicy: structuredClone(source.transportPolicy),
    columnOrder: [...COLUMN_ORDER],
    candidateRows: source.candidates.map((candidate) =>
      COLUMN_ORDER.map((field) => getPath(candidate, field))
    ),
  };
}

function decodeColumnarTransport(columnar) {
  assertV4(
    JSON.stringify(columnar.columnOrder) === JSON.stringify(COLUMN_ORDER),
    `${columnar.debateNumber}: column order drifted`
  );
  return {
    schemaVersion: columnar.sourceSchemaVersion,
    protocolId: columnar.protocolId,
    debateNumber: columnar.debateNumber,
    debateId: columnar.debateId,
    candidateCount: columnar.candidateCount,
    completeSourceDiscovery: structuredClone(columnar.completeSourceDiscovery),
    candidates: columnar.candidateRows.map((row) => {
      assertV4(
        row.length === COLUMN_ORDER.length,
        `${columnar.debateNumber}: columnar row width drifted`
      );
      const candidate = {};
      COLUMN_ORDER.forEach((field, index) => setPath(candidate, field, row[index]));
      return candidate;
    }),
    transportPolicy: structuredClone(columnar.transportPolicy),
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function overlapUnionMs(target, others) {
  const start = Date.parse(target.startedAt);
  const end = Date.parse(target.completedAt);
  const intersections = others
    .map((other) => [
      Math.max(start, Date.parse(other.startedAt)),
      Math.min(end, Date.parse(other.completedAt)),
    ])
    .filter(([left, right]) => right > left)
    .sort((left, right) => left[0] - right[0]);
  const merged = [];
  for (const interval of intersections) {
    const prior = merged.at(-1);
    if (!prior || interval[0] > prior[1]) merged.push([...interval]);
    else prior[1] = Math.max(prior[1], interval[1]);
  }
  return merged.reduce((sum, [left, right]) => sum + right - left, 0);
}

if (shouldWrite) {
  assertV4(
    !(await access(OUTPUT).then(() => true, () => false)),
    `${OUTPUT} already exists; diagnosis is immutable`
  );
}

const [manifestBytes, executionBytes, preparationBytes, historicalBytes] =
  await Promise.all([
    readFile(EXECUTION_MANIFEST),
    readFile(EXECUTION),
    readFile(PREPARATION),
    readFile(HISTORICAL_TIMEOUT),
  ]);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const historical = JSON.parse(historicalBytes);

assertV4(
  execution.status ===
      "v2-validation-score-blind-inventory-complete-with-failure" &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 10 &&
    execution.validContexts === 9 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.rampPassed === false &&
    execution.scoresDerived === 0 &&
    execution.currentCanaryReclassified === false &&
    execution.proposedPolicyPromoted === false &&
    execution.authorization?.retry === false &&
    execution.authorization?.independentJudgmentPacketPreparation === false,
  "expected failed v2 inventory execution is unavailable"
);
assertV4(
  manifest.model?.label === "5.6 Sol" &&
    manifest.model?.slug === "gpt-5.6-sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
    manifest.executionPolicy?.retriesMaximum === 0,
  "frozen model or execution boundary drifted"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash drift: ${file}`);
}
const failed = execution.results.filter((result) => !result.accepted);
const valid = execution.results.filter((result) => result.accepted);
assertV4(
  failed.length === 1 &&
    failed[0].debateNumber === "137" &&
    failed[0].status === "timed-out" &&
    failed[0].timedOut === true &&
    failed[0].elapsedMs >= 600000 &&
    failed[0].proposalWritten === false &&
    failed[0].stdoutSha256 === sha256(Buffer.alloc(0)) &&
    failed[0].terminationSignal === "SIGTERM",
  "Debate 137 timeout record drifted"
);
assertV4(
  !(await access(`${BASE}/inventory-proposals/debate-137.json`).then(
    () => true,
    () => false
  )) &&
    !(await access(`${BASE}/locked-inventories/debate-137.json`).then(
      () => true,
      () => false
    )),
  "Debate 137 unexpectedly has a partial accepted artifact"
);
assertV4(
  historical.interpretation?.retryAuthorized === false &&
    historical.interpretation?.timeoutExtensionRecommended === false &&
    historical.interpretation?.validOutputReusableInSuccessorGate === false &&
    historical.successorRecommendation?.rerunAllThreeFresh === true,
  "historical timeout-recovery precedent drifted"
);

const transportComparisons = [];
for (const context of preparation.contexts) {
  const sourceBytes = await readFile(context.modelCandidateTransport);
  const source = JSON.parse(sourceBytes);
  const columnar = buildColumnarTransport(source);
  const decoded = decodeColumnarTransport(columnar);
  assertV4(
    isDeepStrictEqual(decoded, source),
    `${context.debateNumber}: columnar round-trip changed semantics`
  );
  const columnarBytes = compactBytes(columnar);
  transportComparisons.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    originalTransportBytes: sourceBytes.length,
    columnarTransportBytes: columnarBytes.length,
    savingsBytes: sourceBytes.length - columnarBytes.length,
    savingsFraction: Number(
      ((sourceBytes.length - columnarBytes.length) / sourceBytes.length).toFixed(4)
    ),
    originalCopiedInputBytes: context.copiedInputBytes,
    projectedCopiedInputBytes:
      context.copiedInputBytes - sourceBytes.length + columnarBytes.length,
  });
}
const failedContext = preparation.contexts.find(
  (context) => context.debateNumber === failed[0].debateNumber
);
const overlapMs = overlapUnionMs(failed[0], valid);
const validElapsed = valid.map((result) => result.elapsedMs);
const maximumCandidates = Math.max(
  ...preparation.contexts.map((context) => context.candidates)
);
const maximumCopiedInputBytes = Math.max(
  ...preparation.contexts.map((context) => context.copiedInputBytes)
);
const maximumSchemaBytes = Math.max(
  ...preparation.contexts.map((context) => context.schemaBytes)
);
const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2-inventory-timeout-failure-diagnosis",
  protocolId: manifest.protocolId,
  status:
    "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized",
  diagnosedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateResultPreserved: {
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    status: execution.status,
    contextsPlanned: 10,
    contextsAttempted: 10,
    validContexts: 9,
    invalidContexts: 1,
    retries: 0,
    scoresDerived: 0,
    originalCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  failedContext: {
    debateNumber: failed[0].debateNumber,
    status: failed[0].status,
    elapsedMs: failed[0].elapsedMs,
    timeoutMsApplied: failed[0].timeoutMsApplied,
    terminationSignal: failed[0].terminationSignal,
    stdoutEmpty: failed[0].stdoutSha256 === sha256(Buffer.alloc(0)),
    resultWritten: false,
    proposalWritten: false,
    candidates: failedContext.candidates,
    copiedInputBytes: failedContext.copiedInputBytes,
    schemaBytes: failedContext.schemaBytes,
    sourceComplexityBand: failedContext.sourceComplexityBand,
    overlapWithOtherContextsMs: overlapMs,
    executionWithoutOtherActiveContextsMs: failed[0].elapsedMs - overlapMs,
  },
  cohortDiagnostics: {
    validContextElapsedMsMinimum: Math.min(...validElapsed),
    validContextElapsedMsMedian: median(validElapsed),
    validContextElapsedMsMaximum: Math.max(...validElapsed),
    failedContextHasMaximumCandidateCount:
      failedContext.candidates === maximumCandidates,
    failedContextHasMaximumCopiedInputBytes:
      failedContext.copiedInputBytes === maximumCopiedInputBytes,
    failedContextHasMaximumSchemaBytes:
      failedContext.schemaBytes === maximumSchemaBytes,
    largestCandidateCount: maximumCandidates,
    largestCopiedInputBytes: maximumCopiedInputBytes,
    largestSchemaBytes: maximumSchemaBytes,
    deterministicPacketSizeOrConcurrencyCauseEstablished: false,
    exactCause: "indeterminate-no-result-or-progress-output-before-timeout",
  },
  historicalPrecedent: {
    source: HISTORICAL_TIMEOUT,
    sourceSha256: sha256(historicalBytes),
    retryRejected: true,
    timeoutExtensionRejected: true,
    priorValidOutputsNotReusableInSuccessor: true,
    fullFreshSuccessorRequired: true,
  },
  columnarTransportPrototype: {
    representation: "lossless compact JSON column order plus candidate rows",
    everyCandidateRetained: true,
    everyOriginalModelVisibleFieldRetained: true,
    rowOrderPreserved: true,
    semanticCandidateDownselectionPerformed: false,
    parsedRoundTripIdentityVerified: true,
    columnOrder: [...COLUMN_ORDER],
    contexts: transportComparisons,
    originalMaximumCopiedInputBytes: Math.max(
      ...transportComparisons.map((context) => context.originalCopiedInputBytes)
    ),
    projectedMaximumCopiedInputBytes: Math.max(
      ...transportComparisons.map((context) => context.projectedCopiedInputBytes)
    ),
    minimumTransportSavingsFraction: Math.min(
      ...transportComparisons.map((context) => context.savingsFraction)
    ),
  },
  requiredSuccessorDesign: {
    fullTenContextFreshExecution: true,
    priorNineValidOutputsReusableForSuccessorAcceptance: false,
    failedContextAttemptTreatedAsRetry: false,
    sameTenDebates: true,
    sameInventorySemantics: true,
    sameOutputSchemaAndDeterministicValidator: true,
    sameModel: "5.6 Sol",
    sameReasoningEffort: "low",
    sameAuthentication: "ChatGPT subscription",
    samePerContextTimeoutMs: 600000,
    timeoutExtensionAuthorized: false,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    allPriorInventoryOutputsUnavailableToSuccessorModels: true,
    onlyTransportSerializationMayChange: true,
    allCandidatesAndFieldsMustRoundTripExactly: true,
  },
  sourceHashes: {
    [EXECUTION_MANIFEST]: sha256(manifestBytes),
    [EXECUTION]: sha256(executionBytes),
    [PREPARATION]: sha256(preparationBytes),
    [HISTORICAL_TIMEOUT]: sha256(historicalBytes),
    [SCRIPT]: sha256(await readFile(SCRIPT)),
  },
  totals: {
    modelContexts: 0,
    retries: 0,
    corrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    columnarRecoveryTransportPreparation: true,
    recoveryExecutionManifest: false,
    recoveryModelExecution: false,
    retry: false,
    timeoutExtension: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
};

if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, jsonBytes(diagnosis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      failedContext: diagnosis.failedContext,
      cohortDiagnostics: diagnosis.cohortDiagnostics,
      columnarTransportPrototype: {
        originalMaximumCopiedInputBytes:
          diagnosis.columnarTransportPrototype.originalMaximumCopiedInputBytes,
        projectedMaximumCopiedInputBytes:
          diagnosis.columnarTransportPrototype.projectedMaximumCopiedInputBytes,
        minimumTransportSavingsFraction:
          diagnosis.columnarTransportPrototype.minimumTransportSavingsFraction,
      },
      retryAuthorized: false,
      timeoutExtensionAuthorized: false,
      fullFreshTenContextSuccessorRequired: true,
      modelContexts: 0,
      scoresDerived: 0,
    },
    null,
    2
  )
);
