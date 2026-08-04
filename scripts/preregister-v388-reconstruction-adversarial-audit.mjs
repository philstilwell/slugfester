#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const auditRoot = "docs/calibration/v3.8.8/reconstruction/adversarial-audit";
const reconstructionRoot = "docs/calibration/v3.8.8/reconstruction";
const outputPaths = {
  "55": `${reconstructionRoot}/validated-outputs/debate-55.json`,
  "103": `${reconstructionRoot}/outputs/debate-103.json`,
  "161": `${reconstructionRoot}/outputs/debate-161.json`
};
const readBytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));

const commonSources = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  `${auditRoot}/manual.md`,
  `${auditRoot}/schema.json`,
  "scripts/run-v388-reconstruction-adversarial-audit.mjs",
  "scripts/validate-v388-reconstruction-adversarial-audit.mjs",
  "scripts/compile-v388-reconstruction-adversarial-audit.mjs"
];
const contexts = [];
const sourcePaths = new Set(commonSources);
for (const debateNumber of ["55", "103", "161"]) {
  const packetPath = `${reconstructionRoot}/packets/debate-${debateNumber}.json`;
  const packet = await readJson(packetPath);
  const context = {
    debateNumber,
    debateId: packet.debateId,
    reconstruction: outputPaths[debateNumber],
    packet: packetPath,
    transcript: packet.sourceChain.transcriptPath,
    events: packet.sourceChain.eventsPath,
    sourceManifest: packet.sourceChain.localManifestPath,
    output: `${auditRoot}/outputs/debate-${debateNumber}.json`
  };
  contexts.push(context);
  [context.reconstruction, context.packet, context.transcript, context.events, context.sourceManifest].forEach((item) => sourcePaths.add(item));
}
const sourceHashes = {};
for (const relativePath of [...sourcePaths].sort()) sourceHashes[relativePath] = sha256(await readBytes(relativePath));

const manifest = {
  schemaVersion: "3.8.8-reconstruction-adversarial-audit-manifest",
  protocolId: "v3.8.8-reconstruction-adversarial-audit",
  status: "frozen-supplemental-audit-authorized",
  createdAt: new Date().toISOString(),
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  executionPolicy: { contexts: 3, perInvocationTimeoutMs: 1200000, retriesAuthorized: 0, apiKeysRemoved: true, ephemeralCodexHome: true, auditOnly: true },
  sourceHashes,
  contexts,
  futureOutputs: contexts.map((context) => context.output),
  artifacts: { execution: `${auditRoot}/model-execution.json`, summary: `${auditRoot}/audit-summary.json` },
  cost: { authentication: "ChatGPT subscription", meteredModelApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  authorization: { supplementalAuditModelExecution: true, reconstructionMutation: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) await writeFile(path.resolve(root, `${auditRoot}/execution-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
