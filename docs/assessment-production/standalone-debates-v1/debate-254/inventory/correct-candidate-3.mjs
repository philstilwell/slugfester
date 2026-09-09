import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const basePath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/candidate-2.json";
const outputPath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/candidate-3.json";
const correctionPath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/correction-2.json";
const eventsPath = ".assessment-cache/captions/gcszn0DvFlM/events.json";
const inventory = JSON.parse(readFileSync(basePath, "utf8"));
const events = JSON.parse(readFileSync(eventsPath, "utf8"));
const sha256 = value => createHash("sha256").update(value).digest("hex");
const exactSpan = (startEvent, endEvent) => ({
  startEvent,
  endEvent,
  startMs: events[startEvent].startMs,
  endMs: events[endEvent].startMs + events[endEvent].durationMs,
  excerpt: events.slice(startEvent, endEvent + 1).map(event => event.text).join(" ").replace(/\s+/g, " ").trim()
});

const newMove = {
  moveId: "m22",
  sectionId: "new-testament-and-cases",
  speaker: "Joshua Bowen",
  side: "con",
  moveKind: "reply",
  importance: 2,
  burdenContact: { bridgeId: "con-nt-silence", tier: "central" },
  sourceSpan: exactSpan(3002, 3029),
  attributionConfidence: "medium",
  attributionBasis: "Caption sequence and the moderator's preceding handoff support Joshua Bowen as the speaker; required audio confirmation has not yet occurred.",
  quoteEligibleExactSpans: [],
  proposition: "Jesus's Luke 17 slave illustration presupposes continued compulsory service and therefore undercuts a claimed New Testament condemnation of slavery.",
  respondsToIds: ["m19"],
  adoptsMoveIds: [],
  inferenceGroupId: "nt-noncondemnation",
  incrementalContribution: "Adds Luke 17 as a distinct textual premise supporting the m09 inference as most recently extended by m18 that the New Testament does not condemn slavery.",
  extendsMoveIds: ["m18"],
  repeatedInferenceOnly: false
};

const insertionIndex = inventory.moves.findIndex(move => move.moveId === "m20");
inventory.moves.splice(insertionIndex, 0, newMove);

const bowenCoverage = inventory.speakerCoverage.find(record => record.speaker === "Joshua Bowen");
bowenCoverage.substantiveOpportunityCount += 1;
bowenCoverage.selectedMoveIds = inventory.moves.filter(move => move.speaker === "Joshua Bowen").map(move => move.moveId);

const bowenAlignment = inventory.formatFitness.sectionAlignments.find(record =>
  record.sectionId === "new-testament-and-cases" && record.speaker === "Joshua Bowen"
);
bowenAlignment.selectedMoveIds = inventory.moves
  .filter(move => move.sectionId === "new-testament-and-cases" && move.speaker === "Joshua Bowen")
  .map(move => move.moveId);

inventory.selectionBalanceAudit.totalBySide = {
  pro: inventory.moves.filter(move => move.side === "pro").length,
  con: inventory.moves.filter(move => move.side === "con").length
};
inventory.selectionBalanceAudit.sections = inventory.sections.map(section => ({
  sectionId: section.sectionId,
  pro: inventory.moves.filter(move => move.sectionId === section.sectionId && move.side === "pro").length,
  con: inventory.moves.filter(move => move.sectionId === section.sectionId && move.side === "con").length
}));
inventory.selectionBalanceAudit.asymmetryRationale = "The negative has four more selected moves because Joshua Bowen contributes distinct specialist analyses of definition, comparative law, lexical context, specific statutes, and the later Luke 17 textual premise. The Luke 17 move is retained as an incremental contribution linked to m09 rather than discarded to preserve counts; artificial parity would suppress load-bearing source material or duplicate the affirmative's recurring canonical-trajectory inference.";

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
writeFileSync(outputPath, serialized);
const correctedHash = sha256(serialized);
const correction = {
  schemaVersion: "1.0-standalone-team-inventory-targeted-correction",
  protocolId: "assessment-production-multi-speaker-approximation-v1",
  debateNumber: inventory.debateNumber,
  debateId: inventory.debateId,
  correctionCycle: 2,
  authorization: {
    path: "docs/assessment-production/standalone-debates-v1/debate-254/recovery-authorization-2.json",
    findingId: "audit-254-f03"
  },
  status: "complete-pending-independent-reaudit",
  sourceInventory: { path: basePath, sha256: sha256(readFileSync(basePath)) },
  correctedInventory: { path: outputPath, sha256: correctedHash },
  resolution: "Selected Joshua Bowen's events 3002-3029 as m22 because Luke 17 is a distinct textual premise reaching m09's earlier New Testament non-condemnation inference. Because m18 is the latest retained extension of that inference group, m22 extends m18 while explicitly identifying its relationship to m09. The move earns credit only for the new Luke 17 premise, remains attributed at medium confidence, and awaits audio confirmation.",
  changedFieldPaths: [
    "moves (inserted moveId=m22 before moveId=m20)",
    "speakerCoverage[speaker=Joshua Bowen].substantiveOpportunityCount",
    "speakerCoverage[speaker=Joshua Bowen].selectedMoveIds",
    "formatFitness.sectionAlignments[sectionId=new-testament-and-cases,speaker=Joshua Bowen].selectedMoveIds",
    "selectionBalanceAudit.totalBySide.con",
    "selectionBalanceAudit.sections[sectionId=new-testament-and-cases].con",
    "selectionBalanceAudit.asymmetryRationale"
  ],
  unchangedDecisionStatement: "All candidate-2 fields not listed in changedFieldPaths remain byte-equivalent as parsed JSON values; no unrelated move, span, quotation candidate, repetition record, section, route, identity, or source-scope decision changed.",
  audioAssertions: {
    audioReviewed: false,
    audioConfirmedMoves: [],
    note: "This is a caption/event-index source correction only."
  }
};
writeFileSync(correctionPath, `${JSON.stringify(correction, null, 2)}\n`);
