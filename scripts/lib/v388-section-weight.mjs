import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V388_SECTION_ROOT = "docs/calibration/v3.8.8/section-weight-consensus";
export const V388_SECTION_DEBATES = ["55", "103", "161"];
export const sectionId = (index) => `section-${String(index + 1).padStart(2, "0")}`;
const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const boolean = (extra = {}) => ({ type: "boolean", ...extra });
const array = (items, extra = {}) => ({ type: "array", items, ...extra });
const closedObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export function makeSectionPacket(debate) {
  const acceptedBridgeIds = debate.bridgeCoverage.filter((bridge) => bridge.status === "represented").map((bridge) => bridge.bridgeId);
  assert(debate.moves.length >= 8 && debate.bridgeCoverage.length === acceptedBridgeIds.length, `${debate.debateNumber}: final coverage inventory invalid`);
  return {
    schemaVersion: "3.8.8-section-weight-planning-packet",
    protocolId: "v3.8.8-score-blind-section-weight-consensus",
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    motion: debate.motion,
    sides: debate.sides,
    routes: debate.routes,
    moves: debate.moves.map((move) => ({ moveId: move.moveId, sourceSpan: move.sourceSpan, atomicExcerpt: move.atomicExcerpt, speaker: move.speaker, side: move.side, proposition: move.proposition, selectionRole: move.selectionRole, moveKind: move.moveKind, respondsToRefs: move.respondsToRefs })),
    bridgeCoverage: debate.bridgeCoverage.map((bridge) => ({ bridgeId: bridge.bridgeId, routeId: bridge.routeId, side: bridge.side, tier: bridge.tier, description: bridge.description, status: bridge.status, moveRefs: bridge.moveRefs })),
    acceptedBridgeIds,
    constraints: { sectionsMinimum: 4, sectionsMaximum: 7, everyMoveAssignedExactlyOnce: true, everySectionContainsBothSides: true, sectionWeightsPositiveIntegersTotaling: 100, moveImportanceMinimum: 1, moveImportanceMaximum: 3, everyBridgeMapped: true, scoreBlind: true },
    prohibitedOutputs: ["burden-contact tuple", "response quality", "dimension judgments", "participant scores", "section totals", "overall totals", "winner", "burden adjustment", "assessment prose", "Overall Commentary", "AI Extension"]
  };
}

export function makeSectionSchema(packet) {
  const moveIds = packet.moves.map((move) => move.moveId);
  const possibleSectionIds = Array.from({ length: 7 }, (_value, index) => sectionId(index));
  const bridgeIds = packet.acceptedBridgeIds;
  const assignment = closedObject({ moveId: string({ enum: moveIds }), importance: integer({ minimum: 1, maximum: 3 }), rationale: string({ minLength: 60 }) });
  const section = closedObject({ sectionId: string({ enum: possibleSectionIds }), title: string({ minLength: 5, maxLength: 70 }), rationale: string({ minLength: 80 }), weight: integer({ minimum: 1, maximum: 97 }), moveAssignments: array(assignment, { minItems: 2, maxItems: moveIds.length }) });
  const bridgeMapping = closedObject({ bridgeId: string({ enum: bridgeIds }), sectionIds: array(string({ enum: possibleSectionIds }), { minItems: 1, maxItems: 7 }), moveRefs: array(string({ enum: moveIds }), { minItems: 1, maxItems: moveIds.length }), rationale: string({ minLength: 80 }) });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v388-section-weight-plan-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: "3.8.8-section-weight-plan-output" }),
      debateNumber: string({ const: packet.debateNumber }),
      debateId: string({ const: packet.debateId }),
      plannerRole: string({ const: "section-weight-planner" }),
      sections: array(section, { minItems: 4, maxItems: 7 }),
      bridgeMappings: array(bridgeMapping, { minItems: bridgeIds.length, maxItems: bridgeIds.length }),
      audit: closedObject({ everyMoveAssignedExactlyOnce: boolean({ const: true }), everySectionContainsBothSides: boolean({ const: true }), sectionWeightsTotal100: boolean({ const: true }), everyBridgeMapped: boolean({ const: true }), scoreJudgmentsAbsent: boolean({ const: true }), coverageClaim: string({ const: "complete-score-blind-section-and-weight-plan" }) })
    })
  };
}

export function validateSectionPlan(plan, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema), plan, `sectionPlan.${packet.debateNumber}`);
  assert(plan.schemaVersion === "3.8.8-section-weight-plan-output" && plan.debateNumber === packet.debateNumber && plan.debateId === packet.debateId && plan.plannerRole === "section-weight-planner", "section plan identity invalid");
  assert(!containsScoreField(plan), "section plan contains score field");
  assert(canonicalJson(plan.sections.map((section, index) => section.sectionId)) === canonicalJson(plan.sections.map((_section, index) => sectionId(index))), "section IDs must be sequential");
  assert(plan.sections.reduce((sum, section) => sum + section.weight, 0) === 100, "section weights must total 100");
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const assigned = plan.sections.flatMap((section) => section.moveAssignments.map((item) => item.moveId));
  assert(assigned.length === packet.moves.length && new Set(assigned).size === assigned.length && canonicalJson([...assigned].sort()) === canonicalJson(packet.moves.map((move) => move.moveId).sort()), "move assignment must be exact and unique");
  const sectionForMove = new Map();
  let previousEarliest = -1;
  for (const section of plan.sections) {
    const starts = section.moveAssignments.map((item) => moveById.get(item.moveId).sourceSpan.startEvent);
    const earliest = Math.min(...starts);
    assert(earliest >= previousEarliest, `${section.sectionId}: section order is not chronological`);
    previousEarliest = earliest;
    const sourceOrder = [...section.moveAssignments].sort((left, right) => moveById.get(left.moveId).sourceSpan.startEvent - moveById.get(right.moveId).sourceSpan.startEvent || left.moveId.localeCompare(right.moveId)).map((item) => item.moveId);
    assert(canonicalJson(section.moveAssignments.map((item) => item.moveId)) === canonicalJson(sourceOrder), `${section.sectionId}: moves are not chronological`);
    const sides = new Set(section.moveAssignments.map((item) => moveById.get(item.moveId).side));
    assert(sides.has("pro") && sides.has("con"), `${section.sectionId}: both sides required`);
    for (const item of section.moveAssignments) sectionForMove.set(item.moveId, section.sectionId);
  }
  assert(canonicalJson(plan.bridgeMappings.map((item) => item.bridgeId)) === canonicalJson(packet.acceptedBridgeIds), "bridge mapping order invalid");
  const bridgeById = new Map(packet.bridgeCoverage.map((item) => [item.bridgeId, item]));
  const sectionIds = new Set(plan.sections.map((section) => section.sectionId));
  for (const mapping of plan.bridgeMappings) {
    const bridge = bridgeById.get(mapping.bridgeId);
    assert(new Set(mapping.sectionIds).size === mapping.sectionIds.length && new Set(mapping.moveRefs).size === mapping.moveRefs.length, `${mapping.bridgeId}: duplicate bridge mapping ref`);
    assert(mapping.sectionIds.every((id) => sectionIds.has(id)), `${mapping.bridgeId}: unknown mapped section`);
    assert(mapping.moveRefs.every((ref) => bridge.moveRefs.includes(ref) && mapping.sectionIds.includes(sectionForMove.get(ref))), `${mapping.bridgeId}: bridge evidence is not retained in a mapped section`);
    assert(mapping.moveRefs.some((ref) => moveById.get(ref).side === bridge.side), `${mapping.bridgeId}: bridge mapping lacks same-side evidence`);
  }
  assert(plan.audit.everyMoveAssignedExactlyOnce && plan.audit.everySectionContainsBothSides && plan.audit.sectionWeightsTotal100 && plan.audit.everyBridgeMapped && plan.audit.scoreJudgmentsAbsent && plan.audit.coverageClaim === "complete-score-blind-section-and-weight-plan", "section audit invalid");
  return { sectionCount: plan.sections.length, moveCount: assigned.length, bridgeCount: plan.bridgeMappings.length, weightTotal: 100, scoreFields: 0 };
}

export function semanticSectionPlan(plan) {
  return {
    sections: plan.sections.map((section) => ({ sectionId: section.sectionId, weight: section.weight, moveAssignments: section.moveAssignments.map((item) => ({ moveId: item.moveId, importance: item.importance })) })),
    bridgeMappings: plan.bridgeMappings.map((mapping) => ({ bridgeId: mapping.bridgeId, sectionIds: [...mapping.sectionIds].sort(), moveRefs: [...mapping.moveRefs].sort() }))
  };
}

export function sectionPlansAgree(left, right) {
  return canonicalJson(semanticSectionPlan(left)) === canonicalJson(semanticSectionPlan(right));
}

export { assert, canonicalJson };
