#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { eventExcerpt, normalizeWords } from "./lib/v381-source-preparation.mjs";
import { additionRef } from "./lib/v384-coverage-preparation.mjs";
import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const outputPath = "docs/calibration/v3.8.7/coverage-batch-span-correction/exhaustive-preflight.json";
const rawPath = "docs/calibration/v3.8.5/coverage-transport-amendment/raw-output.json";
const packetPath = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal/packets/debate-161.json";
const schemaPath = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal/schemas/debate-161.schema.json";
const eventsPath = ".assessment-cache/captions/9JVRy7bR7zI/events.json";
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [output, packet, schema, events] = await Promise.all([readJson(rawPath), readJson(packetPath), readJson(schemaPath), readJson(eventsPath)]);
const issues = [];
const check = (condition, code, message, details = {}) => { if (!condition) issues.push({ code, message, ...details }); };
try { validateSchemaValue(validateClosedSchema(schema), output, "coverageProposal.161"); }
catch (error) { issues.push({ code: "closed-schema", message: error.message }); }
check(output.schemaVersion === "3.8.4-full-coverage-proposal-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "coverage-proposer", "identity", "coverage proposal identity invalid");
check(!containsScoreField(output), "score-prohibition", "coverage proposal contains a score field");
check(output.seedDecisions.length === packet.seedMoves.length && output.additions.length >= 1 && output.additions.length <= 24, "count", "coverage proposal count invalid");
check(canonicalJson(output.seedDecisions.map((item) => item.seedMoveId)) === canonicalJson(packet.seedMoves.map((item) => item.moveId)), "seed-order", "seed decisions do not preserve packet order");
check(canonicalJson(output.bridgeCoverage.map((item) => item.bridgeId)) === canonicalJson(packet.acceptedBridgeIds), "bridge-order", "bridge coverage does not preserve packet order");
check(canonicalJson(output.materialConcessionAudit.map((item) => item.side)) === canonicalJson(["pro", "con"]), "concession-order", "concession audit order invalid");
const selectedRefs = [...output.seedDecisions.filter((item) => item.decision === "retain").map((item) => item.seedMoveId), ...output.additions.map((item) => item.localRef)];
const validRefs = new Set(selectedRefs);
check(validRefs.size === selectedRefs.length, "selected-ref-unique", "selected move references are not unique");
check(selectedRefs.length <= 28, "selected-count", "final selected move count exceeds 28", { observed: selectedRefs.length });
const validateMoveSemantics = (move, ref) => {
  check(typeof move.rationale === "string" && move.rationale.trim().length >= 70, "rationale-length", "move rationale too short", { ref });
  check(Array.isArray(move.respondsToRefs) && move.respondsToRefs.length <= 6 && new Set(move.respondsToRefs).size === move.respondsToRefs.length, "response-refs", "response references invalid", { ref });
  for (const responseRef of move.respondsToRefs ?? []) check(validRefs.has(responseRef), "response-ref-selected", "response target is not selected", { ref, responseRef });
  check(move.moveKind === "constructive" ? move.respondsToRefs.length === 0 : move.respondsToRefs.length >= 1, "move-kind-response", "move kind and response targets disagree", { ref });
  check(move.selectionRole !== "load-bearing-constructive" || move.moveKind === "constructive", "role-kind", "load-bearing role requires constructive kind", { ref });
  check(move.selectionRole !== "major-direct-reply" || move.moveKind === "reply", "role-kind", "major reply role requires reply kind", { ref });
  check(move.selectionRole !== "material-concession" || move.moveKind === "concession", "role-kind", "concession role requires concession kind", { ref });
  check(move.moveKind !== "concession" || move.selectionRole === "material-concession", "kind-role", "concession kind requires concession role", { ref });
  check(!(move.respondsToRefs ?? []).includes(ref), "self-reference", "move responds to itself", { ref });
};
for (const decision of output.seedDecisions) {
  if (decision.decision === "exclude") check(decision.selectionRole === "contextual-only" && decision.moveKind === "constructive" && decision.respondsToRefs.length === 0 && decision.rationale.trim().length >= 70, "excluded-seed-semantics", "excluded seed semantics invalid", { ref: decision.seedMoveId });
  else validateMoveSemantics(decision, decision.seedMoveId);
}
const sourceSpans = new Set(packet.seedMoves.map((move) => `${move.sourceSpan.startEvent}:${move.sourceSpan.endEvent}`));
let previousStart = -1;
for (let index = 0; index < output.additions.length; index += 1) {
  const move = output.additions[index];
  const ref = move.localRef;
  check(ref === additionRef(index), "addition-order", "addition local reference is not sequential", { ref, expected: additionRef(index) });
  check(move.selectionRole !== "contextual-only", "addition-role", "contextual-only addition prohibited", { ref });
  const rangeValid = move.startEvent >= 0 && move.endEvent < events.length && move.startEvent <= move.endEvent;
  check(rangeValid, "event-range", "addition event range invalid", { ref, startEvent: move.startEvent, endEvent: move.endEvent });
  check(move.startEvent >= previousStart, "chronological-order", "additions not ordered by start event", { ref, previousStart, startEvent: move.startEvent });
  previousStart = move.startEvent;
  const spanKey = `${move.startEvent}:${move.endEvent}`;
  check(!sourceSpans.has(spanKey), "duplicate-span", "source span duplicates seed or earlier addition", { ref, spanKey });
  sourceSpans.add(spanKey);
  if (rangeValid) {
    const wordCount = normalizeWords(eventExcerpt(events, move.startEvent, move.endEvent)).length;
    const startMs = events[move.startEvent].startMs;
    const endMs = events[move.endEvent].startMs + events[move.endEvent].durationMs;
    check(wordCount >= 20 && wordCount <= 220, "span-word-count", "atomic source span must contain 20-220 normalized words", { ref, observed: wordCount, startEvent: move.startEvent, endEvent: move.endEvent });
    check(endMs > startMs && endMs - startMs <= 150000, "span-duration", "source span must be 150 seconds or less", { ref, observedMs: endMs - startMs });
  }
  check(packet.sides[move.side].speakers.includes(move.speaker), "speaker-side", "addition speaker-side mismatch", { ref });
  validateMoveSemantics(move, ref);
}
const sideForRef = new Map(packet.seedMoves.map((move) => [move.moveId, move.side]));
for (const move of output.additions) sideForRef.set(move.localRef, move.side);
for (const side of ["pro", "con"]) {
  const sideRefs = selectedRefs.filter((ref) => sideForRef.get(ref) === side);
  const selectedMoves = [...output.seedDecisions.filter((item) => item.decision === "retain" && sideForRef.get(item.seedMoveId) === side), ...output.additions.filter((item) => item.side === side)];
  check(sideRefs.length >= 4, "side-count", "side has fewer than four selected moves", { side, observed: sideRefs.length });
  check(selectedMoves.some((move) => move.selectionRole === "load-bearing-constructive"), "side-constructive", "side lacks load-bearing constructive", { side });
  check(selectedMoves.some((move) => move.selectionRole === "major-direct-reply"), "side-reply", "side lacks major direct reply", { side });
}
for (const coverage of output.bridgeCoverage) {
  check(new Set(coverage.moveRefs).size === coverage.moveRefs.length, "bridge-ref-unique", "bridge references duplicate move", { bridgeId: coverage.bridgeId });
  for (const ref of coverage.moveRefs) check(validRefs.has(ref), "bridge-ref-selected", "bridge references nonselected move", { bridgeId: coverage.bridgeId, ref });
  const route = packet.routes.find((item) => item.bridges.some((bridge) => bridge.bridgeId === coverage.bridgeId));
  const bridgeSide = route?.side;
  if (coverage.status === "represented") {
    check(coverage.moveRefs.length >= 1 && coverage.omission === null, "bridge-represented-shape", "represented bridge shape invalid", { bridgeId: coverage.bridgeId });
    check(coverage.moveRefs.some((ref) => sideForRef.get(ref) === bridgeSide), "bridge-side", "represented bridge lacks route-side move", { bridgeId: coverage.bridgeId });
  } else {
    check(coverage.moveRefs.length === 0 && coverage.omission !== null, "bridge-omission-shape", "omission bridge shape invalid", { bridgeId: coverage.bridgeId });
    if (coverage.omission) check(coverage.omission.side === bridgeSide && packet.sides[bridgeSide].speakers.includes(coverage.omission.speaker) && coverage.omission.opportunityStartEvent >= 0 && coverage.omission.opportunityEndEvent < events.length && coverage.omission.opportunityStartEvent <= coverage.omission.opportunityEndEvent, "bridge-omission-content", "omission content invalid", { bridgeId: coverage.bridgeId });
  }
}
const roleByRef = new Map([...output.seedDecisions.filter((item) => item.decision === "retain").map((item) => [item.seedMoveId, item.selectionRole]), ...output.additions.map((item) => [item.localRef, item.selectionRole])]);
for (const audit of output.materialConcessionAudit) {
  check(new Set(audit.moveRefs).size === audit.moveRefs.length, "concession-ref-unique", "duplicate concession refs", { side: audit.side });
  for (const ref of audit.moveRefs) check(validRefs.has(ref) && sideForRef.get(ref) === audit.side, "concession-ref-side", "concession ref invalid", { side: audit.side, ref });
  check(audit.status === "none-found" ? audit.moveRefs.length === 0 : audit.moveRefs.length >= 1 && audit.moveRefs.every((ref) => roleByRef.get(ref) === "material-concession"), "concession-shape", "concession audit shape invalid", { side: audit.side });
}
check(output.audit.fullTranscriptReviewed && output.audit.seedInventoryTreatedAsIncomplete && output.audit.legacyAssessmentUnavailable && output.audit.scoresAndAssessmentProseAbsent && output.audit.coverageClaim === "complete-proposal-pending-independent-review", "audit-affirmations", "coverage audit affirmations invalid");
const artifact = {
  schemaVersion: "3.8.7-exhaustive-coverage-preflight",
  sourceRawOutput: rawPath,
  debateNumber: output.debateNumber,
  auditMode: "collect-all-no-fail-fast",
  additionCount: output.additions.length,
  selectedMoveCount: selectedRefs.length,
  issueCount: issues.length,
  issueCountsByCode: Object.fromEntries([...new Set(issues.map((item) => item.code))].sort().map((code) => [code, issues.filter((item) => item.code === code).length])),
  issues,
  passed: issues.length === 0
};
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", output: outputPath, additionCount: artifact.additionCount, selectedMoveCount: artifact.selectedMoveCount, issueCount: artifact.issueCount, issueCountsByCode: artifact.issueCountsByCode, issueRefs: issues.map((item) => item.ref).filter(Boolean), passed: artifact.passed }, null, 2));
