#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_DISPUTE_ADJ_PROTOCOL_ID,
  PRODUCTION_CANARY_DISPUTE_ADJ_ROOT,
  buildProductionCanaryDisputeAdjudicationPacket,
  makeProductionCanaryDisputeAdjudicationSchema
} from "./lib/assessment-production-canary-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const EXPECTED_DEBATES = ["05", "13", "37", "64", "65", "81", "130", "138", "152", "188"];
const disagreementRoot =
  "docs/assessment-production/canary-v1-disagreement-audio-prep";
const audioRoot = "docs/assessment-production/canary-v1-audio-verification";
const audioAdjRoot =
  "docs/assessment-production/canary-v1-audio-attribution-adjudication";
const judgmentPreparationPath =
  "docs/assessment-production/canary-v1-independent-judgments/preparation-manifest.json";
const [sourceAnalysis, audioAudit, audioAdjAnalysis, judgmentPreparation] =
  await Promise.all([
    readFile(`${disagreementRoot}/analysis.json`, "utf8").then(JSON.parse),
    readFile(`${audioRoot}/audio-verification.json`, "utf8").then(JSON.parse),
    readFile(`${audioAdjRoot}/analysis.json`, "utf8").then(JSON.parse),
    readFile(judgmentPreparationPath, "utf8").then(JSON.parse)
  ]);
assertV4(
  sourceAnalysis.status ===
    "production-canary-deterministic-disagreements-extracted-audio-source-preparation-authorized" &&
    audioAdjAnalysis.status ===
      "production-canary-audio-attribution-adjudication-passed" &&
    audioAdjAnalysis.combinedAudioResult.verificationRate === 1 &&
    audioAdjAnalysis.authorization.disputeAdjudicationPacketPreparation,
  "production-canary dispute adjudication preparation is unauthorized"
);

const combinedAudioByDebateMove = new Map();
for (const debate of audioAudit.debates) {
  for (const move of debate.moves) {
    if (move.status === "verified") {
      combinedAudioByDebateMove.set(`${move.debateNumber}:${move.moveId}`, move);
    }
  }
}
const audioDecision = audioAdjAnalysis.adjudication.decisions[0];
const originalUnresolved = audioAudit.debates
  .flatMap((debate) => debate.moves)
  .find(
    (move) =>
      move.debateNumber === "05" && move.moveId === audioDecision.moveId
  );
assertV4(
  audioDecision.status === "verified" && originalUnresolved,
  "Debate 05 combined audio resolution unavailable"
);
combinedAudioByDebateMove.set("05:pro-move-07", {
  ...structuredClone(originalUnresolved),
  status: "verified",
  resolvedSpeaker: audioDecision.authoringSpeaker,
  resolutionMethod: "isolated-audio-attribution-adjudication",
  audioAttributionDecision: structuredClone(audioDecision),
  deterministicEvidence: {
    ...structuredClone(originalUnresolved.deterministicEvidence),
    transcriptHashMatched: true,
    excerptRecall:
      originalUnresolved.deterministicEvidence.expectedSpeakerExcerptRecall,
    isolatedAuthorshipVerified: true
  }
});

const schema = makeProductionCanaryDisputeAdjudicationSchema();
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const inputPaths = {
  decomposedRubric: "docs/reassessment-rubric-v4.0.md",
  derivedFindingsRubric: "docs/reassessment-rubric-v4.0.1.md",
  boundedInventoryRubric: "docs/reassessment-rubric-v4.1.md",
  workflow: "docs/assessment-production-canary-dispute-only-adjudication-workflow.md",
  manual: `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/manual.md`,
  schema: `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/adjudication.schema.json`
};
const sharedInputBytes =
  (await Promise.all(
    Object.entries(inputPaths)
      .filter(([key]) => key !== "schema")
      .map(([, file]) => readFile(file))
  )).reduce((sum, bytes) => sum + bytes.length, 0) + schemaBytes.length;
const contexts = [];
let disputedMoves = 0;
let candidateSelections = 0;
let audioVerifiedMoves = 0;

for (const debateNumber of EXPECTED_DEBATES) {
  const judgmentContext = judgmentPreparation.contexts.find(
    (item) =>
      item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  assertV4(judgmentContext, `Debate ${debateNumber}: judgment context unavailable`);
  const disagreementPath =
    `${disagreementRoot}/disagreements/debate-${debateNumber}.json`;
  const [disagreements, lockedInventory, events] = await Promise.all([
    readFile(disagreementPath, "utf8").then(JSON.parse),
    readFile(judgmentContext.lockedInventory, "utf8").then(JSON.parse),
    readFile(judgmentContext.originalEvents, "utf8").then(JSON.parse)
  ]);
  const audioByMoveId = new Map(
    [...combinedAudioByDebateMove]
      .filter(([key]) => key.startsWith(`${debateNumber}:`))
      .map(([key, value]) => [key.slice(debateNumber.length + 1), value])
  );
  const built = buildProductionCanaryDisputeAdjudicationPacket(
    disagreements,
    lockedInventory,
    events,
    audioByMoveId
  );
  const packetPath =
    `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath =
    `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath =
    `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(built.packet, null, 2)}\n`);
  const selections = built.packet.disputedMoves.reduce(
    (sum, move) =>
      sum +
      [
        move.candidates.importancePair,
        move.candidates.attributionPair,
        move.candidates.responsePair,
        move.candidates.charityPair,
        move.candidates.assessmentConfidencePair
      ].filter(Boolean).length +
      Object.keys(move.candidates.scoringFields).length,
    built.packet.burdenAdjustmentDisputes.length
  );
  const audioCount = built.packet.disputedMoves.filter(
    (move) => move.evidence.audioVerification !== null
  ).length;
  const audioTranscriptBytes = (
    await Promise.all(
      built.audioTranscriptInputs.map((input) => readFile(input.sourcePath))
    )
  ).reduce((sum, bytes) => sum + bytes.length, 0);
  if (shouldWrite) {
    await mkdir(path.dirname(packetPath), { recursive: true });
    await mkdir(path.dirname(provenancePath), { recursive: true });
    await writeFile(packetPath, packetBytes);
    await writeFile(
      provenancePath,
      `${JSON.stringify(
        {
          schemaVersion:
            "1.0-production-canary-adjudication-candidate-provenance",
          protocolId: built.packet.protocolId,
          debateNumber,
          modelInput: false,
          mappings: built.provenance
        },
        null,
        2
      )}\n`
    );
  }
  contexts.push({
    debateNumber,
    debateId: built.packet.debateId,
    packet: packetPath,
    provenance: provenancePath,
    output: outputPath,
    disputeSource: disagreementPath,
    lockedInventory: judgmentContext.lockedInventory,
    sourcePacket: judgmentContext.sourcePacket,
    originalEvents: judgmentContext.originalEvents,
    disputedMoves: built.packet.disputedMoves.length,
    candidateSelections: selections,
    audioVerifiedMoves: audioCount,
    audioTranscriptInputs: built.audioTranscriptInputs,
    packetBytes: packetBytes.length,
    copiedInputBytes: sharedInputBytes + packetBytes.length + audioTranscriptBytes
  });
  disputedMoves += built.packet.disputedMoves.length;
  candidateSelections += selections;
  audioVerifiedMoves += audioCount;
}

const preparation = {
  schemaVersion: "1.0-production-canary-dispute-only-adjudication-preparation",
  protocolId: PRODUCTION_CANARY_DISPUTE_ADJ_PROTOCOL_ID,
  status: shouldWrite
    ? "prepared-ten-isolated-production-canary-dispute-only-adjudication-contexts"
    : "preview",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0
  },
  inputs: inputPaths,
  contexts,
  evidenceBoundary: {
    disputedFieldsOnly: true,
    candidateOrderingAnonymizedPerPair: true,
    provenanceFilesNeverModelInputs: true,
    initialPassIdentitiesUnavailable: true,
    initialPassRationalesUnavailable: true,
    nondisputedFieldsUnavailable: true,
    fullInitialOutputsUnavailable: true,
    calculatedScoresUnavailable: true,
    winnersUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    rawVerifiedDiarizedTranscriptsSuppliedOnlyWhereRequired: true
  },
  totals: {
    contexts: contexts.length,
    disputedMoves,
    candidateSelections,
    audioVerifiedMoves,
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    meanCopiedInputBytes: Math.round(
      contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) /
        contexts.length
    ),
    modelContextsExecuted: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    executionManifest: true,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
assertV4(
  contexts.length === 10 &&
    disputedMoves === sourceAnalysis.adjudicationWorkload.disputedMoves &&
    candidateSelections === sourceAnalysis.adjudicationWorkload.candidateSelections,
  "production-canary adjudication workload differs from deterministic extraction"
);
assertV4(
  audioVerifiedMoves === 4,
  "verified audio work was not attached to every triggered disputed move"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 350000,
  `production-canary adjudication context ${preparation.totals.maximumCopiedInputBytes} bytes exceeds the promoted 350 KB ceiling`
);
if (shouldWrite) {
  await mkdir(PRODUCTION_CANARY_DISPUTE_ADJ_ROOT, { recursive: true });
  await writeFile(
    `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/adjudication.schema.json`,
    schemaBytes
  );
  await writeFile(
    `${PRODUCTION_CANARY_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
    `${JSON.stringify(preparation, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        disputedMoves: context.disputedMoves,
        candidateSelections: context.candidateSelections,
        audioVerifiedMoves: context.audioVerifiedMoves,
        packetBytes: context.packetBytes,
        copiedInputBytes: context.copiedInputBytes
      })),
      totals: preparation.totals,
      adjudicationModelExecutionAuthorized: false
    },
    null,
    2
  )
);
