#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_DEBATES, V41_LEAN_ROOT, V41_MODEL, V41_PACKET_VERSION, V41_PROTOCOL_ID, assertV4, makeV41PrimarySchema, readJson } from "./lib/v41-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sourceRoot = "docs/calibration/v4.0.1/lean-retired-gate/packets";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const packets = [];

for (const debateNumber of V41_LEAN_DEBATES) {
  const source = await readJson(`${sourceRoot}/debate-${debateNumber}.json`);
  for (const [pathKey, hashKey] of [["transcriptPath", "transcriptSha256"], ["eventsPath", "eventsSha256"], ["localManifestPath", "localManifestSha256"]]) {
    const bytes = await readFile(path.resolve(root, source.sourceChain[pathKey]));
    assertV4(sha256(bytes) === source.sourceChain[hashKey], `${debateNumber}: ${pathKey} hash mismatch`);
  }
  const packet = {
    ...source,
    schemaVersion: V41_PACKET_VERSION,
    protocolId: V41_PROTOCOL_ID,
    modelInputBoundary: { ...source.modelInputBoundary, highEffortReferenceOutputsUnavailable: true, boundedMoveMinimum: 8, boundedMoveMaximum: 24, sectionMinimum: 4, sectionMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2 }
  };
  packets.push({ debateNumber, debateId: packet.debateId, packet, controlSampleSelected: debateNumber === "161" });
}

if (shouldWrite) {
  await mkdir(path.resolve(root, `${V41_LEAN_ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(root, `${V41_LEAN_ROOT}/schemas`), { recursive: true });
  await mkdir(path.resolve(root, `${V41_LEAN_ROOT}/schema-preflight`), { recursive: true });
  for (const item of packets) await writeFile(path.resolve(root, `${V41_LEAN_ROOT}/packets/debate-${item.debateNumber}.json`), `${JSON.stringify(item.packet, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V41_LEAN_ROOT}/schemas/primary.schema.json`), `${JSON.stringify(makeV41PrimarySchema(), null, 2)}\n`);
  const oldSynthetic = await readJson("docs/calibration/v4.0.1/lean-retired-gate/schema-preflight/packet.json");
  const synthetic = { ...oldSynthetic, schemaVersion: V41_PACKET_VERSION, protocolId: V41_PROTOCOL_ID, debateId: "v41-bounded-schema-preflight", modelInputBoundary: { ...oldSynthetic.modelInputBoundary, highEffortReferenceOutputsUnavailable: true, boundedMoveMinimum: 8, boundedMoveMaximum: 24 } };
  await writeFile(path.resolve(root, `${V41_LEAN_ROOT}/schema-preflight/packet.json`), `${JSON.stringify(synthetic, null, 2)}\n`);
}

const preparation = {
  schemaVersion: "4.1-bounded-retired-preparation",
  protocolId: V41_PROTOCOL_ID,
  status: shouldWrite ? "prepared-source-only-no-model-execution" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V41_MODEL.label, slug: V41_MODEL.slug, primaryReasoningEffort: V41_MODEL.primaryReasoningEffort, reviewReasoningEffort: V41_MODEL.reviewReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  debates: packets.map((item) => ({ debateNumber: item.debateNumber, debateId: item.debateId, controlSampleSelected: item.controlSampleSelected, packet: `${V41_LEAN_ROOT}/packets/debate-${item.debateNumber}.json`, output: `${V41_LEAN_ROOT}/primary-outputs/debate-${item.debateNumber}.json` })),
  inputs: {
    workflowBase: "docs/assessment-workflow-v4.0.md",
    workflowDerivedScores: "docs/assessment-workflow-v4.0.1.md",
    workflow: "docs/assessment-workflow-v4.1.md",
    rubricBase: "docs/reassessment-rubric-v4.0.md",
    rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md",
    rubric: "docs/reassessment-rubric-v4.1.md",
    manual: `${V41_LEAN_ROOT}/manual.md`,
    schema: `${V41_LEAN_ROOT}/schemas/primary.schema.json`
  },
  controlPolicy: { rate: 0.1, selected: ["161"], selectionVisibleToPrimaryJudge: false },
  totals: { debates: 3, sourceOnlyPackets: 3, controlDebates: 1, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, endpointPreflight: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V41_LEAN_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: 3, controlDebates: ["161"], primaryReasoningEffort: V41_MODEL.primaryReasoningEffort, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
