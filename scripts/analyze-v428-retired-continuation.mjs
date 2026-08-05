#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { lexicalTokens } from "./lib/v418-source-integrity.mjs";
import { compileV426PrimaryOutput, evaluateV426PrimaryTiming, validateV426PrimaryOutput } from "./lib/v426-retired-completion.mjs";
import { isLocalCorrectableFailure, V428_ROOT } from "./lib/v428-retired-continuation.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, anchorExecution, priorExecution, correctionExecution] = await Promise.all([
  readFile(`${V428_ROOT}/execution-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${V428_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.5/conservative-excerpt-smoke/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.6/conservative-excerpt-retired-completion/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.7/bounded-primary-correction/model-execution.json", "utf8").then(JSON.parse)
]);

assertV4(execution.contextsAttempted === 4 && execution.contextsSkipped === 0 && execution.authorization.deterministicPrimaryAnalysis, "complete v4.2.8 first-pass execution unavailable");
assertV4(anchorExecution.status === "excerpt-smoke-execution-passed", "Debate 131 anchor unavailable");
assertV4(priorExecution.results.length === 1 && priorExecution.results[0].debateNumber === "106", "Debate 106 original primary unavailable");
assertV4(correctionExecution.status === "bounded-correction-execution-passed", "Debate 106 correction unavailable");

function extractFirstError(message) {
  return message?.match(/Error: ([^\n]+)/)?.[1] ?? null;
}

function orderingViolations(moves) {
  const violations = [];
  for (let index = 1; index < moves.length; index += 1) {
    const prior = moves[index - 1];
    const current = moves[index];
    const priorKey = [prior.sourceSpan.startEvent, prior.sourceSpan.endEvent, prior.moveId];
    const currentKey = [current.sourceSpan.startEvent, current.sourceSpan.endEvent, current.moveId];
    const ordered = priorKey[0] < currentKey[0]
      || (priorKey[0] === currentKey[0] && priorKey[1] < currentKey[1])
      || (priorKey[0] === currentKey[0] && priorKey[1] === currentKey[1] && priorKey[2].localeCompare(currentKey[2]) <= 0);
    if (!ordered) {
      violations.push({
        priorMoveId: prior.moveId,
        priorStartEvent: prior.sourceSpan.startEvent,
        priorEndEvent: prior.sourceSpan.endEvent,
        moveId: current.moveId,
        startEvent: current.sourceSpan.startEvent,
        endEvent: current.sourceSpan.endEvent
      });
    }
  }
  return violations;
}

const contextsByDebate = new Map(manifest.contexts.map((context) => [context.debateNumber, context]));
const debates = [];
const failures = [];
for (const result of execution.results) {
  const context = contextsByDebate.get(result.debateNumber);
  assertV4(context, `${result.debateNumber}: context missing from frozen manifest`);
  if (result.gateAcceptancePassed) {
    const [packet, raw, compiled, eventsBytes, ledgerBytes] = await Promise.all([
      readFile(context.packet, "utf8").then(JSON.parse),
      readFile(context.rawOutput, "utf8").then(JSON.parse),
      readFile(context.compiledOutput, "utf8").then(JSON.parse),
      readFile(context.originalEvents),
      readFile(context.sourceLedger)
    ]);
    const events = JSON.parse(eventsBytes);
    const validation = validateV426PrimaryOutput(raw, packet, events, eventsBytes, ledgerBytes);
    assertV4(canonicalJson(compileV426PrimaryOutput(raw, packet, events)) === canonicalJson(compiled), `${context.debateNumber}: compilation replay mismatch`);
    debates.push({
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      firstPassStatus: "valid",
      validation,
      deterministicCompilationReplayPassed: true
    });
    continue;
  }

  const failure = {
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    status: result.status,
    elapsedMs: result.elapsedMs,
    rawOutputWritten: result.rawOutputWritten,
    correctableRawAvailable: isLocalCorrectableFailure(result),
    firstSurfacedFailure: extractFirstError(result.validationMessage),
    deterministicDiagnostics: null
  };
  if (result.rawOutputWritten) {
    const [raw, packet, eventsBytes, ledgerBytes] = await Promise.all([
      readFile(context.rawOutput, "utf8").then(JSON.parse),
      readFile(context.packet, "utf8").then(JSON.parse),
      readFile(context.originalEvents),
      readFile(context.sourceLedger)
    ]);
    const sorted = structuredClone(raw);
    sorted.moves.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
    let postSortFailure = null;
    try {
      validateV426PrimaryOutput(sorted, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
    } catch (error) {
      postSortFailure = error.message;
    }
    const sectionCounts = raw.sections.map((section) => ({
      sectionId: section.sectionId,
      pro: raw.moves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").length,
      con: raw.moves.filter((move) => move.sectionId === section.sectionId && move.side === "con").length
    }));
    const excerptDiagnostics = raw.moves.map((move) => ({
      moveId: move.moveId,
      characters: move.sourceSpan.excerpt.length,
      tokens: lexicalTokens(move.sourceSpan.excerpt).length
    }));
    failure.deterministicDiagnostics = {
      moveCount: raw.moves.length,
      sectionCount: raw.sections.length,
      orderingViolations: orderingViolations(raw.moves),
      canonicalSortTestedInMemoryOnly: true,
      postSortFailure,
      sectionCounts,
      excerptDiagnostics,
      excerptsWithin450CharactersAnd12To100Tokens: excerptDiagnostics.every((item) => item.characters <= 450 && item.tokens >= 12 && item.tokens <= 100)
    };
  }
  failures.push(failure);
  debates.push({
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    firstPassStatus: "invalid",
    failure: failure.firstSurfacedFailure,
    rawOutputPreserved: result.rawOutputWritten,
    correctableRawAvailable: failure.correctableRawAvailable
  });
}

const firstPassResults = [anchorExecution.result, priorExecution.results[0], ...execution.results];
const firstPassValid = 1 + execution.validContexts;
const firstPassInvalid = firstPassResults.length - firstPassValid;
const allFailuresCorrectable = failures.length > 0 && failures.every((failure) => failure.correctableRawAvailable);
const allSixFinallyValidated = failures.length === 0;
let timing = null;
let correctionAdjustedProjection = null;
let runtimePassed = false;
if (allSixFinallyValidated) {
  const timingInputs = firstPassResults.map((result) => ({
    debateNumber: result.debateNumber,
    gateAcceptancePassed: true,
    elapsedMs: result.elapsedMs,
    recoverableStreamEvents: result.recoverableStreamEvents
  }));
  timing = evaluateV426PrimaryTiming(timingInputs);
  const observedCorrectionRate = firstPassInvalid / firstPassResults.length;
  const correctionMinutes = correctionExecution.result.elapsedMs / 60000;
  const centralCorrectionHours = observedCorrectionRate * correctionMinutes * 195 / 60;
  const conservativeCorrectionRate = Math.max(0.25, observedCorrectionRate);
  const conservativeCorrectionMinutes = correctionMinutes * 1.25;
  const conservativeCorrectionHours = conservativeCorrectionRate * conservativeCorrectionMinutes * 195 / 60;
  correctionAdjustedProjection = {
    central: {
      baseHours: timing.centralProjection.hours.total,
      correctionRate: Number(observedCorrectionRate.toFixed(4)),
      correctionMinutesPerCorrectedDebate: Number(correctionMinutes.toFixed(2)),
      correctionHours: Number(centralCorrectionHours.toFixed(2)),
      totalHours: Number((timing.centralProjection.hours.total + centralCorrectionHours).toFixed(2))
    },
    conservative: {
      baseHours: timing.conservativeProjection.hours.total,
      correctionRate: Number(conservativeCorrectionRate.toFixed(4)),
      correctionMinutesPerCorrectedDebate: Number(conservativeCorrectionMinutes.toFixed(2)),
      correctionHours: Number(conservativeCorrectionHours.toFixed(2)),
      totalHours: Number((timing.conservativeProjection.hours.total + conservativeCorrectionHours).toFixed(2))
    }
  };
  runtimePassed = timing.timingEligible && correctionAdjustedProjection.central.totalHours <= 52 && correctionAdjustedProjection.conservative.totalHours <= 60;
}

const status = failures.length > 0
  ? allFailuresCorrectable
    ? "retired-primary-continuation-complete-bounded-correction-preparation-authorized"
    : "retired-primary-continuation-blocked-noncorrectable-failure"
  : runtimePassed
    ? "retired-six-reliability-passed-fresh-gate-preparation-authorized"
    : "retired-six-reliability-failed-correction-adjusted-runtime";
const analysis = {
  schemaVersion: "4.2.8-retired-continuation-primary-analysis",
  protocolId: manifest.protocolId,
  status,
  developmentOnly: true,
  debates,
  failures,
  retiredSix: {
    debateNumbers: firstPassResults.map((result) => result.debateNumber),
    firstPassValid,
    firstPassInvalid,
    firstPassValidityRate: Number((firstPassValid / firstPassResults.length).toFixed(4)),
    completedCorrections: 1,
    pendingCorrections: failures.length,
    finallyValidatedContexts: allSixFinallyValidated ? 6 : 2 + execution.validContexts,
    primaryAttempts: firstPassResults.length,
    primaryRetries: 0,
    primaryElapsedMs: firstPassResults.reduce((sum, result) => sum + result.elapsedMs, 0),
    completedCorrectionElapsedMs: correctionExecution.result.elapsedMs
  },
  sourceIntegrityBoundary: {
    inheritedValidatedContexts: 2,
    newValidContexts: execution.validContexts,
    rawInvalidOutputsPreserved: failures.filter((failure) => failure.rawOutputWritten).length,
    newCompilerReplays: debates.filter((debate) => debate.deterministicCompilationReplayPassed).length,
    scoreFieldsDerived: 0
  },
  timing,
  correctionAdjustedProjection,
  totals: {
    contextsAttemptedThisStage: 4,
    attemptsThisStage: 4,
    retriesThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    boundedCorrectionPreparation: allFailuresCorrectable,
    boundedCorrectionExecution: false,
    newDisjointFreshGatePreparation: failures.length === 0 && runtimePassed,
    newFreshGateExecution: false,
    scoreDerivation: false,
    legacyComparison: false,
    productionMutation: false,
    all195Debates: false
  }
};

if (shouldWrite) {
  await writeFile(manifest.artifacts.primaryAnalysis, `${JSON.stringify(analysis, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: analysis.status,
  firstPassValid,
  firstPassInvalid,
  firstPassValidityRate: analysis.retiredSix.firstPassValidityRate,
  newValidContexts: execution.validContexts,
  newInvalidContexts: execution.invalidContexts,
  correctableFailures: failures.filter((failure) => failure.correctableRawAvailable).map((failure) => failure.debateNumber),
  correctionPreparationAuthorized: analysis.authorization.boundedCorrectionPreparation,
  freshGatePreparationAuthorized: analysis.authorization.newDisjointFreshGatePreparation,
  scoreDerivationAuthorized: false,
  meteredApiCostUsd: 0
}, null, 2));
