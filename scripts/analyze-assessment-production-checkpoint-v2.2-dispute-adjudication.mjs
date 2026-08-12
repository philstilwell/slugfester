#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { validateCheckpointV22DisputeAdjudicationOutput } from "./lib/assessment-production-checkpoint-v2.2-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/dispute-only-adjudication";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution, preparation] = await Promise.all(
  ["execution-manifest.json", "model-execution.json", "preparation-manifest.json"].map(
    (file) => readFile(`${root}/${file}`, "utf8").then(JSON.parse)
  )
);
assertV4(
  manifest.status ===
      "frozen-ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.developmentValidationOnly === false &&
    execution.retries === 0 &&
    execution.corrections === 0 &&
    execution.scoresDerived === 0,
  "production checkpoint v2.2 adjudication execution unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch during production checkpoint v2.2 adjudication analysis: ${file}`
  );
}

const contexts = [];
for (const context of manifest.contexts) {
  const result = execution.results.find(
    (item) => item.debateNumber === context.debateNumber
  );
  if (!result) {
    contexts.push({
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      status: "unattempted",
      accepted: false,
      validationReplayed: false,
      disputedMoves: null,
      candidateSelections: null,
      audioTranscriptInputs: context.audioTranscriptInputs.length,
      calculatedScores: null
    });
    continue;
  }
  let replay = null;
  if (result.gateAcceptancePassed) {
    replay = validateCheckpointV22DisputeAdjudicationOutput(
      JSON.parse(await readFile(context.output, "utf8")),
      JSON.parse(await readFile(context.packet, "utf8"))
    );
    assertV4(
      replay.status === "passed" &&
        sha256(await readFile(context.output)) === result.outputSha256,
      `${context.debateNumber}: production checkpoint v2.2 adjudication replay mismatch`
    );
  }
  contexts.push({
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    status: result.status,
    accepted: result.gateAcceptancePassed,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    validationReplayed: replay?.status === "passed",
    disputedMoves: replay?.disputedMoves ?? null,
    candidateSelections: replay?.candidateSelections ?? null,
    audioTranscriptInputs: result.audioTranscriptInputs.length,
    calculatedScores: replay?.calculatedScores ?? null
  });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length
  ? Math.max(...valid.map((context) => context.elapsedMinutes))
  : null;
const meanElapsedMinutes = valid.length
  ? Number(
      (
        valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) /
        valid.length
      ).toFixed(2)
    )
  : null;
const semanticPass =
  valid.length === preparation.contexts.length &&
  valid.reduce((sum, context) => sum + context.candidateSelections, 0) ===
    preparation.totals.candidateSelections &&
  valid.reduce((sum, context) => sum + context.disputedMoves, 0) ===
    preparation.totals.disputedMoves;
const timingPass =
  semanticPass &&
  maximumElapsedMinutes <= manifest.executionPolicy.maximumMinutesPerContext &&
  meanElapsedMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const scoreBlindPass =
  semanticPass && contexts.every((context) => context.calculatedScores === 0);
const passed = semanticPass && timingPass && scoreBlindPass;
const analysis = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-dispute-only-adjudication-analysis",
  protocolId: manifest.protocolId,
  status: passed
    ? "production-checkpoint-v2.2-dispute-only-adjudication-gate-passed"
    : semanticPass
      ? timingPass
        ? "production-checkpoint-v2.2-adjudication-gate-failed-scoreblindness"
        : "production-checkpoint-v2.2-adjudication-gate-failed-timing"
      : "production-checkpoint-v2.2-adjudication-gate-failed-validation",
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  contexts,
  gate: {
    semanticPass,
    timingPass,
    scoreBlindPass,
    validContexts: valid.length,
    requiredValidContexts: preparation.contexts.length,
    disputedMovesDecided: valid.reduce(
      (sum, context) => sum + context.disputedMoves,
      0
    ),
    requiredDisputedMoves: preparation.totals.disputedMoves,
    candidateSelections: valid.reduce(
      (sum, context) => sum + context.candidateSelections,
      0
    ),
    requiredCandidateSelections: preparation.totals.candidateSelections,
    maximumElapsedMinutes,
    maximumAllowedMinutesPerContext:
      manifest.executionPolicy.maximumMinutesPerContext,
    meanElapsedMinutes,
    maximumAllowedMeanMinutes: manifest.executionPolicy.maximumMeanMinutes,
    retries: 0,
    corrections: 0,
    scoresDerived: 0
  },
  evidenceBoundary: {
    provenanceFilesUnavailableToModel: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    nondisputedFieldsUnavailable: true,
    rawVerifiedAudioTranscriptsSuppliedOnlyWhereRequired: true,
    audioTranscriptInputs: contexts.reduce(
      (sum, context) => sum + context.audioTranscriptInputs,
      0
    ),
    candidateValuesInvented: 0,
    calculatedScores: 0
  },
  totals: {
    modelContexts: execution.contextsAttempted,
    retries: 0,
    corrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    finalLedgerAssembly: passed,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "assemble-production-checkpoint-v2.2-final-ledgers-deterministically"
    : "diagnose-production-checkpoint-v2.2-dispute-adjudication-failure-only"
};
if (shouldWrite) {
  await writeFile(
    manifest.artifacts.analysis,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      validContexts: valid.length,
      disputedMovesDecided: analysis.gate.disputedMovesDecided,
      candidateSelections: analysis.gate.candidateSelections,
      timings: {
        byDebate: Object.fromEntries(
          contexts.map((context) => [
            context.debateNumber,
            context.elapsedMinutes ?? null
          ])
        ),
        maximumElapsedMinutes,
        meanElapsedMinutes,
        passed: timingPass
      },
      audioTranscriptInputs: analysis.evidenceBoundary.audioTranscriptInputs,
      scoresDerived: 0,
      meteredApiCostUsd: 0,
      nextAuthorized: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
