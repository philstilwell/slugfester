#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATE_PLANS, ROOT, validateFieldDisjointRepairOutput } from
  "./lib/assessment-production-post-canary-batch-12-publication-field-disjoint-repair-1.mjs";
import { validatePostCanaryBatch12PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-12-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/publication-reconstruction";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  `${ROOT}/execution-preparation-manifest.json`,
  `${ROOT}/execution-activation.json`,
  `${ROOT}/model-execution.json`
].map((file) => readFile(path.resolve(file))));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.contextsPlanned === 2 &&
    [1, 2].includes(execution.contextsAttempted) &&
    execution.attempts === execution.contextsAttempted && execution.retries === 0 &&
    execution.timeoutExtensions === 0 && execution.furtherCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 && execution.fieldDisjointAcrossContexts === true,
  "two-shard repair execution boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `analysis source hash mismatch: ${file}`);
}

const replayedContexts = [];
const acceptedData = new Map();
for (const result of execution.results) {
  const context = activation.contexts.find((candidate) => candidate.contextIndex === result.contextIndex);
  assertV4(context && context.shardId === result.shardId &&
    context.debateNumber === result.debateNumber,
  `context ${result.contextIndex}: identity mismatch`);
  if (!result.gateAcceptancePassed) {
    replayedContexts.push({
      contextIndex: result.contextIndex,
      shardId: result.shardId,
      debateNumber: result.debateNumber,
      status: result.status,
      gateAcceptancePassed: false,
      validationReplayed: false,
      validationMessage: result.validationMessage ?? result.failureMessage ?? null
    });
    continue;
  }
  const [outputBytes, packetBytes, validationBytes, provenanceBytes] = await Promise.all([
    context.output, context.packet, context.validation, context.provenance
  ].map((file) => readFile(path.resolve(file))));
  assertV4(sha256(outputBytes) === result.outputSha256,
    `context ${result.contextIndex}: output hash changed`);
  assertV4(sha256(validationBytes) === result.validationSha256,
    `context ${result.contextIndex}: validation hash changed`);
  assertV4(sha256(provenanceBytes) === result.provenanceSha256,
    `context ${result.contextIndex}: provenance hash changed`);
  const packet = JSON.parse(packetBytes);
  const output = JSON.parse(outputBytes);
  const validation = validateFieldDisjointRepairOutput(output, packet);
  const validationRecord = JSON.parse(validationBytes);
  const provenance = JSON.parse(provenanceBytes);
  assertV4(validation.status === "passed" && validationRecord.status === "passed" &&
    validationRecord.outputSha256 === result.outputSha256 &&
    provenance.outputSha256 === result.outputSha256 &&
    provenance.attemptCount === 1 && provenance.retryCount === 0 &&
    provenance.timeoutExtensionCount === 0 && provenance.furtherCorrectionContextCount === 0,
  `context ${result.contextIndex}: accepted output audit mismatch`);
  acceptedData.set(result.contextIndex, { context, packet, output, outputBytes,
    validationBytes, provenanceBytes, validation });
  replayedContexts.push({
    contextIndex: result.contextIndex,
    shardId: result.shardId,
    debateNumber: result.debateNumber,
    status: result.status,
    gateAcceptancePassed: true,
    validationReplayed: true,
    outputSha256: result.outputSha256,
    validation
  });
}

const debateResults = [];
const correctedByDebate = new Map();
for (const plan of DEBATE_PLANS) {
  const debateNumber = plan.debateNumber;
  const debateContexts = activation.contexts.filter((context) => context.debateNumber === debateNumber);
  const acceptedContexts = debateContexts.filter((context) => acceptedData.has(context.contextIndex));
  const outputPath = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const validationPath = `${PUBLICATION_ROOT}/validations/debate-${debateNumber}.json`;
  const provenancePath = `${PUBLICATION_ROOT}/provenance/debate-${debateNumber}.json`;
  const [baseOutputBytes, publicationPacketBytes, failedValidationBytes,
    failedProvenanceBytes] = await Promise.all([
      outputPath, packetPath, validationPath, provenancePath
    ].map((file) => readFile(path.resolve(file))));
  let corrected = null;
  let correctedBytes = null;
  let completeValidation = null;
  let failureMessage = null;
  const replacements = [];
  if (acceptedContexts.length === debateContexts.length) {
    try {
      corrected = structuredClone(JSON.parse(baseOutputBytes));
      for (const context of debateContexts) {
        const data = acceptedData.get(context.contextIndex);
        for (const target of data.packet.targets) {
          const replacement = String(data.output.corrections[target.fieldKey]).trim();
          let originalValue;
          if (target.kind === "critique") {
            originalValue = corrected.moveProse[target.moveId].critique;
            assertV4(sha256(originalValue) === target.originalValueSha256,
              `${target.field}: original critique changed`);
            corrected.moveProse[target.moveId].critique = replacement;
          } else {
            originalValue = corrected.representativeQuotes[target.side].text;
            assertV4(sha256(originalValue) === target.originalValueSha256,
              `${target.field}: original quote changed`);
            corrected.representativeQuotes[target.side].text = replacement;
          }
          assertV4(originalValue !== replacement,
            `${target.field}: rejected value was not replaced`);
          replacements.push({
            contextIndex: context.contextIndex,
            shardId: context.shardId,
            fieldKey: target.fieldKey,
            field: target.field,
            kind: target.kind,
            originalValueSha256: sha256(originalValue),
            replacementValueSha256: sha256(replacement)
          });
        }
      }
      assertV4(replacements.length === debateContexts.reduce(
        (sum, context) => sum + context.writableFieldCount, 0),
      `Debate ${debateNumber}: replacement count mismatch`);
      completeValidation = validatePostCanaryBatch12PublicationOutput(
        corrected, JSON.parse(publicationPacketBytes)
      );
      assertV4(completeValidation.status === "passed",
        `Debate ${debateNumber}: complete validation failed`);
      correctedBytes = Buffer.from(`${JSON.stringify(corrected, null, 2)}\n`);
      correctedByDebate.set(debateNumber, {
        corrected, correctedBytes, completeValidation, replacements,
        outputPath, packetPath, validationPath, provenancePath,
        baseOutputBytes, publicationPacketBytes, failedValidationBytes, failedProvenanceBytes
      });
    } catch (error) {
      failureMessage = (error.stack ?? error.message).slice(-10000);
    }
  }
  const passed = correctedByDebate.has(debateNumber);
  debateResults.push({
    debateNumber,
    contextsPlanned: debateContexts.length,
    contextsPassed: acceptedContexts.length,
    contextsFailed: debateContexts.length - acceptedContexts.length,
    writableFields: debateContexts.reduce((sum, context) => sum + context.writableFieldCount, 0),
    correctedFields: passed ? replacements.length : 0,
    completeDebateValidated: passed,
    completeValidation,
    failureMessage,
    status: passed ? "passed" : "failed"
  });
}

const repairedDebates = debateResults.filter((item) => item.status === "passed").length;
const allRepaired = repairedDebates === DEBATE_PLANS.length;
const completeCohort = null;

const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-analysis",
  protocolId: activation.protocolId,
  status: allRepaired
    ? "debate-152-field-disjoint-repair-passed-awaiting-nine-context-resumption"
    : repairedDebates > 0
      ? "field-disjoint-repair-partially-passed"
      : "field-disjoint-repair-failed",
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  sources: {
    preparation: `${ROOT}/execution-preparation-manifest.json`,
    preparationSha256: sha256(preparationBytes),
    activation: `${ROOT}/execution-activation.json`,
    activationSha256: sha256(activationBytes),
    execution: `${ROOT}/model-execution.json`,
    executionSha256: sha256(executionBytes)
  },
  execution: {
    contextsPlanned: 2,
    contextsAttempted: execution.contextsAttempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    furtherCorrectionContexts: 0,
    maximumObservedConcurrency: execution.maximumObservedConcurrency,
    wallElapsedMs: execution.wallElapsedMs,
    aggregateModelElapsedMs: execution.aggregateModelElapsedMs
  },
  validationReplay: replayedContexts,
  debateResults,
  totals: {
    debatesTargeted: 1,
    debatesRepaired: repairedDebates,
    debatesFailed: 1 - repairedDebates,
    critiqueFieldsTargeted: 3,
    quoteFieldsTargeted: 0,
    writableFieldsTargeted: 3,
    correctedFieldsAccepted: debateResults.reduce((sum, item) => sum + item.correctedFields, 0),
    modelContexts: execution.contextsAttempted,
    retries: 0,
    timeoutExtensions: 0,
    furtherCorrectionContexts: 0,
    modelAuthoredScores: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  completeCohortStatus: completeCohort?.status ?? null,
  authorization: {
    nineContextResumptionPreparation: allRepaired,
    deterministicCompilationPreparation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: allRepaired
    ? "prepare-nine-original-unattempted-batch-12-publication-contexts"
    : "standing-authorization-permits-bounded-level-2-diagnosis-without-automatic-retry"
};

if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), "repair analysis already exists");
  assertV4(!(await exists(activation.artifacts.completeCohortAnalysis)),
    "complete cohort analysis already exists");
  for (const [debateNumber, data] of correctedByDebate) {
    const correctedPath = `${ROOT}/corrected/debate-${debateNumber}.json`;
    const completeValidationPath = `${ROOT}/complete-validations/debate-${debateNumber}.json`;
    const mergeAuditPath = `${ROOT}/merge-audits/debate-${debateNumber}.json`;
    for (const file of [correctedPath, completeValidationPath, mergeAuditPath]) {
      assertV4(!(await exists(file)), `${file} already exists`);
      await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    }
    const correctedSha256 = sha256(data.correctedBytes);
    const acceptedValidation = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-validation-after-field-disjoint-repair",
      protocolId: activation.protocolId,
      status: "passed",
      debateNumber,
      debateId: data.corrected.debateId,
      outputSha256: correctedSha256,
      validationSummary: data.completeValidation,
      correctedFields: data.replacements.map((item) => item.field),
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0
    };
    const acceptedProvenance = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-provenance-after-field-disjoint-repair",
      protocolId: activation.protocolId,
      debateNumber,
      debateId: data.corrected.debateId,
      failedOriginalFirstAttempt: {
        sourceOutputSha256: sha256(data.baseOutputBytes),
        sourceValidationSha256: sha256(data.failedValidationBytes),
        sourceProvenanceSha256: sha256(data.failedProvenanceBytes),
        attemptCount: 1,
        retryCount: 0
      },
      acceptedRepairContexts: activation.contexts.filter((context) => context.debateNumber === debateNumber)
        .map((context) => ({
          contextIndex: context.contextIndex,
          shardId: context.shardId,
          outputSha256: acceptedData.get(context.contextIndex).outputBytes &&
            sha256(acceptedData.get(context.contextIndex).outputBytes),
          writableFields: context.writableFields,
          attemptCount: 1,
          retryCount: 0,
          timeoutExtensionCount: 0
        })),
      acceptedOutputSha256: correctedSha256,
      validationCleanFieldsRetainedDeterministically: true,
      rejectedPriorStringsAvailableToRepairModels: false,
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0,
      meteredApiCostUsd: 0,
      paidServiceCalls: 0
    };
    await writeFile(path.resolve(correctedPath), data.correctedBytes);
    await writeFile(path.resolve(completeValidationPath), `${JSON.stringify({
      schemaVersion: "1.0-assessment-production-post-canary-batch-12-field-disjoint-repair-complete-validation",
      protocolId: activation.protocolId,
      status: "passed",
      debateNumber,
      correctedFields: data.replacements.map((item) => item.field),
      correctedOutputSha256: correctedSha256,
      validationSummary: data.completeValidation,
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0
    }, null, 2)}\n`);
    await writeFile(path.resolve(mergeAuditPath), `${JSON.stringify({
      schemaVersion: "1.0-assessment-production-post-canary-batch-12-field-disjoint-repair-merge-audit",
      protocolId: activation.protocolId,
      status: "passed",
      debateNumber,
      sourceFailedOutput: {
        path: data.outputPath,
        sha256: sha256(data.baseOutputBytes),
        retainedValidationCleanFieldsDeterministically: true,
        rejectedTargetValuesRetained: false
      },
      replacements: data.replacements,
      correctedOutput: {
        path: correctedPath,
        sha256: correctedSha256,
        validation: data.completeValidation
      },
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0
    }, null, 2)}\n`);
    await writeFile(path.resolve(data.outputPath), data.correctedBytes);
    await writeFile(path.resolve(data.validationPath), `${JSON.stringify(acceptedValidation, null, 2)}\n`);
    await writeFile(path.resolve(data.provenancePath), `${JSON.stringify(acceptedProvenance, null, 2)}\n`);
  }
  await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
  if (completeCohort) {
    await writeFile(path.resolve(activation.artifacts.completeCohortAnalysis),
      `${JSON.stringify(completeCohort, null, 2)}\n`);
  }
}
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: analysis.execution.contextsAttempted,
  validContexts: analysis.execution.validContexts,
  invalidContexts: analysis.execution.invalidContexts,
  debatesRepaired: analysis.totals.debatesRepaired,
  debatesFailed: analysis.totals.debatesFailed,
  correctedFieldsAccepted: analysis.totals.correctedFieldsAccepted,
  completeCohortStatus: analysis.completeCohortStatus,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  costUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (!allRepaired) process.exitCode = 2;
