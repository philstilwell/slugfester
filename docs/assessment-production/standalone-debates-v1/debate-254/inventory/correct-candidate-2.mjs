import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const basePath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/candidate-1.json";
const outputPath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/candidate-2.json";
const correctionPath = "docs/assessment-production/standalone-debates-v1/debate-254/inventory/correction-1.json";
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
const move = id => inventory.moves.find(item => item.moveId === id);

move("m20").sourceSpan = exactSpan(3866, 3893);
move("m21").sourceSpan = exactSpan(3896, 3901);
move("m01").quoteEligibleExactSpans = [
  "Slavery is never once God's ideal due to the sinfulness of the human heart."
];
move("m06").quoteEligibleExactSpans = [
  "These foreigners can be treated as slaves, kept as property in perpetuity"
];

inventory.excludedRepetitions = inventory.excludedRepetitions.filter(record =>
  !(record.speaker === "Matt Dillahunty" && record.startMs === 7092000) &&
  !(record.speaker === "Joshua Bowen" && record.startMs === 8939000)
);

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
writeFileSync(outputPath, serialized);
const candidate2Sha256 = sha256(serialized);
const correction = {
  schemaVersion: "1.0-standalone-team-inventory-correction",
  protocolId: "assessment-production-multi-speaker-approximation-v1",
  debateNumber: inventory.debateNumber,
  debateId: inventory.debateId,
  correctionCycle: 1,
  status: "complete-pending-independent-reaudit",
  sourceInventory: {
    path: basePath,
    sha256: sha256(readFileSync(basePath))
  },
  correctedInventory: {
    path: outputPath,
    sha256: candidate2Sha256
  },
  auditInput: {
    path: "docs/assessment-production/standalone-debates-v1/debate-254/audit/audit-1.json",
    sha256: sha256(readFileSync("docs/assessment-production/standalone-debates-v1/debate-254/audit/audit-1.json"))
  },
  changedFieldPaths: [
    "moves[moveId=m20].sourceSpan",
    "moves[moveId=m21].sourceSpan",
    "moves[moveId=m01].quoteEligibleExactSpans",
    "moves[moveId=m06].quoteEligibleExactSpans",
    "excludedRepetitions[speaker=Matt Dillahunty,startMs=7092000] (removed)",
    "excludedRepetitions[speaker=Joshua Bowen,startMs=8939000] (removed)"
  ],
  findingsResolved: [
    {
      findingId: "audit-254-f01",
      resolution: "Re-anchored m20 mechanically to events 3866-3893, the complete caption span of Cliffe Knechtle's Numbers 31 protection answer. Attribution remains medium pending audio."
    },
    {
      findingId: "audit-254-f02",
      resolution: "Re-anchored m21 mechanically to compact events 3896-3901 only. The span ends at 'They are property.' before the later multi-voice elaboration. Attribution remains medium pending audio."
    },
    {
      findingId: "audit-254-f03",
      resolution: "Removed both false interval/rationale records. A complete Q&A coverage recheck found no additional selected move required: the distinct Numbers 31 exchange is retained as corrected m20-m21; later ownership, moral-foundation, New Testament, and interpretive answers restate or illustrate already retained inferences without changing the burden structure. No teammate adoption link was inferred from side membership."
    },
    {
      findingId: "audit-254-f04",
      resolution: "Added one clean, source-exact 3-18-word quotation candidate per team in m01 and m06. Both remain candidates subject to later audio verification."
    }
  ],
  qAndACoverageCheck: {
    completeWindowReviewed: true,
    rangeMs: { startMs: 5321000, endMs: 10336000 },
    necessaryMoveChangesBeyondAuditFindings: [],
    rationale: "Q&A includes many audience prompts and repeated team explanations. Corrected m20-m21 capture the one audited distinct omitted exchange. Other team answers repeat retained ownership, permission, dignity, canonical-trajectory, comparative-law, or hermeneutic inferences; audience and moderator wording remains uncredited unless a team member advances it."
  },
  audioAssertions: {
    audioReviewed: false,
    audioConfirmedMoves: [],
    note: "This correction uses captions and event indices only; all selected-move audio confirmation remains a later gate."
  }
};
writeFileSync(correctionPath, `${JSON.stringify(correction, null, 2)}\n`);
