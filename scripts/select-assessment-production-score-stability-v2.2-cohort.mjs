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
  "docs/assessment-production/score-stability-v2.2-validation-cohort";
const OUTPUT = `${ROOT}/selection.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const POLICY_AUDIT =
  "docs/assessment-production/score-stability-policy-v2.2-retrospective-audit.json";
const SUCCESSOR_ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development/development-analysis.json";
const PRODUCTION_CANARY_INVENTORY =
  "docs/assessment-production/canary-v1-inventory/analysis.json";
const PRIOR_SELECTIONS = Object.freeze([
  [
    "v2",
    "docs/assessment-production/score-stability-v2-validation-cohort/selection.json",
    "fresh-disjoint-ten-debate-cohort-source-gate-passed",
  ],
  [
    "v2.1",
    "docs/assessment-production/score-stability-v2.1-validation-cohort/selection.json",
    "fresh-disjoint-v2.1-ten-debate-cohort-source-gate-passed",
  ],
  [
    "v2.1.1",
    "docs/assessment-production/score-stability-v2.1.1-validation-cohort/selection.json",
    "fresh-disjoint-v2.1.1-ten-debate-cohort-source-gate-passed",
  ],
  [
    "v2.1.2",
    "docs/assessment-production/score-stability-v2.1.2-validation-cohort/selection.json",
    "fresh-disjoint-v2.1.2-ten-debate-cohort-source-gate-passed",
  ],
  [
    "v2.1.3",
    "docs/assessment-production/score-stability-v2.1.3-validation-cohort/selection.json",
    "fresh-disjoint-v2.1.3-ten-debate-cohort-source-gate-passed",
  ],
]);
const SCRIPT =
  "scripts/select-assessment-production-score-stability-v2.2-cohort.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2-cohort.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; selection is immutable`);
}

const sourcePaths = [
  PRODUCTION_MANIFEST,
  POLICY,
  POLICY_AUDIT,
  SUCCESSOR_ANALYSIS,
  PRODUCTION_CANARY_INVENTORY,
  ...PRIOR_SELECTIONS.map(([, file]) => file),
  SCRIPT,
  TEST,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(file)])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);
const policyAudit = JSON.parse(sourceBytes[POLICY_AUDIT]);
const successorAnalysis = JSON.parse(sourceBytes[SUCCESSOR_ANALYSIS]);
const canaryInventory = JSON.parse(sourceBytes[PRODUCTION_CANARY_INVENTORY]);
const priorSelections = PRIOR_SELECTIONS.map(([version, file, status]) => ({
  version,
  file,
  status,
  document: JSON.parse(sourceBytes[file]),
}));

assertV4(
  productionManifest.schemaVersion ===
      "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.model?.label === "5.6 Sol" &&
    productionManifest.model?.slug === "gpt-5.6-sol" &&
    productionManifest.model?.reasoningEffort === "low" &&
    productionManifest.model?.authentication === "ChatGPT subscription" &&
    policyAudit.status ===
      "retrospective-diagnostic-supports-v2.2-fresh-validation-still-required" &&
    policyAudit.authorization?.freshDisjointCohortSelection === true &&
    policyAudit.authorization?.freshValidationManifestPreparation === false &&
    policyAudit.authorization?.modelExecution === false &&
    policyAudit.authorization?.paidTranscription === false &&
    policyAudit.authorization?.scoreRerun === false &&
    policyAudit.authorization?.v213Reclassification === false &&
    successorAnalysis.status ===
      "chronology-fallback-successor-development-passed-fresh-disjoint-cohort-selection-authorized" &&
    successorAnalysis.authorization?.freshDisjointCohortSelection === true &&
    successorAnalysis.authorization?.successorModelExecution === false &&
    successorAnalysis.totals?.modelContextsExecuted === 0 &&
    successorAnalysis.totals?.scoresDerived === 0 &&
    successorAnalysis.preservedExecutionBoundary?.model?.label === "5.6 Sol" &&
    successorAnalysis.preservedExecutionBoundary?.model?.slug ===
      "gpt-5.6-sol" &&
    successorAnalysis.preservedExecutionBoundary?.model?.reasoningEffort ===
      "low" &&
    successorAnalysis.preservedExecutionBoundary?.model?.authentication ===
      "ChatGPT subscription" &&
    successorAnalysis.preservedExecutionBoundary?.model?.scoreBlind === true &&
    Object.values(successorAnalysis.preservedExecutionBoundary.stopRules).every(Boolean) &&
    canaryInventory.status ===
      "ten-production-canary-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" &&
    canaryInventory.debates?.length === 10 &&
    priorSelections.every(
      ({ status, document }) =>
        document.status === status && document.selected?.length === 10
    ),
  "v2.2 cohort selection is unauthorized or its source boundary drifted"
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
const priorValidationCohorts = priorSelections.map(
  ({ version, document }) => ({
    version,
    debates: new Set(document.selected.map((item) => item.debateNumber)),
  })
);
const observedDebates = new Set([
  ...calibrationObservedDebates,
  ...productionCanaryDebates,
  ...priorValidationCohorts.flatMap(({ debates }) => [...debates]),
]);
assertV4(
  productionCanaryDebates.size === 10 &&
    priorValidationCohorts.every(({ debates }) => debates.size === 10) &&
    priorValidationCohorts.every(({ debates }, index) =>
      [...debates].every(
        (number) =>
          !productionCanaryDebates.has(number) &&
          priorValidationCohorts.every(
            ({ debates: other }, otherIndex) =>
              index === otherIndex || !other.has(number)
          )
      )
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
  assertV4(events.length > 0, `Debate ${item.debateNumber}: no canonical events`);
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
        Object.values(item.sourceGate).every(Boolean) &&
        !observedDebates.has(item.debateNumber)
    ),
  "v2.2 cohort is not fresh, disjoint, dyadic, and source-gated"
);

const selection = {
  schemaVersion: "1.0-score-stability-v2.2-validation-cohort-selection",
  protocolId:
    "assessment-production-score-stability-v2.2-fresh-validation-selection",
  status: "fresh-disjoint-v2.2-ten-debate-cohort-source-gate-passed",
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
    version: "v2.2-proposal",
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    agreedInitialTieImposesNoDirectionConstraint: true,
    numericalThresholdsChanged: false,
    promoted: false,
  },
  successorProtocol: {
    analysis: SUCCESSOR_ANALYSIS,
    sha256: successorSeedSha256,
    version: "v2.1.3-chronology-fallback",
    inheritedDiscoveryVersion: "v2.1.2-bounded-end-discovery",
    planAndSideIsolationPreserved: true,
    preferredMoveKindModelAuthored: true,
    constructiveFallbackModelAuthored: true,
    fallbackConditionRepositoryOwned: true,
    fallbackAppliedOnlyToRetainedOrphanReply: true,
  },
  selectionPolicy: {
    cohortSize: 10,
    dyadicOnly: true,
    pendingReassessmentOnly: true,
    acceptedCalibrationExcluded: true,
    productionCanaryExcluded: true,
    everyPriorValidationCohortExcluded: true,
    calibrationObservationMethod:
      "valid corpus debate numbers embedded in docs/calibration artifact filenames",
    calibrationArtifactPathInventorySha256: sha256(
      Buffer.from(`${calibrationPaths.join("\n")}\n`)
    ),
    calibrationObservedDebateNumbers: [...calibrationObservedDebates].sort(),
    productionCanaryDebateNumbers: [...productionCanaryDebates].sort(),
    priorValidationCohorts: Object.fromEntries(
      priorValidationCohorts.map(({ version, debates }) => [
        version,
        [...debates].sort(),
      ])
    ),
    observedDebateNumbers: [...observedDebates].sort(),
    eligibleCandidateCount: eligible.length,
    deterministicRank:
      "SHA-256(v2.2 policy hash | v2.1.3 successor analysis hash | debate number | debate id), ascending",
    replacementAfterSourceGateFailureAllowed: false,
    transcriptContentSemanticallyInspected: false,
    legacyAssessmentAccessed: false,
    scoreAccessed: false,
    winnerAccessed: false,
  },
  modelBoundary: {
    ...structuredClone(successorAnalysis.preservedExecutionBoundary.model),
    apiKeysRemoved: true,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
  },
  stopRules: structuredClone(
    successorAnalysis.preservedExecutionBoundary.stopRules
  ),
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
    "prepare-v2.2-source-packets-token-ledgers-and-schemas-model-free-only",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(selection, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? selection.status : "preview",
      selectedDebates: selected.map((item) => item.debateNumber),
      eligibleCandidateCount: eligible.length,
      eventCount: selection.totals.eventCount,
      durationHours: selection.totals.durationHours,
      sourceGateFailures: 0,
      modelContexts: 0,
      scoresDerived: 0,
      nextAuthorizedAction: selection.nextAuthorizedAction,
    },
    null,
    2
  )
);
