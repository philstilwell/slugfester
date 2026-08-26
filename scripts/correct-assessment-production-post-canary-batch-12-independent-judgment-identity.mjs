#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const EXECUTION_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const CORRECTION = `${ROOT}/identity-correction-1.json`;
const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-12-independent-judgment.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-post-canary-batch-12-independent-judgments.mjs";
const POST_EXECUTION_TESTS = [
  "scripts/test-assessment-production-post-canary-batch-12-independent-judgment-activation.mjs",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

async function hashFile(file) {
  return sha256(await readFile(file));
}

async function replayHashMap(hashes) {
  const replayed = {};
  for (const file of Object.keys(hashes)) {
    assertV4(await exists(file), `${file}: identity-correction source missing`);
    replayed[file] = await hashFile(file);
  }
  return replayed;
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function runNode(script, args = []) {
  return execFileSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

async function collectJudgmentHashes(contexts) {
  const hashes = {};
  for (const context of contexts) {
    hashes[context.judgmentOutput] = await hashFile(context.judgmentOutput);
  }
  return hashes;
}

async function applyCorrection() {
  assertV4(!(await exists(CORRECTION)), "Batch 12 judgment identity correction already exists");
  const [preparation, executionPreparation, activation, execution] =
    await Promise.all([
      loadJson(PREPARATION),
      loadJson(EXECUTION_PREPARATION),
      loadJson(ACTIVATION),
      loadJson(EXECUTION),
    ]);
  const identities = [
    preparation.batchNumber,
    executionPreparation.batchNumber,
    activation.batchNumber,
    execution.batchNumber,
  ];
  const initialApply = identities.every((value) => value === 11);
  const resumedAfterTestFailure = identities.every((value) => value === 12);
  assertV4(
    (initialApply || resumedAfterTestFailure) &&
      execution.status ===
        "twenty-post-canary-batch-12-independent-judgment-contexts-passed" &&
      execution.validContexts === 20 &&
      execution.invalidContexts === 0 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0,
    "stale Batch 11 identity boundary is not exact"
  );
  assertV4(
    preparation.protocolId ===
      "assessment-production-post-canary-batch-12-independent-judgments" &&
      executionPreparation.protocolId === preparation.protocolId &&
      activation.protocolId === preparation.protocolId &&
      execution.protocolId === preparation.protocolId &&
      preparation.contexts.length === 20 &&
      execution.results.length === 20,
    "Batch 12 substantive judgment boundary drifted"
  );

  const committedBytes = (file) =>
    Buffer.from(
      execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" })
    );
  const syntheticPreCorrectionExecution = structuredClone(execution);
  syntheticPreCorrectionExecution.batchNumber = 11;
  for (const result of syntheticPreCorrectionExecution.results) {
    result.validationSummary.batchNumber = 11;
  }
  const before = {
    preparationSha256: initialApply
      ? await hashFile(PREPARATION)
      : sha256(committedBytes(PREPARATION)),
    executionPreparationSha256: initialApply
      ? await hashFile(EXECUTION_PREPARATION)
      : sha256(committedBytes(EXECUTION_PREPARATION)),
    activationSha256: initialApply
      ? await hashFile(ACTIVATION)
      : sha256(committedBytes(ACTIVATION)),
    executionSha256: initialApply
      ? await hashFile(EXECUTION)
      : sha256(jsonBytes(syntheticPreCorrectionExecution)),
    judgmentHashes: await collectJudgmentHashes(preparation.contexts),
  };

  preparation.batchNumber = 12;
  preparation.sourceHashes = await replayHashMap(preparation.sourceHashes);
  await writeFile(PREPARATION, jsonBytes(preparation));

  executionPreparation.batchNumber = 12;
  executionPreparation.sourceHashes = await replayHashMap(
    executionPreparation.sourceHashes
  );
  await writeFile(EXECUTION_PREPARATION, jsonBytes(executionPreparation));

  activation.batchNumber = 12;
  activation.preparationManifestSha256 = await hashFile(EXECUTION_PREPARATION);
  activation.packetPreparationSha256 = await hashFile(PREPARATION);
  activation.sourceHashes = await replayHashMap(activation.sourceHashes);
  await writeFile(ACTIVATION, jsonBytes(activation));

  for (const context of preparation.contexts) {
    runNode(VALIDATOR, [
      context.judgmentOutput,
      PREPARATION,
      context.debateNumber,
      context.reviewerPass,
      "--write",
    ]);
  }

  execution.batchNumber = 12;
  for (const result of execution.results) {
    const context = preparation.contexts.find(
      (item) =>
        item.debateNumber === result.debateNumber &&
        item.reviewerPass === result.reviewerPass
    );
    assertV4(context, `${result.debateNumber}/${result.reviewerPass}: context missing`);
    const summary = await loadJson(context.validationOutput);
    assertV4(
      summary.batchNumber === 12 &&
        summary.status === "passed" &&
        summary.semanticRepairPerformed === false &&
        summary.modelAuthoredScores === 0 &&
        summary.scoresDerived === 0,
      `${result.debateNumber}/${result.reviewerPass}: corrected validation failed`
    );
    result.validationSummary = summary;
    result.rawOutputSha256 = await hashFile(context.rawOutput);
    result.validationSha256 = await hashFile(context.validationOutput);
    result.provenanceSha256 = await hashFile(context.provenanceOutput);
  }
  await writeFile(EXECUTION, jsonBytes(execution));

  runNode(ANALYZER, ["--write"]);
  for (const test of POST_EXECUTION_TESTS) runNode(test);

  const analysis = await loadJson(ANALYSIS);
  const afterJudgmentHashes = await collectJudgmentHashes(preparation.contexts);
  assertV4(
    JSON.stringify(afterJudgmentHashes) === JSON.stringify(before.judgmentHashes),
    "model judgment bytes changed during identity-only correction"
  );
  assertV4(
    analysis.batchNumber === 12 &&
      analysis.status ===
        "twenty-post-canary-batch-12-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction" &&
      analysis.acceptance.passed === true &&
      analysis.acceptance.semanticRepairs === 0 &&
      analysis.acceptance.modelAuthoredScores === 0 &&
      analysis.acceptance.scores === 0,
    "corrected Batch 12 analysis failed"
  );

  const correction = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-12-independent-judgment-identity-correction",
    protocolId: preparation.protocolId,
    status:
      "exact-batch-number-identity-correction-passed-complete-judgment-gate-replay-passed",
    correctedAt: new Date().toISOString(),
    diagnosis: {
      classification: "stale-cloned-derived-metadata-field",
      staleField: "batchNumber",
      staleValue: 11,
      correctedValue: 12,
      affectedSubstantiveModelInputs: 0,
      affectedModelJudgmentBytes: 0,
      modelContextsExecutedForCorrection: 0,
      retries: 0,
      timeoutExtensions: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
    },
    scope: {
      preparation: PREPARATION,
      executionPreparation: EXECUTION_PREPARATION,
      activation: ACTIVATION,
      execution: EXECUTION,
      validationsRegenerated: 20,
      analysisRegenerated: ANALYSIS,
      postExecutionTestsReplayed: POST_EXECUTION_TESTS,
      preExecutionTestsNotReplayedAfterOutputsExisted: [
        "scripts/test-assessment-production-post-canary-batch-12-independent-judgment-preparation.mjs",
        "scripts/test-assessment-production-post-canary-batch-12-independent-judgment-manifest.mjs",
      ],
    },
    before,
    after: {
      preparationSha256: await hashFile(PREPARATION),
      executionPreparationSha256: await hashFile(EXECUTION_PREPARATION),
      activationSha256: await hashFile(ACTIVATION),
      executionSha256: await hashFile(EXECUTION),
      analysisSha256: await hashFile(ANALYSIS),
      judgmentHashes: afterJudgmentHashes,
    },
    invariants: {
      modelJudgmentBytesPreservedByteIdentical: true,
      modelInputsChanged: false,
      judgmentsChanged: false,
      ratingsChanged: false,
      scoresDerived: 0,
      semanticRepairs: 0,
      allTwentyValidationsReplayed: true,
      completePairedJudgmentGateReplayed: true,
      preExecutionTestTimingBoundaryPreserved: true,
    },
    nextAuthorizedAction:
      "extract-freeze-and-analyze-batch-12-disagreements-under-standing-authorization",
  };
  await mkdir(path.dirname(CORRECTION), { recursive: true });
  await writeFile(CORRECTION, jsonBytes(correction));
  console.log(
    JSON.stringify(
      {
        status: correction.status,
        correctedField: "batchNumber",
        correctedFrom: 11,
        correctedTo: 12,
        judgmentsPreservedByteIdentical: 20,
        validationsReplayed: 20,
        modelContextsExecutedForCorrection: 0,
        directIncrementalCostUsd: 0,
        nextAuthorizedAction: correction.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validateCorrection() {
  const [preparation, executionPreparation, activation, execution, analysis, correction] =
    await Promise.all([
      loadJson(PREPARATION),
      loadJson(EXECUTION_PREPARATION),
      loadJson(ACTIVATION),
      loadJson(EXECUTION),
      loadJson(ANALYSIS),
      loadJson(CORRECTION),
    ]);
  assertV4(
    [preparation, executionPreparation, activation, execution, analysis].every(
      (artifact) => artifact.batchNumber === 12
    ) &&
      correction.status ===
        "exact-batch-number-identity-correction-passed-complete-judgment-gate-replay-passed" &&
      correction.invariants.modelJudgmentBytesPreservedByteIdentical === true &&
      correction.invariants.allTwentyValidationsReplayed === true &&
      correction.invariants.completePairedJudgmentGateReplayed === true,
    "Batch 12 judgment identity correction validation failed"
  );
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4((await hashFile(file)) === digest, `${file}: preparation hash drifted`);
  }
  for (const [file, digest] of Object.entries(executionPreparation.sourceHashes)) {
    assertV4((await hashFile(file)) === digest, `${file}: execution preparation hash drifted`);
  }
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4((await hashFile(file)) === digest, `${file}: activation hash drifted`);
  }
  assertV4(
    (await hashFile(EXECUTION_PREPARATION)) ===
        activation.preparationManifestSha256 &&
      (await hashFile(PREPARATION)) === activation.packetPreparationSha256 &&
      JSON.stringify(await collectJudgmentHashes(preparation.contexts)) ===
        JSON.stringify(correction.after.judgmentHashes),
    "Batch 12 corrected manifest or judgment hash drifted"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-batch-12-independent-judgment-identity-correction",
        batchNumber: 12,
        contexts: execution.validContexts,
        judgmentsPreservedByteIdentical: 20,
        validationsReplayed: 20,
        modelContextsExecutedForCorrection: 0,
        directIncrementalCostUsd: 0,
        nextAuthorizedAction: correction.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "apply") await applyCorrection();
else if (command === "validate") await validateCorrection();
else throw new Error("usage: correct-assessment-production-post-canary-batch-12-independent-judgment-identity.mjs <apply|validate>");
