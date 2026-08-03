#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe } from "./lib/v25-derived-annotations.mjs";

const sourcePath = path.resolve("docs/calibration/v2.5/development/v2.4-disputed-cases.json");
const outputPath = path.resolve("docs/calibration/v2.5/development/derived-examples.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

const mechanismEvidence = {
  "V24-DISPUTE-02": {
    defectType: "other",
    defect: "We know where the dividing line is between what we know and what we don't know",
    impact: "Is there life after death? We know the answer to that.",
  },
  "V24-DISPUTE-03": {
    defectType: "missing-premise",
    defect: "To pretend that the scientific explanation is the only explanation is just plain ignorant.",
    impact: "that is a second and a perfectly valid and in fact a needed explanation to give a full and accurate account of what's going on.",
    malformed: "To pretend that the scientific explanation is the only explanation is just plain ignorant.",
    replacement: "that is a second and a perfectly valid and in fact a needed explanation to give a full and accurate account of what's going on.",
  },
  "V24-DISPUTE-06": {
    defectType: "other",
    defect: "I don't think that there is really any difference in how that side of the room and this side of the room would argue that we should judge evidence",
    impact: "how much the naturalistic view of the world does explain and what a great system it is for accounting for the world that we experience.",
    malformed: "I don't think that there is really any difference in how that side of the room and this side of the room would argue that we should judge evidence",
    replacement: "how much the naturalistic view of the world does explain and what a great system it is for accounting for the world that we experience.",
  },
  "V24-DISPUTE-09": {
    defectType: "ambiguity",
    defect: "it doesn't bar us from testing claims that are attributed to the supernatural",
    impact: "until we actually have the ability to investigate and confirm that the supernatural exists we don't get to appeal to it",
    malformed: "methodological naturalism is the foundation of science it's not a safe space for Skeptics",
    replacement: "until we actually have the ability to investigate and confirm that the supernatural exists we don't get to appeal to it",
  },
  "V24-DISPUTE-10": {
    defectType: "missing-premise",
    defect: "barring an acceptance that it's possible to raise someone from the dead or that it's possible that there's a being who can raise someone from the dead",
    impact: "you don't have a justification",
    malformed: "that doesn't change the facts even if you're right",
    replacement: "barring an acceptance that it's possible to raise someone from the dead or that it's possible that there's a being who can raise someone from the dead you don't have a justification",
  },
  "V24-DISPUTE-14": {
    defectType: "contradiction",
    defect: "theories that by your lights couldn't possibly be true",
    impact: "i don't think when you're doing that theory selection you can actually attribute probabilities to the theories",
  },
};

function evidence(excerpt, phrase) {
  if (!phrase) return null;
  const startChar = excerpt.indexOf(phrase);
  if (startChar < 0) throw new Error(`Evidence phrase not found: ${phrase}`);
  return { text: phrase, startChar, endChar: startChar + phrase.length };
}

function coveragePrimitives(item) {
  const components = item.targetPacket?.indispensableComponents ?? [];
  const result = item.locked.targetCoverage;
  if (item.interactionMode === "constructive") return { componentContacts: [], targetPreserved: null, relevantContraryMaterial: null, derivedTargetCoverage: "not-applicable" };
  const contacts = components.map((component, index) => ({
    componentId: component.id,
    contact: result === "full" || (result === "partial" && index === 0) ? "addressed" : "not-addressed",
  }));
  return {
    componentContacts: contacts,
    targetPreserved: result !== "substitution",
    relevantContraryMaterial: result === "relevant-nonanswer",
    derivedTargetCoverage: result,
  };
}

function routeFixture(item) {
  if (item.locked.burdenRelation === "unadopted-or-irrelevant") return { routes: [], packet: { primaryRouteId: null, eligibleBridgeIds: [], selectionRationale: "The adjudicated development case lacks a material route to an adopted burden, so the primary route is null." }, contacts: [] };
  const definition = item.burdenDefinitions[0] ?? { id: `${item.caseId}-ROUTE`, side: item.side, description: "Development-only adopted burden route for this selected atomic move.", successCriteria: "The move must supply the motion-level consequence required by its adopted side." };
  const routeId = `${item.caseId}-ROUTE`;
  const bridges = [
    { id: `${routeId}-MOTION`, tier: "motion", description: definition.successCriteria },
    { id: `${routeId}-CENTRAL`, tier: "central", description: definition.description },
    { id: `${routeId}-SUB`, tier: "subsidiary", description: "Establish or attack the necessary local premise, distinction, or evidential issue identified by this atomic move." },
  ];
  const tier = item.locked.burdenRelation === "completes" ? "motion" : item.locked.burdenRelation === "advances-central" ? "central" : item.locked.burdenRelation === "advances-sub-burden" ? "subsidiary" : null;
  const contact = tier ? [{ bridgeId: bridges.find((bridge) => bridge.tier === tier).id, contactMode: definition.side === item.side ? "supports" : "attacks" }] : [];
  return {
    routes: [{ id: routeId, side: definition.side, description: definition.description, successCriteria: definition.successCriteria, bridges }],
    packet: { primaryRouteId: routeId, eligibleBridgeIds: bridges.map((bridge) => bridge.id), selectionRationale: "This development fixture locks the adjudicated adopted route and exposes all three tiered bridges so the relation can be calculator-derived." },
    contacts: contact,
  };
}

const examples = source.cases.map((item) => {
  const mechanism = mechanismEvidence[item.caseId] ?? {};
  const coverage = coveragePrimitives(item);
  const diagnostic = {
    defectType: item.locked.diagnostic ? mechanism.defectType : "none",
    defectEvidence: item.locked.diagnostic ? evidence(item.sourceExcerpt, mechanism.defect) : null,
    targetImpactExplicit: item.locked.diagnostic,
    targetImpactEvidence: item.locked.diagnostic ? evidence(item.sourceExcerpt, mechanism.impact) : null,
    derivedDiagnostic: item.locked.diagnostic,
  };
  const reframe = {
    malformedDemandExplained: item.locked.reframe,
    malformedDemandEvidence: item.locked.reframe ? evidence(item.sourceExcerpt, mechanism.malformed) : null,
    replacementDemandStated: item.locked.reframe,
    replacementDemandEvidence: item.locked.reframe ? evidence(item.sourceExcerpt, mechanism.replacement) : null,
    derivedReframe: item.locked.reframe,
  };
  const route = routeFixture(item);
  const inventoryFixture = { burdenRoutes: route.routes };
  const moveFixture = { interactionMode: item.interactionMode, burdenPacket: route.packet };
  const burden = { contactedBridges: route.contacts, derivedBurdenRelation: item.locked.burdenRelation };
  if (deriveCoverage(moveFixture, coverage) !== item.locked.targetCoverage) throw new Error(`${item.caseId}: coverage derivation mismatch`);
  if (deriveDiagnostic(diagnostic) !== item.locked.diagnostic) throw new Error(`${item.caseId}: diagnostic derivation mismatch`);
  if (deriveReframe(reframe) !== item.locked.reframe) throw new Error(`${item.caseId}: reframe derivation mismatch`);
  if (deriveBurdenRelation(inventoryFixture, moveFixture, burden) !== item.locked.burdenRelation) throw new Error(`${item.caseId}: burden derivation mismatch`);
  return {
    caseId: item.caseId,
    debateId: item.debateId,
    debateNumber: item.debateNumber,
    moveId: item.moveId,
    side: item.side,
    speaker: item.speaker,
    timestamp: item.timestamp,
    sourceSpan: item.sourceSpan,
    sourceExcerpt: item.sourceExcerpt,
    interactionMode: item.interactionMode,
    targetPacket: item.targetPacket,
    burdenRoutes: route.routes,
    burdenPacket: route.packet,
    disputedV24Fields: item.disputedFields,
    annotation: { coveragePrimitives: coverage, diagnosticPrimitives: diagnostic, reframePrimitives: reframe, burdenPrimitives: burden },
    lesson: `The v2.5 primitives reproduce the adjudicated v2.4 ${item.disputedFields.join(", ")} outcome without asking one compound binary or burden-tier question.`,
  };
});

const artifact = { schemaVersion: "2.5-development-derived-examples", workflowVersion: "Slugfester Reassessment Workflow v2.5", rubricVersion: "Slugfester Reassessment Rubric v2.5", model: "5.6 Sol", heldOutEligible: false, generatedAt: new Date().toISOString(), source: { path: path.relative(process.cwd(), sourcePath), caseCount: source.caseCount, disputedFieldCount: source.disputedFieldCount }, exampleCount: examples.length, examples };
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", exampleCount: examples.length, output: path.relative(process.cwd(), outputPath) }, null, 2));
