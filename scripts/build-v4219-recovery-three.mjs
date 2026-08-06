#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4219_MODEL, V4219_OUTPUT_VERSION, V4219_PACKET_VERSION, V4219_PROTOCOL_ID, V4219_ROOT, buildV4219SourcePacket, classifyV4219PrimaryRoute, makeV4219PrimarySchema, measureV4219CopiedInput } from "./lib/v4219-primary-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [sample, screening] = await Promise.all(["source-only-sample.json", "sample-screening-v4.2.19.1.json"].map((file) => readFile(`${V4219_ROOT}/${file}`, "utf8").then(JSON.parse)));
assertV4(sample.status === "frozen-pending-motion-only-screening" && sample.debates.length === 3 && sample.audit.priorOrRejectedSampleOverlap === 0 && !sample.selectionBoundary.legacyAssessmentContentAccessed, "v4.2.19 sample invalid");
assertV4(screening.status === "sample-screened-packet-preparation-authorized" && screening.authorization.compactSourcePacketPreparation, "v4.2.19 packet preparation unauthorized");
for (const [file, digest] of Object.entries(sample.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `sample source hash mismatch: ${file}`);
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V4219_ROOT}/manual.md`, schema: `${V4219_ROOT}/primary.schema.json` };
const schemaBytes = Buffer.from(`${JSON.stringify(makeV4219PrimarySchema(), null, 2)}\n`);
if (shouldWrite) await writeFile(inputs.schema, schemaBytes);
else assertV4(sha256(await readFile(inputs.schema)) === sha256(schemaBytes), "v4.2.19 stored schema differs from generator");
const sharedInputBytes = (await Promise.all(Object.values(inputs).map((file) => stat(file).then((item) => item.size)))).reduce((sum, value) => sum + value, 0);
assertV4(sharedInputBytes === sample.routingAudit.sharedInputBytes, "v4.2.19 shared input byte count changed after selection");
const control = [...sample.debates].sort((left, right) => sha256(`slugfester-v4.2.19-control:${left.debateId}`).localeCompare(sha256(`slugfester-v4.2.19-control:${right.debateId}`)))[0];
const contexts = [];
for (const debate of sample.debates) {
  const transcriptPath = `.assessment-cache/captions/${debate.videoId}/transcript.txt`;
  const eventsPath = `.assessment-cache/captions/${debate.videoId}/events.json`;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.19/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(file)));
  const built = buildV4219SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  const measurement = measureV4219CopiedInput({ packetBytes: built.packetBytes, sourceLedgerBytes: built.sourceLedgerBytes, sharedInputBytes });
  assertV4(measurement.route.route === "direct" && debate.route === "direct", `${debate.number}: selected context no longer passes direct route`);
  assertV4(built.packet.eventCount === debate.sourceLedgerEvents && built.sourceLedgerBytes.length === debate.sourceLedgerBytes && built.packetBytes.length === debate.packetBytes && measurement.compactCopiedInputBytes === debate.compactCopiedInputBytes, `${debate.number}: selected transport measurement changed`);
  const packetPath = `${V4219_ROOT}/packets/debate-${debate.number}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(sourceLedgerPath), { recursive: true });
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(sourceLedgerPath, built.sourceLedgerBytes);
    await writeFile(packetPath, built.packetBytes);
  }
  contexts.push({ debateNumber: debate.number, debateId: debate.debateId, family: debate.family, durationSeconds: debate.durationSeconds, captionKind: debate.captionKind, route: measurement.route.route, routeEvidence: measurement.route, controlSampleSelected: debate.debateId === control.debateId, packet: packetPath, sourceLedger: sourceLedgerPath, originalTranscript: transcriptPath, originalEvents: eventsPath, originalManifest: manifestPath, rawOutput: `${V4219_ROOT}/primary-outputs/debate-${debate.number}.json`, compiledOutput: `${V4219_ROOT}/primary-compiled/debate-${debate.number}.json`, sourceLedgerSha256: built.packet.transportChain.sourceLedgerSha256, sourceLedgerEvents: built.packet.eventCount, sourceLedgerBytes: built.sourceLedgerBytes.length, packetBytes: built.packetBytes.length, sharedInputBytes, compactCopiedInputBytes: measurement.compactCopiedInputBytes });
}
const preparation = { schemaVersion: "4.2.19.1-recovery-three-preparation", protocolId: V4219_PROTOCOL_ID, status: shouldWrite ? "prepared-three-recovery-direct-contexts" : "preview", calibrationOnly: true, AIOnly: true, dyadicOnly: true, model: { label: V4219_MODEL.label, slug: V4219_MODEL.slug, reasoningEffort: V4219_MODEL.primaryReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, sample: `${V4219_ROOT}/source-only-sample.json`, screening: `${V4219_ROOT}/sample-screening-v4.2.19.1.json`, contexts, inputs, sourcePolicy: { completeLocalTranscriptChains: true, oneLosslessTimestampedLedgerPerDebate: true, originalTranscriptAndEventsStoredLocally: true, duplicatePlainTranscriptDeliveryProhibited: true, routeUsesDuration: false, directRouteRequiresBothEventAndByteCeilings: true, exactEvidenceCueRequired: true, evidenceCueTokenRange: [6, 20], evidenceCueMaximumCharacters: 180, repositoryOwnedExcerptCompilation: true, compiledExcerptMaximumCharacters: 450, compiledExcerptTokenRange: [12, 90], repositoryOwnedChronology: true, repositoryDerivedResponseClass: true, modelAuthoredAbsoluteResponsivenessProhibited: true }, controlPolicy: { selectedDebateId: control.debateId, selectedDebateNumber: control.number, visibleToPrimaryJudge: false, purpose: "force later isolated Pass B and adjudication-path exercise" }, audioPolicy: { mediumConfidenceMoveRequiresAudioVerification: true, audioVerificationOccursBeforeAdjudicationAndScoreDerivation: true }, executionPolicy: { attemptsPerDebate: 1, retries: 0, postHocCorrectionAuthorized: false, semanticNormalizationAuthorized: false, scoreDerivationAuthorized: false }, totals: { debates: contexts.length, sourceLedgerEvents: contexts.reduce((sum, item) => sum + item.sourceLedgerEvents, 0), meanCompactCopiedInputBytes: Math.round(contexts.reduce((sum, item) => sum + item.compactCopiedInputBytes, 0) / contexts.length), maximumCompactCopiedInputBytes: Math.max(...contexts.map((item) => item.compactCopiedInputBytes)), modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { deterministicFixtures: true, primaryExecutionManifest: true, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(`${V4219_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, outputSchemaVersion: V4219_OUTPUT_VERSION, packetSchemaVersion: V4219_PACKET_VERSION, debates: contexts.map((item) => item.debateNumber), control: preparation.controlPolicy.selectedDebateNumber, totalDurationHours: Number((contexts.reduce((sum, item) => sum + item.durationSeconds, 0) / 3600).toFixed(2)), sourceLedgerEvents: preparation.totals.sourceLedgerEvents, meanCompactCopiedInputKilobytes: Math.round(preparation.totals.meanCompactCopiedInputBytes / 1000), maximumCompactCopiedInputKilobytes: Math.round(preparation.totals.maximumCompactCopiedInputBytes / 1000), modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
