#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_ROOT } from "./lib/v417-fresh-validation.mjs";
import {
  V417_PASS_B_PROTOCOL_ID,
  V417_PASS_B_ROOT,
  buildV417LockedEventLedger,
  buildV417PassBPacket,
  makeV417PassBSchema,
  validateV417LockedEventLedger,
  validateV417PassBPacket
} from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const [primaryPreparation, primaryAnalysis, primaryExecution] = await Promise.all([
  readJson(`${V417_ROOT}/preparation-manifest.json`),
  readJson(`${V417_ROOT}/primary-analysis.json`),
  readJson(`${V417_ROOT}/primary-model-execution.json`)
]);
assertV4(primaryAnalysis.status === "primary-passed-pass-b-preparation-authorized" && primaryAnalysis.totals.pendingAudioMoves === 0, "v4.1.7 primary analysis unavailable");
assertV4(primaryExecution.status === "primary-execution-passed" && primaryExecution.validContexts === 6, "v4.1.7 primary execution unavailable");

const contexts = [];
for (const debate of primaryAnalysis.debates.filter((item) => item.escalation.requiresSecondPass)) {
  const prepared = primaryPreparation.debates.find((item) => item.debateNumber === debate.debateNumber);
  assertV4(prepared, `${debate.debateNumber}: primary preparation unavailable`);
  const [primary, sourcePacket] = await Promise.all([readJson(prepared.output), readJson(prepared.packet)]);
  const eventsBytes = await readFile(path.resolve(root, sourcePacket.sourceChain.eventsPath));
  const events = JSON.parse(eventsBytes);
  const packet = buildV417PassBPacket(primary, sourcePacket);
  const packetValidation = validateV417PassBPacket(packet);
  const eventLedger = buildV417LockedEventLedger(packet, events);
  const eventValidation = validateV417LockedEventLedger(eventLedger, packet, events);
  const packetPath = `${V417_PASS_B_ROOT}/packets/debate-${debate.debateNumber}.json`;
  const lockedEventsPath = `${V417_PASS_B_ROOT}/locked-events/debate-${debate.debateNumber}.json`;
  const outputPath = `${V417_PASS_B_ROOT}/outputs/debate-${debate.debateNumber}.json`;
  const originalEventsFileSha256 = createHash("sha256").update(eventsBytes).digest("hex");
  assertV4(originalEventsFileSha256 === sourcePacket.sourceChain.eventsSha256, `${debate.debateNumber}: original events hash mismatch`);
  contexts.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    family: debate.family,
    packet: packetPath,
    lockedEvents: lockedEventsPath,
    sourcePacket: prepared.packet,
    transcript: sourcePacket.sourceChain.transcriptPath,
    events: sourcePacket.sourceChain.eventsPath,
    localManifest: sourcePacket.sourceChain.localManifestPath,
    primaryOutput: prepared.output,
    output: outputPath,
    packetValidation,
    eventValidation,
    originalEventsFileSha256
  });
  if (shouldWrite) {
    await mkdir(path.resolve(root, path.dirname(packetPath)), { recursive: true });
    await mkdir(path.resolve(root, path.dirname(lockedEventsPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, lockedEventsPath), `${JSON.stringify(eventLedger, null, 2)}\n`);
  }
}
assertV4(contexts.map((item) => item.debateNumber).join(",") === "58,91,59,144,171", "v4.1.7 Pass B context order invalid");

if (shouldWrite) {
  await mkdir(path.resolve(root, V417_PASS_B_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(root, V417_PASS_B_ROOT, "schemas/pass-b.schema.json"), `${JSON.stringify(makeV417PassBSchema(), null, 2)}\n`);
}

const inputs = {
  ...primaryPreparation.inputs,
  manual: `${V417_PASS_B_ROOT}/manual.md`,
  schema: `${V417_PASS_B_ROOT}/schemas/pass-b.schema.json`
};
const preparation = {
  schemaVersion: "4.1.7-fresh-six-triggered-pass-b-preparation",
  protocolId: V417_PASS_B_PROTOCOL_ID,
  status: shouldWrite ? "prepared-five-score-blind-pass-b-contexts" : "preview",
  calibrationOnly: true,
  sourceAccess: { completeTranscriptVisibleToModel: true, completeOriginalEventsHashLocked: true, completeOriginalEventsVisibleToModel: false, lockedEventsVisibleToModel: true, contextRowsPerSide: 2 },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  contexts,
  totals: {
    debates: contexts.length,
    lockedMoves: contexts.reduce((sum, item) => sum + item.packetValidation.lockedMoves, 0),
    originalEvents: contexts.reduce((sum, item) => sum + item.eventValidation.originalEventCount, 0),
    deliveredLockedAndContextEventRows: contexts.reduce((sum, item) => sum + item.eventValidation.deliveredRows, 0),
    modelContextsExecuted: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: { deterministicFixture: true, passBModelExecution: false, disagreementExtraction: false, adjudication: false, scoreDerivation: false, legacyComparison: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(root, V417_PASS_B_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.length, lockedMoves: preparation.totals.lockedMoves, originalEvents: preparation.totals.originalEvents, deliveredEventRows: preparation.totals.deliveredLockedAndContextEventRows, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
