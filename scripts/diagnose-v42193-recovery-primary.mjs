#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { bagOfWordsRecall, lexicalTokens, orderedTokenCoverage } from "./lib/v418-source-integrity.mjs";
import { V4219_ROOT, validateV4219PrimaryOutput } from "./lib/v4219-primary-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, gate] = await Promise.all(["execution-manifest.json", "model-execution.json", "analysis.json"].map((file) => readFile(`${V4219_ROOT}/${file}`, "utf8").then(JSON.parse)));
if (gate.status !== "recovery-primary-gate-failed-validation" || execution.validContexts !== 0 || execution.retries !== 0) throw new Error("v4.2.19.2 failed gate unavailable");

function tokenSequenceIndex(haystack, needle) {
  outer: for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) if (haystack[start + offset] !== needle[offset]) continue outer;
    return start;
  }
  return -1;
}

function exactTokenWindow(text, start, count) {
  const matches = [...text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)];
  return text.slice(matches[start].index, matches[start + count - 1].index + matches[start + count - 1][0].length);
}

function bestExactCue(cue, text) {
  const matches = [...text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)];
  const count = Math.min(20, Math.max(6, lexicalTokens(cue).length));
  let best = null;
  for (let start = 0; start + count <= matches.length; start += 1) {
    const value = exactTokenWindow(text, start, count);
    const score = orderedTokenCoverage(cue, value) * 2 + bagOfWordsRecall(cue, value);
    if (!best || score > best.score) best = { value, score };
  }
  if (!best) throw new Error("selected span cannot supply a cue window");
  return best.value;
}

const diagnostics = [];
const categoryTotals = { "character-exact": 0, "punctuation-or-format-only": 0, "caption-disfluency-multiplicity": 0, "selected-span-boundary": 0, other: 0 };
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  const [output, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
  const eventsDocument = JSON.parse(eventsBytes);
  const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument.events;
  const fullTokens = lexicalTokens(events.map((event) => event.text).join(" "));
  const cues = [];
  const counterfactual = structuredClone(output);
  for (const [index, move] of output.moves.entries()) {
    const cue = move.sourceSpan.evidenceCue.replace(/\s+/g, " ").trim();
    const spanText = events.slice(move.sourceSpan.startEvent, move.sourceSpan.endEvent + 1).map((event) => event.text).join(" ").replace(/\s+/g, " ").trim();
    const cueTokens = lexicalTokens(cue);
    const spanTokens = lexicalTokens(spanText);
    const characterExact = spanText.toLocaleLowerCase("en-US").includes(cue.toLocaleLowerCase("en-US"));
    const lexicalSequenceInSpan = tokenSequenceIndex(spanTokens, cueTokens) >= 0;
    const lexicalSequenceInFullTranscript = tokenSequenceIndex(fullTokens, cueTokens) >= 0;
    const lexicalRecall = bagOfWordsRecall(cue, spanText);
    const orderedCoverage = orderedTokenCoverage(cue, spanText);
    let category = "other";
    if (characterExact) category = "character-exact";
    else if (lexicalSequenceInSpan) category = "punctuation-or-format-only";
    else if (lexicalRecall === 1 && orderedCoverage === 1) category = "caption-disfluency-multiplicity";
    else if (lexicalSequenceInFullTranscript) category = "selected-span-boundary";
    categoryTotals[category] += 1;
    cues.push({ moveId: move.moveId, startEvent: move.sourceSpan.startEvent, endEvent: move.sourceSpan.endEvent, characterExact, lexicalSequenceInSpan, lexicalSequenceInFullTranscript, lexicalRecall: Number(lexicalRecall.toFixed(6)), orderedCoverage: Number(orderedCoverage.toFixed(6)), category });
    counterfactual.moves[index].sourceSpan.evidenceCue = bestExactCue(cue, spanText);
  }
  let counterfactualResult;
  try {
    const replay = validateV4219PrimaryOutput(counterfactual, packet, eventsDocument, eventsBytes, ledgerBytes);
    counterfactualResult = { status: "passes-after-in-memory-source-exact-cue-substitution", moves: replay.moves, chronologyReordered: replay.deterministicRecovery.chronologyReordered, acceptedAsGateEvidence: false };
  } catch (error) {
    counterfactualResult = { status: "still-fails-after-in-memory-source-exact-cue-substitution", nextFailure: error.message, acceptedAsGateEvidence: false };
  }
  const chronological = [...output.moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
  const moveIndex = new Map(chronological.map((move, index) => [move.moveId, index]));
  const targetChronologyViolations = chronological.flatMap((move, index) => move.response.decisiveTargetIds.flatMap((targetMoveId) => !moveIndex.has(targetMoveId) || moveIndex.get(targetMoveId) >= index ? [{ moveId: move.moveId, startEvent: move.sourceSpan.startEvent, targetMoveId, targetStartEvent: chronological.find((candidate) => candidate.moveId === targetMoveId)?.sourceSpan.startEvent ?? null }] : []));
  diagnostics.push({ debateNumber: context.debateNumber, debateId: context.debateId, status: result.status, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), sourceLedgerEvents: context.sourceLedgerEvents, compactCopiedInputBytes: context.compactCopiedInputBytes, rawOutputAvailable: result.rawOutputWritten, cueAudit: { moves: cues.length, characterExact: cues.filter((item) => item.characterExact).length, mismatches: cues.filter((item) => !item.characterExact).length, details: cues }, targetChronologyViolations, counterfactual: counterfactualResult });
}
const elapsedMinutes = diagnostics.map((item) => item.elapsedMinutes);
const diagnosis = { schemaVersion: "4.2.19.3-recovery-primary-failure-diagnosis", protocolId: manifest.protocolId, status: "recovery-evidence-and-target-contract-redesign-required", developmentOnly: true, codeOnly: true, gateResultPreserved: { validContexts: execution.validContexts, attemptedContexts: execution.contextsAttempted, retries: execution.retries, corrections: execution.correctionContexts, scoresDerived: 0 }, operationalRoutingEvidence: { contextsCompletedWithoutTimeout: execution.results.filter((item) => !item.timedOut).length, transportFailures: execution.results.filter((item) => item.status === "transport-failed").length, elapsedMinutesByDebate: Object.fromEntries(diagnostics.map((item) => [item.debateNumber, item.elapsedMinutes])), observedMeanElapsedMinutes: Number((elapsedMinutes.reduce((sum, value) => sum + value, 0) / elapsedMinutes.length).toFixed(2)), observedMaximumElapsedMinutes: Math.max(...elapsedMinutes), includesNearCeilingStressContext: diagnostics.some((item) => item.sourceLedgerEvents >= 1790 && item.compactCopiedInputBytes >= 140000), semanticAcceptanceRequiredBeforeTimingGate: true }, evidenceCueFindings: { totalMoves: Object.values(categoryTotals).reduce((sum, value) => sum + value, 0), categoryTotals, exactCharacterCueResponsibilityRejected: true, repositoryOwnedSourceSpanRenderingRecommended: true }, diagnostics, findings: { debate110CounterfactualPassesAfterEvidenceOnlySubstitution: diagnostics.find((item) => item.debateNumber === "110")?.counterfactual.status.startsWith("passes"), debate194CounterfactualPassesAfterEvidenceOnlySubstitution: diagnostics.find((item) => item.debateNumber === "194")?.counterfactual.status.startsWith("passes"), debate147HasLaterTargetViolation: diagnostics.find((item) => item.debateNumber === "147")?.targetChronologyViolations.length === 1, repositoryChronologyGuardConfirmed: true, automaticTargetRepairRejected: true }, requiredRecoveryDesign: ["derive the bounded verbatim evidence window from the locked source span and model proposition without requiring model-authored quotation mechanics", "freeze deterministic lexical-salience scoring and tie-breaking before another model sample", "retain canonical chronology and fail every target edge that is not earlier after ordering", "strengthen reply-target instructions without automatically deleting, reversing, or reclassifying an invalid edge"], totals: { modelContexts: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { evidenceRecoveryDesign: true, targetTopologyRecoveryDesign: true, recoveryModelExecution: false, passB: false, audioVerification: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(`${V4219_ROOT}/failure-diagnosis.json`, `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: diagnosis.status, gateResultPreserved: diagnosis.gateResultPreserved, routing: diagnosis.operationalRoutingEvidence, cueCategories: categoryTotals, debates: diagnostics.map((item) => ({ debateNumber: item.debateNumber, cueMismatches: item.cueAudit.mismatches, targetChronologyViolations: item.targetChronologyViolations, counterfactual: item.counterfactual.status })), nextAuthorized: "code-only-evidence-and-target-contract-design", modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
