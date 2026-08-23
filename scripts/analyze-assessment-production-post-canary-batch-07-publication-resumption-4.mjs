#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch07PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-4.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT;
const [p, a, e] = await Promise.all([
  "execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"
].map((file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `resumption analysis source mismatch: ${file}`);
assertV4(e.contextsPlanned === 2 && e.attempts === e.contextsAttempted && e.retries === 0 &&
  e.timeoutExtensions === 0 && e.correctionContexts === 0 && e.meteredApiCostUsd === 0 &&
  e.paidServiceCallsThisStage === 0 && e.modelAuthoredScores === 0,
"resumption execution changed");
assertV4(!shouldWrite || !(await exists(a.artifacts.analysis)), `${a.artifacts.analysis} exists`);
const accepted = [];
let failureMessage = null;
try {
  for (const row of p.acceptedDebates) {
    const outputBytes = await readFile(path.resolve(row.output));
    assertV4(sha256(outputBytes) === row.outputSha256,
      `accepted Debate ${row.debateNumber}: output changed`);
    const validation = validatePostCanaryBatch07PublicationOutput(JSON.parse(outputBytes),
      JSON.parse(await readFile(path.resolve(row.packet), "utf8")));
    accepted.push({ debateNumber: row.debateNumber, output: row.output,
      outputSha256: sha256(outputBytes), packet: row.packet, status: validation.status,
      validationSummary: validation, priorAccepted: true });
  }
  if (e.contextsAttempted === 2 && e.validContexts === 2 && e.invalidContexts === 0 &&
      e.results.every((row) => row.gateAcceptancePassed)) {
    for (const context of a.contexts) {
      const result = e.results.find((row) => row.contextIndex === context.contextIndex);
      const outputBytes = await readFile(path.resolve(context.rawOutput));
      assertV4(result && sha256(outputBytes) === result.outputSha256,
        `resumed Debate ${context.debateNumber}: output changed`);
      const validation = validatePostCanaryBatch07PublicationOutput(JSON.parse(outputBytes),
        JSON.parse(await readFile(path.resolve(context.packet), "utf8")));
      accepted.push({ debateNumber: context.debateNumber, output: context.rawOutput,
        outputSha256: sha256(outputBytes), packet: context.packet, status: validation.status,
        validationSummary: validation, priorAccepted: false });
    }
  }
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
}
const totals = accepted.reduce((sum, row) => ({ debates: sum.debates + 1,
  moves: sum.moves + row.validationSummary.moves,
  critiques: sum.critiques + row.validationSummary.critiques,
  exactSourceQuotes: sum.exactSourceQuotes + row.validationSummary.quoteExactSourceMatches,
  overallCommentarySides: sum.overallCommentarySides + row.validationSummary.overallCommentarySides,
  aiExtensionSides: sum.aiExtensionSides + row.validationSummary.aiExtensionSides,
  modelAuthoredScores: sum.modelAuthoredScores + row.validationSummary.calculatedScoresAuthoredByModel
}), { debates: 0, moves: 0, critiques: 0, exactSourceQuotes: 0,
  overallCommentarySides: 0, aiExtensionSides: 0, modelAuthoredScores: 0 });
const passed = !failureMessage && totals.debates === 10 && totals.moves === 187 &&
  totals.critiques === 187 && totals.exactSourceQuotes === 20 &&
  totals.overallCommentarySides === 20 && totals.aiExtensionSides === 20 &&
  totals.modelAuthoredScores === 0 && accepted.every((row) => row.status === "passed");
const analysis = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-resumption-4-analysis",
  protocolId: a.protocolId, status: passed
    ? "batch-07-complete-ten-debate-publication-reconstruction-cohort-passed"
    : "batch-07-publication-resumption-4-or-cohort-validation-failed",
  productionCanary: false, batchNumber: 7, stagingOnly: true,
  execution: { contextsPlanned: 2, contextsAttempted: e.contextsAttempted,
    contextsPassed: e.validContexts, contextsFailed: e.invalidContexts,
    contextsUnattempted: e.contextsUnattempted, attempts: e.attempts, retries: 0,
    timeoutExtensions: 0, correctionContexts: 0, modelAuthoredScores: 0 },
  acceptedDebates: accepted.map((row) => ({ debateNumber: row.debateNumber,
    output: row.output, outputSha256: row.outputSha256, packet: row.packet,
    priorAccepted: row.priorAccepted, validationSummary: row.validationSummary })),
  cohortValidation: { status: passed ? "passed" : "failed", ...totals,
    expectedDebateOrder: ["193", "80", "121", "100", "78", "113", "180", "02", "182", "56"],
    immutableScoresChanged: passed ? 0 : null, lockedScoresUnchanged: passed ? true : null },
  failureMessage, cost: { authentication: "ChatGPT subscription",
    directIncrementalCostUsd: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 },
  authorization: { publicationCompilationPreparationAndExecution: passed,
    retry: false, timeoutExtension: false, repairPacketPreparation: false,
    correctionModelExecution: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-and-execute-one-deterministic-batch-07-publication-compilation-pass"
    : "stop-after-failed-batch-07-publication-resumption-4-output" };
if (shouldWrite) await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: e.contextsAttempted,
  contextsPassed: e.validContexts, contextsFailed: e.invalidContexts,
  cohortValidation: analysis.cohortValidation, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));

