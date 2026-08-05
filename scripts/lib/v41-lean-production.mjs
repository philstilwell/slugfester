import {
  V4_MODEL_RATING_KEYS,
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
  deriveV4PrimaryScores,
  evaluateV4Escalation,
  makeV4ControlSample,
  makeV4PrimarySchema,
  readJson,
  validateV4PrimaryOutput
} from "./v4-lean-production.mjs";

export const V41_LEAN_ROOT = "docs/calibration/v4.1.5/lean-retired-gate";
export const V41_LEAN_DEBATES = Object.freeze(["55", "103", "161"]);
export const V41_PROTOCOL_ID = "v4.1.5-bounded-lean-risk-triggered-consensus";
export const V41_OUTPUT_VERSION = "4.1.5-bounded-primary-output";
export const V41_PACKET_VERSION = "4.1.5-bounded-source-only-packet";
export const V41_MODEL = Object.freeze({ label: "5.6 Sol", slug: "gpt-5.6-sol", primaryReasoningEffort: "low", reviewReasoningEffort: "high" });
export const V41_MOVE_MINIMUM = 8;
export const V41_MOVE_MAXIMUM = 24;

export { V4_MODEL_RATING_KEYS, assertV4, canonicalJson, containsProhibitedCalculatedField, makeV4ControlSample, readJson };

const clone = (value) => structuredClone(value);

function bridgeSchema(base, tier) {
  const schema = clone(base);
  schema.properties.tier = { type: "string", const: tier };
  return schema;
}

export function makeV41PrimarySchema() {
  const base = makeV4PrimarySchema();
  const move = clone(base.properties.moves.items);
  move.required = move.required.filter((key) => !["sectionId", "side"].includes(key));
  delete move.properties.sectionId;
  delete move.properties.side;

  const originalBridge = base.properties.routes.items.properties.bridges.items;
  const route = clone(base.properties.routes.items);
  route.required = ["routeId", "side", "description", "successCriteria", "motionBridge", "centralBridges", "subsidiaryBridges"];
  delete route.properties.bridges;
  route.properties.motionBridge = bridgeSchema(originalBridge, "motion");
  route.properties.centralBridges = { type: "array", minItems: 1, maxItems: 4, items: bridgeSchema(originalBridge, "central") };
  route.properties.subsidiaryBridges = { type: "array", minItems: 1, maxItems: 2, items: bridgeSchema(originalBridge, "subsidiary") };

  const section = clone(base.properties.sections.items);
  section.required = [...section.required, "proMoves", "conMoves"];
  section.properties.proMoves = { type: "array", minItems: 1, maxItems: 2, items: move };
  section.properties.conMoves = { type: "array", minItems: 1, maxItems: 2, items: move };

  base.$id = "slugfester-v415-bounded-lean-primary-judgment";
  base.title = "Slugfester v4.1.5 bounded lean primary judgment";
  base.required = base.required.filter((key) => key !== "moves");
  delete base.properties.moves;
  base.properties.schemaVersion.const = V41_OUTPUT_VERSION;
  base.properties.protocolId.const = V41_PROTOCOL_ID;
  base.properties.routes.items = route;
  base.properties.sections = { type: "array", minItems: 4, maxItems: 6, items: section };
  return base;
}

function flattenRoute(route) {
  return {
    routeId: route.routeId,
    side: route.side,
    description: route.description,
    successCriteria: route.successCriteria,
    bridges: [route.motionBridge, ...route.centralBridges, ...route.subsidiaryBridges]
  };
}

export function normalizeV41Primary(output) {
  const moves = output.sections.flatMap((section) => [
    ...section.proMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "pro" })),
    ...section.conMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "con" }))
  ]).sort((a, b) => a.sourceSpan.startEvent - b.sourceSpan.startEvent || a.sourceSpan.endEvent - b.sourceSpan.endEvent || a.moveId.localeCompare(b.moveId));
  return {
    ...output,
    schemaVersion: "4.0.1-lean-primary-output",
    protocolId: "v4.0.1-lean-risk-triggered-consensus",
    routes: output.routes.map(flattenRoute),
    sections: output.sections.map(({ proMoves, conMoves, ...section }) => section),
    moves
  };
}

export function convertV4ReferenceToV41(reference) {
  const { moves: referenceMoves, ...referenceWithoutMoves } = reference;
  return {
    ...referenceWithoutMoves,
    schemaVersion: V41_OUTPUT_VERSION,
    protocolId: V41_PROTOCOL_ID,
    routes: reference.routes.map(({ bridges, ...route }) => ({
      ...route,
      motionBridge: bridges.find((bridge) => bridge.tier === "motion"),
      centralBridges: bridges.filter((bridge) => bridge.tier === "central"),
      subsidiaryBridges: bridges.filter((bridge) => bridge.tier === "subsidiary")
    })),
    sections: reference.sections.map((section) => ({
      ...section,
      proMoves: referenceMoves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").map(({ sectionId, side, ...move }) => move),
      conMoves: referenceMoves.filter((move) => move.sectionId === section.sectionId && move.side === "con").map(({ sectionId, side, ...move }) => move)
    }))
  };
}

function validateV41Shape(output) {
  const schema = makeV41PrimarySchema();
  assertV4(output && typeof output === "object" && !Array.isArray(output), "output: expected object");
  assertV4(canonicalJson(Object.keys(output).sort()) === canonicalJson(schema.required.sort()), "output keys do not match v4.1 schema");
  assertV4(output.schemaVersion === V41_OUTPUT_VERSION && output.protocolId === V41_PROTOCOL_ID, "v4.1 protocol identity mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "primary output contains a prohibited calculated field");
  assertV4(Array.isArray(output.routes) && output.routes.length === 2, "exactly two v4.1 routes required");
  assertV4(canonicalJson(output.routes.map((route) => route.side).sort()) === canonicalJson(["con", "pro"]), "one route per side required");
  for (const [index, route] of output.routes.entries()) {
    assertV4(route.motionBridge?.tier === "motion", `routes[${index}]: motion bridge missing`);
    assertV4(Array.isArray(route.centralBridges) && route.centralBridges.length >= 1 && route.centralBridges.length <= 4 && route.centralBridges.every((bridge) => bridge.tier === "central"), `routes[${index}]: central bridges invalid`);
    assertV4(Array.isArray(route.subsidiaryBridges) && route.subsidiaryBridges.length >= 1 && route.subsidiaryBridges.length <= 2 && route.subsidiaryBridges.every((bridge) => bridge.tier === "subsidiary"), `routes[${index}]: subsidiary bridges invalid`);
  }
  assertV4(Array.isArray(output.sections) && output.sections.length >= 4 && output.sections.length <= 6, "section count outside 4..6");
  const nestedMoves = [];
  for (const [index, section] of output.sections.entries()) {
    for (const side of ["pro", "con"]) {
      const key = `${side}Moves`;
      assertV4(Array.isArray(section[key]) && section[key].length >= 1 && section[key].length <= 2, `sections[${index}].${key}: requires one or two moves`);
      nestedMoves.push(...section[key]);
    }
  }
  assertV4(nestedMoves.length >= V41_MOVE_MINIMUM && nestedMoves.length <= V41_MOVE_MAXIMUM, `move count outside ${V41_MOVE_MINIMUM}..${V41_MOVE_MAXIMUM}`);
}

export function validateV41PrimaryOutput(output, packet) {
  validateV41Shape(output);
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
  const normalizedPacket = { ...packet, schemaVersion: "4.0.1-lean-source-only-packet", protocolId: "v4.0.1-lean-risk-triggered-consensus" };
  const normalized = normalizeV41Primary(output);
  const validation = validateV4PrimaryOutput(normalized, normalizedPacket, { additionalAdjustmentBurdenIds: output.routes.map((route) => route.routeId) });
  return { ...validation, schemaVersion: V41_OUTPUT_VERSION, protocolId: V41_PROTOCOL_ID, boundedMoves: normalized.moves.length };
}

export function deriveV41PrimaryScores(output) {
  const scores = deriveV4PrimaryScores(normalizeV41Primary(output));
  return { ...scores, protocolId: V41_PROTOCOL_ID };
}

export function evaluateV41Escalation({ primary, ...rest }) {
  return evaluateV4Escalation({ primary: normalizeV41Primary(primary), ...rest });
}

export function projectV41ComputeHours({
  debateCount = 195,
  primaryMinutesPerDebate = 5.5,
  finalizationMinutesPerDebate = 4.25,
  escalationRate = 0.15,
  passBMinutesPerEscalatedDebate = 8,
  adjudicationShareOfEscalations = 0.5,
  adjudicationMinutesPerAdjudicatedDebate = 5.6,
  fixedAudioQaRenderingHours = 5
} = {}) {
  const primary = debateCount * primaryMinutesPerDebate / 60;
  const finalization = debateCount * finalizationMinutesPerDebate / 60;
  const passB = debateCount * escalationRate * passBMinutesPerEscalatedDebate / 60;
  const adjudication = debateCount * escalationRate * adjudicationShareOfEscalations * adjudicationMinutesPerAdjudicatedDebate / 60;
  const total = primary + finalization + passB + adjudication + fixedAudioQaRenderingHours;
  return {
    inputs: { debateCount, primaryMinutesPerDebate, finalizationMinutesPerDebate, escalationRate, passBMinutesPerEscalatedDebate, adjudicationShareOfEscalations, adjudicationMinutesPerAdjudicatedDebate, fixedAudioQaRenderingHours },
    hours: { primary: Number(primary.toFixed(2)), finalization: Number(finalization.toFixed(2)), passB: Number(passB.toFixed(2)), adjudication: Number(adjudication.toFixed(2)), audioQaRendering: fixedAudioQaRenderingHours, total: Number(total.toFixed(2)) },
    centralTargetPassed: total <= 52,
    conservativeCeilingPassed: total <= 60
  };
}

export function projectV41ConservativeHours() {
  return projectV41ComputeHours({ primaryMinutesPerDebate: 7, finalizationMinutesPerDebate: 5, escalationRate: 0.2, passBMinutesPerEscalatedDebate: 8.5, adjudicationShareOfEscalations: 0.6, adjudicationMinutesPerAdjudicatedDebate: 6.5 });
}

function addTransportContingency(projection, contingencyHours) {
  const total = Number((projection.hours.total + contingencyHours).toFixed(2));
  return {
    ...projection,
    inputs: { ...projection.inputs, fixedTransportContingencyHours: contingencyHours },
    hours: { ...projection.hours, transportContingency: contingencyHours, total },
    centralTargetPassed: total <= 52,
    conservativeCeilingPassed: total <= 60
  };
}

export function evaluateV415Timing(results, { fixedTransportContingencyHours = 2 } = {}) {
  assertV4(Array.isArray(results) && results.length === 3 && results.every((item) => Number.isFinite(item.elapsedMs) && item.elapsedMs > 0 && Number.isInteger(item.recoverableStreamEvents) && item.recoverableStreamEvents >= 0), "three valid timing results required");
  const wallPrimaryMinutesPerDebate = results.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / results.length;
  const cleanResults = results.filter((item) => item.recoverableStreamEvents === 0);
  const recoveredResults = results.filter((item) => item.recoverableStreamEvents > 0);
  const timingEligible = cleanResults.length >= 2 && recoveredResults.length <= 1;
  const computePrimaryMinutesPerDebate = timingEligible && recoveredResults.length === 1
    ? cleanResults.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / cleanResults.length
    : wallPrimaryMinutesPerDebate;
  const conservativePrimaryMinutesPerDebate = Math.max(7, computePrimaryMinutesPerDebate * 1.25);
  const centralProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: computePrimaryMinutesPerDebate }), fixedTransportContingencyHours);
  const conservativeProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: conservativePrimaryMinutesPerDebate, finalizationMinutesPerDebate: 5, escalationRate: 0.2, passBMinutesPerEscalatedDebate: 8.5, adjudicationShareOfEscalations: 0.6, adjudicationMinutesPerAdjudicatedDebate: 6.5 }), fixedTransportContingencyHours);
  const runtimePassed = timingEligible && centralProjection.hours.total <= 52 && conservativeProjection.hours.total <= 60;
  return {
    wallPrimaryMinutesPerDebate: Number(wallPrimaryMinutesPerDebate.toFixed(2)),
    computePrimaryMinutesPerDebate: Number(computePrimaryMinutesPerDebate.toFixed(2)),
    conservativePrimaryMinutesPerDebate: Number(conservativePrimaryMinutesPerDebate.toFixed(2)),
    transportCleanContexts: cleanResults.length,
    recoveredTransportContexts: recoveredResults.length,
    recoveredTransportDebates: recoveredResults.map((item) => item.debateNumber),
    timingEligible,
    fixedTransportContingencyHours,
    centralProjection,
    conservativeProjection,
    runtimePassed
  };
}
