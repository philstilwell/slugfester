#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  bagOfWordsRecall,
  normalizeV418Events,
  orderedTokenCoverage
} from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const preparedIndex = process.argv.indexOf("--prepared-at");
const preparedAt = preparedIndex >= 0 ? process.argv[preparedIndex + 1] : null;
assertV4(
  preparedAt && !Number.isNaN(Date.parse(preparedAt)),
  "--prepared-at requires an ISO timestamp"
);

const ROOT = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair";
const PLAN = `${ROOT}/repair-plan.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const CONTINUATION_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/preparation-manifest.json";
const CONTINUATION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/analysis.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const NORMALIZER = "scripts/lib/v418-source-integrity.mjs";
const ACQUISITION = "scripts/acquire-youtube-captions.mjs";
const SCRIPT = "scripts/prepare-assessment-production-post-canary-source-normalization-repair-v1.mjs";
const TEST = "scripts/test-assessment-production-post-canary-source-normalization-repair-v1.mjs";
const FUTURE_ACTIVATION = `${ROOT}/execution-activation.json`;
const FUTURE_EXECUTION = `${ROOT}/execution.json`;
const TARGETS = [
  {
    debateNumber: "88",
    debateId: "sechler-dillahunty-perfect-mind-universe-2022",
    videoId: "FUPOouj5jNg",
    eventIndex: 807,
    transcriptLineNumber: 808
  },
  {
    debateNumber: "127",
    debateId: "slick-clifton-objective-morality-god-2014",
    videoId: "uJeKS705aXs",
    eventIndex: 2017,
    transcriptLineNumber: 2018
  }
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(file).then(() => true, () => false);
const sourcePathsFor = (videoId) => ({
  raw: `.assessment-cache/captions/${videoId}/captions.srv3.xml`,
  events: `.assessment-cache/captions/${videoId}/events.json`,
  transcript: `.assessment-cache/captions/${videoId}/transcript.txt`,
  manifest: `.assessment-cache/captions/${videoId}/manifest.json`
});

if (shouldWrite) {
  assertV4(
    !(await exists(PLAN)) && !(await exists(ANALYSIS)),
    `${ROOT} already contains an immutable repair plan`
  );
}

const controlPaths = [
  CONTINUATION_PREPARATION,
  CONTINUATION_ANALYSIS,
  PRODUCTION_MANIFEST,
  WORKFLOW,
  NORMALIZER,
  ACQUISITION,
  SCRIPT,
  TEST
];
const targetSourcePaths = TARGETS.flatMap(({ videoId }) =>
  Object.values(sourcePathsFor(videoId))
);
const sourcePaths = [...controlPaths, ...targetSourcePaths];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const sourceHashes = Object.fromEntries(
  sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
);
const continuationPreparation = JSON.parse(sourceBytes[CONTINUATION_PREPARATION]);
const continuationAnalysis = JSON.parse(sourceBytes[CONTINUATION_ANALYSIS]);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);

assertV4(
  continuationPreparation.status === "post-canary-continuation-plan-frozen-source-normalization-blockers-found" &&
    continuationPreparation.remainingCanonicalEventAudit.failed === 2 &&
    canonicalJson(
      continuationPreparation.remainingCanonicalEventAudit.failures.map(
        (item) => item.debateNumber
      )
    ) === canonicalJson(["88", "127"]) &&
    continuationPreparation.authorization.sourceRepairPlanPreparation === false &&
    !continuationPreparation.authorization.sourceRepairExecution &&
    !continuationPreparation.authorization.modelExecution &&
    !continuationPreparation.authorization.productionMutation &&
    continuationAnalysis.status === "post-canary-continuation-analysis-passed-with-two-source-normalization-blockers" &&
    continuationAnalysis.decision.recommendedNextGate === "prepare a bounded, model-free source normalization repair plan for Debates 88 and 127" &&
    productionManifest.items.length === 195,
  "frozen two-debate continuation blocker boundary drifted"
);

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " " };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
}

function stripMarkup(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function parseAttributes(value) {
  return Object.fromEntries(
    [...value.matchAll(/([:\w-]+)="([^"]*)"/g)].map((match) => [
      match[1],
      decodeEntities(match[2])
    ])
  );
}

function rawNonemptyParagraphs(xml) {
  const paragraphs = [];
  for (const match of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const attributes = parseAttributes(match[1]);
    const text = stripMarkup(match[2]);
    if (!text) continue;
    paragraphs.push({
      attributes,
      text,
      byteOffset: Buffer.byteLength(xml.slice(0, match.index)),
      raw: match[0]
    });
  }
  return paragraphs;
}

function transcriptLines(value) {
  return value.endsWith("\n")
    ? value.slice(0, -1).split("\n")
    : value.split("\n");
}

function transcriptWordCount(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

const targetPlans = [];
for (const target of TARGETS) {
  const paths = sourcePathsFor(target.videoId);
  const productionItem = productionManifest.items.find(
    (item) => item.debateNumber === target.debateNumber
  );
  assertV4(
    productionItem?.debateId === target.debateId &&
      productionItem.videoId === target.videoId &&
      productionItem.speakerCount === 2 &&
      productionItem.disposition === "pending-reassessment" &&
      productionItem.sourceChain.events === paths.events &&
      productionItem.sourceChain.transcript === paths.transcript &&
      productionItem.sourceChain.manifest === paths.manifest,
    `Debate ${target.debateNumber}: production-manifest identity drifted`
  );

  const rawBytes = sourceBytes[paths.raw];
  const eventsBytes = sourceBytes[paths.events];
  const transcriptBytes = sourceBytes[paths.transcript];
  const manifestBytes = sourceBytes[paths.manifest];
  const rawXml = rawBytes.toString("utf8");
  const events = JSON.parse(eventsBytes);
  const transcript = transcriptBytes.toString("utf8");
  const lines = transcriptLines(transcript);
  const localManifest = JSON.parse(manifestBytes);

  assertV4(
    sha256(eventsBytes) === productionItem.sourceChain.eventsSha256 &&
      sha256(transcriptBytes) === productionItem.sourceChain.transcriptSha256 &&
      sha256(manifestBytes) === productionItem.sourceChain.manifestSha256 &&
      localManifest.normalizedEventsSha256 === sha256(eventsBytes) &&
      localManifest.transcriptSha256 === sha256(transcriptBytes) &&
      localManifest.rawCaptionSha256 === sha256(rawBytes) &&
      localManifest.eventCount === events.length &&
      localManifest.wordCount === transcriptWordCount(transcript) &&
      lines.length === events.length,
    `Debate ${target.debateNumber}: frozen source hash chain drifted`
  );

  const invalidDuration = events
    .map((event, index) => ({ index, event }))
    .filter(
      ({ event }) =>
        !Number.isInteger(event.durationMs) || event.durationMs <= 0
    );
  const invalidStart = events.filter(
    (event) => !Number.isInteger(event.startMs) || event.startMs < 0
  );
  const emptyText = events.filter(
    (event) => typeof event.text !== "string" || !event.text.trim()
  );
  const nonmonotonic = events.filter(
    (event, index) => index > 0 && event.startMs < events[index - 1].startMs
  );
  assertV4(
    invalidDuration.length === 1 &&
      invalidDuration[0].index === target.eventIndex &&
      invalidDuration[0].event.durationMs === 0 &&
      invalidStart.length === 0 &&
      emptyText.length === 0 &&
      nonmonotonic.length === 0,
    `Debate ${target.debateNumber}: source defect is not the one frozen zero-duration event`
  );

  const rawParagraphs = rawNonemptyParagraphs(rawXml);
  const missingDuration = rawParagraphs
    .map((paragraph, index) => ({ index, paragraph }))
    .filter(({ paragraph }) => paragraph.attributes.d === undefined);
  const rawTarget = rawParagraphs[target.eventIndex];
  const removedEvent = invalidDuration[0].event;
  assertV4(
    rawParagraphs.length === events.length &&
      missingDuration.length === 1 &&
      missingDuration[0].index === target.eventIndex &&
      Number(rawTarget.attributes.t) === removedEvent.startMs &&
      rawTarget.attributes.d === undefined &&
      rawTarget.text === removedEvent.text &&
      lines[target.eventIndex].endsWith(removedEvent.text),
    `Debate ${target.debateNumber}: raw missing-duration provenance drifted`
  );

  const neighboringText = events
    .slice(Math.max(0, target.eventIndex - 2), target.eventIndex)
    .concat(events.slice(target.eventIndex + 1, target.eventIndex + 3))
    .map((event) => event.text)
    .join(" ");
  const lexicalRecall = bagOfWordsRecall(removedEvent.text, neighboringText);
  const orderedCoverage = orderedTokenCoverage(removedEvent.text, neighboringText);
  const exactNeighborSubstring = neighboringText
    .toLowerCase()
    .includes(removedEvent.text.toLowerCase());
  assertV4(
    lexicalRecall === 1 && orderedCoverage === 1 && exactNeighborSubstring,
    `Debate ${target.debateNumber}: removed row has unique lexical content`
  );

  const repairedEvents = events.filter((_, index) => index !== target.eventIndex);
  normalizeV418Events(repairedEvents);
  const repairedLines = lines.filter((_, index) => index !== target.eventIndex);
  assertV4(repairedLines.length === repairedEvents.length, `Debate ${target.debateNumber}: projected line/event count mismatch`);
  for (let index = 0; index < repairedEvents.length; index += 1) {
    const originalIndex = index < target.eventIndex ? index : index + 1;
    assertV4(
      canonicalJson(repairedEvents[index]) === canonicalJson(events[originalIndex]) &&
        repairedLines[index] === lines[originalIndex],
      `Debate ${target.debateNumber}: projected repair changed a non-target row`
    );
  }
  const repairedEventsBytes = Buffer.from(serializedJson(repairedEvents));
  const repairedTranscriptBytes = Buffer.from(`${repairedLines.join("\n")}\n`);
  const repairedManifest = {
    ...structuredClone(localManifest),
    normalizedEventsSha256: sha256(repairedEventsBytes),
    transcriptSha256: sha256(repairedTranscriptBytes),
    eventCount: repairedEvents.length,
    wordCount: transcriptWordCount(repairedTranscriptBytes.toString("utf8"))
  };
  const repairedManifestBytes = Buffer.from(serializedJson(repairedManifest));
  const manifestChangedFields = Object.keys(localManifest).filter(
    (key) => canonicalJson(localManifest[key]) !== canonicalJson(repairedManifest[key])
  );
  assertV4(
    canonicalJson(manifestChangedFields) ===
      canonicalJson(["normalizedEventsSha256", "transcriptSha256", "eventCount", "wordCount"]),
    `Debate ${target.debateNumber}: projected manifest field boundary drifted`
  );

  targetPlans.push({
    debateNumber: target.debateNumber,
    debateId: target.debateId,
    videoId: target.videoId,
    diagnosis: {
      sourceFilesAndRecordedHashesMatchedBeforeCanonicalValidation: true,
      zeroDurationDerivedEvents: 1,
      otherStructuralEventDefects: 0,
      normalizedEventIndex: target.eventIndex,
      transcriptLineNumber: target.transcriptLineNumber,
      removedDerivedEvent: structuredClone(removedEvent),
      removedTranscriptLine: lines[target.eventIndex],
      rawCaptionParagraph: {
        byteOffset: rawTarget.byteOffset,
        attributes: structuredClone(rawTarget.attributes),
        raw: rawTarget.raw,
        durationAttributePresent: false
      },
      rawNonemptyParagraphsMissingDuration: 1,
      neighboringDuplicateEvidence: {
        radiusEventsEachSide: 2,
        exactSubstringPresent: exactNeighborSubstring,
        lexicalRecall,
        orderedTokenCoverage: orderedCoverage,
        uniqueSemanticContentRemoved: false
      }
    },
    repair: {
      removeOnlyNormalizedEventIndex: target.eventIndex,
      removeOnlyTranscriptLineNumber: target.transcriptLineNumber,
      preserveEveryOtherEventValueAndOrder: true,
      preserveEveryOtherTranscriptLineValueAndOrder: true,
      updateLocalManifestFieldsOnly: [
        "normalizedEventsSha256",
        "transcriptSha256",
        "eventCount",
        "wordCount"
      ],
      rawCaptionMutationAllowed: false,
      frozenProductionManifestMutationAllowed: false
    },
    projected: {
      events: {
        path: paths.events,
        beforeBytes: eventsBytes.byteLength,
        beforeSha256: sha256(eventsBytes),
        beforeCount: events.length,
        afterBytes: repairedEventsBytes.byteLength,
        afterSha256: sha256(repairedEventsBytes),
        afterCount: repairedEvents.length
      },
      transcript: {
        path: paths.transcript,
        beforeBytes: transcriptBytes.byteLength,
        beforeSha256: sha256(transcriptBytes),
        beforeLineCount: lines.length,
        afterBytes: repairedTranscriptBytes.byteLength,
        afterSha256: sha256(repairedTranscriptBytes),
        afterLineCount: repairedLines.length
      },
      localManifest: {
        path: paths.manifest,
        beforeBytes: manifestBytes.byteLength,
        beforeSha256: sha256(manifestBytes),
        afterBytes: repairedManifestBytes.byteLength,
        afterSha256: sha256(repairedManifestBytes),
        beforeEventCount: localManifest.eventCount,
        afterEventCount: repairedManifest.eventCount,
        beforeWordCount: localManifest.wordCount,
        afterWordCount: repairedManifest.wordCount
      },
      rawCaption: {
        path: paths.raw,
        beforeAndAfterBytes: rawBytes.byteLength,
        beforeAndAfterSha256: sha256(rawBytes)
      }
    }
  });
}

const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-two-debate-source-normalization-repair-plan",
  protocolId: "assessment-production-post-canary-source-normalization-repair-v1",
  status: "two-debate-zero-duration-derived-event-repair-plan-frozen-awaiting-execution-activation-decision",
  preparedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  planningOnly: true,
  userAuthorization: {
    instruction: "Proceed with the next task at your discretion.",
    scopeInterpretation: "Prepare and freeze only the bounded model-free repair plan identified by the committed continuation audit; do not mutate the ignored source chain, create repair records, select a batch, execute models, derive scores, reconstruct publication prose, or mutate production.",
    directIncrementalCostEstimateUsd: 0
  },
  targets: targetPlans,
  atomicExecutionContract: {
    targets: 2,
    attemptsMaximumAfterSeparateActivation: 1,
    automaticRetryAllowed: false,
    allOrNothing: true,
    exactMutableIgnoredPaths: targetPlans.flatMap((target) => [
      target.projected.events.path,
      target.projected.transcript.path,
      target.projected.localManifest.path
    ]),
    exactMutableIgnoredPathCount: 6,
    rawCaptionPathsMutable: false,
    committedRepairRecordsRequiredAfterSuccessfulExecution: 2,
    repairRecordsMayBeWrittenOnlyAfterAllSixProjectedHashesAndAllValidatorsPass: true,
    rollbackBothTargetsOnAnyMismatch: true,
    originalProductionManifestMutable: false,
    globalAcquisitionParserMutable: false
  },
  requiredPostRepairValidation: {
    exactProjectedHashes: true,
    canonicalEventValidationBothDebates: true,
    transcriptLineCountEqualsEventCountBothDebates: true,
    localManifestHashChainBothDebates: true,
    localManifestWordCountBothDebates: true,
    everyNonTargetEventAndTranscriptLinePreserved: true,
    rawCaptionHashesUnchanged: true,
    frozenProductionManifestHashUnchanged: true,
    continuationArtifactsUnchanged: true,
    completeCorpusTranscriptValidator: "node scripts/validate-corpus-transcripts.mjs",
    completeRepositoryCheck: "npm run check"
  },
  modelBoundary: {
    preservedAssessmentModel: "5.6 Sol",
    preservedReasoningEffort: "low",
    preservedAuthentication: "ChatGPT subscription",
    participantJudgmentMustRemainScoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    modelContexts: 0,
    judgmentExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    meteredApiCostUsdMaximum: 0
  },
  stopRules: {
    executionBeforeSeparateCommittedActivationBlocks: true,
    anyFrozenSourceHashMismatchBlocks: true,
    anyAdditionalInvalidEventBlocks: true,
    anyUniqueSemanticContentLossBlocks: true,
    anyProjectedHashMismatchBlocks: true,
    anyRawCaptionMutationBlocks: true,
    anyProductionManifestMutationBlocks: true,
    anyNonTargetRowMutationBlocks: true,
    anyGlobalParserMutationBlocks: true,
    anyValidatorFailureRequiresAtomicRollback: true,
    automaticRetryBlocks: true,
    batchSelectionBlocks: true,
    modelExecutionBlocks: true,
    scoreDerivationBlocks: true,
    publicationReconstructionBlocks: true,
    productionMutationBlocks: true,
    remainingProductionBatchExecutionBlocks: true,
    paidServiceUseBlocks: true
  },
  sourceHashes,
  totals: {
    targetDebates: 2,
    zeroDurationEvents: 2,
    otherStructuralEventDefects: 0,
    uniqueSemanticContentRowsRemoved: 0,
    projectedIgnoredPathMutations: 6,
    executedIgnoredPathMutations: 0,
    batchesSelected: 0,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    productionMutations: 0,
    paidServiceCalls: 0,
    meteredApiCostUsd: 0
  },
  authorization: {
    repairExecutionActivationPreparation: false,
    repairExecution: false,
    sourceMutation: false,
    repairRecordWrite: false,
    continuationSelectionPolicyPreparation: false,
    batchSelection: false,
    modelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  futureArtifacts: {
    executionActivation: FUTURE_ACTIVATION,
    executionAudit: FUTURE_EXECUTION
  },
  nextAuthorizedAction: "user-decision-on-two-debate-source-normalization-repair-execution-activation-preparation"
};
const planBytes = serializedJson(plan);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-two-debate-source-normalization-repair-analysis",
  protocolId: plan.protocolId,
  status: "two-debate-zero-duration-source-repair-plan-analysis-passed-awaiting-activation-decision",
  analyzedAt: preparedAt,
  repairPlan: {
    path: PLAN,
    bytes: Buffer.byteLength(planBytes),
    sha256: sha256(planBytes),
    status: plan.status
  },
  finding: "Debates 88 and 127 each contain exactly one nonempty raw caption paragraph with no duration attribute. The acquisition parser deterministically converted the absent duration to zero, producing the only structurally invalid event in each source chain. In both debates, the row's complete word sequence is duplicated within the two neighboring rows on each side.",
  remedy: "Remove only the two zero-duration derived events and their corresponding transcript lines, update only four derived local-manifest fields per debate, preserve both raw caption files and the frozen production manifest, and require one separately activated atomic attempt with rollback on any mismatch.",
  decision: {
    diagnosisPassed: true,
    exactProjectionPassed: true,
    uniqueSemanticContentLossProjected: false,
    sourceRepairPlanFrozen: true,
    sourceRepairExecutionAuthorized: false,
    batchSelectionAuthorized: false,
    modelExecutionAuthorized: false,
    productionMutationAuthorized: false
  },
  modelBoundary: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlindnessPreserved: true,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    meteredApiCostUsd: 0
  },
  nextAuthorizedAction: plan.nextAuthorizedAction
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PLAN, planBytes);
  await writeFile(ANALYSIS, serializedJson(analysis));
}

console.log(JSON.stringify({
  status: shouldWrite ? plan.status : "preview",
  targets: targetPlans.map((target) => ({
    debateNumber: target.debateNumber,
    eventIndex: target.diagnosis.normalizedEventIndex,
    transcriptLineNumber: target.diagnosis.transcriptLineNumber,
    rawDurationAttributePresent: target.diagnosis.rawCaptionParagraph.durationAttributePresent,
    exactNeighborSubstringPresent: target.diagnosis.neighboringDuplicateEvidence.exactSubstringPresent,
    projectedEventSha256: target.projected.events.afterSha256,
    projectedTranscriptSha256: target.projected.transcript.afterSha256,
    projectedManifestSha256: target.projected.localManifest.afterSha256
  })),
  projectedIgnoredPathMutations: 6,
  executionAuthorized: false,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction
}, null, 2));
