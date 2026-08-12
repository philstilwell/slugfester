#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const OUTPUT = `${ROOT}/selection.json`;
const FAILURE_OUTPUT = `${ROOT}/selection-failure.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const PROMOTION =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PRODUCTION_CANARY_INVENTORY =
  "docs/assessment-production/canary-v1-inventory/analysis.json";
const PROVEN_STOP_RULES =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/execution-activation.json";
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
  [
    "v2.2",
    "docs/assessment-production/score-stability-v2.2-validation-cohort/selection.json",
    "fresh-disjoint-v2.2-ten-debate-cohort-source-gate-passed",
  ],
]);
const SCRIPT = "scripts/select-assessment-production-checkpoint-v2.2.mjs";
const TEST = "scripts/test-assessment-production-checkpoint-v2.2.mjs";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(file).then(
    () => true,
    () => false
  );
if (shouldWrite) {
  assertV4(
    !(await exists(OUTPUT)) && !(await exists(FAILURE_OUTPUT)),
    `${ROOT} already contains an immutable production checkpoint selection result`
  );
}

const sourcePaths = [
  PRODUCTION_MANIFEST,
  WORKFLOW,
  POLICY,
  PROMOTION,
  PRODUCTION_CANARY_INVENTORY,
  PROVEN_STOP_RULES,
  ...PRIOR_SELECTIONS.map(([, file]) => file),
  SCRIPT,
  TEST,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(file)])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);
const promotion = JSON.parse(sourceBytes[PROMOTION]);
const canaryInventory = JSON.parse(sourceBytes[PRODUCTION_CANARY_INVENTORY]);
const provenStopRules = JSON.parse(sourceBytes[PROVEN_STOP_RULES]);
const priorSelections = PRIOR_SELECTIONS.map(([version, file, status]) => ({
  version,
  file,
  status,
  document: JSON.parse(sourceBytes[file]),
}));
assertV4(
  productionManifest.schemaVersion ===
      "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.model.label === "5.6 Sol" &&
    productionManifest.model.slug === "gpt-5.6-sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription" &&
    productionManifest.scope.firstCheckpointSize === 10 &&
    productionManifest.boundaries.dyadicOnly &&
    productionManifest.boundaries.legacyAssessmentUnavailableToModels &&
    productionManifest.boundaries.twoIndependentSolPasses &&
    productionManifest.boundaries.scoresAfterAdjudicationOnly &&
    productionManifest.boundaries.modelAuthoredScoresMaximum === 0 &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    promotion.activePolicy.normativeText === POLICY &&
    promotion.activePolicy.normativeTextSha256 === sha256(sourceBytes[POLICY]) &&
    promotion.productionScoreControl.scoreCalculationPasses === 1 &&
    !promotion.productionScoreControl.modelAuthoredScoresAllowed &&
    !promotion.productionScoreControl.thresholdMutationAllowed &&
    !promotion.productionScoreControl.resultDependentPolicyChangeAllowed &&
    !promotion.productionScoreControl.automaticRerunAllowed &&
    promotion.authorization.productionCheckpointSelection &&
    !promotion.authorization.productionPacketPreparation &&
    !promotion.authorization.modelExecution &&
    !promotion.authorization.productionMutation &&
    canaryInventory.status ===
      "ten-production-canary-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" &&
    canaryInventory.debates.length === 10 &&
    provenStopRules.status ===
      "frozen-twenty-v2.2.3-independent-judgment-contexts-authorized" &&
    Object.values(provenStopRules.stopRules).every(Boolean) &&
    priorSelections.every(
      ({ status, document }) =>
        document.status === status && document.selected.length === 10
    ),
  "new production checkpoint selection is unauthorized or its control boundary drifted"
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
const failedV1CanaryDebates = new Set(
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
  ...failedV1CanaryDebates,
  ...priorValidationCohorts.flatMap(({ debates }) => [...debates]),
]);
assertV4(
  failedV1CanaryDebates.size === 10 &&
    priorValidationCohorts.every(({ debates }) => debates.size === 10) &&
    priorValidationCohorts.every(({ debates }, index) =>
      [...debates].every(
        (number) =>
          !failedV1CanaryDebates.has(number) &&
          priorValidationCohorts.every(
            ({ debates: other }, otherIndex) =>
              index === otherIndex || !other.has(number)
          )
      )
    ),
  "production and validation cohort exclusions are not disjoint"
);

const policySeedSha256 = promotion.activePolicy.normativeTextSha256;
const promotionSeedSha256 = sha256(sourceBytes[PROMOTION]);
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
      `${policySeedSha256}|${promotionSeedSha256}|${item.debateNumber}|${item.debateId}`
    ),
  }))
  .sort(
    (left, right) =>
      left.rankSha256.localeCompare(right.rankSha256) ||
      left.item.debateNumber.localeCompare(right.item.debateNumber)
  );
assertV4(eligible.length >= 10, "fewer than ten fresh dyadic debates remain");

const selected = [];
const sourceGateFailures = [];
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
  sourceHashes[item.sourceChain.transcript] = sha256(transcriptBytes);
  sourceHashes[item.sourceChain.events] = sha256(eventsBytes);
  sourceHashes[item.sourceChain.manifest] = sha256(localManifestBytes);
  let events;
  try {
    events = normalizeV418Events(JSON.parse(eventsBytes));
  } catch (error) {
    sourceGateFailures.push({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      rankSha256,
      stage: "canonical-event-validation",
      message: error.message,
      sourceChain: structuredClone(item.sourceChain),
      sourceHashesMatchedBeforeCanonicalValidation: true,
    });
    continue;
  }
  assertV4(events.length > 0, `Debate ${item.debateNumber}: no canonical events`);
  const durationMs = Math.max(
    ...events.map((event) => event.startMs + event.durationMs)
  );
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
if (sourceGateFailures.length > 0) {
  const failure = {
    schemaVersion: "1.0-production-checkpoint-v2.2-selection-failure",
    protocolId: "assessment-production-checkpoint-v2.2-1-selection",
    status:
      "production-checkpoint-v2.2-source-gate-failed-selection-not-frozen",
    frozenAt: shouldWrite ? frozenAt : null,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    developmentValidationOnly: false,
    productionCanary: true,
    stagingOnly: true,
    activePolicy: {
      promotion: PROMOTION,
      promotionSha256: promotionSeedSha256,
      version: promotion.activePolicy.version,
      normativeText: POLICY,
      normativeTextSha256: policySeedSha256,
    },
    deterministicProspectiveSelection: eligible.slice(0, 10).map(
      ({ item, rankSha256 }) => ({
        debateNumber: item.debateNumber,
        debateId: item.debateId,
        videoId: item.videoId,
        rankSha256,
      })
    ),
    gate: {
      replacementsAllowed: false,
      replacementsPerformed: 0,
      transcriptContentSemanticallyInspected: false,
      legacyAssessmentAccessed: false,
      scoreAccessed: false,
      winnerAccessed: false,
      sourceGateFailures,
    },
    sourceHashes,
    totals: {
      prospectiveDebates: 10,
      sourceGatePassed: selected.length,
      sourceGateFailed: sourceGateFailures.length,
      modelContexts: 0,
      paidTranscriptionCalls: 0,
      meteredApiCostUsd: 0,
      scoresDerived: 0,
    },
    historicalDisposition: {
      failedV1CanaryReclassified: false,
      failedValidationCohortsReclassified: false,
    },
    authorization: {
      sourceFailureDiagnosis: true,
      sourceRepairPlanPreparation: true,
      sourceMutation: false,
      replacementSelection: false,
      checkpointManifestPreparation: false,
      sourcePacketPreparation: false,
      modelExecution: false,
      paidTranscription: false,
      scoreDerivation: false,
      publicationPacketPreparation: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
    nextAuthorizedAction:
      "prepare-source-repair-plan-for-failed-production-checkpoint-debate-model-free-only",
  };
  if (shouldWrite) {
    await mkdir(ROOT, { recursive: true });
    await writeFile(
      FAILURE_OUTPUT,
      `${JSON.stringify(failure, null, 2)}\n`
    );
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? failure.status : "preview-source-gate-failed",
        prospectiveSelectedDebates:
          failure.deterministicProspectiveSelection.map(
            (item) => item.debateNumber
          ),
        sourceGateFailures,
        replacementsPerformed: 0,
        modelContexts: 0,
        scoresDerived: 0,
        nextAuthorizedAction: failure.nextAuthorizedAction,
      },
      null,
      2
    )
  );
  process.exit(0);
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
  "production checkpoint is not fresh, disjoint, dyadic, and source-gated"
);

const selection = {
  schemaVersion: "1.0-production-checkpoint-v2.2-selection",
  protocolId: "assessment-production-checkpoint-v2.2-1-selection",
  status:
    "fresh-disjoint-ten-debate-production-checkpoint-v2.2-source-gate-passed",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  activePolicy: {
    promotion: PROMOTION,
    promotionSha256: promotionSeedSha256,
    version: promotion.activePolicy.version,
    normativeText: POLICY,
    normativeTextSha256: policySeedSha256,
    thresholds: structuredClone(promotion.activePolicy.thresholds),
    winnerRule: structuredClone(promotion.activePolicy.winnerRule),
  },
  selectionPolicy: {
    cohortSize: 10,
    dyadicOnly: true,
    pendingReassessmentOnly: true,
    acceptedCalibrationExcluded: true,
    failedV1CanaryExcluded: true,
    everyValidationCohortExcluded: true,
    calibrationObservationMethod:
      "valid corpus debate numbers embedded in docs/calibration artifact filenames",
    calibrationArtifactPathInventorySha256: sha256(
      Buffer.from(`${calibrationPaths.join("\n")}\n`)
    ),
    calibrationObservedDebateNumbers: [...calibrationObservedDebates].sort(),
    failedV1CanaryDebateNumbers: [...failedV1CanaryDebates].sort(),
    priorValidationCohorts: Object.fromEntries(
      priorValidationCohorts.map(({ version, debates }) => [
        version,
        [...debates].sort(),
      ])
    ),
    observedDebateNumbers: [...observedDebates].sort(),
    eligibleCandidateCount: eligible.length,
    deterministicRank:
      "SHA-256(active v2.2 normative-text hash | v2.2 promotion-record hash | debate number | debate id), ascending",
    replacementAfterSourceGateFailureAllowed: false,
    transcriptContentSemanticallyInspected: false,
    legacyAssessmentAccessed: false,
    scoreAccessed: false,
    winnerAccessed: false,
  },
  modelBoundary: {
    ...structuredClone(productionManifest.model),
    scoreBlind: true,
    apiKeysRemoved: true,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
  },
  stopRules: structuredClone(provenStopRules.stopRules),
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
  historicalDisposition: {
    failedV1CanaryReclassified: false,
    failedValidationCohortsReclassified: false,
  },
  authorization: {
    checkpointManifestPreparation: true,
    sourcePacketPreparation: false,
    discoveryModelExecution: false,
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
    publicationPacketPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-and-freeze-production-checkpoint-v2.2-master-manifest-model-free-only",
};

assertV4(
  canonicalJson(selection.activePolicy.thresholds) ===
    canonicalJson(promotion.activePolicy.thresholds),
  "active v2.2 thresholds changed during selection"
);
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
