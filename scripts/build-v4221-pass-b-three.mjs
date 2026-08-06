#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4220_ROOT } from "./lib/v4220-source-span-rendering.mjs";
import { V4221_ROOT, buildV4221PassBPacket, makeV4221PassBSchema, validateV4221PassBPacket } from "./lib/v4221-pass-b-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const sourcePreparation = JSON.parse(await readFile(`${V4220_ROOT}/preparation-manifest.json`, "utf8"));
const sourceAnalysis = JSON.parse(await readFile(`${V4220_ROOT}/analysis.json`, "utf8"));
assertV4(sourceAnalysis.status === "source-span-primary-gate-passed" && sourceAnalysis.authorization.passBRecoveryDesign, "accepted v4.2.20.1 primary gate required");

const contexts = [];
for (const source of sourcePreparation.contexts) {
  const primaryPath = `${V4220_ROOT}/primary-outputs/debate-${source.debateNumber}.json`;
  const sourcePacketPath = `${V4220_ROOT}/packets/debate-${source.debateNumber}.json`;
  const [primary, sourcePacket] = await Promise.all([readFile(primaryPath, "utf8").then(JSON.parse), readFile(sourcePacketPath, "utf8").then(JSON.parse)]);
  const packet = buildV4221PassBPacket(primary, sourcePacket);
  const validation = validateV4221PassBPacket(packet);
  const packetPath = `${V4221_ROOT}/packets/debate-${source.debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await writeFile(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  }
  contexts.push({
    debateNumber: source.debateNumber,
    debateId: source.debateId,
    family: source.family,
    sourcePrimary: primaryPath,
    sourcePacket: sourcePacketPath,
    passBPacket: packetPath,
    sourceLedger: source.sourceLedger,
    originalTranscript: source.originalTranscript,
    originalEvents: source.originalEvents,
    originalManifest: source.originalManifest,
    rawOutput: `${V4221_ROOT}/pass-b-outputs/debate-${source.debateNumber}.json`,
    reconstructedOutput: `${V4221_ROOT}/pass-b-reconstructed/debate-${source.debateNumber}.json`,
    packetValidation: validation
  });
}

const preparation = {
  schemaVersion: "4.2.21-pass-b-preparation",
  protocolId: "v4.2.21-source-span-consensus",
  status: shouldWrite ? "prepared-three-isolated-source-span-pass-b-contexts" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  sourcePrimaryGate: `${V4220_ROOT}/analysis.json`,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  inputs: { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", workflow: "docs/assessment-workflow-v4.2.21.md", manual: `${V4221_ROOT}/manual.md`, schema: `${V4221_ROOT}/pass-b.schema.json` },
  contexts,
  isolation: { oneDebatePerFreshContext: true, completeTimestampedSourceLedgerVisible: true, lockedInventoryVisible: true, primaryJudgmentsHidden: true, primaryRatingsHidden: true, primaryTotalsHidden: true, triggerReasonsHidden: true, controlsHidden: true, otherDebatesHidden: true, legacyAssessmentsHidden: true, winnersHidden: true, publicationProseHidden: true },
  totals: { contexts: contexts.length, lockedMoves: contexts.reduce((sum, context) => sum + context.packetValidation.lockedMoves, 0), modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { executionManifest: true, passBModelExecution: false, audioExecution: false, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};

if (shouldWrite) {
  await mkdir(path.resolve(V4221_ROOT), { recursive: true });
  await writeFile(path.resolve(V4221_ROOT, "pass-b.schema.json"), `${JSON.stringify(makeV4221PassBSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V4221_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => context.debateNumber), contexts: contexts.length, lockedMoves: preparation.totals.lockedMoves, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, passBModelExecutionAuthorized: false }, null, 2));
