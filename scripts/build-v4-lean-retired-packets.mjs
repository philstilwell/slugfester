#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V4_LEAN_DEBATES, V4_LEAN_ROOT, assertV4, makeV4ControlSample, makeV4PrimarySchema, readJson } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sourceRoot = "docs/calibration/v3.8.11/performance-judgment-consensus/packets";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const controlIds = new Set(makeV4ControlSample(V4_LEAN_DEBATES.map((number) => `retired-debate-${number}`)));
const packets = [];

for (const debateNumber of V4_LEAN_DEBATES) {
  const source = await readJson(`${sourceRoot}/debate-${debateNumber}.json`);
  const [manifest, events] = await Promise.all([
    readJson(source.sourceChain.localManifestPath),
    readJson(source.sourceChain.eventsPath)
  ]);
  assertV4(sha256(await bytes(source.sourceChain.transcriptPath)) === source.sourceChain.transcriptSha256, `${debateNumber}: transcript hash mismatch`);
  assertV4(sha256(await bytes(source.sourceChain.eventsPath)) === source.sourceChain.eventsSha256, `${debateNumber}: events hash mismatch`);
  assertV4(sha256(await bytes(source.sourceChain.localManifestPath)) === source.sourceChain.localManifestSha256, `${debateNumber}: manifest hash mismatch`);
  const eventArray = Array.isArray(events) ? events : events.events;
  assertV4(Array.isArray(eventArray) && eventArray.length > 0, `${debateNumber}: events unavailable`);
  const packet = {
    schemaVersion: "4.0-lean-source-only-packet",
    protocolId: "v4.0-lean-risk-triggered-consensus",
    debateNumber,
    debateId: source.debateId,
    motion: source.motion,
    sides: source.sides,
    durationSeconds: manifest.durationSeconds,
    eventCount: eventArray.length,
    sourceChain: source.sourceChain,
    modelInputBoundary: {
      fullTranscriptRequired: true,
      timestampedEventsRequired: true,
      legacyAssessmentsUnavailable: true,
      priorArgumentInventoriesUnavailable: true,
      priorBurdenMapsUnavailable: true,
      priorSectionsAndWeightsUnavailable: true,
      priorRatingsAndTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      assessmentProseUnavailable: true,
      controlSelectionUnavailable: true
    }
  };
  packets.push({ debateNumber, debateId: packet.debateId, packet, controlSampleSelected: controlIds.has(`retired-debate-${debateNumber}`) });
}

const schema = makeV4PrimarySchema();
const artifacts = [];
if (shouldWrite) {
  await mkdir(path.resolve(root, `${V4_LEAN_ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(root, `${V4_LEAN_ROOT}/schemas`), { recursive: true });
  for (const item of packets) {
    const packetPath = `${V4_LEAN_ROOT}/packets/debate-${item.debateNumber}.json`;
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(item.packet, null, 2)}\n`);
    artifacts.push(packetPath);
  }
  await writeFile(path.resolve(root, `${V4_LEAN_ROOT}/schemas/primary.schema.json`), `${JSON.stringify(schema, null, 2)}\n`);
}

const sourceHashes = {};
for (const item of packets) {
  for (const relativePath of Object.values(item.packet.sourceChain)) {
    if (typeof relativePath === "string" && relativePath.includes("/")) sourceHashes[relativePath] = sha256(await bytes(relativePath));
  }
}
const preparation = {
  schemaVersion: "4.0-lean-retired-preparation",
  protocolId: "v4.0-lean-risk-triggered-consensus",
  status: shouldWrite ? "prepared-source-only-no-model-execution" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  debates: packets.map((item) => ({ debateNumber: item.debateNumber, debateId: item.debateId, controlSampleSelected: item.controlSampleSelected, packet: `${V4_LEAN_ROOT}/packets/debate-${item.debateNumber}.json`, output: `${V4_LEAN_ROOT}/primary-outputs/debate-${item.debateNumber}.json` })),
  inputs: { workflow: "docs/assessment-workflow-v4.0.md", rubric: "docs/reassessment-rubric-v4.0.md", manual: `${V4_LEAN_ROOT}/manual.md`, schema: `${V4_LEAN_ROOT}/schemas/primary.schema.json` },
  controlPolicy: { rate: 0.1, selected: packets.filter((item) => item.controlSampleSelected).map((item) => item.debateNumber), selectionVisibleToPrimaryJudge: false },
  sourceHashes,
  totals: { debates: packets.length, sourceOnlyPackets: packets.length, controlDebates: packets.filter((item) => item.controlSampleSelected).length, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, endpointPreflight: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V4_LEAN_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: packets.length, packets: artifacts, controlDebates: preparation.controlPolicy.selected, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
