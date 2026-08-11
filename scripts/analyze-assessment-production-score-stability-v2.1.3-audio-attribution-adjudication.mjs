#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import {
  V213_AUDIO_ADJ_PROTOCOL_ID,
  V213_AUDIO_ADJ_ROOT,
  validateV213AudioAttributionAdjudicationOutput
} from "./lib/assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [execution, output, packet, audioAudit] = await Promise.all([
  "model-execution.json",
  "output.json",
  "packet.json"
].map((file) =>
  readFile(`${V213_AUDIO_ADJ_ROOT}/${file}`, "utf8").then(JSON.parse)
).concat([
  readFile(
    "docs/assessment-production/score-stability-v2.1.3-validation-cohort/audio-verification/audio-verification.json",
    "utf8"
  ).then(JSON.parse)
]));
assertV4(
  execution.status === "v2.1.3-audio-attribution-adjudication-execution-passed" &&
    execution.authorization.analysis,
  "valid v2.1.3 audio-attribution execution unavailable"
);
const validation = await validateV213AudioAttributionAdjudicationOutput(
  output,
  packet
);
const passed = validation.verified === 1 && validation.unresolved === 0;
const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.1.3-audio-attribution-adjudication-analysis",
  protocolId: V213_AUDIO_ADJ_PROTOCOL_ID,
  status: passed
    ? "v2.1.3-audio-attribution-adjudication-passed"
    : "v2.1.3-audio-attribution-adjudication-unresolved",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  preservedDeterministicGate: {
    status: audioAudit.status,
    verified: audioAudit.totals.verified,
    unresolved: audioAudit.totals.unresolved,
    erasedOrReclassified: false
  },
  adjudication: { validation, decisions: output.adjudications },
  combinedAudioResult: {
    requiredMoves: 5,
    deterministicallyVerified: 4,
    adjudicatedVerified: validation.verified,
    unresolved: validation.unresolved,
    verificationRate: (4 + validation.verified) / 5
  },
  costs: {
    originalPaidDiarizationEstimatedExposureUsd:
      audioAudit.totals.estimatedProcessingExposureUsd,
    additionalPaidTranscriptionCalls: 0,
    additionalTranscriptionCostUsd: 0,
    modelComputeAuthentication: "ChatGPT subscription",
    meteredModelApiCostUsd: 0
  },
  scoreBlindness: {
    ratingsAccessed: false,
    scoresAccessed: false,
    legacyAssessmentsAccessed: false,
    otherDebatesAccessed: false,
    publicationProseAccessed: false,
    scoreArtifactCreated: false
  },
  authorization: {
    disputeAdjudicationPacketPreparation: passed,
    disputeAdjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-v2.1.3-dispute-only-adjudication-packets"
    : "stop-v2.1.3-audio-attribution-unresolved"
};
if (shouldWrite) {
  await writeFile(
    `${V213_AUDIO_ADJ_ROOT}/analysis.json`,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      verified: validation.verified,
      unresolved: validation.unresolved,
      combinedAudioVerified: 4 + validation.verified,
      combinedAudioRequired: 5,
      disputeAdjudicationPacketPreparationAuthorized:
        analysis.authorization.disputeAdjudicationPacketPreparation,
      paidTranscriptionCalls: 0,
      meteredModelApiCostUsd: 0,
      scoresDerived: 0,
      nextAuthorized: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
if (!passed) process.exitCode = 1;
