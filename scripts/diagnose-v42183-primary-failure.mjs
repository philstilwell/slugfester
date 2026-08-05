#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { V4_RESPONSE_RANGES } from "./lib/v4-lean-production.mjs";
import { validateV42181PrimaryOutput, V42181_ROOT } from "./lib/v42181-fresh-direct-three.mjs";

const shouldWrite = process.argv.includes("--write"), preparation = JSON.parse(await readFile(`${V42181_ROOT}/preparation-manifest.json`, "utf8")), execution = JSON.parse(await readFile(`${V42181_ROOT}/model-execution.json`, "utf8")), gate = JSON.parse(await readFile(`${V42181_ROOT}/analysis.json`, "utf8"));
if (gate.status !== "fresh-direct-primary-gate-failed-validation" || execution.validContexts !== 0 || execution.retries !== 0) throw new Error("v4.2.18.2 failed gate unavailable");
const wholeWordPrefix = (text) => { if (text.length <= 450) return text; const prefix = text.slice(0, 451), boundary = prefix.lastIndexOf(" "); return prefix.slice(0, boundary).trimEnd(); };
const diagnostics = [];
for (const context of preparation.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber), item = { debateNumber: context.debateNumber, debateId: context.debateId, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), status: result.status, sourceLedgerEvents: context.sourceLedgerEvents, compactCopiedInputBytes: context.compactCopiedInputBytes, rawOutputAvailable: result.rawOutputWritten };
  if (!result.rawOutputWritten) { diagnostics.push({ ...item, failureDomains: ["direct-route-timeout"], counterfactual: null }); continue; }
  const [output, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
  const overlongExcerpts = output.moves.filter((move) => move.sourceSpan.excerpt.length > 450).map((move) => ({ moveId: move.moveId, characters: move.sourceSpan.excerpt.length, words: move.sourceSpan.excerpt.trim().split(/\s+/).filter(Boolean).length }));
  const chronologyInversions = output.moves.slice(1).flatMap((move, index) => { const prior = output.moves[index]; return move.sourceSpan.startEvent < prior.sourceSpan.startEvent || move.sourceSpan.startEvent === prior.sourceSpan.startEvent && move.sourceSpan.endEvent < prior.sourceSpan.endEvent ? [{ priorMoveId: prior.moveId, priorStartEvent: prior.sourceSpan.startEvent, moveId: move.moveId, startEvent: move.sourceSpan.startEvent }] : []; });
  const responseTupleViolations = [];
  for (const move of output.moves) {
    const response = move.response, contacted = response.components.filter((component) => component.contacted).length, total = response.components.length;
    let structural = true;
    if (response.class === "full-answer") structural = contacted === total;
    else if (response.class === "partial-answer") structural = contacted > 0 && contacted < total;
    else if (response.class === "relevant-nonanswer") structural = contacted === 0 && response.issueBearingContraryMaterial;
    else if (response.class === "nonanswer") structural = contacted === 0 && !response.issueBearingContraryMaterial;
    else if (response.class === "diagnostic-defeat") structural = contacted > 0 && response.diagnosticConsequenceExplicit;
    else if (response.class === "justified-reframe") structural = contacted > 0 && response.replacementDemandAnswered;
    const range = V4_RESPONSE_RANGES[response.class], value = move.ratings.responsiveness.value, ratingInClassRange = value >= range[0] && value <= range[1];
    if (!structural || !ratingInClassRange) responseTupleViolations.push({ moveId: move.moveId, responseClass: response.class, contactedComponents: contacted, totalComponents: total, responsivenessValue: value, permittedRange: range, structuralClassValid: structural, ratingInClassRange });
  }
  const counterfactual = structuredClone(output);
  for (const move of counterfactual.moves) move.sourceSpan.excerpt = wholeWordPrefix(move.sourceSpan.excerpt);
  counterfactual.moves.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
  let counterfactualValidation;
  try { const validation = validateV42181PrimaryOutput(counterfactual, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes); counterfactualValidation = { status: "passes-after-in-memory-whole-word-excerpt-shortening-and-chronology-sort", moves: validation.moves, acceptedAsGateEvidence: false }; }
  catch (error) { counterfactualValidation = { status: "still-fails-after-in-memory-whole-word-excerpt-shortening-and-chronology-sort", nextFailure: error.message, acceptedAsGateEvidence: false }; }
  const failureDomains = []; if (overlongExcerpts.length) failureDomains.push("source-excerpt-length"); if (chronologyInversions.length) failureDomains.push("move-chronology"); if (responseTupleViolations.length) failureDomains.push("response-class-rating-consistency");
  diagnostics.push({ ...item, failureDomains, overlongExcerpts, maximumExcerptCharacters: Math.max(...output.moves.map((move) => move.sourceSpan.excerpt.length)), chronologyInversions, responseTupleViolations, counterfactual: counterfactualValidation });
}
const diagnosis = { schemaVersion: "4.2.18.3-fresh-primary-failure-diagnosis", protocolId: preparation.protocolId, status: "fresh-direct-primary-recovery-redesign-required", developmentOnly: true, codeOnly: true, gateResultPreserved: { validContexts: execution.validContexts, attemptedContexts: execution.contextsAttempted, retries: execution.retries, corrections: execution.correctionContexts, scoresDerived: 0 }, diagnostics, findings: { durationOnlyDirectRoutingRejected: true, proposedConservativeDirectRouteCeilingsForNextTest: { sourceLedgerEventsMaximum: 1800, compactCopiedInputBytesMaximum: 150000, evidenceBasis: "both completed contexts were below these limits; the timed-out context exceeded both" }, sourceExcerptSchemaMaximumRemovalRejected: true, debate107CounterfactualPassesAfterEvidenceOnlyWholeWordShortening: diagnostics.find((item) => item.debateNumber === "107")?.counterfactual.status.startsWith("passes"), repositoryOwnedChronologySortCandidate: true, responseClassMustPrecedeWithinClassResponsiveness: true }, requiredRecoveryDesign: ["select or route direct contexts using compact event count and copied input bytes, not duration alone", "compile or normalize source excerpts only at whole-word boundaries while preserving the selected source span and a minimum evidence window", "sort moves deterministically by source chronology and then fail any response edge that no longer targets an earlier move", "derive response class from locked component findings before soliciting or mapping the within-class responsiveness judgment"], totals: { modelContexts: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { recoveryDesign: true, recoveryModelExecution: false, scoreDerivation: false, requiredAudioVerification: false, passB: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(`${V42181_ROOT}/failure-diagnosis.json`, `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: diagnosis.status, debates: diagnostics.map((item) => ({ debateNumber: item.debateNumber, status: item.status, failureDomains: item.failureDomains, counterfactual: item.counterfactual?.status ?? null })), proposedDirectRouteCeilings: diagnosis.findings.proposedConservativeDirectRouteCeilingsForNextTest, recoveryDesignAuthorized: true, recoveryModelExecutionAuthorized: false, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
