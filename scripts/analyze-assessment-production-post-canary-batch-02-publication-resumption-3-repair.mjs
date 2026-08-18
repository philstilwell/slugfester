#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT,
  mergeAndValidateResumption3Repairs
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source hash mismatch: ${file}`
  );
}
assertV4(
  execution.contextsPlanned === 5 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 5 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "the resumption-3 repair execution record changed"
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
let failureMessage = null;
let baseOutputBytes = {};
let repairOutputBytes = [];
if (
  execution.contextsAttempted === 5 &&
  execution.validContexts === 5 &&
  execution.invalidContexts === 0 &&
  execution.results.every((result) => result.gateAcceptancePassed)
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
    const publicationPacketBytes = Object.fromEntries(
      await Promise.all(
        Object.entries(preparation.inputs.publicationPackets).map(
          async ([debateNumber, file]) => [
            debateNumber,
            await readFile(path.resolve(file))
          ]
        )
      )
    );
    assertV4(
      sha256(baseOutputBytes["99"]) ===
        diagnosis.failedContextArtifacts.output.sha256,
      "Debate 99: failed output changed before merge"
    );
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
    for (let index = 0; index < 5; index += 1) {
      assertV4(
        sha256(repairOutputBytes[index]) ===
          execution.results[index].repairOutputSha256,
        `repair output ${index} hash mismatch`
      );
    }
    merge = mergeAndValidateResumption3Repairs({
      baseOutputs: Object.fromEntries(
        Object.entries(baseOutputBytes).map(([debate, bytes]) => [
          debate,
          JSON.parse(bytes)
        ])
      ),
      repairs: repairOutputBytes.map((bytes) => JSON.parse(bytes)),
      repairPackets,
      publicationPackets: Object.fromEntries(
        Object.entries(publicationPacketBytes).map(([debate, bytes]) => [
          debate,
          JSON.parse(bytes)
        ])
      )
    });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const passed =
  execution.validContexts === 5 &&
  Object.values(merge?.fullValidations ?? {}).length === 1 &&
  Object.values(merge.fullValidations).every(
    (validation) => validation.status === "passed"
  );
const correctedFields = execution.results.flatMap(
  (result) => result.validationSummary?.correctedFields ?? []
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-02-resumption-3-bounded-repairs-and-complete-publication-validations-passed"
    : "batch-02-resumption-3-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  gate: {
    repairContextsPlanned: 5,
    repairContextsAttempted: execution.contextsAttempted,
    repairContextsPassed: execution.validContexts,
    repairContextsFailed: execution.invalidContexts,
    repairContextsUnattempted: execution.contextsUnattempted,
    completeDebateValidationPassed: passed,
    correctedFields,
    correctedFieldCount: correctedFields.length,
    movesValidated: Object.values(merge?.fullValidations ?? {}).reduce(
      (sum, validation) => sum + validation.moves,
      0
    ),
    critiquesValidated: Object.values(merge?.fullValidations ?? {}).reduce(
      (sum, validation) => sum + validation.critiques,
      0
    ),
    exactSourceQuotesValidated: Object.values(
      merge?.fullValidations ?? {}
    ).reduce((sum, validation) => sum + validation.quoteExactSourceMatches, 0),
    overallCommentarySidesValidated: Object.values(
      merge?.fullValidations ?? {}
    ).reduce((sum, validation) => sum + validation.overallCommentarySides, 0),
    aiExtensionSidesValidated: Object.values(
      merge?.fullValidations ?? {}
    ).reduce((sum, validation) => sum + validation.aiExtensionSides, 0),
    completeDebateValidations: merge?.fullValidations ?? null,
    immutableFieldsChanged: passed ? 0 : null,
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
    repairOutputs: activation.contexts.map((context) => context.repairOutput),
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
    modelAuthoredScores: 0
  },
  authorization: {
    twoContextResumptionManifestPreparation: passed,
    twoContextModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-a-separate-two-context-batch-02-publication-resumption-4-manifest-under-standing-authorization"
    : "standing-authorization-stop-failed-repair"
};

if (shouldWrite && passed) {
  const mergedBytes = Object.fromEntries(
    Object.entries(merge.mergedOutputs).map(([debateNumber, output]) => [
      debateNumber,
      Buffer.from(`${JSON.stringify(output, null, 2)}\n`)
    ])
  );
  const completeValidations = Object.fromEntries(
    Object.entries(merge.fullValidations).map(
      ([debateNumber, validationSummary]) => [
        debateNumber,
        {
          schemaVersion:
            "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-complete-debate-validation",
          protocolId: activation.protocolId,
          status: "passed",
          debateNumber,
          mergedOutputSha256: sha256(mergedBytes[debateNumber]),
          validationSummary,
          originalFailedOutputPreserved: true,
          authorizedFieldsChanged: merge.transformations.filter(
            (item) => item.debateNumber === debateNumber
          ).length,
          immutableFieldsChanged: 0,
          modelAuthoredScores: 0,
          lockedScoresUnchanged: true
        }
      ]
    )
  );
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumbers: ["99"],
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
      path: context.repairOutput,
      sha256: sha256(repairOutputBytes[index])
    })),
    mergedOutputs: Object.fromEntries(
      Object.entries(activation.artifacts.mergedOutputs).map(
        ([debateNumber, file]) => [
          debateNumber,
          { path: file, sha256: sha256(mergedBytes[debateNumber]) }
        ]
      )
    ),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: merge.transformations.length,
    immutableFieldsChanged: 0,
    completeDebateValidations: merge.fullValidations,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  for (const debateNumber of ["99"]) {
    await mkdir(
      path.dirname(path.resolve(activation.artifacts.mergedOutputs[debateNumber])),
      { recursive: true }
    );
    await writeFile(
      path.resolve(activation.artifacts.mergedOutputs[debateNumber]),
      mergedBytes[debateNumber]
    );
    await writeFile(
      path.resolve(activation.artifacts.completeValidations[debateNumber]),
      `${JSON.stringify(completeValidations[debateNumber], null, 2)}\n`
    );
  }
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
console.log(JSON.stringify({
  status: analysis.status,
  repairContextsAttempted: analysis.gate.repairContextsAttempted,
  repairContextsPassed: analysis.gate.repairContextsPassed,
  completeDebateValidationPassed:
    analysis.gate.completeDebateValidationPassed,
  correctedFieldCount: analysis.gate.correctedFieldCount,
  movesValidated: analysis.gate.movesValidated,
  critiquesValidated: analysis.gate.critiquesValidated,
  attempts: analysis.gate.attempts,
  retries: 0,
  meteredApiCostUsd: 0,
  paidServiceCalls: 0,
  modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
