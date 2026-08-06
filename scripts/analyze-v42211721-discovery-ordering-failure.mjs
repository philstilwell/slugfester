#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { compileV422112CandidateBundle, validateV422112Discovery } from "./lib/v422112-simplified-discovery.mjs";

const GATE_ROOT = "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery";
const OUTPUT = "docs/calibration/v4.2.21.17.21/discovery-ordering-failure/failure-analysis.json";
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const compareCandidates = (left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent
  || left.sourceSpan.endEvent - right.sourceSpan.endEvent
  || left.candidateId.localeCompare(right.candidateId);

const manifestBytes = await readFile(`${GATE_ROOT}/execution-manifest.json`);
const executionBytes = await readFile(`${GATE_ROOT}/model-execution.json`);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const preparationBytes = await readFile(manifest.preparation);
const preparation = JSON.parse(preparationBytes);

assertV4(manifest.status === "frozen-twenty-hard-route-held-out-discovery-contexts-authorized", "unexpected frozen gate manifest");
assertV4(execution.status === "hard-route-held-out-discovery-complete-with-failure", "held-out gate must remain failed");
assertV4(execution.contextsAttempted === 20 && execution.validContexts === 19 && execution.invalidContexts === 1 && execution.retries === 0, "unexpected held-out failure ledger");

const failureRecords = execution.results.filter((result) => !result.accepted);
assertV4(failureRecords.length === 1, "exactly one failed context is required");
const failureRecord = failureRecords[0];
assertV4(failureRecord.status === "output-validation-failed" && failureRecord.rawOutputWritten, "failure must be a preserved validation failure");
assertV4(failureRecord.validationMessage.includes("candidates are not chronological"), "failure is not chronology-only at the validator boundary");

const contexts = [];
const debateBundles = [];
for (const debate of preparation.contexts) {
  const packet = JSON.parse(await readFile(debate.packet));
  const plan = JSON.parse(await readFile(debate.plan));
  const eventsBytes = await readFile(debate.originalEvents);
  const fullLedgerBytes = await readFile(debate.fullLedger);
  const rawOutputs = [];
  const orderedOutputs = [];
  for (const chunk of debate.chunks) {
    const context = manifest.contexts.find((item) => item.debateNumber === debate.debateNumber && item.chunkId === chunk.chunkId);
    const result = execution.results.find((item) => item.debateNumber === debate.debateNumber && item.chunkId === chunk.chunkId);
    assertV4(context && result, `${debate.debateNumber}/${chunk.chunkId}: context or execution record missing`);
    const rawBytes = await readFile(chunk.rawOutput);
    const raw = JSON.parse(rawBytes);
    assertV4(result.rawOutputSha256 === sha256(rawBytes), `${debate.debateNumber}/${chunk.chunkId}: raw output hash drifted`);
    const ordered = { ...clone(raw), candidates: [...raw.candidates].map(clone).sort(compareCandidates) };
    const rawIds = raw.candidates.map((candidate) => candidate.candidateId);
    const orderedIds = ordered.candidates.map((candidate) => candidate.candidateId);
    const reordered = canonicalJson(rawIds) !== canonicalJson(orderedIds);
    const fieldPreservation = ordered.candidates.every((candidate) => {
      const source = raw.candidates.find((item) => item.candidateId === candidate.candidateId);
      return source && canonicalJson(source) === canonicalJson(candidate);
    });
    assertV4(fieldPreservation && ordered.candidates.length === raw.candidates.length, `${debate.debateNumber}/${chunk.chunkId}: canonical ordering changed candidate content`);
    const validation = validateV422112Discovery(ordered, {
      packet,
      chunk,
      plan,
      eventsDocument: JSON.parse(eventsBytes),
      eventsBytes,
      chunkBytes: await readFile(chunk.chunkLedgerPath),
      fullLedgerBytes,
    });
    rawOutputs.push(raw);
    orderedOutputs.push(ordered);
    const movedCandidates = raw.candidates.flatMap((candidate, rawIndex) => {
      const orderedIndex = ordered.candidates.findIndex((item) => item.candidateId === candidate.candidateId);
      return rawIndex === orderedIndex ? [] : [{ candidateId: candidate.candidateId, rawIndex, orderedIndex, sourceSpan: candidate.sourceSpan }];
    });
    const inversions = raw.candidates.slice(1).flatMap((candidate, index) => {
      const prior = raw.candidates[index];
      return compareCandidates(prior, candidate) <= 0 ? [] : [{
        priorCandidateId: prior.candidateId,
        priorSourceSpan: prior.sourceSpan,
        candidateId: candidate.candidateId,
        candidateSourceSpan: candidate.sourceSpan,
      }];
    });
    contexts.push({
      contextIndex: result.contextIndex,
      debateNumber: debate.debateNumber,
      chunkId: chunk.chunkId,
      executionAccepted: result.accepted,
      executionStatus: result.status,
      candidates: raw.candidates.length,
      rawOutput: chunk.rawOutput,
      rawOutputSha256: sha256(rawBytes),
      rawChronologyCanonical: !reordered,
      canonicalOrderingValidationStatus: validation.status,
      candidateFieldsPreservedExactly: fieldPreservation,
      movedCandidates,
      adjacentInversions: inversions,
    });
  }
  const rawBundle = compileV422112CandidateBundle({ packet, plan, outputs: rawOutputs });
  const orderedBundle = compileV422112CandidateBundle({ packet, plan, outputs: orderedOutputs });
  assertV4(canonicalJson(rawBundle) === canonicalJson(orderedBundle), `${debate.debateNumber}: deterministic compilation changed under input ordering`);
  debateBundles.push({
    debateNumber: debate.debateNumber,
    candidates: rawBundle.candidateCount,
    rawAndOrderedCompilationCanonicallyIdentical: true,
    compiledBundleSha256: sha256(Buffer.from(`${JSON.stringify(rawBundle, null, 2)}\n`)),
  });
}

const reorderedContexts = contexts.filter((context) => !context.rawChronologyCanonical);
assertV4(reorderedContexts.length === 1, "ordering defect is not isolated to one context");
assertV4(reorderedContexts[0].contextIndex === failureRecord.contextIndex, "ordering defect does not match the failed execution context");
assertV4(contexts.every((context) => context.canonicalOrderingValidationStatus === "passed" && context.candidateFieldsPreservedExactly), "in-memory order-only replay did not validate universally");
assertV4(debateBundles.every((debate) => debate.rawAndOrderedCompilationCanonicallyIdentical), "compiled semantics depend on raw array order");

const analysis = {
  schemaVersion: "4.2.21.17.21-discovery-ordering-failure-analysis",
  protocolId: "v4.2.21.17.21-discovery-ordering-failure-analysis",
  status: "ordering-only-failure-confirmed-order-invariant-validator-development-authorized",
  calibrationOnly: true,
  AIOnly: true,
  heldOutGateDisposition: "failed-and-not-retried",
  inputs: {
    manifest: `${GATE_ROOT}/execution-manifest.json`,
    manifestSha256: sha256(manifestBytes),
    execution: `${GATE_ROOT}/model-execution.json`,
    executionSha256: sha256(executionBytes),
    preparation: manifest.preparation,
    preparationSha256: sha256(preparationBytes),
  },
  failure: {
    contextIndex: failureRecord.contextIndex,
    debateNumber: failureRecord.debateNumber,
    chunkId: failureRecord.chunkId,
    executionStatus: failureRecord.status,
    classification: "valid-structured-output-with-noncanonical-candidate-array-order",
    transportPassed: failureRecord.commandExitCode === 0 && failureRecord.terminationSignal === null && !failureRecord.timedOut,
    rawOutputPreserved: failureRecord.rawOutputWritten,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  replay: {
    method: "in-memory-order-only-clone",
    comparator: ["sourceSpan.startEvent", "sourceSpan.endEvent", "candidateId"],
    contexts,
    debateBundles,
    contextsReordered: reorderedContexts.length,
    allTwentyValidateUnderCanonicalOrdering: true,
    allCandidateFieldsPreservedExactly: true,
    rawAndOrderedCompilationCanonicallyIdenticalForAllDebates: true,
    derivedOutputsReplacedRawModelOutputs: false,
  },
  designFinding: {
    simplifiedDiscoveryModelAuthorsLocalTargetIds: false,
    selectedTargetTopologyDeferredToIndependentJudgment: true,
    compilerAlreadyCanonicalizesCandidateChronology: true,
    rawArrayOrderAffectsCompiledCandidateSemantics: false,
    inheritedChronologyRejectionRequiredForSimplifiedDiscovery: false,
  },
  recommendation: {
    nextProtocol: "versioned order-invariant simplified-discovery validation with explicit canonical-order audit",
    developmentData: "retired and failed-gate artifacts only",
    requireRetiredRegressionBeforeFreshHeldOutEvidence: true,
    acceptV42211720AsPassed: false,
    retryV42211720: false,
  },
  cost: {
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    orderInvariantValidatorDevelopment: true,
    retiredRegression: true,
    freshHeldOutModelExecution: false,
    independentJudgmentPacketPreparation: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};

if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  heldOutGateDisposition: analysis.heldOutGateDisposition,
  failedContext: analysis.failure,
  contextsReordered: analysis.replay.contextsReordered,
  allTwentyValidateUnderCanonicalOrdering: analysis.replay.allTwentyValidateUnderCanonicalOrdering,
  compiledBundlesIdentical: analysis.replay.rawAndOrderedCompilationCanonicallyIdenticalForAllDebates,
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
