#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import { buildV422116JudgmentPacket, makeV422116JudgmentSchema, V422116_MODEL } from "./lib/v422116-decomposed-consensus.mjs";

const INVENTORY_ROOT = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory";
const INVENTORY_ANALYSIS = `${INVENTORY_ROOT}/analysis.json`;
const SOURCE_PREPARATION = "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const inputs = { manual: `${ROOT}/judgment-manual.md` };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const inventoryAnalysisBytes = await readFile(INVENTORY_ANALYSIS);
const sourcePreparationBytes = await readFile(SOURCE_PREPARATION);
const inventoryAnalysis = JSON.parse(inventoryAnalysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
assertV4(inventoryAnalysis.status === "five-hard-route-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" && inventoryAnalysis.authorization.independentJudgmentPacketPreparation, "independent judgment preparation unauthorized");
const sharedInputBytes = (await Promise.all(Object.values(inputs).map((file) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0);

const contexts = [];
for (const debate of inventoryAnalysis.debates) {
  const source = sourcePreparation.contexts.find((item) => item.debateNumber === debate.debateNumber);
  assertV4(source, `${debate.debateNumber}: source preparation missing`);
  const lockedInventoryBytes = await readFile(debate.lockedInventory);
  assertV4(sha256(lockedInventoryBytes) === debate.lockedInventorySha256, `${debate.debateNumber}: locked inventory hash drifted`);
  const lockedInventory = JSON.parse(lockedInventoryBytes);
  const [transcriptBytes, eventsBytes, manifestBytes, fullLedgerBytes] = await Promise.all([
    readFile(source.originalTranscript),
    readFile(source.originalEvents),
    readFile(source.originalManifest),
    readFile(source.fullLedger),
  ]);
  const localManifest = JSON.parse(manifestBytes);
  const built = buildV4220SourcePacket({
    debate: {
      number: debate.debateNumber,
      debateId: debate.debateId,
      motion: JSON.parse(await readFile(source.packet)).motion,
      sides: JSON.parse(await readFile(source.packet)).sides,
      videoId: localManifest.videoId,
    },
    transcriptPath: source.originalTranscript,
    eventsPath: source.originalEvents,
    manifestPath: source.originalManifest,
    sourceLedgerPath: source.fullLedger,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
  });
  assertV4(sha256(built.sourceLedgerBytes) === sha256(fullLedgerBytes), `${debate.debateNumber}: source-ledger replay changed`);
  const sourcePacketPath = `${ROOT}/source-packets/debate-${debate.debateNumber}.json`;
  const sourcePacketBytes = Buffer.from(`${JSON.stringify(built.packet, null, 2)}\n`);
  if (shouldWrite) {
    await mkdir(path.dirname(sourcePacketPath), { recursive: true });
    await writeFile(sourcePacketPath, sourcePacketBytes);
  }
  for (const reviewerPass of ["A", "B"]) {
    const packet = buildV422116JudgmentPacket(lockedInventory, reviewerPass);
    const packetBytes = Buffer.from(JSON.stringify(packet));
    const packetPath = `${ROOT}/judgment-packets/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`;
    const schema = makeV422116JudgmentSchema({ packet });
    const serializedSchema = JSON.stringify(schema);
    assertV4(!serializedSchema.includes('"uniqueItems"'), `${debate.debateNumber}/${reviewerPass}: unsupported uniqueItems remains`);
    const schemaBytes = Buffer.from(serializedSchema);
    const schemaPath = `${ROOT}/schemas/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.schema.json`;
    if (shouldWrite) {
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, packetBytes);
      await writeFile(schemaPath, schemaBytes);
    }
    contexts.push({
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      reviewerPass,
      reviewerRole: packet.reviewerRole,
      lockedInventory: debate.lockedInventory,
      lockedInventorySha256: debate.lockedInventorySha256,
      lockedInventoryCanonicalSha256: packet.lockedInventorySha256,
      sourcePacket: sourcePacketPath,
      sourcePacketSha256: sha256(sourcePacketBytes),
      originalEvents: source.originalEvents,
      originalEventsSha256: sha256(eventsBytes),
      fullLedger: source.fullLedger,
      fullLedgerSha256: sha256(fullLedgerBytes),
      judgmentPacket: packetPath,
      judgmentPacketSha256: sha256(packetBytes),
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      moves: lockedInventory.moves.length,
      copiedInputBytes: sharedInputBytes + sourcePacketBytes.length + packetBytes.length + schemaBytes.length,
      judgmentOutput: `${ROOT}/judgments/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      rawOutput: `${ROOT}/raw-outputs/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      validationOutput: `${ROOT}/validations/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      provenanceOutput: `${ROOT}/provenance/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
    });
  }
}
assertV4(
  contexts.length === 10 && contexts.every((context) => context.copiedInputBytes <= 115000),
  `independent judgment context exceeds 115 KB transport ceiling: ${Math.max(...contexts.map((context) => context.copiedInputBytes))}`,
);
for (const debate of inventoryAnalysis.debates) {
  const pair = contexts.filter((context) => context.debateNumber === debate.debateNumber);
  assertV4(pair.length === 2 && pair[0].lockedInventoryCanonicalSha256 === pair[1].lockedInventoryCanonicalSha256, `${debate.debateNumber}: A/B locked inventory mismatch`);
}

const preparation = {
  schemaVersion: "4.2.21.17.25-hard-route-independent-judgment-preparation",
  protocolId: "v4.2.21.17.25-hard-route-independent-judgments",
  status: shouldWrite ? "ten-hard-route-independent-judgment-contexts-prepared" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  sources: {
    inventoryAnalysis: INVENTORY_ANALYSIS,
    inventoryAnalysisSha256: sha256(inventoryAnalysisBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
  },
  sharedInputBytes,
  contexts,
  isolation: {
    twoIndependentPassesPerDebate: true,
    byteIdenticalLockedInventoryPerPair: true,
    separateFreshModelContextPerPass: true,
    otherPassUnavailable: true,
    otherDebatesUnavailable: true,
    candidateSelectionUnavailable: true,
    legacyAssessmentsScoresWinnersAndPublicationProseUnavailable: true,
  },
  deterministicDerivations: {
    targetEnumsEarlierOpposingOnly: true,
    responseClassRepositoryDerived: true,
    absoluteResponsivenessRepositoryMapped: true,
    absoluteRelevanceBurdenRepositoryMapped: true,
    precisionAndCalibrationRepositoryMapped: true,
    untestedCharityAnchorRepositoryApplied: true,
    strictBurdenResidualExclusionRepositoryApplied: true,
    runtimeUniquenessValidationRetained: true,
    semanticRepair: false,
  },
  totals: {
    debates: 5,
    contexts: 10,
    uniqueMoves: inventoryAnalysis.totals.movesLocked,
    movesJudgedAcrossPasses: contexts.reduce((sum, context) => sum + context.moves, 0),
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    meanCopiedInputBytes: Math.round(contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) / contexts.length),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    deterministicFixtures: true,
    executionManifest: true,
    modelExecution: false,
    disagreementExtraction: false,
    audioVerification: false,
    adjudication: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: preparation.status,
  contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, moves: context.moves, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000) })),
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  meanCopiedInputKilobytes: Math.round(preparation.totals.meanCopiedInputBytes / 1000),
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
