#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import {
  V418_MODEL,
  V418_OUTPUT_VERSION,
  V418_PACKET_VERSION,
  V418_PROTOCOL_ID,
  V418_ROOT,
  makeV418PrimarySchema,
  selectV418ControlDebates
} from "./lib/v418-source-integrity.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const samplePath = `${V418_ROOT}/source-only-sample.json`;
const sample = JSON.parse(await readFile(path.resolve(root, samplePath), "utf8"));
assertV4(sample.status === "frozen-before-legacy-score-access" && sample.debates.length === 6 && !sample.selectionBoundary.legacyAssessmentContentAccessed && sample.audit.v417Overlap === 0, "v4.1.8 fresh-six sample invalid");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, digest] of Object.entries(sample.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `sample source hash mismatch: ${file}`);

const controlIds = new Set(selectV418ControlDebates(sample.debates.map((debate) => debate.debateId)));
const packets = [];
for (const debate of sample.debates) {
  const transcriptPath = `.assessment-cache/captions/${debate.videoId}/transcript.txt`;
  const eventsPath = `.assessment-cache/captions/${debate.videoId}/events.json`;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(path.resolve(root, file))));
  const eventsDocument = JSON.parse(eventsBytes);
  const manifest = JSON.parse(manifestBytes);
  const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument.events;
  assertV4(Array.isArray(events) && events.length > 0 && manifest.videoId === debate.videoId, `${debate.number}: local source chain invalid`);
  assertV4(manifest.transcriptSha256 === sha256(transcriptBytes) && manifest.normalizedEventsSha256 === sha256(eventsBytes), `${debate.number}: manifest source hash mismatch`);
  const packet = {
    schemaVersion: V418_PACKET_VERSION,
    protocolId: V418_PROTOCOL_ID,
    debateNumber: debate.number,
    debateId: debate.debateId,
    motion: debate.motion,
    sides: debate.sides,
    durationSeconds: manifest.durationSeconds,
    eventCount: events.length,
    sourceChain: {
      transcriptPath,
      transcriptSha256: sha256(transcriptBytes),
      eventsPath,
      eventsSha256: sha256(eventsBytes),
      localManifestPath: manifestPath,
      localManifestSha256: sha256(manifestBytes)
    },
    modelInputBoundary: {
      fullTranscriptRequired: true,
      timestampedEventsRequired: true,
      eventFileHashValidationRequired: true,
      repositoryOwnedSourceTimes: true,
      modelSuppliedSourceMillisecondsProhibited: true,
      excerptMinimumTokens: 12,
      excerptMaximumTokens: 90,
      minimumExcerptLexicalRecall: 0.8,
      minimumExcerptOrderedCoverage: 0.8,
      legacyAssessmentsUnavailable: true,
      priorArgumentInventoriesUnavailable: true,
      priorBurdenMapsUnavailable: true,
      priorSectionsAndWeightsUnavailable: true,
      priorRatingsAndTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      assessmentProseUnavailable: true,
      priorPrimaryOutputsUnavailable: true,
      controlSelectionUnavailable: true,
      highEffortReferenceOutputsUnavailable: true,
      boundedMoveMinimum: 8,
      boundedMoveMaximum: 24,
      sectionMinimum: 4,
      sectionMaximum: 6,
      movesPerSidePerSectionMinimum: 1,
      movesPerSidePerSectionMaximum: 2
    }
  };
  packets.push({ debate, packet, controlSampleSelected: controlIds.has(debate.debateId) });
}

if (shouldWrite) {
  await mkdir(path.resolve(root, `${V418_ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(root, `${V418_ROOT}/schemas`), { recursive: true });
  for (const item of packets) await writeFile(path.resolve(root, `${V418_ROOT}/packets/debate-${item.debate.number}.json`), `${JSON.stringify(item.packet, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V418_ROOT}/schemas/primary.schema.json`), `${JSON.stringify(makeV418PrimarySchema(), null, 2)}\n`);
}

const inputs = {
  workflowBase: "docs/assessment-workflow-v4.0.md",
  workflowDerivedScores: "docs/assessment-workflow-v4.0.1.md",
  workflowBounded: "docs/assessment-workflow-v4.1.md",
  workflowBurdenIds: "docs/assessment-workflow-v4.1.1.md",
  workflowChronology: "docs/assessment-workflow-v4.1.2.md",
  workflowConsistency: "docs/assessment-workflow-v4.1.3.md",
  workflowBurdenTuple: "docs/assessment-workflow-v4.1.4.md",
  workflowTiming: "docs/assessment-workflow-v4.1.5.md",
  workflowPassB: "docs/assessment-workflow-v4.1.6.md",
  workflowFreshValidation: "docs/assessment-workflow-v4.1.7.md",
  workflowSourceIntegrity: "docs/assessment-workflow-v4.1.8.md",
  rubricBase: "docs/reassessment-rubric-v4.0.md",
  rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md",
  rubricBounded: "docs/reassessment-rubric-v4.1.md",
  manual: `${V418_ROOT}/manual.md`,
  schema: `${V418_ROOT}/schemas/primary.schema.json`
};
const preparation = {
  schemaVersion: "4.1.8-source-integrity-fresh-six-preparation",
  protocolId: V418_PROTOCOL_ID,
  status: shouldWrite ? "prepared-source-only-no-model-execution" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: {
    label: V418_MODEL.label,
    slug: V418_MODEL.slug,
    primaryReasoningEffort: V418_MODEL.primaryReasoningEffort,
    reviewReasoningEffort: V418_MODEL.reviewReasoningEffort,
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0
  },
  sample: samplePath,
  debates: packets.map((item) => ({
    debateNumber: item.debate.number,
    debateId: item.debate.debateId,
    family: item.debate.family,
    durationSeconds: item.debate.durationSeconds,
    controlSampleSelected: item.controlSampleSelected,
    packet: `${V418_ROOT}/packets/debate-${item.debate.number}.json`,
    rawOutput: `${V418_ROOT}/primary-outputs/debate-${item.debate.number}.json`,
    compiledOutput: `${V418_ROOT}/primary-compiled/debate-${item.debate.number}.json`
  })),
  inputs,
  endpointSchemaInheritance: {
    from: "v4.1.7-fresh-six-bounded-primary",
    structuralFieldsChanged: true,
    removedModelFields: ["sourceSpan.startMs", "sourceSpan.endMs"],
    newSchemaKeywordsIntroduced: false,
    deterministicTranslationFixtureRequired: true,
    newEndpointPreflightRequired: false,
    rationale: "The schema only removes two properties and their requirements; it introduces no endpoint keyword. Exact local translation and mutation fixtures pass."
  },
  sourceIntegrityPolicy: {
    completeEventFileHashRequired: true,
    repositoryOwnedSourceTimes: true,
    excerptTokens: [12, 90],
    minimumLexicalRecall: 0.8,
    minimumOrderedCoverage: 0.8,
    invalidContextRetryMaximum: 0,
    outputNormalizationAuthorized: false
  },
  controlPolicy: {
    rate: 0.1,
    selectedDebateIds: [...controlIds],
    selectedNumbers: packets.filter((item) => item.controlSampleSelected).map((item) => item.debate.number),
    selectionVisibleToPrimaryJudge: false
  },
  totals: { debates: 6, sourceOnlyPackets: 6, controlDebates: controlIds.size, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, primaryExecutionManifest: false, primaryModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V418_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({
  status: preparation.status,
  outputSchemaVersion: V418_OUTPUT_VERSION,
  debates: 6,
  controls: preparation.controlPolicy.selectedNumbers,
  totalDurationHours: Number((sample.debates.reduce((sum, debate) => sum + debate.durationSeconds, 0) / 3600).toFixed(2)),
  primaryReasoningEffort: V418_MODEL.primaryReasoningEffort,
  repositoryOwnedSourceTimes: true,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0
}, null, 2));
