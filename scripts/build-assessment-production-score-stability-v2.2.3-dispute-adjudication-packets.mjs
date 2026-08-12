#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V223_DISPUTE_ADJ_PROTOCOL_ID,
  V223_DISPUTE_ADJ_ROOT,
  buildV223DisputeAdjudicationPacket,
  makeV223DisputeAdjudicationSchema
} from "./lib/assessment-production-score-stability-v2.2.3-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const EXPECTED_DEBATES = [
  "17",
  "39",
  "121",
  "21",
  "75",
  "168",
  "177",
  "56",
  "49",
  "132"
];
const cohortRoot =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort";
const disagreementRoot = `${cohortRoot}/disagreement-extraction`;
const audioRoot = `${cohortRoot}/audio-verification`;
const audioAdjRoot = `${cohortRoot}/audio-attribution-adjudication`;
const judgmentPreparationPath =
  `${cohortRoot}/independent-judgments/preparation-manifest.json`;
const [sourceAnalysis, audioAudit, audioAdjAnalysis, judgmentPreparation] =
  await Promise.all([
    readFile(`${disagreementRoot}/analysis.json`, "utf8").then(JSON.parse),
    readFile(`${audioRoot}/audio-verification.json`, "utf8").then(JSON.parse),
    readFile(`${audioAdjRoot}/analysis.json`, "utf8").then(JSON.parse),
    readFile(judgmentPreparationPath, "utf8").then(JSON.parse)
  ]);
assertV4(
  sourceAnalysis.status ===
      "v2.2.3-deterministic-disagreements-extracted-audio-source-preparation-authorized" &&
    JSON.stringify(
      sourceAnalysis.debates.map((debate) => debate.debateNumber)
    ) === JSON.stringify(EXPECTED_DEBATES) &&
    audioAdjAnalysis.status ===
      "v2.2.3-audio-attribution-adjudication-passed" &&
    audioAdjAnalysis.combinedAudioResult.verificationRate === 1 &&
    audioAdjAnalysis.authorization.disputeAdjudicationPacketPreparation,
  "v2.2.3 dispute adjudication preparation is unauthorized"
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
      move.debateNumber === "17" && move.moveId === audioDecision.moveId
  );
assertV4(
  audioDecision.status === "verified" &&
    audioDecision.authoringSpeaker === "Francis Collins" &&
    originalUnresolved,
  "Debate 17 combined audio resolution unavailable"
);
combinedAudioByDebateMove.set(
  `17:${audioDecision.moveId}`,
  {
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
  }
);

const schema = makeV223DisputeAdjudicationSchema();
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const inputPaths = {
  rubric: "docs/reassessment-rubric-v2.1.md",
  decomposedRubric: "docs/reassessment-rubric-v4.0.md",
  derivedFindingsRubric: "docs/reassessment-rubric-v4.0.1.md",
  boundedInventoryRubric: "docs/reassessment-rubric-v4.1.md",
  workflow:
    "docs/assessment-production-score-stability-v2.2.3-dispute-only-adjudication-workflow.md",
  manual: `${V223_DISPUTE_ADJ_ROOT}/manual.md`,
  schema: `${V223_DISPUTE_ADJ_ROOT}/adjudication.schema.json`
};
const sharedInputBytes =
  (
    await Promise.all(
      Object.entries(inputPaths)
        .filter(([key]) => key !== "schema")
        .map(([, file]) => readFile(file))
    )
  ).reduce((sum, bytes) => sum + bytes.length, 0) + schemaBytes.length;
const contexts = [];
let disputedMoves = 0;
let candidateSelections = 0;
let audioVerifiedMoves = 0;

for (const debateNumber of EXPECTED_DEBATES) {
  const judgmentContext = judgmentPreparation.contexts.find(
    (item) =>
      item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  assertV4(
    judgmentContext,
    `Debate ${debateNumber}: judgment context unavailable`
  );
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
  const built = buildV223DisputeAdjudicationPacket(
    disagreements,
    lockedInventory,
    events,
    audioByMoveId
  );
  const packetPath =
    `${V223_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath =
    `${V223_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath =
    `${V223_DISPUTE_ADJ_ROOT}/outputs/debate-${debateNumber}.json`;
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
            "1.0-score-stability-v2.2.3-adjudication-candidate-provenance",
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
  schemaVersion:
    "1.0-score-stability-v2.2.3-dispute-only-adjudication-preparation",
  protocolId: V223_DISPUTE_ADJ_PROTOCOL_ID,
  status: shouldWrite
    ? "prepared-ten-isolated-v2.2.3-dispute-only-adjudication-contexts"
    : "preview",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
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
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "freeze-ten-v2.2.3-dispute-only-adjudication-execution-contexts"
};
assertV4(
  contexts.length === 10 &&
    disputedMoves === sourceAnalysis.adjudicationWorkload.disputedMoves &&
    candidateSelections ===
      sourceAnalysis.adjudicationWorkload.candidateSelections,
  "v2.2.3 adjudication workload differs from deterministic extraction"
);
assertV4(
  audioVerifiedMoves === 4,
  "verified audio work was not attached to every triggered disputed move"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 350000,
  `v2.2.3 adjudication context ${preparation.totals.maximumCopiedInputBytes} bytes exceeds the promoted 350 KB ceiling`
);
if (shouldWrite) {
  await mkdir(V223_DISPUTE_ADJ_ROOT, { recursive: true });
  await writeFile(
    `${V223_DISPUTE_ADJ_ROOT}/adjudication.schema.json`,
    schemaBytes
  );
  await writeFile(
    `${V223_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
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
      adjudicationModelExecutionAuthorized: false,
      nextAuthorized: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
