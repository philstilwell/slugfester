#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V424_MODEL, V424_OUTPUT_VERSION, V424_PACKET_VERSION, V424_PROTOCOL_ID, V424_ROOT, buildV424SourceLedger, makeV424PrimarySchema, selectV424ControlDebates, validateV424SourceLedger } from "./lib/v424-screened-chronology-fresh.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const [sample, screening] = await Promise.all(["source-only-sample.json", "sample-screening.json"].map((file) => readFile(path.resolve(root, V424_ROOT, file), "utf8").then(JSON.parse)));
assertV4(sample.status === "frozen-pending-source-only-semantic-screening" && sample.debates.length === 6 && sample.audit.priorFreshGateOverlap === 0 && !sample.selectionBoundary.legacyAssessmentContentAccessed, "v4.2.4 fresh-six sample invalid");
assertV4(screening.status === "sample-screened-packet-preparation-authorized" && screening.audit.substantiveFamilies === 6 && screening.authorization.compactChronologySourcePacketPreparation, "v4.2.4 sample screening invalid");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, digest] of Object.entries(sample.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `sample source hash mismatch: ${file}`);
const controlIds = new Set(selectV424ControlDebates(sample.debates.map((debate) => debate.debateId)));
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
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.4/debate-${debate.number}.jsonl`;
  const sourceLedgerBytes = Buffer.from(buildV424SourceLedger(eventsDocument));
  const ledgerValidation = validateV424SourceLedger(sourceLedgerBytes, eventsDocument, sha256(sourceLedgerBytes));
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, sourceLedgerPath)), { recursive: true });
    await writeFile(path.resolve(root, sourceLedgerPath), sourceLedgerBytes);
  }
  const packet = {
    schemaVersion: V424_PACKET_VERSION,
    protocolId: V424_PROTOCOL_ID,
    debateNumber: debate.number,
    debateId: debate.debateId,
    motion: debate.motion,
    sides: debate.sides,
    durationSeconds: manifest.durationSeconds,
    eventCount: events.length,
    sourceChain: { transcriptPath, transcriptSha256: sha256(transcriptBytes), eventsPath, eventsSha256: sha256(eventsBytes), localManifestPath: manifestPath, localManifestSha256: sha256(manifestBytes) },
    transportChain: { format: "jsonl rows [eventIndex,startMs,durationMs,text]", sourceLedgerPath, sourceLedgerSha256: sha256(sourceLedgerBytes), sourceLedgerBytes: sourceLedgerBytes.length, sourceLedgerEventCount: ledgerValidation.eventCount, replayExactToOriginalEvents: true },
    modelInputBoundary: { fullTimestampedTranscriptRequired: true, completeTimestampedSourceLedgerRequired: true, plainTranscriptDeliveredToModel: false, originalEventsFileDeliveredToModel: false, originalTranscriptAndEventsStoredAndHashLockedLocally: true, historicalWorkflowAmendmentsDeliveredToModel: false, primaryRelevantRubricsDeliveredToModel: true, consolidatedPrimaryManualDeliveredToModel: true, repositoryOwnedSourceTimes: true, modelSuppliedSourceMillisecondsProhibited: true, excerptMinimumTokens: 12, excerptMaximumTokens: 100, excerptMaximumCharacters: 600, minimumExcerptLexicalRecall: 0.8, minimumExcerptOrderedCoverage: 0.8, movesNestedUnderSections: false, oneChronologicalMoveInventoryRequired: true, replyTargetsMustAlreadyAppearInInventory: true, legacyAssessmentsUnavailable: true, priorArgumentInventoriesUnavailable: true, priorBurdenMapsUnavailable: true, priorSectionsAndWeightsUnavailable: true, priorRatingsAndTotalsUnavailable: true, winnerLabelsUnavailable: true, assessmentProseUnavailable: true, priorPrimaryOutputsUnavailable: true, controlSelectionUnavailable: true, highEffortReferenceOutputsUnavailable: true, boundedMoveMinimum: 8, boundedMoveMaximum: 24, sectionMinimum: 4, sectionMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2 }
  };
  packets.push({ debate, packet, sourceLedgerBytes, originalSourceTextBytes: transcriptBytes.length + eventsBytes.length, controlSampleSelected: controlIds.has(debate.debateId) });
}
if (shouldWrite) {
  await mkdir(path.resolve(root, `${V424_ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(root, `${V424_ROOT}/schemas`), { recursive: true });
  for (const item of packets) await writeFile(path.resolve(root, `${V424_ROOT}/packets/debate-${item.debate.number}.json`), `${JSON.stringify(item.packet, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V424_ROOT}/schemas/primary.schema.json`), `${JSON.stringify(makeV424PrimarySchema(), null, 2)}\n`);
}
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V424_ROOT}/manual.md`, schema: `${V424_ROOT}/schemas/primary.schema.json` };
const sharedInputBytes = shouldWrite ? await Promise.all(Object.values(inputs).map((file) => stat(path.resolve(root, file)).then((item) => item.size))).then((values) => values.reduce((sum, value) => sum + value, 0)) : 0;
const debates = [];
for (const item of packets) {
  const packetPath = `${V424_ROOT}/packets/debate-${item.debate.number}.json`;
  const packetBytes = shouldWrite ? (await stat(path.resolve(root, packetPath))).size : Buffer.byteLength(`${JSON.stringify(item.packet, null, 2)}\n`);
  debates.push({ debateNumber: item.debate.number, debateId: item.debate.debateId, family: item.debate.family, durationBand: item.debate.durationBand, durationSeconds: item.debate.durationSeconds, controlSampleSelected: item.controlSampleSelected, packet: packetPath, sourceLedger: item.packet.transportChain.sourceLedgerPath, rawOutput: `${V424_ROOT}/primary-outputs/debate-${item.debate.number}.json`, compiledOutput: `${V424_ROOT}/primary-compiled/debate-${item.debate.number}.json`, compactCopiedInputBytes: sharedInputBytes + packetBytes + item.sourceLedgerBytes.length, duplicatedSourceTextBytesAvoided: item.originalSourceTextBytes - item.sourceLedgerBytes.length });
}
const preparation = {
  schemaVersion: "4.2.4-screened-chronology-fresh-six-preparation",
  protocolId: V424_PROTOCOL_ID,
  status: shouldWrite ? "prepared-six-screened-chronology-compact-contexts" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V424_MODEL.label, slug: V424_MODEL.slug, primaryReasoningEffort: V424_MODEL.primaryReasoningEffort, reviewReasoningEffort: V424_MODEL.reviewReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  sample: `${V424_ROOT}/source-only-sample.json`,
  screening: `${V424_ROOT}/sample-screening.json`,
  debates,
  inputs,
  transportPolicy: { oneLosslessTimestampedLedgerPerDebate: true, ledgerReplayExactRequired: true, originalTranscriptAndEventsStoredLocally: true, duplicatePlainTranscriptDeliveryProhibited: true, originalEventFileDeliveryProhibited: true, historicalWorkflowStackDeliveryProhibited: true, endpointSchemaStillEnforced: true, sharedInstructionAndSchemaBytes: sharedInputBytes },
  chronologyPolicy: { sectionMetadataSeparate: true, oneTopLevelMoveInventory: true, emittedMoveOrder: "startEvent, endEvent, moveId", replyTargetsMustAlreadyAppear: true, automaticRetargetingAuthorized: false, inheritedChronologyValidationRetained: true },
  sourceIntegrityPolicy: { completeOriginalEventFileHashRequired: true, repositoryOwnedSourceTimes: true, excerptTokens: [12, 100], excerptMaximumCharacters: 600, minimumLexicalRecall: 0.8, minimumOrderedCoverage: 0.8, invalidContextRetryMaximum: 0, outputNormalizationAuthorized: false },
  controlPolicy: { rate: 0.1, selectedDebateIds: [...controlIds], selectedNumbers: packets.filter((item) => item.controlSampleSelected).map((item) => item.debate.number), selectionVisibleToPrimaryJudge: false },
  totals: { debates: 6, sourceOnlyPackets: 6, compactSourceLedgers: 6, sourceLedgerEvents: packets.reduce((sum, item) => sum + item.packet.transportChain.sourceLedgerEventCount, 0), sourceLedgerBytes: packets.reduce((sum, item) => sum + item.sourceLedgerBytes.length, 0), duplicatedSourceTextBytesAvoided: debates.reduce((sum, item) => sum + item.duplicatedSourceTextBytesAvoided, 0), meanCompactCopiedInputBytes: Math.round(debates.reduce((sum, item) => sum + item.compactCopiedInputBytes, 0) / debates.length), maximumCompactCopiedInputBytes: Math.max(...debates.map((item) => item.compactCopiedInputBytes)), controlDebates: controlIds.size, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, primaryExecutionManifest: false, primaryModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V424_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, outputSchemaVersion: V424_OUTPUT_VERSION, debates: 6, controls: preparation.controlPolicy.selectedNumbers, totalDurationHours: Number((sample.debates.reduce((sum, debate) => sum + debate.durationSeconds, 0) / 3600).toFixed(2)), durationBandCounts: sample.audit.durationBandCounts, sourceLedgerEvents: preparation.totals.sourceLedgerEvents, sourceLedgerMegabytes: Number((preparation.totals.sourceLedgerBytes / 1000000).toFixed(3)), meanCompactCopiedInputKilobytes: Math.round(preparation.totals.meanCompactCopiedInputBytes / 1000), maximumCompactCopiedInputKilobytes: Math.round(preparation.totals.maximumCompactCopiedInputBytes / 1000), chronologyFirst: true, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
