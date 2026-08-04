#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_COVERAGE_ROOT,
  additionMoveId,
  additionRef,
  coveragePhaseLockPaths,
  enrichCoverageProposal,
  validateCoverageProposalRaw,
  validateEnrichedCoverageProposal
} from "./lib/v384-coverage-preparation.mjs";
import { normalizeWords } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [packet, schema, events] = await Promise.all([
  readJson(`${V384_COVERAGE_ROOT}/proposal/packets/debate-103.json`),
  readJson(`${V384_COVERAGE_ROOT}/proposal/schemas/debate-103.schema.json`),
  readJson(".assessment-cache/captions/g1TlLCSn_5o/events.json")
]);

const selectedSeedIds = packet.seedMoves.map((move) => move.moveId);
const seedsBySide = Object.fromEntries(["pro", "con"].map((side) => [side, packet.seedMoves.filter((move) => move.side === side).map((move) => move.moveId)]));
const decisionRole = new Map([
  [seedsBySide.pro[0], ["load-bearing-constructive", "constructive", []]],
  [seedsBySide.pro[1], ["load-bearing-constructive", "constructive", []]],
  [seedsBySide.pro[2], ["major-direct-reply", "reply", [seedsBySide.con[0]]]],
  [seedsBySide.pro[3], ["major-direct-reply", "reply", [seedsBySide.con[1]]]],
  [seedsBySide.con[0], ["load-bearing-constructive", "constructive", []]],
  [seedsBySide.con[1], ["load-bearing-constructive", "constructive", []]],
  [seedsBySide.con[2], ["major-direct-reply", "reply", [seedsBySide.pro[0]]]],
  [seedsBySide.con[3], ["major-direct-reply", "reply", [seedsBySide.pro[1]]]]
]);

function spanAt(startEvent) {
  let endEvent = startEvent;
  while (endEvent < events.length - 1) {
    const text = events.slice(startEvent, endEvent + 1).map((item) => item.text).join(" ");
    if (normalizeWords(text).length >= 28) break;
    endEvent += 1;
  }
  return { startEvent, endEvent };
}

const additionSpans = [35, 610, 1040].map(spanAt);
const additions = additionSpans.map((span, index) => {
  const side = index % 2 === 0 ? "pro" : "con";
  return {
    localRef: additionRef(index),
    ...span,
    speaker: packet.sides[side].speakers[0],
    side,
    proposition: `Synthetic coverage addition ${index + 1} identifies a source-grounded proposition solely for deterministic lifecycle validation.`,
    attributionConfidence: index === 1 ? "medium" : "high",
    attributionBasis: "The synthetic attribution basis is long enough to test the closed full-coverage proposal contract without making a debate judgment.",
    selectionRole: "load-bearing-constructive",
    moveKind: "constructive",
    respondsToRefs: [],
    rationale: "This synthetic addition exists only to validate source-span derivation, packet-local references, side coverage, and deterministic stable identifiers."
  };
});

const raw = {
  schemaVersion: "3.8.4-full-coverage-proposal-output",
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "coverage-proposer",
  seedDecisions: packet.seedMoves.map((move) => {
    const [selectionRole, moveKind, respondsToRefs] = decisionRole.get(move.moveId);
    return {
      seedMoveId: move.moveId,
      decision: "retain",
      selectionRole,
      moveKind,
      respondsToRefs,
      rationale: "The synthetic retained-seed decision exists only to validate ordered identities, role constraints, selected response references, and coverage mechanics."
    };
  }),
  additions,
  bridgeCoverage: packet.routes.flatMap((route) => route.bridges.map((bridge) => ({
    bridgeId: bridge.bridgeId,
    status: "represented",
    moveRefs: [seedsBySide[route.side][0]],
    omission: null,
    rationale: "The synthetic represented-bridge record exists only to validate exact route order, selected reference integrity, route-side representation, and null omission behavior."
  }))),
  materialConcessionAudit: ["pro", "con"].map((side) => ({
    side,
    status: "none-found",
    moveRefs: [],
    rationale: "The synthetic no-concession record exists only to validate the required full-transcript audit branch without claiming a substantive debate conclusion."
  })),
  audit: {
    fullTranscriptReviewed: true,
    seedInventoryTreatedAsIncomplete: true,
    legacyAssessmentUnavailable: true,
    scoresAndAssessmentProseAbsent: true,
    coverageClaim: "complete-proposal-pending-independent-review"
  }
};

validateCoverageProposalRaw(raw, packet, schema, events);
const enriched = validateEnrichedCoverageProposal(enrichCoverageProposal(raw, packet, events), packet, events);

function rejected(mutator) {
  const candidate = structuredClone(raw);
  mutator(candidate);
  try {
    validateCoverageProposalRaw(candidate, packet, schema, events);
    return false;
  } catch {
    return true;
  }
}

const negativeChecks = {
  additionalPropertyRejected: rejected((candidate) => { candidate.seedDecisions[0].importance = 3; }),
  emptyRepresentedBridgeRejected: rejected((candidate) => { candidate.bridgeCoverage[0].moveRefs = []; }),
  replyWithoutTargetRejected: rejected((candidate) => { candidate.seedDecisions.find((item) => item.selectionRole === "major-direct-reply").respondsToRefs = []; }),
  duplicateAdditionSpanRejected: rejected((candidate) => { candidate.additions[1].startEvent = candidate.additions[0].startEvent; candidate.additions[1].endEvent = candidate.additions[0].endEvent; }),
  nonsequentialAdditionRefRejected: rejected((candidate) => { candidate.additions[1].localRef = "addition-03"; }),
  contextualAdditionRejected: rejected((candidate) => { candidate.additions[0].selectionRole = "contextual-only"; }),
  incompleteAuditRejected: rejected((candidate) => { candidate.audit.fullTranscriptReviewed = false; })
};

const futureRaw = `${V384_COVERAGE_ROOT}/proposal/raw-outputs/debate-103.json`;
const futureEnriched = `${V384_COVERAGE_ROOT}/proposal/enriched-outputs/debate-103.json`;
const lockPaths = coveragePhaseLockPaths([{
  packet: `${V384_COVERAGE_ROOT}/proposal/packets/debate-103.json`,
  schema: `${V384_COVERAGE_ROOT}/proposal/schemas/debate-103.schema.json`,
  transcript: packet.transcript.path,
  events: packet.events.path,
  rawOutput: futureRaw,
  enrichedOutput: futureEnriched
}], ["docs/assessment-workflow-v3.8.4.md"]);
const futureOutputsExcluded = !lockPaths.includes(futureRaw) && !lockPaths.includes(futureEnriched);

const timeoutTerminationVerified = await new Promise((resolve) => {
  const child = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore" });
  const timer = setTimeout(() => child.kill("SIGTERM"), 50);
  child.on("close", (_code, signal) => { clearTimeout(timer); resolve(signal === "SIGTERM"); });
});

const canonicalHash = createHash("sha256").update(JSON.stringify(enriched)).digest("hex");
const expectedAdditionIds = additions.map((_item, index) => additionMoveId(packet.debateId, index));
const fixture = {
  schemaVersion: "3.8.4-full-coverage-proposal-dry-fixture",
  status: "passed",
  modelContextsExecuted: 0,
  debateNumber: packet.debateNumber,
  validSeedDecisions: raw.seedDecisions.length,
  validAdditions: raw.additions.length,
  selectedMoves: enriched.inventorySummary.selectedMoveCount,
  acceptedBridgeRecords: raw.bridgeCoverage.length,
  materialConcessionAudits: raw.materialConcessionAudit.length,
  deterministicAdditionIds: enriched.additions.map((move) => move.moveId),
  expectedAdditionIds,
  exactSourceDerivations: enriched.additions.filter((move) => move.atomicExcerpt.length > 0 && move.contextWindow.includes(move.atomicExcerpt)).length,
  mediumConfidenceAudioTriggers: enriched.inventorySummary.mediumOrLowAdditionCount,
  scoreFieldsEmitted: 0,
  legacyAssessmentFieldsEmitted: 0,
  negativeChecks,
  futureOutputsExcludedFromPhaseLock: futureOutputsExcluded,
  timeoutTerminationVerified,
  deterministicArtifactSha256: canonicalHash
};
fixture.passed =
  Object.values(negativeChecks).every(Boolean) &&
  fixture.validSeedDecisions === 8 &&
  fixture.validAdditions === 3 &&
  fixture.acceptedBridgeRecords === 10 &&
  fixture.materialConcessionAudits === 2 &&
  fixture.deterministicAdditionIds.join("|") === expectedAdditionIds.join("|") &&
  fixture.exactSourceDerivations === fixture.validAdditions &&
  fixture.mediumConfidenceAudioTriggers === 1 &&
  fixture.futureOutputsExcludedFromPhaseLock &&
  fixture.timeoutTerminationVerified;
fixture.status = fixture.passed ? "passed" : "failed";
if (!fixture.passed) throw new Error("v3.8.4 full-coverage proposal dry fixture failed");
if (shouldWrite) {
  await mkdir(path.resolve(root, V384_COVERAGE_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V384_COVERAGE_ROOT}/proposal-dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
