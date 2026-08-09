#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  PRODUCTION_CANARY_AUDIO_ADJ_ROOT
} from "./lib/assessment-production-canary-audio-attribution-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const manifestPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/analysis.json`;
const outputPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/output.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  for (const future of [manifestPath, executionPath, analysisPath, outputPath]) {
    assertV4(!(await exists(future)), `${future} already exists`);
  }
}
const preparationPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/preparation-manifest.json`;
const packetPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/packet.json`;
const [preparation, packet] = await Promise.all(
  [preparationPath, packetPath].map((file) => readFile(file, "utf8").then(JSON.parse))
);
assertV4(
  preparation.status ===
    "prepared-one-production-canary-disputed-audio-attribution" &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    !preparation.authorization.modelExecution,
  "production-canary audio-attribution preparation invalid"
);
assertV4(
  packet.moves.length === 1 && packet.moves[0].moveId === "pro-move-07",
  "production-canary audio-attribution packet population invalid"
);
const sourceFiles = [
  preparation.inputs.workflow,
  preparation.inputs.manual,
  preparation.inputs.schema,
  preparation.inputs.packet,
  ...preparation.inputs.rawDiarizedTranscripts,
  preparation.inputs.diagnosis,
  preparationPath,
  "scripts/lib/assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/build-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/test-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/preregister-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/run-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/validate-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/analyze-assessment-production-canary-audio-attribution-adjudication.mjs",
  "scripts/test-assessment-production-canary-audio-attribution-gate.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const copiedInputFiles = [
  preparation.inputs.workflow,
  preparation.inputs.manual,
  preparation.inputs.schema,
  preparation.inputs.packet,
  ...preparation.inputs.rawDiarizedTranscripts
];
let copiedInputBytes = 0;
for (const file of copiedInputFiles) copiedInputBytes += (await readFile(file)).length;
assertV4(copiedInputBytes <= 115000, "audio-attribution context exceeds input ceiling");
const manifest = {
  schemaVersion:
    "1.0-production-canary-audio-attribution-adjudication-execution-manifest",
  protocolId: PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  status: "frozen-one-production-canary-audio-attribution-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: preparation.model,
  context: {
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    disputedMoves: packet.moves.map((move) => move.moveId),
    workflow: preparation.inputs.workflow,
    manual: preparation.inputs.manual,
    schema: preparation.inputs.schema,
    packet: preparation.inputs.packet,
    rawDiarizedTranscripts: preparation.inputs.rawDiarizedTranscripts,
    output: preparation.output,
    copiedInputBytes
  },
  isolation: {
    freshTemporaryCodexHome: true,
    freshSourceDirectory: true,
    ratingsUnavailable: true,
    scoresUnavailable: true,
    legacyUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    perInvocationTimeoutMs: 900000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: [
      "OPENAI_API_KEY",
      "OPENAI_ORG_ID",
      "OPENAI_PROJECT_ID",
      "OPENAI_BASE_URL",
      "AZURE_OPENAI_API_KEY",
      "CODEX_API_KEY"
    ],
    meteredApiCostUsdMaximum: 0,
    paidTranscriptionCalls: 0,
    stderrTailRecordedOnFailure: true
  },
  authorization: {
    modelExecution: true,
    deterministicValidation: true,
    deterministicAnalysis: true,
    retry: false,
    paidTranscription: false,
    disputeAdjudicationPacketPreparation: false,
    disputeAdjudicationModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: {
    output: outputPath,
    execution: executionPath,
    analysis: analysisPath
  },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      contexts: 1,
      disputedMoves: 1,
      copiedInputBytes,
      model: "5.6 Sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      attempts: 1,
      retriesMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      paidTranscriptionCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
