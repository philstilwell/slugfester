#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import {
  PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  PRODUCTION_CANARY_AUDIO_ADJ_ROOT,
  validateProductionCanaryAudioAttributionAdjudicationOutput
} from "./lib/assessment-production-canary-audio-attribution-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [execution, output, packet, audioAudit] = await Promise.all([
  "model-execution.json",
  "output.json",
  "packet.json"
].map((file) =>
  readFile(`${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/${file}`, "utf8").then(JSON.parse)
).concat([
  readFile(
    "docs/assessment-production/canary-v1-audio-verification/audio-verification.json",
    "utf8"
  ).then(JSON.parse)
]));
assertV4(
  execution.status ===
    "production-canary-audio-attribution-adjudication-execution-passed" &&
    execution.authorization.analysis,
  "valid production-canary audio-attribution execution unavailable"
);
const validation =
  await validateProductionCanaryAudioAttributionAdjudicationOutput(output, packet);
const passed = validation.verified === 1 && validation.unresolved === 0;
const analysis = {
  schemaVersion: "1.0-production-canary-audio-attribution-adjudication-analysis",
  protocolId: PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  status: passed
    ? "production-canary-audio-attribution-adjudication-passed"
    : "production-canary-audio-attribution-adjudication-unresolved",
  productionCanary: true,
  stagingOnly: true,
  preservedDeterministicGate: {
    status: audioAudit.status,
    verified: audioAudit.totals.verified,
    unresolved: audioAudit.totals.unresolved,
    erasedOrReclassified: false
  },
  adjudication: { validation, decisions: output.adjudications },
  combinedAudioResult: {
    requiredMoves: 4,
    deterministicallyVerified: 3,
    adjudicatedVerified: validation.verified,
    unresolved: validation.unresolved,
    verificationRate: (3 + validation.verified) / 4
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
  }
};
if (shouldWrite) {
  await writeFile(
    `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/analysis.json`,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      verified: validation.verified,
      unresolved: validation.unresolved,
      combinedAudioVerified: 3 + validation.verified,
      combinedAudioRequired: 4,
      disputeAdjudicationPacketPreparationAuthorized:
        analysis.authorization.disputeAdjudicationPacketPreparation,
      paidTranscriptionCalls: 0,
      meteredModelApiCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
if (!passed) process.exitCode = 1;
