#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch02PublicationOutput } from "./lib/assessment-production-post-canary-batch-02-publication-validation.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT } from "./lib/assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  harnessCorrection: `${ROOT}/execution-harness-correction-1.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`
};
const failedDebates = ["136", "83"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) {
  assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);
}

const readJsonBytes = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { bytes, value: JSON.parse(bytes) };
};
const core = Object.fromEntries(
  await Promise.all(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(async ([name, file]) => [name, await readJsonBytes(file)])
  )
);
const activation = core.activation.value;
const execution = core.execution.value;
const analysis = core.analysis.value;
const harnessCorrection = core.harnessCorrection.value;
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  activation.status ===
      "frozen-eight-untouched-post-canary-batch-02-publication-resumption-2-contexts-authorized-under-standing-authorization" &&
    harnessCorrection.status ===
      "frozen-batch-02-publication-resumption-2-execution-harness-correction-1" &&
    harnessCorrection.modelContextsAttemptedBeforeCorrection === 0 &&
    execution.status ===
      "post-canary-batch-02-publication-resumption-2-complete-with-failure" &&
    execution.contextsPlanned === 8 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 5 &&
    execution.validContexts === 1 &&
    execution.invalidContexts === 2 &&
    execution.attempts === 3 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status ===
      "post-canary-batch-02-publication-resumption-2-failed-validation" &&
    analysis.authorization?.failureDiagnosis === true &&
    analysis.authorization?.repairPacketPreparation === true &&
    analysis.nextAuthorizedAction ===
      "diagnose-batch-02-publication-resumption-2-failure-under-standing-authorization",
  "the failed Batch 2 publication resumption-2 gate changed"
);
assertV4(
  canonicalJson(
    execution.results
      .filter((result) => !result.gateAcceptancePassed)
      .map((result) => result.debateNumber)
  ) === canonicalJson(failedDebates),
  "the failed debate set changed"
);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const expectedFailures = {
  "136": [
    ["con-calibrated-existence-baseline", 132],
    ["con-anonymous-late-changing-transmission", 131],
    ["pro-miracle-content-method-challenge", 132],
    ["pro-attestation-can-raise-miracle-probability", 131],
    ["pro-acts-ending-supports-early-date", 134],
    ["pro-variation-compatible-with-testimony", 133],
    ["pro-local-knowledge-supports-continuity", 131],
    ["con-empty-tomb-narrative-not-verification", 133],
    ["con-bodily-scenes-as-polemical-development", 137]
  ],
  "83": [["pro-first-cause-01", 101]]
};

const debateDiagnoses = [];
for (const debateNumber of failedDebates) {
  const result = execution.results.find(
    (item) => item.debateNumber === debateNumber
  );
  const context = activation.contexts[result.contextIndex];
  const outputFile = context.rawOutput;
  const packetFile = context.packet;
  const validationFile = context.validation;
  const provenanceFile = context.provenance;
  const [outputRecord, packetRecord, validationRecord, provenanceRecord] =
    await Promise.all([
      readJsonBytes(outputFile),
      readJsonBytes(packetFile),
      readJsonBytes(validationFile),
      readJsonBytes(provenanceFile)
    ]);
  assertV4(
    result.status === "output-validation-failed" &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.correctionContextCount === 0 &&
      result.outputSha256 === sha256(outputRecord.bytes) &&
      result.validationSha256 === sha256(validationRecord.bytes) &&
      result.provenanceSha256 === sha256(provenanceRecord.bytes) &&
      validationRecord.value.status === "failed" &&
      provenanceRecord.value.outputSha256 === result.outputSha256,
    `Debate ${debateNumber}: preserved failed context changed`
  );
  const rows = packetRecord.value.moves.map((move) => {
    const critique = String(
      outputRecord.value.moveProse[move.moveId].critique
    ).trim();
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    return {
      moveId: move.moveId,
      words: wordCount(critique),
      characters: critique.length,
      sentences: sentences.length,
      orderedLabelsPassed:
        sentences.length === 4 &&
        sentences.every((sentence, index) =>
          sentence.toLowerCase().startsWith(labels[index])
        ),
      terminalPunctuationPassed: sentences.every((sentence) =>
        /[.!?]["')\]]?$/.test(sentence.trim())
      )
    };
  });
  const invalid = rows.filter(
    (row) =>
      row.words < 105 ||
      row.words > 130 ||
      row.characters < 880 ||
      row.sentences !== 4 ||
      !row.orderedLabelsPassed ||
      !row.terminalPunctuationPassed
  );
  assertV4(
    canonicalJson(invalid.map((row) => [row.moveId, row.words])) ===
      canonicalJson(expectedFailures[debateNumber]) &&
      rows.every(
        (row) =>
          row.characters >= 880 &&
          row.sentences === 4 &&
          row.orderedLabelsPassed &&
          row.terminalPunctuationPassed
      ),
    `Debate ${debateNumber}: unexpected validation category exists`
  );

  const diagnosticOnly = structuredClone(outputRecord.value);
  let wordsRemoved = 0;
  let wordsAdded = 0;
  for (const row of invalid) {
    const sentences = diagnosticOnly.moveProse[row.moveId].critique
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const tokens = sentences[1].split(/\s+/);
      assertV4(tokens.length > 6, `${row.moveId}: cannot shorten diagnostically`);
      tokens.splice(tokens.length - 2, 1);
      sentences[1] = tokens.join(" ");
      wordsRemoved += 1;
    }
    if (wordCount(sentences.join(" ")) < 105) {
      assertV4(
        wordCount(sentences.join(" ")) === 101,
        `${row.moveId}: unexpected under-minimum boundary`
      );
      sentences[1] = sentences[1].replace(
        /([.!?]["')\]]?)$/,
        " with adequate evidential specificity$1"
      );
      wordsAdded += 4;
    }
    diagnosticOnly.moveProse[row.moveId].critique = sentences.join(" ");
  }
  const replay = validatePostCanaryBatch02PublicationOutput(
    diagnosticOnly,
    packetRecord.value
  );
  assertV4(
    replay.status === "passed" &&
      replay.moves === packetRecord.value.moves.length &&
      replay.critiques === packetRecord.value.moves.length &&
      replay.minimumCritiqueCharacters >= 880 &&
      replay.quoteExactSourceMatches === 2 &&
      replay.overallCommentarySides === 2 &&
      replay.aiExtensionSides === 2 &&
      replay.calculatedScoresAuthoredByModel === 0 &&
      replay.lockedScoresUnchanged === true,
    `Debate ${debateNumber}: diagnostic-only replay failed`
  );
  debateDiagnoses.push({
    debateNumber,
    debateId: context.debateId,
    contextIndex: result.contextIndex,
    originalContextIndex: result.originalContextIndex,
    failedFields: invalid.map((row) => ({
      path: `moveProse.${row.moveId}.critique`,
      words: row.words,
      characters: row.characters,
      acceptanceWords: [105, 130],
      targetWords: [112, 118],
      minimumCharacters: 880,
      wordsBelowMinimum: Math.max(0, 105 - row.words),
      wordsAboveMaximum: Math.max(0, row.words - 130)
    })),
    wordsRemoved,
    wordsAdded,
    diagnosticReplay: replay,
    artifacts: {
      output: { path: outputFile, sha256: sha256(outputRecord.bytes) },
      packet: { path: packetFile, sha256: sha256(packetRecord.bytes) },
      validation: {
        path: validationFile,
        sha256: sha256(validationRecord.bytes)
      },
      provenance: {
        path: provenanceFile,
        sha256: sha256(provenanceRecord.bytes)
      }
    }
  });
}

const proposedRepairPartition = debateDiagnoses.flatMap((debate) => {
  const fields = debate.failedFields.map(({ path: field }) => field);
  const packets = [];
  for (let index = 0; index < fields.length; index += 2) {
    packets.push({
      debateNumber: debate.debateNumber,
      writableFields: fields.slice(index, index + 2)
    });
  }
  return packets;
});
assertV4(
  proposedRepairPartition.length === 6 &&
    proposedRepairPartition.every(
      (packet) =>
        packet.writableFields.length >= 1 &&
        packet.writableFields.length <= 2
    ) &&
    proposedRepairPartition.flatMap((packet) => packet.writableFields).length ===
      10,
  "the six-packet ten-field repair partition changed"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-2-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-02-resumption-2-two-debate-ten-critique-word-boundary-failures",
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  failureBoundary: {
    failedDebates,
    failedDebateCount: 2,
    failedFieldCount: 10,
    overMaximumFieldCount: 9,
    underMinimumFieldCount: 1,
    wordsRemovedInDiagnosticCopies: 24,
    wordsAddedInDiagnosticCopies: 4,
    unexpectedValidationCategories: 0,
    debateDiagnoses
  },
  rampDisposition: {
    contextsPlanned: 8,
    contextsAttempted: 3,
    contextsPassed: 1,
    contextsFailed: 2,
    contextsUnattempted: 5,
    acceptedDebate: "04",
    unattemptedDebates: execution.unattemptedContextIndexes.map(
      (index) => activation.contexts[index].debateNumber
    ),
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0
  },
  diagnosticReplay: {
    persistedCorrectedOutputs: false,
    originalOutputsModified: false,
    completeDebatesPassed: debateDiagnoses.map((debate) => ({
      debateNumber: debate.debateNumber,
      result: debate.diagnosticReplay
    }))
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorizedUnderStandingAuthorization: true,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPacketCount: 6,
    proposedRepairPartition,
    proposedModel: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription"
    },
    attemptsMaximumPerPacket: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRepairsMaximum: 0
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresChanged: false,
    sourcesChanged: false,
    modelContextsExecutedForDiagnosis: 0,
    modelAuthoredScores: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    productionMutation: false
  },
  authorization: {
    standingAuthorizationApplies: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    retry: false,
    timeoutExtension: false,
    recursiveRepair: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  coreArtifacts: Object.fromEntries(
    Object.entries(core).map(([name, record]) => [
      name,
      { path: paths[name], sha256: sha256(record.bytes) }
    ])
  ),
  standingAuthorization: {
    path: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status
  },
  nextRequiredAction:
    "prepare-six-bounded-debate-136-and-83-publication-repair-packets-under-standing-authorization"
};

const serialized = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(paths.diagnosis), serialized);
} else if (await exists(paths.diagnosis)) {
  assertV4(
    String(await readFile(path.resolve(paths.diagnosis))) === serialized,
    "the frozen resumption-2 failure diagnosis changed"
  );
}
console.log(JSON.stringify({
  status: diagnosis.status,
  failedDebates,
  failedFieldCount: 10,
  unexpectedValidationCategories: 0,
  hypotheticalCompleteDebateReplaysPassed: 2,
  proposedRepairPacketCount: 6,
  writableFieldsMaximumPerPacket: 2,
  modelContextsExecutedForDiagnosis: 0,
  directIncrementalCostUsd: 0,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
