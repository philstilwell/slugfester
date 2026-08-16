#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch01PublicationOutput } from "./lib/assessment-production-post-canary-batch-01-publication-validation.mjs";
import {
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT,
  mergeAndValidateResumptionRepairs
} from "./lib/assessment-production-post-canary-batch-01-publication-resumption-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(
    JSON.parse
  ),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(
    JSON.parse
  ),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(
    JSON.parse
  )
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source hash mismatch: ${file}`
  );
}
assertV4(
  execution.contextsPlanned === 3 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 3 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0,
  "the publication-resumption repair execution record changed"
);
if (shouldWrite) {
  for (const file of [
    activation.artifacts.analysis,
    ...Object.values(activation.artifacts.mergedOutputs),
    ...Object.values(activation.artifacts.completeValidations),
    activation.artifacts.mergeAudit
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null;
let cohortRows = [];
let failureMessage = null;
let baseOutputBytes = {};
let repairOutputBytes = [];
if (
  execution.contextsAttempted === 3 &&
  execution.validContexts === 3 &&
  execution.invalidContexts === 0 &&
  execution.results.every(({ gateAcceptancePassed }) => gateAcceptancePassed)
) {
  try {
    const diagnosis = JSON.parse(
      await readFile(path.resolve(preparation.inputs.diagnosis), "utf8")
    );
    baseOutputBytes = Object.fromEntries(
      await Promise.all(
        Object.entries(preparation.inputs.immutableBaseOutputs).map(
          async ([debateNumber, file]) => [
            debateNumber,
            await readFile(path.resolve(file))
          ]
        )
      )
    );
    for (const debateNumber of ["91", "13"]) {
      assertV4(
        sha256(baseOutputBytes[debateNumber]) ===
          diagnosis.sourceHashes[
            preparation.inputs.immutableBaseOutputs[debateNumber]
          ],
        `Debate ${debateNumber}: original failed output changed before merge`
      );
    }
    const repairPackets = await Promise.all(
      activation.contexts.map((context) =>
        readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
      )
    );
    repairOutputBytes = await Promise.all(
      activation.contexts.map((context) =>
        readFile(path.resolve(context.repairOutput))
      )
    );
    for (let index = 0; index < 3; index += 1) {
      assertV4(
        sha256(repairOutputBytes[index]) ===
          execution.results[index].repairOutputSha256,
        `repair output ${index} hash mismatch`
      );
    }
    const baseOutputs = Object.fromEntries(
      Object.entries(baseOutputBytes).map(([debateNumber, bytes]) => [
        debateNumber,
        JSON.parse(bytes)
      ])
    );
    const publicationPackets = Object.fromEntries(
      await Promise.all(
        Object.entries(preparation.inputs.publicationPackets).map(
          async ([debateNumber, file]) => [
            debateNumber,
            JSON.parse(await readFile(path.resolve(file), "utf8"))
          ]
        )
      )
    );
    merge = mergeAndValidateResumptionRepairs({
      baseOutputs,
      repairs: repairOutputBytes.map((bytes) => JSON.parse(bytes)),
      repairPackets,
      publicationPackets
    });

    const cohortDebates = [
      "31",
      "94",
      "52",
      "146",
      "91",
      "175",
      "75",
      "72",
      "13",
      "195"
    ];
    cohortRows = await Promise.all(
      cohortDebates.map(async (debateNumber) => {
        const output = ["91", "13"].includes(debateNumber)
          ? merge.mergedOutputs[debateNumber]
          : JSON.parse(
              await readFile(
                path.resolve(
                  preparation.inputs.acceptedCohortOutputs[debateNumber]
                ),
                "utf8"
              )
            );
        const packet = JSON.parse(
          await readFile(
            path.resolve(
              preparation.inputs.cohortPublicationPackets[debateNumber]
            ),
            "utf8"
          )
        );
        const validation = validatePostCanaryBatch01PublicationOutput(
          output,
          packet
        );
        return { debateNumber, validation };
      })
    );
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const cohortTotals = cohortRows.reduce(
  (totals, { validation }) => ({
    debates: totals.debates + 1,
    moves: totals.moves + validation.moves,
    critiques: totals.critiques + validation.critiques,
    exactSourceQuotes:
      totals.exactSourceQuotes + validation.quoteExactSourceMatches,
    overallCommentarySides:
      totals.overallCommentarySides + validation.overallCommentarySides,
    aiExtensionSides:
      totals.aiExtensionSides + validation.aiExtensionSides,
    minimumCritiqueCharacters: Math.min(
      totals.minimumCritiqueCharacters,
      validation.minimumCritiqueCharacters
    ),
    modelAuthoredScores:
      totals.modelAuthoredScores + validation.calculatedScoresAuthoredByModel,
    lockedScoresUnchanged:
      totals.lockedScoresUnchanged && validation.lockedScoresUnchanged
  }),
  {
    debates: 0,
    moves: 0,
    critiques: 0,
    exactSourceQuotes: 0,
    overallCommentarySides: 0,
    aiExtensionSides: 0,
    minimumCritiqueCharacters: Infinity,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  }
);
const passed =
  execution.validContexts === 3 &&
  merge?.fullValidations?.["91"]?.status === "passed" &&
  merge?.fullValidations?.["13"]?.status === "passed" &&
  merge.transformations.length === 4 &&
  cohortTotals.debates === 10 &&
  cohortTotals.moves === 177 &&
  cohortTotals.critiques === 177 &&
  cohortTotals.exactSourceQuotes === 20 &&
  cohortTotals.overallCommentarySides === 20 &&
  cohortTotals.aiExtensionSides === 20 &&
  cohortTotals.minimumCritiqueCharacters >= 880 &&
  cohortTotals.modelAuthoredScores === 0 &&
  cohortTotals.lockedScoresUnchanged === true;
const correctedFields = execution.results.flatMap(
  ({ validationSummary }) => validationSummary?.correctedFields ?? []
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-01-publication-resumption-bounded-repair-and-complete-cohort-validation-passed"
    : "batch-01-publication-resumption-bounded-repair-or-complete-cohort-validation-failed",
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  gate: {
    repairContextsPlanned: 3,
    repairContextsAttempted: execution.contextsAttempted,
    repairContextsPassed: execution.validContexts,
    repairContextsFailed: execution.invalidContexts,
    repairContextsUnattempted: execution.contextsUnattempted,
    completeDebate91ValidationPassed:
      merge?.fullValidations?.["91"]?.status === "passed",
    completeDebate13ValidationPassed:
      merge?.fullValidations?.["13"]?.status === "passed",
    completeCohortValidationPassed: passed,
    correctedFields,
    correctedFieldCount: correctedFields.length,
    immutableFieldsChanged: passed ? 0 : null,
    cohort: cohortTotals,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrectionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  artifacts: {
    originalFailedOutputs: preparation.inputs.immutableBaseOutputs,
    originalFailedOutputsPreserved: true,
    repairOutputs: activation.contexts.map(({ repairOutput }) => repairOutput),
    mergedOutputs: passed ? activation.artifacts.mergedOutputs : null,
    completeValidations: passed
      ? activation.artifacts.completeValidations
      : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null
  },
  totals: {
    modelContexts: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0,
    publicationCompilationPasses: 0,
    publicationFinalizations: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  authorization: {
    publicationCompilationPreparation: passed,
    deterministicCompilation: false,
    repairModelExecution: false,
    publicationModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "user-approval-required-before-batch-01-publication-compilation-preparation-only"
    : "failure-diagnosis-only"
};

if (shouldWrite && passed) {
  const mergedBytes = Object.fromEntries(
    ["91", "13"].map((debateNumber) => [
      debateNumber,
      Buffer.from(
        `${JSON.stringify(merge.mergedOutputs[debateNumber], null, 2)}\n`
      )
    ])
  );
  for (const debateNumber of ["91", "13"]) {
    const completeValidation = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-complete-debate-validation",
      protocolId: activation.protocolId,
      status: "passed",
      debateNumber,
      mergedOutputSha256: sha256(mergedBytes[debateNumber]),
      validationSummary: merge.fullValidations[debateNumber],
      originalFailedOutputPreserved: true,
      authorizedFieldsChanged: merge.transformations.filter(
        (item) => item.debateNumber === debateNumber
      ).length,
      immutableFieldsChanged: 0,
      modelAuthoredScores: 0,
      lockedScoresUnchanged: true
    };
    await mkdir(
      path.dirname(
        path.resolve(activation.artifacts.mergedOutputs[debateNumber])
      ),
      { recursive: true }
    );
    await mkdir(
      path.dirname(
        path.resolve(activation.artifacts.completeValidations[debateNumber])
      ),
      { recursive: true }
    );
    await writeFile(
      path.resolve(activation.artifacts.mergedOutputs[debateNumber]),
      mergedBytes[debateNumber]
    );
    await writeFile(
      path.resolve(activation.artifacts.completeValidations[debateNumber]),
      `${JSON.stringify(completeValidation, null, 2)}\n`
    );
  }
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debates: ["91", "13"],
    originalFailedOutputs: Object.fromEntries(
      Object.entries(preparation.inputs.immutableBaseOutputs).map(
        ([debateNumber, file]) => [
          debateNumber,
          { path: file, sha256: sha256(baseOutputBytes[debateNumber]) }
        ]
      )
    ),
    repairOutputs: activation.contexts.map((context, index) => ({
      packetIndex: index,
      debateNumber: context.debateNumber,
      path: context.repairOutput,
      sha256: sha256(repairOutputBytes[index])
    })),
    mergedOutputs: Object.fromEntries(
      ["91", "13"].map((debateNumber) => [
        debateNumber,
        {
          path: activation.artifacts.mergedOutputs[debateNumber],
          sha256: sha256(mergedBytes[debateNumber])
        }
      ])
    ),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: 4,
    immutableFieldsChanged: 0,
    completeDebateValidations: merge.fullValidations,
    completeCohortValidation: cohortTotals,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  await writeFile(
    path.resolve(activation.artifacts.mergeAudit),
    `${JSON.stringify(mergeAudit, null, 2)}\n`
  );
}
if (shouldWrite) {
  await writeFile(
    path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      repairContextsAttempted: analysis.gate.repairContextsAttempted,
      repairContextsPassed: analysis.gate.repairContextsPassed,
      completeDebate91ValidationPassed:
        analysis.gate.completeDebate91ValidationPassed,
      completeDebate13ValidationPassed:
        analysis.gate.completeDebate13ValidationPassed,
      completeCohortValidationPassed:
        analysis.gate.completeCohortValidationPassed,
      correctedFieldCount: analysis.gate.correctedFieldCount,
      cohortDebates: analysis.gate.cohort.debates,
      cohortMoves: analysis.gate.cohort.moves,
      attempts: analysis.gate.attempts,
      retries: 0,
      meteredApiCostUsd: 0,
      paidServiceCalls: 0,
      modelAuthoredScores: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
