#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V415_PASS_B_PROTOCOL_ID, V415_PASS_B_ROOT, buildV415PassBPacket, makeV415PassBSchema, validateV415PassBPacket } from "./lib/v415-triggered-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, analysis] = await Promise.all([readJson(`${V41_LEAN_ROOT}/preparation-manifest.json`), readJson(`${V41_LEAN_ROOT}/primary-analysis.json`)]);
assertV4(analysis.status === "primary-passed-ready-to-freeze-triggered-pass-b" && analysis.totals.pendingAudioMoves === 0, "Pass B packet preparation unauthorized");
const triggered = analysis.debates.filter((debate) => debate.escalation.requiresSecondPass);
assertV4(triggered.length > 0, "no triggered debates");
const contexts = [];
for (const debate of triggered) {
  const prepared = preparation.debates.find((item) => item.debateNumber === debate.debateNumber);
  assertV4(prepared, `${debate.debateNumber}: preparation unavailable`);
  const [primary, sourcePacket] = await Promise.all([readJson(prepared.output), readJson(prepared.packet)]);
  const packet = buildV415PassBPacket(primary, sourcePacket);
  const validation = validateV415PassBPacket(packet);
  const packetPath = `${V415_PASS_B_ROOT}/packets/debate-${debate.debateNumber}.json`;
  const outputPath = `${V415_PASS_B_ROOT}/outputs/debate-${debate.debateNumber}.json`;
  contexts.push({ debateNumber: debate.debateNumber, debateId: debate.debateId, packet: packetPath, sourcePacket: prepared.packet, transcript: sourcePacket.sourceChain.transcriptPath, events: sourcePacket.sourceChain.eventsPath, localManifest: sourcePacket.sourceChain.localManifestPath, output: outputPath, validation });
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await writeFile(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  }
}

const syntheticPrimary = await readJson(`${V41_LEAN_ROOT}/schema-preflight/output.json`);
const syntheticSource = await readJson(`${V41_LEAN_ROOT}/schema-preflight/packet.json`);
const syntheticPacket = buildV415PassBPacket(syntheticPrimary, syntheticSource);
if (shouldWrite) {
  await mkdir(path.resolve(V415_PASS_B_ROOT, "schemas"), { recursive: true });
  await mkdir(path.resolve(V415_PASS_B_ROOT, "schema-preflight"), { recursive: true });
  await writeFile(path.resolve(V415_PASS_B_ROOT, "schemas/pass-b.schema.json"), `${JSON.stringify(makeV415PassBSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V415_PASS_B_ROOT, "schema-preflight/packet.json"), `${JSON.stringify(syntheticPacket, null, 2)}\n`);
}
const preparationManifest = {
  schemaVersion: "4.1.5-triggered-pass-b-preparation",
  protocolId: V415_PASS_B_PROTOCOL_ID,
  status: shouldWrite ? "prepared-score-blind-pass-b-packets" : "preview",
  calibrationOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  contexts,
  inputs: { workflow: "docs/assessment-workflow-v4.0.md", workflowBounded: "docs/assessment-workflow-v4.1.md", workflowConsistency: "docs/assessment-workflow-v4.1.3.md", workflowBurdenTuple: "docs/assessment-workflow-v4.1.4.md", workflowTiming: "docs/assessment-workflow-v4.1.5.md", rubricBase: "docs/reassessment-rubric-v4.0.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V415_PASS_B_ROOT}/manual.md`, schema: `${V415_PASS_B_ROOT}/schemas/pass-b.schema.json` },
  totals: { triggeredDebates: contexts.length, lockedMoves: contexts.reduce((sum, item) => sum + item.validation.lockedMoves, 0), primaryJudgmentFieldsVisible: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { passBSchemaPreflight: true, passBModelExecution: false, disagreementExtraction: false, adjudication: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(V415_PASS_B_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparationManifest, null, 2)}\n`);
console.log(JSON.stringify({ status: preparationManifest.status, triggeredDebates: contexts.length, lockedMoves: preparationManifest.totals.lockedMoves, primaryJudgmentFieldsVisible: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
