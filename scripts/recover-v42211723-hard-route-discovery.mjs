#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { parseV42219Ledger, serializeV42219Rows } from "./lib/v42219-generalized-partition.mjs";
import { canonicalizeV42211722CandidateOrder, compileV42211722CandidateBundle, validateV42211722Discovery } from "./lib/v42211722-order-invariant-discovery.mjs";

const SOURCE_ROOT = "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery";
const FAILURE_ANALYSIS = "docs/calibration/v4.2.21.17.21/discovery-ordering-failure/failure-analysis.json";
const REGRESSION = "docs/calibration/v4.2.21.17.22/order-invariant-discovery-regression/regression.json";
const ROOT = "docs/calibration/v4.2.21.17.23/mechanical-discovery-recovery";
const ANALYSIS = `${ROOT}/recovery-analysis.json`;
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const manifestBytes = await readFile(`${SOURCE_ROOT}/execution-manifest.json`);
const executionBytes = await readFile(`${SOURCE_ROOT}/model-execution.json`);
const failureBytes = await readFile(FAILURE_ANALYSIS);
const regressionBytes = await readFile(REGRESSION);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const failure = JSON.parse(failureBytes);
const regression = JSON.parse(regressionBytes);
const preparationBytes = await readFile(manifest.preparation);
const preparation = JSON.parse(preparationBytes);

assertV4(execution.status === "hard-route-held-out-discovery-complete-with-failure" && execution.validContexts === 19 && execution.invalidContexts === 1 && execution.retries === 0, "source discovery gate disposition drifted");
assertV4(failure.status === "ordering-only-failure-confirmed-order-invariant-validator-development-authorized" && failure.heldOutGateDisposition === "failed-and-not-retried", "ordering-only diagnosis unavailable");
assertV4(regression.status === "order-invariant-discovery-validator-retired-regression-passed" && regression.totals.availableRawOutputs === 63 && regression.totals.orderingOnlyRecoveries === 1 && regression.totals.hardenedRejected === 2, "order-invariant regression unavailable");

const debates = [];
const outputAudits = [];
for (const debate of preparation.contexts) {
  const packet = JSON.parse(await readFile(debate.packet));
  const plan = JSON.parse(await readFile(debate.plan));
  const eventsBytes = await readFile(debate.originalEvents);
  const fullLedgerBytes = await readFile(debate.fullLedger);
  const rawOutputs = [];
  const orderedOutputs = [];
  for (const chunk of debate.chunks) {
    const result = execution.results.find((item) => item.debateNumber === debate.debateNumber && item.chunkId === chunk.chunkId);
    assertV4(result?.rawOutputWritten && result.retryCount === 0, `${debate.debateNumber}/${chunk.chunkId}: preserved raw output unavailable`);
    const rawBytes = await readFile(chunk.rawOutput);
    assertV4(sha256(rawBytes) === result.rawOutputSha256, `${debate.debateNumber}/${chunk.chunkId}: raw output hash drifted`);
    const raw = JSON.parse(rawBytes);
    const validation = validateV42211722Discovery(raw, {
      packet,
      chunk,
      plan,
      eventsDocument: JSON.parse(eventsBytes),
      eventsBytes,
      chunkBytes: await readFile(chunk.chunkLedgerPath),
      fullLedgerBytes,
    });
    const { orderedOutput } = canonicalizeV42211722CandidateOrder(raw);
    rawOutputs.push(raw);
    orderedOutputs.push(orderedOutput);
    outputAudits.push({
      debateNumber: debate.debateNumber,
      chunkId: chunk.chunkId,
      rawOutput: chunk.rawOutput,
      rawOutputSha256: result.rawOutputSha256,
      sourceExecutionAccepted: result.accepted,
      recoveryValidationStatus: validation.status,
      candidates: validation.candidates,
      rawChronologyCanonical: validation.rawChronologyCanonical,
      canonicalOrderingAppliedForValidation: validation.canonicalOrderingAppliedForValidation,
      candidateFieldsModified: validation.candidateFieldsModified,
    });
  }
  const rawBundle = compileV42211722CandidateBundle({ packet, plan, outputs: rawOutputs });
  const orderedBundle = compileV42211722CandidateBundle({ packet, plan, outputs: orderedOutputs });
  assertV4(canonicalJson(rawBundle) === canonicalJson(orderedBundle), `${debate.debateNumber}: compilation depends on raw array order`);
  const pro = rawBundle.candidates.filter((candidate) => candidate.side === "pro").length;
  const con = rawBundle.candidates.filter((candidate) => candidate.side === "con").length;
  assertV4(rawBundle.candidateCount >= 8 && pro >= 4 && con >= 4, `${debate.debateNumber}: recovered candidate inventory is insufficient`);
  const rows = parseV42219Ledger(fullLedgerBytes);
  const included = new Set();
  for (const candidate of rawBundle.candidates) {
    for (let event = Math.max(0, candidate.sourceSpan.startEvent - 12); event <= Math.min(rows.length - 1, candidate.sourceSpan.endEvent + 12); event += 1) included.add(event);
  }
  const sparseRows = [...included].sort((left, right) => left - right).map((event) => rows[event]);
  const sparseBytes = serializeV42219Rows(sparseRows);
  const bundlePath = `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`;
  const sparsePath = `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`;
  const bundleBytes = Buffer.from(`${JSON.stringify(rawBundle, null, 2)}\n`);
  if (shouldWrite) {
    await mkdir(path.dirname(bundlePath), { recursive: true });
    await mkdir(path.dirname(sparsePath), { recursive: true });
    await writeFile(bundlePath, bundleBytes);
    await writeFile(sparsePath, sparseBytes);
  }
  debates.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    frozenRoute: debate.frozenRoute,
    partitionSeverity: debate.partitionSeverity,
    chunks: debate.chunks.length,
    candidates: rawBundle.candidateCount,
    pro,
    con,
    constructive: rawBundle.candidates.filter((candidate) => candidate.moveKind === "constructive").length,
    reply: rawBundle.candidates.filter((candidate) => candidate.moveKind === "reply").length,
    mediumAttributionCandidates: rawBundle.candidates.filter((candidate) => candidate.attributionConfidence === "medium").length,
    lowAttributionCandidates: rawBundle.candidates.filter((candidate) => candidate.attributionConfidence === "low").length,
    rawAndOrderedCompilationCanonicallyIdentical: true,
    bundlePath,
    bundleSha256: sha256(bundleBytes),
    sparsePath,
    sparseEvents: sparseRows.length,
    sparseBytes: sparseBytes.length,
    sparseSha256: sha256(sparseBytes),
    candidateSpansIncluded: rawBundle.candidates.every((candidate) => {
      for (let event = candidate.sourceSpan.startEvent; event <= candidate.sourceSpan.endEvent; event += 1) if (!included.has(event)) return false;
      return true;
    }),
  });
}

assertV4(outputAudits.length === 20 && outputAudits.every((output) => output.recoveryValidationStatus === "passed" && !output.candidateFieldsModified), "universal recovered validation failed");
assertV4(outputAudits.filter((output) => output.canonicalOrderingAppliedForValidation).length === 1, "ordering recovery count drifted");
assertV4(outputAudits.filter((output) => output.canonicalOrderingAppliedForValidation).every((output) => output.debateNumber === "63" && output.chunkId === "chunk-001"), "ordering recovery identity drifted");

const analysis = {
  schemaVersion: "4.2.21.17.23-hard-route-discovery-mechanical-recovery",
  protocolId: "v4.2.21.17.23-hard-route-discovery-mechanical-recovery",
  status: "hard-route-discovery-mechanically-recovered-independent-judgment-packet-preparation-authorized",
  calibrationOnly: true,
  AIOnly: true,
  sourceDiscoveryGateDisposition: "v4.2.21.17.20-failed-and-not-retried",
  independentJudgmentEvidenceHeldOut: true,
  inputs: {
    manifest: `${SOURCE_ROOT}/execution-manifest.json`,
    manifestSha256: sha256(manifestBytes),
    execution: `${SOURCE_ROOT}/model-execution.json`,
    executionSha256: sha256(executionBytes),
    preparation: manifest.preparation,
    preparationSha256: sha256(preparationBytes),
    failureAnalysis: FAILURE_ANALYSIS,
    failureAnalysisSha256: sha256(failureBytes),
    retiredRegression: REGRESSION,
    retiredRegressionSha256: sha256(regressionBytes),
  },
  outputAudits,
  debates,
  audit: {
    rawOutputs: outputAudits.length,
    sourceExecutionValid: execution.validContexts,
    sourceExecutionInvalid: execution.invalidContexts,
    recoveryValid: outputAudits.filter((output) => output.recoveryValidationStatus === "passed").length,
    orderingCanonicalizations: outputAudits.filter((output) => output.canonicalOrderingAppliedForValidation).length,
    rawOutputsRewritten: false,
    candidateFieldsModified: false,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    rawAndOrderedCompilationCanonicallyIdenticalForAllDebates: debates.every((debate) => debate.rawAndOrderedCompilationCanonicallyIdentical),
    candidateBundlesInventoryFeasible: true,
    scoresDerived: 0,
  },
  totals: {
    debates: debates.length,
    candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
    pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
    con: debates.reduce((sum, debate) => sum + debate.con, 0),
    sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0),
    modelContextsExecutedByRecovery: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    independentJudgmentPacketPreparation: true,
    independentJudgmentModelExecution: false,
    audioExecution: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
};

if (shouldWrite) await writeFile(ANALYSIS, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  sourceDiscoveryGateDisposition: analysis.sourceDiscoveryGateDisposition,
  debates,
  audit: analysis.audit,
  totals: analysis.totals,
}, null, 2));
