#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const OUTPUT = `${ROOT}/selection.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md";
const SUCCESSOR_ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.1-discovery-successor-development/development-analysis.json";
const PRODUCTION_CANARY_INVENTORY =
  "docs/assessment-production/canary-v1-inventory/analysis.json";
const V2_SELECTION =
  "docs/assessment-production/score-stability-v2-validation-cohort/selection.json";
const V21_SELECTION =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/selection.json";
const SCRIPT =
  "scripts/select-assessment-production-score-stability-v2.1.1-cohort.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-cohort.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(
  () => true,
  () => false
);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; selection is immutable`);
}

const sourcePaths = [
  PRODUCTION_MANIFEST,
  POLICY,
  SUCCESSOR_ANALYSIS,
  PRODUCTION_CANARY_INVENTORY,
  V2_SELECTION,
  V21_SELECTION,
  SCRIPT,
  TEST,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(file)])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);
const successorAnalysis = JSON.parse(sourceBytes[SUCCESSOR_ANALYSIS]);
const canaryInventory = JSON.parse(sourceBytes[PRODUCTION_CANARY_INVENTORY]);
const v2Selection = JSON.parse(sourceBytes[V2_SELECTION]);
const v21Selection = JSON.parse(sourceBytes[V21_SELECTION]);

assertV4(
  productionManifest.schemaVersion ===
      "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.model?.label === "5.6 Sol" &&
    productionManifest.model?.slug === "gpt-5.6-sol" &&
    productionManifest.model?.reasoningEffort === "low" &&
    productionManifest.model?.authentication === "ChatGPT subscription" &&
    successorAnalysis.status ===
      "v2.1.1-repository-materialized-discovery-successor-model-free-regression-passed" &&
    successorAnalysis.authorization?.freshDisjointCohortSelection === true &&
    successorAnalysis.authorization?.freshSourcePreparation === false &&
    successorAnalysis.authorization?.discoveryModelExecution === false &&
    successorAnalysis.totals?.modelContexts === 0 &&
    canaryInventory.status ===
      "ten-production-canary-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" &&
    canaryInventory.debates?.length === 10 &&
    v2Selection.status === "fresh-disjoint-ten-debate-cohort-source-gate-passed" &&
    v2Selection.selected?.length === 10 &&
    v21Selection.status ===
      "fresh-disjoint-v2.1-ten-debate-cohort-source-gate-passed" &&
    v21Selection.selected?.length === 10,
  "v2.1.1 cohort selection is unauthorized or its source boundary drifted"
);

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

const calibrationPaths = (await walkFiles("docs/calibration")).sort();
const calibrationObservedDebates = new Set();
for (const file of calibrationPaths) {
  const match = file.match(/debate-(\d{1,3})/);
  if (!match) continue;
  const number = Number(match[1]);
  if (number >= 1 && number <= productionManifest.scope.corpusDebates) {
    calibrationObservedDebates.add(String(number).padStart(2, "0"));
  }
}
const productionCanaryDebates = new Set(
  canaryInventory.debates.map((debate) => debate.debateNumber)
);
const failedV2ValidationDebates = new Set(
  v2Selection.selected.map((item) => item.debateNumber)
);
const failedV21ValidationDebates = new Set(
  v21Selection.selected.map((item) => item.debateNumber)
);
const observedDebates = new Set([
  ...calibrationObservedDebates,
  ...productionCanaryDebates,
  ...failedV2ValidationDebates,
  ...failedV21ValidationDebates,
]);
assertV4(
  productionCanaryDebates.size === 10 &&
    failedV2ValidationDebates.size === 10 &&
    failedV21ValidationDebates.size === 10 &&
    [...productionCanaryDebates].every(
      (number) => !failedV2ValidationDebates.has(number)
    ) &&
    [...failedV21ValidationDebates].every(
      (number) =>
        !productionCanaryDebates.has(number) &&
        !failedV2ValidationDebates.has(number)
    ),
  "observed production and validation cohorts are not disjoint"
);

const policySeedSha256 = sha256(sourceBytes[POLICY]);
const successorSeedSha256 = sha256(sourceBytes[SUCCESSOR_ANALYSIS]);
const eligible = productionManifest.items
  .filter(
    (item) =>
      item.speakerCount === 2 &&
      item.disposition === "pending-reassessment" &&
      item.acceptedCalibration === null &&
      !observedDebates.has(item.debateNumber)
  )
  .map((item) => ({
    item,
    rankSha256: sha256(
      `${policySeedSha256}|${successorSeedSha256}|${item.debateNumber}|${item.debateId}`
    ),
  }))
  .sort(
    (left, right) =>
      left.rankSha256.localeCompare(right.rankSha256) ||
      left.item.debateNumber.localeCompare(right.item.debateNumber)
  );
assertV4(eligible.length >= 10, "fewer than ten fresh dyadic debates remain");

const selected = [];
const sourceHashes = Object.fromEntries(
  sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
);
for (const { item, rankSha256 } of eligible.slice(0, 10)) {
  const [transcriptBytes, eventsBytes, localManifestBytes] = await Promise.all([
    readFile(item.sourceChain.transcript),
    readFile(item.sourceChain.events),
    readFile(item.sourceChain.manifest),
  ]);
  assertV4(
    sha256(transcriptBytes) === item.sourceChain.transcriptSha256,
    `Debate ${item.debateNumber}: transcript hash mismatch`
  );
  assertV4(
    sha256(eventsBytes) === item.sourceChain.eventsSha256,
    `Debate ${item.debateNumber}: events hash mismatch`
  );
  assertV4(
    sha256(localManifestBytes) === item.sourceChain.manifestSha256,
    `Debate ${item.debateNumber}: local manifest hash mismatch`
  );
  const events = normalizeV418Events(JSON.parse(eventsBytes));
  const durationMs = Math.max(
    ...events.map((event) => event.startMs + event.durationMs)
  );
  sourceHashes[item.sourceChain.transcript] = sha256(transcriptBytes);
  sourceHashes[item.sourceChain.events] = sha256(eventsBytes);
  sourceHashes[item.sourceChain.manifest] = sha256(localManifestBytes);
  selected.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    motion: item.motion,
    sides: structuredClone(item.sides),
    speakerCount: item.speakerCount,
    rankSha256,
    eventCount: events.length,
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
    sourceChain: structuredClone(item.sourceChain),
    sourceGate: {
      transcriptPresentAndHashMatched: true,
      eventsPresentAndHashMatched: true,
      localManifestPresentAndHashMatched: true,
      canonicalEventProjectionNonempty: true,
    },
  });
}

assertV4(
  selected.length === 10 &&
    new Set(selected.map((item) => item.debateNumber)).size === 10 &&
    selected.every(
      (item) =>
        item.speakerCount === 2 &&
        item.sourceGate.transcriptPresentAndHashMatched &&
        item.sourceGate.eventsPresentAndHashMatched &&
        item.sourceGate.localManifestPresentAndHashMatched &&
        !observedDebates.has(item.debateNumber)
    ),
  "v2.1.1 cohort is not fresh, disjoint, dyadic, and source-gated"
);

const selection = {
  schemaVersion: "1.0-score-stability-v2.1.1-validation-cohort-selection",
  protocolId:
    "assessment-production-score-stability-v2.1.1-fresh-validation-selection",
  status: "fresh-disjoint-v2.1.1-ten-debate-cohort-source-gate-passed",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  policy: {
    path: POLICY,
    sha256: policySeedSha256,
    version: "v2.1-proposal",
    everyIntegerRoundedTieAccepted: true,
    promoted: false,
  },
  successorProtocol: {
    analysis: SUCCESSOR_ANALYSIS,
    sha256: successorSeedSha256,
    version: "v2.1.1-repository-materialized-discovery",
    minimumRequestedLexicalTokens: 12,
    modelAuthoredEndEvent: false,
    predecessorOwnershipRuleExplicit: true,
    retiredArtifactsReusableForAcceptance: false,
    retiredArtifactsReusableAsFreshModelInput: false,
  },
  selectionPolicy: {
    cohortSize: 10,
    dyadicOnly: true,
    pendingReassessmentOnly: true,
    acceptedCalibrationExcluded: true,
    productionCanaryExcluded: true,
    failedV2ValidationCohortExcluded: true,
    failedV21ValidationCohortExcluded: true,
    calibrationObservationMethod:
      "valid corpus debate numbers embedded in docs/calibration artifact filenames",
    calibrationArtifactPathInventorySha256: sha256(
      Buffer.from(`${calibrationPaths.join("\n")}\n`)
    ),
    calibrationObservedDebateNumbers: [...calibrationObservedDebates].sort(),
    productionCanaryDebateNumbers: [...productionCanaryDebates].sort(),
    failedV2ValidationDebateNumbers: [...failedV2ValidationDebates].sort(),
    failedV21ValidationDebateNumbers: [...failedV21ValidationDebates].sort(),
    observedDebateNumbers: [...observedDebates].sort(),
    eligibleCandidateCount: eligible.length,
    deterministicRank:
      "SHA-256(v2.1 policy hash | v2.1.1 successor analysis hash | debate number | debate id), ascending",
    replacementAfterSourceGateFailureAllowed: false,
    transcriptContentSemanticallyInspected: false,
    legacyAssessmentAccessed: false,
    scoreAccessed: false,
    winnerAccessed: false,
  },
  modelBoundary: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    scoreBlind: true,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
  },
  selected,
  sourceHashes,
  totals: {
    debates: selected.length,
    eventCount: selected.reduce((sum, item) => sum + item.eventCount, 0),
    durationHours: Number(
      (
        selected.reduce((sum, item) => sum + item.durationSeconds, 0) / 3600
      ).toFixed(3)
    ),
    sourceGateFailures: 0,
    modelContexts: 0,
    paidTranscriptionCalls: 0,
    meteredApiCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    freshSourcePreparation: true,
    discoveryExecutionManifestPreparation: false,
    discoveryModelExecution: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-v2.1.1-source-packets-token-ledgers-and-schemas-model-free-only",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(selection, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? selection.status : "preview",
  eligibleCandidateCount: eligible.length,
  selected: selected.map((item) => ({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    eventCount: item.eventCount,
    durationSeconds: item.durationSeconds,
  })),
  totals: selection.totals,
  modelContextsExecuted: 0,
  scoresDerived: 0,
  nextAuthorizedAction: selection.nextAuthorizedAction,
}, null, 2));
