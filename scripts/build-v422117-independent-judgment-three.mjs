#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import { buildV422116JudgmentPacket, makeV422116JudgmentSchema, V422116_MODEL, V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

export const V422117_ROOT = "docs/calibration/v4.2.21.17/independent-judgment-three";
export const V422117_PROTOCOL_ID = "v4.2.21.17-independent-judgment-three";
const shouldWrite = process.argv.includes("--write");
const analysis = JSON.parse(await readFile(`${V422116_ROOT}/inventory-recovery-analysis.json`, "utf8"));
assertV4(analysis.status === "retired-partition-three-inventory-gate-passed-independent-judgment-preparation-authorized" && analysis.authorization.independentJudgmentPreparation, "independent judgment preparation unauthorized");
const manualPath = `${V422117_ROOT}/judgment-manual.md`;
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerived: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: manualPath };
const sharedInputBytes = (await Promise.all(Object.values(inputs).map((file) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = [];
for (const debateNumber of ["133", "178", "182"]) {
  const lockedInventoryPath = `${V422116_ROOT}/locked-inventories/debate-${debateNumber}.json`;
  const lockedInventoryBytes = await readFile(lockedInventoryPath);
  const lockedInventory = JSON.parse(lockedInventoryBytes);
  const discoveryPacketPath = `docs/calibration/v4.2.21.12/simplified-partition-discovery/packets/debate-${debateNumber}.json`;
  const discoveryPacket = JSON.parse(await readFile(discoveryPacketPath, "utf8"));
  const [transcriptBytes, eventsBytes, manifestBytes, fullLedgerBytes] = await Promise.all([discoveryPacket.sourceChain.transcriptPath, discoveryPacket.sourceChain.eventsPath, discoveryPacket.sourceChain.localManifestPath, discoveryPacket.transportChain.sourceLedgerPath].map((file) => readFile(file)));
  const localManifest = JSON.parse(manifestBytes);
  const built = buildV4220SourcePacket({ debate: { number: debateNumber, debateId: discoveryPacket.debateId, motion: discoveryPacket.motion, sides: discoveryPacket.sides, videoId: localManifest.videoId }, transcriptPath: discoveryPacket.sourceChain.transcriptPath, eventsPath: discoveryPacket.sourceChain.eventsPath, manifestPath: discoveryPacket.sourceChain.localManifestPath, sourceLedgerPath: discoveryPacket.transportChain.sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  assertV4(sha256(built.sourceLedgerBytes) === sha256(fullLedgerBytes), `${debateNumber}: v4.2.20 source-ledger replay changed`);
  const sourcePacketPath = `${V422117_ROOT}/source-packets/debate-${debateNumber}.json`;
  const sourcePacketBytes = Buffer.from(`${JSON.stringify(built.packet, null, 2)}\n`);
  if (shouldWrite) { await mkdir(path.dirname(sourcePacketPath), { recursive: true }); await writeFile(sourcePacketPath, sourcePacketBytes); }
  for (const reviewerPass of ["A", "B"]) {
    const judgmentPacket = buildV422116JudgmentPacket(lockedInventory, reviewerPass);
    const judgmentPacketBytes = Buffer.from(JSON.stringify(judgmentPacket));
    const judgmentPacketPath = `${V422117_ROOT}/judgment-packets/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.json`;
    const schema = makeV422116JudgmentSchema({ packet: judgmentPacket });
    const schemaBytes = Buffer.from(JSON.stringify(schema));
    const schemaPath = `${V422117_ROOT}/schemas/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.schema.json`;
    if (shouldWrite) {
      await mkdir(path.dirname(judgmentPacketPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(judgmentPacketPath, judgmentPacketBytes);
      await writeFile(schemaPath, schemaBytes);
    }
    contexts.push({
      debateNumber,
      debateId: lockedInventory.debateId,
      reviewerPass,
      reviewerRole: judgmentPacket.reviewerRole,
      lockedInventory: lockedInventoryPath,
      lockedInventorySha256: sha256(lockedInventoryBytes),
      lockedInventoryCanonicalSha256: judgmentPacket.lockedInventorySha256,
      sourcePacket: sourcePacketPath,
      sourcePacketSha256: sha256(sourcePacketBytes),
      originalEvents: discoveryPacket.sourceChain.eventsPath,
      originalEventsSha256: sha256(eventsBytes),
      fullLedger: discoveryPacket.transportChain.sourceLedgerPath,
      fullLedgerSha256: sha256(fullLedgerBytes),
      judgmentPacket: judgmentPacketPath,
      judgmentPacketSha256: sha256(judgmentPacketBytes),
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      moves: lockedInventory.moves.length,
      copiedInputBytes: sharedInputBytes + sourcePacketBytes.length + judgmentPacketBytes.length + schemaBytes.length,
      judgmentOutput: `${V422117_ROOT}/judgments/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.json`,
      rawOutput: `${V422117_ROOT}/raw-outputs/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.json`,
      validationOutput: `${V422117_ROOT}/validations/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.json`,
      provenanceOutput: `${V422117_ROOT}/provenance/pass-${reviewerPass.toLowerCase()}/debate-${debateNumber}.json`
    });
  }
}
assertV4(contexts.length === 6 && contexts.every((context) => context.copiedInputBytes <= 115000), "independent judgment context exceeds 115 KB transport ceiling");
for (const debateNumber of ["133", "178", "182"]) {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  assertV4(pair.length === 2 && pair[0].lockedInventoryCanonicalSha256 === pair[1].lockedInventoryCanonicalSha256, `${debateNumber}: Pass A/B locked inventory mismatch`);
}
const preparation = {
  schemaVersion: "4.2.21.17-independent-judgment-preparation",
  protocolId: V422117_PROTOCOL_ID,
  status: shouldWrite ? "retired-partition-three-independent-judgments-prepared" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  sharedInputBytes,
  contexts,
  isolation: { twoIndependentPassesPerDebate: true, byteIdenticalLockedInventoryPerPair: true, separateFreshModelContextPerPass: true, otherPassUnavailable: true, candidateSelectionUnavailable: true, legacyAssessmentsScoresWinnersAndProseUnavailable: true },
  deterministicDerivations: { targetEnumsEarlierOpposingOnly: true, responseClassRepositoryDerived: true, absoluteResponsivenessRepositoryMapped: true, absoluteRelevanceBurdenRepositoryMapped: true, untestedCharityAnchorRepositoryApplied: true, strictBurdenResidualExclusionRepositoryApplied: true, semanticRepair: false },
  totals: { debates: 3, contexts: 6, movesJudged: contexts.reduce((sum, context) => sum + context.moves, 0), maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), meanCopiedInputBytes: Math.round(contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) / contexts.length), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, executionManifest: true, modelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${V422117_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, moves: context.moves, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000) })), maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
