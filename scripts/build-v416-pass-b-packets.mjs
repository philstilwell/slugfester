#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import {
  V416_PASS_B_PROTOCOL_ID,
  V416_PASS_B_ROOT,
  buildV416LockedEventLedger,
  buildV416PassBPacket,
  makeV416PassBSchema,
  validateV416LockedEventLedger,
  validateV416PassBPacket
} from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const primaryRoot = V41_LEAN_ROOT;
const primaryPreparation = await readJson(`${primaryRoot}/preparation-manifest.json`);
const primaryAnalysis = await readJson(`${primaryRoot}/primary-analysis.json`);
const failedV415 = await readJson("docs/calibration/v4.1.5/lean-retired-gate/pass-b/model-execution.json");
assertV4(primaryAnalysis.status === "primary-passed-ready-to-freeze-triggered-pass-b" && primaryAnalysis.totals.pendingAudioMoves === 0, "v4.1.5 primary gate unavailable");
assertV4(failedV415.status === "pass-b-execution-failed-fast" && failedV415.results.some((item) => item.debateNumber === "161" && item.status === "timed-out"), "v4.1.6 amendment lacks frozen timeout predicate");

const contexts = [];
for (const debate of primaryAnalysis.debates.filter((item) => item.escalation.requiresSecondPass)) {
  const prepared = primaryPreparation.debates.find((item) => item.debateNumber === debate.debateNumber);
  assertV4(prepared, `${debate.debateNumber}: primary preparation unavailable`);
  const [primary, sourcePacket] = await Promise.all([readJson(prepared.output), readJson(prepared.packet)]);
  const eventsBytes = await readFile(path.resolve(root, sourcePacket.sourceChain.eventsPath));
  const events = JSON.parse(eventsBytes);
  const packet = buildV416PassBPacket(primary, sourcePacket);
  const packetValidation = validateV416PassBPacket(packet);
  const eventLedger = buildV416LockedEventLedger(packet, events);
  const eventValidation = validateV416LockedEventLedger(eventLedger, packet, events);
  const packetPath = `${V416_PASS_B_ROOT}/packets/debate-${debate.debateNumber}.json`;
  const lockedEventsPath = `${V416_PASS_B_ROOT}/locked-events/debate-${debate.debateNumber}.json`;
  const outputPath = `${V416_PASS_B_ROOT}/outputs/debate-${debate.debateNumber}.json`;
  contexts.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
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
    originalEventsFileSha256: createHash("sha256").update(eventsBytes).digest("hex")
  });
  assertV4(contexts.at(-1).originalEventsFileSha256 === sourcePacket.sourceChain.eventsSha256, `${debate.debateNumber}: original events hash mismatch`);
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(lockedEventsPath)), { recursive: true });
    await writeFile(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(lockedEventsPath), `${JSON.stringify(eventLedger, null, 2)}\n`);
  }
}
assertV4(contexts.map((item) => item.debateNumber).join(",") === "55,103,161", "v4.1.6 context order invalid");

if (shouldWrite) {
  await mkdir(path.resolve(V416_PASS_B_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(V416_PASS_B_ROOT, "schemas/pass-b.schema.json"), `${JSON.stringify(makeV416PassBSchema(), null, 2)}\n`);
}

const preparation = {
  schemaVersion: "4.1.6-triggered-pass-b-preparation",
  protocolId: V416_PASS_B_PROTOCOL_ID,
  status: shouldWrite ? "prepared-nonredundant-score-blind-pass-b" : "preview",
  calibrationOnly: true,
  sourceAccess: { completeTranscriptVisibleToModel: true, completeOriginalEventsHashLocked: true, completeOriginalEventsVisibleToModel: false, lockedEventsVisibleToModel: true, contextRowsPerSide: 2 },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: {
    workflowBase: "docs/assessment-workflow-v4.0.md",
    workflowBounded: "docs/assessment-workflow-v4.1.md",
    workflowConsistency: "docs/assessment-workflow-v4.1.3.md",
    workflowBurdenTuple: "docs/assessment-workflow-v4.1.4.md",
    workflowTiming: "docs/assessment-workflow-v4.1.5.md",
    workflowSourceDelivery: "docs/assessment-workflow-v4.1.6.md",
    rubricBase: "docs/reassessment-rubric-v4.0.md",
    rubricBounded: "docs/reassessment-rubric-v4.1.md",
    manual: `${V416_PASS_B_ROOT}/manual.md`,
    schema: `${V416_PASS_B_ROOT}/schemas/pass-b.schema.json`
  },
  inheritedPreflight: { path: "docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/model-execution.json", statusRequired: "endpoint-preflight-passed", exactJudgmentShapeUnchanged: true, modelContextsRepeated: 0 },
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
  authorization: { deterministicFixture: true, passBModelExecution: false, disagreementExtraction: false, adjudication: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(V416_PASS_B_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.length, lockedMoves: preparation.totals.lockedMoves, originalEvents: preparation.totals.originalEvents, deliveredEventRows: preparation.totals.deliveredLockedAndContextEventRows, deliveryFraction: Number((preparation.totals.deliveredLockedAndContextEventRows / preparation.totals.originalEvents).toFixed(3)), modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
