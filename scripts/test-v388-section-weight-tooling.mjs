#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, sectionPlansAgree, validateSectionPlan } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const reports = [];
for (const debateNumber of V388_SECTION_DEBATES) {
  const [packet, schema] = await Promise.all([readJson(`${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`), readJson(`${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`)]);
  const buckets = Array.from({ length: 4 }, () => []);
  for (const side of ["pro", "con"]) packet.moves.filter((move) => move.side === side).forEach((move, index) => buckets[index % 4].push(move));
  buckets.sort((left, right) => Math.min(...left.map((move) => move.sourceSpan.startEvent)) - Math.min(...right.map((move) => move.sourceSpan.startEvent)));
  const assignment = new Map();
  const sections = buckets.map((moves, index) => {
    const id = `section-${String(index + 1).padStart(2, "0")}`;
    moves.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.moveId.localeCompare(right.moveId));
    moves.forEach((move) => assignment.set(move.moveId, id));
    return { sectionId: id, title: `Synthetic balanced section ${index + 1}`, rationale: "This synthetic fixture groups chronological moves from both sides solely to exercise exact assignment, ordering, weighting, bridge mapping, and validation invariants.", weight: 25, moveAssignments: moves.map((move) => ({ moveId: move.moveId, importance: 2, rationale: "The synthetic fixture assigns neutral middle importance solely to validate the closed importance range and complete move coverage." })) };
  });
  const bridgeMappings = packet.bridgeCoverage.map((bridge) => { const refs = bridge.moveRefs.filter((ref) => assignment.has(ref)); return { bridgeId: bridge.bridgeId, sectionIds: [...new Set(refs.map((ref) => assignment.get(ref)))].sort(), moveRefs: refs, rationale: "The synthetic fixture retains the locked bridge evidence and maps each reference to the section containing that move solely for deterministic validation." }; });
  const plan = { schemaVersion: "3.8.8-section-weight-plan-output", debateNumber, debateId: packet.debateId, plannerRole: "section-weight-planner", sections, bridgeMappings, audit: { everyMoveAssignedExactlyOnce: true, everySectionContainsBothSides: true, sectionWeightsTotal100: true, everyBridgeMapped: true, scoreJudgmentsAbsent: true, coverageClaim: "complete-score-blind-section-and-weight-plan" } };
  const summary = validateSectionPlan(plan, packet, schema);
  if (!sectionPlansAgree(plan, structuredClone(plan))) throw new Error(`${debateNumber}: semantic plan identity failed`);
  const altered = structuredClone(plan); altered.sections[0].weight -= 1; altered.sections[1].weight += 1;
  if (sectionPlansAgree(plan, altered)) throw new Error(`${debateNumber}: semantic disagreement missed`);
  reports.push({ debateNumber, ...summary, semanticAgreementDetected: true, semanticDisagreementDetected: true });
}
const fixture = { schemaVersion: "3.8.8-section-weight-dry-fixture", status: "passed", modelContextsExecuted: 0, reports, scoreFields: 0, meteredApiCostUsd: 0 };
if (shouldWrite) { await mkdir(path.resolve(root, V388_SECTION_ROOT), { recursive: true }); await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
