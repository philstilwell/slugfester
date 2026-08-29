import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { debates } from "../src/data/debates.js";
import {
  MULTI_SPEAKER_MODEL,
  MULTI_SPEAKER_PROTOCOL_ID,
  MULTI_SPEAKER_REASONING,
  MULTI_SPEAKER_RUBRIC,
  canonicalJson,
  fileRecord,
  sha256
} from "./lib/assessment-production-multi-speaker-approximation-v1.mjs";

const OUTPUT_PATH =
  "docs/assessment-production/multi-speaker-approximation-v1/manifest.json";
const WORKFLOW_PATH = "docs/assessment-multi-speaker-approximation-workflow-v1.md";
const RUBRIC_PATH = "docs/reassessment-rubric-v2.1.md";
const LIBRARY_PATH =
  "scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs";
const TEST_PATH = "scripts/test-assessment-production-multi-speaker-approximation-v1.mjs";
const PRIMARY_SCHEMA_PATH =
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/primary-judgment.schema.json";
const ADJUDICATION_SCHEMA_PATH =
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/adjudication.schema.json";
const INVENTORY_AUDIT_SCHEMA_PATH =
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/inventory-audit.schema.json";
const AUDIO_VERIFICATION_SCHEMA_PATH =
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/audio-verification.schema.json";
const POLICY_PATH =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";

const CONFIG = Object.freeze([
  {
    number: "18",
    format: "panel-3v1",
    pro: ["Rowan Williams", "Philip Goff", "Elizabeth Oldfield"],
    con: ["Alex O'Connor"]
  },
  {
    number: "32",
    format: "team-2v2",
    pro: ["Cliffe Knechtle", "Stuart Knechtle"],
    con: ["Alex O'Connor", "Phil Halper"]
  },
  {
    number: "35",
    format: "team-2v2",
    pro: ["Sean Carroll", "Michael Shermer"],
    con: ["Ian Hutchinson", "Dinesh D'Souza"]
  },
  {
    number: "45",
    format: "panel-3v1",
    pro: ["Peter Singer", "Jessica Frazier", "Richard Swinburne"],
    con: ["Alex O'Connor"]
  },
  {
    number: "71",
    format: "team-2v1",
    pro: ["Harold Kushner", "Peter Gomes"],
    con: ["Christopher Hitchens"]
  },
  {
    number: "84",
    format: "team-1v2",
    pro: ["Lawrence Krauss"],
    con: ["Stephen Meyer", "Denis Lamoureux"]
  },
  {
    number: "95",
    format: "panel-1v3",
    pro: ["William Lane Craig"],
    con: ["Jessica Frazier", "Philip Goff", "Joe Folley"]
  },
  {
    number: "96",
    format: "team-2v2",
    pro: ["Cliffe Knechtle", "Stuart Knechtle"],
    con: ["Aron Ra", "Tom Jump"]
  },
  {
    number: "105",
    format: "team-2v2",
    pro: ["William Lane Craig", "Rowan Williams"],
    con: ["Sabine Hossenfelder", "Slavoj Žižek"]
  },
  {
    number: "115",
    format: "team-2v2",
    pro: ["Trent Horn", "Cameron Bertuzzi"],
    con: ["Alex O'Connor", "Joe Schmid"]
  },
  {
    number: "125",
    format: "team-2v1",
    pro: ["Cliffe Knechtle", "Stuart Knechtle"],
    con: ["Alex O'Connor"]
  },
  {
    number: "149",
    format: "team-2v2",
    pro: ["Eben Alexander", "Raymond Moody"],
    con: ["Sean Carroll", "Steven Novella"]
  },
  {
    number: "154",
    format: "panel-1v2",
    pro: ["Greg Koukl"],
    con: ["Alex O'Connor", "Alok Kanojia"]
  },
  {
    number: "173",
    format: "team-2v2",
    pro: ["John Onaiyekan", "Ann Widdecombe"],
    con: ["Stephen Fry", "Christopher Hitchens"]
  },
  {
    number: "174",
    format: "panel-1v2",
    pro: ["Rowan Williams"],
    con: ["Richard Dawkins", "Anthony Kenny"]
  },
  {
    number: "184",
    format: "team-2v2",
    pro: ["David Enoch", "Eric Sampson"],
    con: ["Don Loeb", "Matthew Lutz"]
  }
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function videoIdFromUrl(value) {
  const url = new URL(value);
  return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
}

function sourceRecord(videoId) {
  const root = `.assessment-cache/captions/${videoId}`;
  const transcript = fileRecord(`${root}/transcript.txt`);
  const events = fileRecord(`${root}/events.json`);
  const manifest = fileRecord(`${root}/manifest.json`);
  const sourceManifest = JSON.parse(readFileSync(manifest.path, "utf8"));
  assert(sourceManifest.videoId === videoId, `${videoId}: source manifest identity mismatch`);
  assert(
    transcript.sha256 === sourceManifest.transcriptSha256,
    `${videoId}: transcript hash mismatch`
  );
  assert(
    events.sha256 === sourceManifest.normalizedEventsSha256,
    `${videoId}: event hash mismatch`
  );
  return {
    status: "complete-and-hash-valid",
    transcript,
    events,
    manifest,
    extractionMethod: sourceManifest.extractionMethod,
    durationSeconds: sourceManifest.durationSeconds,
    eventCount: sourceManifest.eventCount,
    wordCount: sourceManifest.wordCount,
    captionKind: sourceManifest.track?.kind ?? null,
    languageCode: sourceManifest.track?.languageCode ?? null
  };
}

function buildManifest() {
  const configuredNumbers = new Set(CONFIG.map((item) => item.number));
  assert(configuredNumbers.size === 16, "configuration must contain 16 unique debates");
  const selected = CONFIG.map((item) => {
    const debate = debates.find((candidate) => candidate.number === item.number);
    assert(debate, `Debate ${item.number}: not found`);
    const videoId = videoIdFromUrl(debate.youtubeUrl);
    return {
      debateNumber: debate.number,
      debateId: debate.id,
      title: debate.title,
      youtubeUrl: debate.youtubeUrl,
      videoId,
      format: item.format,
      sides: {
        pro: { label: debate.sides.pro.name, speakers: item.pro },
        con: { label: debate.sides.con.name, speakers: item.con }
      },
      substantiveSpeakerCount: item.pro.length + item.con.length,
      formatFitnessStatus: "required-before-primary-judgment",
      interlocutorRankingEligible: false,
      source: sourceRecord(videoId),
      legacyAssessmentBoundary: {
        identityFieldsReadDuringPreparation: [
          "number",
          "id",
          "title",
          "youtubeUrl",
          "sides.pro.name",
          "sides.con.name"
        ],
        legacyScoresRead: false,
        legacyProseRead: false,
        legacyWinnerRead: false,
        legacyTagsRead: false,
        legacyMaterialAllowedInModelPackets: false
      }
    };
  });
  const checkpoint = ["71", "84", "154"];
  const remaining = selected
    .map((item) => item.debateNumber)
    .filter((number) => !checkpoint.includes(number));
  return {
    schemaVersion: "1.1-multi-speaker-approximation-manifest",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "process-and-source-census-frozen-awaiting-checkpoint-execution",
    frozenOn: "2026-08-28",
    authorization: {
      userInstruction:
        "Let's try again to create a comparable assessment process for these. They do not need to be perfect, but just approximate the assessments and scores.",
      qualitySafeguardsInstruction:
        "Implement those recommendations at your discretion.",
      preparationAuthorized: true,
      modelExecutionAuthorizedByThisManifest: false,
      paidTranscriptionAuthorized: false,
      productionMutationAuthorized: false,
      rankingMutationAuthorized: false
    },
    method: {
      assessmentModel: MULTI_SPEAKER_MODEL,
      reasoningEffort: MULTI_SPEAKER_REASONING,
      authentication: "ChatGPT subscription",
      rubric: MULTI_SPEAKER_RUBRIC,
      primaryJudgmentsPerDebate: 2,
      independentInventoryAuditsPerAcceptedInventory: 1,
      inventoryAuditCorrectionCyclesMaximum: 1,
      disputeAdjudication: "isolated-existing-option-only",
      sideScoreFormula: "same move, section, and overall aggregation as active v2.1 production",
      speakerContributionScores: "diagnostic-only-not-ranking-eligible",
      directIncrementalModelCostUsd: 0,
      expectedPaidTranscriptionCostUsd: 0,
      estimatedAggregateWorkflowHours: { minimum: 12, maximum: 18 }
    },
    controls: {
      scoreBlind: true,
      legacyBlind: true,
      completeTranscriptRequired: true,
      sourceHashReplayRequired: true,
      actualSpeakerOwnsEveryMove: true,
      teammateCreditTransferProhibited: true,
      explicitAdoptionEvidenceRequired: true,
      formatFitnessRequired: true,
      mixedRoleWinnerWithholdingRequired: true,
      independentScoreBlindInventoryAuditRequired: true,
      allSelectedMovesRequireAudio: true,
      allSpeakerHandoffsRequireAudio: true,
      allQuoteEligibleSpansRequireAudio: true,
      repositoryAuthoredTotalsOnly: true,
      scorePassesMaximumPerDebate: 1,
      ordinaryV2AttributionProhibited: true,
      approximationDisclosureRequired: true,
      primaryScoreRangePublicationRequired: true,
      equalActiveSpeakerSensitivityRequired: true,
      leaveOneSpeakerOutSensitivityRequired: true,
      formatSensitiveCheckpointHoldRequired: true,
      interlocutorRankingExclusionRequired: true
    },
    scoreStability: {
      meanAbsoluteDistanceAtMost: 4,
      maximumDistanceAtMost: 8,
      maximumExcursionAtMost: 3,
      sharedInitialWinnerCannotReverse: true
    },
    executionOrder: {
      checkpoint: {
        debateNumbers: checkpoint,
        rationale:
          "Covers two-versus-one, one-versus-two, and mixed inquiry-panel structures. This is a production checkpoint, not a held-out reliability gate."
      },
      batches: [
        { batch: 1, debateNumbers: remaining.slice(0, 4) },
        { batch: 2, debateNumbers: remaining.slice(4, 8) },
        { batch: 3, debateNumbers: remaining.slice(8) }
      ],
      replacementSelectionAllowed: false,
      concurrentBatchesAllowed: false
    },
    sourceSummary: {
      debates: selected.length,
      completeChains: selected.filter(
        (item) => item.source.status === "complete-and-hash-valid"
      ).length,
      transcriptFiles: selected.length,
      eventFiles: selected.length,
      sourceManifests: selected.length,
      paidTranscriptionExpected: false
    },
    implementationLocks: {
      workflow: fileRecord(WORKFLOW_PATH),
      rubric: fileRecord(RUBRIC_PATH),
      contractLibrary: fileRecord(LIBRARY_PATH),
      contractTest: fileRecord(TEST_PATH),
      inventoryAuditSchema: fileRecord(INVENTORY_AUDIT_SCHEMA_PATH),
      primaryJudgmentSchema: fileRecord(PRIMARY_SCHEMA_PATH),
      adjudicationSchema: fileRecord(ADJUDICATION_SCHEMA_PATH),
      audioVerificationSchema: fileRecord(AUDIO_VERIFICATION_SCHEMA_PATH),
      activeScorePolicy: fileRecord(POLICY_PATH)
    },
    debates: selected,
    nextAuthorizedAction:
      "Review this preparation record, then separately authorize the three-debate checkpoint model execution."
  };
}

const manifest = buildManifest();
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const write = process.argv.includes("--write");

if (write) {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, serialized);
  console.log(
    JSON.stringify(
      {
        status: "written",
        path: OUTPUT_PATH,
        sha256: sha256(serialized),
        debates: manifest.debates.length,
        sourceChains: manifest.sourceSummary.completeChains
      },
      null,
      2
    )
  );
} else {
  assert(existsSync(OUTPUT_PATH), `${OUTPUT_PATH}: missing; run with --write`);
  const existing = readFileSync(OUTPUT_PATH, "utf8");
  assert(
    canonicalJson(JSON.parse(existing)) === canonicalJson(manifest),
    `${OUTPUT_PATH}: stale; rebuild with --write`
  );
  console.log(
    JSON.stringify(
      {
        status: "passed",
        path: OUTPUT_PATH,
        sha256: sha256(existing),
        debates: manifest.debates.length,
        sourceChains: manifest.sourceSummary.completeChains
      },
      null,
      2
    )
  );
}
