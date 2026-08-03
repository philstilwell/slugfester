#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveCoverage } from "./lib/v26-derived-annotations.mjs";

const sourcePath = path.resolve("docs/calibration/v2.6/development/v2.5-target-contact-disputes.json");
const outputPath = path.resolve("docs/calibration/v2.6/development/target-contact-examples.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
function evidence(excerpt, phrase) {
  const startChar = excerpt.indexOf(phrase);
  if (startChar < 0 || excerpt.indexOf(phrase, startChar + 1) >= 0) throw new Error(`phrase missing or non-unique: ${phrase}`);
  return { text: phrase, startChar, endChar: startChar + phrase.length };
}
const specifications = {
  "d130-m07-pro-responsive-distinctive-context": {
    kinds: { "d130-t07-c1": "rule-comparison", "d130-t07-c2": "rule-comparison", "d130-t07-c3": "burden" },
    dependsOn: { "d130-t07-c3": ["d130-t07-c1", "d130-t07-c2"] },
    relation: "preserved",
    operations: {},
    contrary: "he is performing deeds that he and others believe are miracles and exorcisms and he predicts his Vaman inviolate death and and subsequent resurrection",
    rationale: "The response keeps the ordinary-missing-body target in view but supplies only case-specific contrary material. It performs no qualifying operation on the ordinary baseline, theft-or-misplacement comparison, or exclusion burden.",
  },
  "d130-m08-con-responsive-rare-conjunction": {
    kinds: { "d130-t08-c1": "fact-premise", "d130-t08-c2": "fact-premise", "d130-t08-c3": "fact-premise", "d130-t08-c4": "inference" },
    dependsOn: { "d130-t08-c4": ["d130-t08-c1", "d130-t08-c2", "d130-t08-c3"] },
    relation: "preserved",
    operations: { "d130-t08-c4": { operation: "undermines", phrase: "that's actually the evidence actually is what is predicted by the naturalistic hypothesis" } },
    rationale: "The response attacks the inference that the conjunction disfavors naturalism, but no operation propagates from that inference node to the three historical-premise nodes. Coverage therefore remains partial.",
  },
  "d130-m11-pro-responsive-explanatory-scope": {
    kinds: { "d130-t11-c1": "fact-premise", "d130-t11-c2": "inference", "d130-t11-c3": "fact-premise" },
    dependsOn: { "d130-t11-c2": ["d130-t11-c1", "d130-t11-c3"] },
    relation: "preserved",
    operations: {
      "d130-t11-c1": { operation: "denies", phrase: "nothing no one hallucinates" },
      "d130-t11-c2": { operation: "denies", phrase: "we wouldn't expect group appearances" },
    },
    rationale: "The move denies both the initiating hallucination and the expected group result, while leaving the distinct anchoring-and-suggestion mechanism untouched. Two of three nodes are contacted, so coverage is partial.",
  },
  "d130-m12-con-responsive-unmet-burden": {
    kinds: { "d130-t12-c1": "modality", "d130-t12-c2": "modality", "d130-t12-c3": "modality", "d130-t12-c4": "conclusion" },
    dependsOn: { "d130-t12-c4": ["d130-t12-c1", "d130-t12-c2", "d130-t12-c3"] },
    relation: "substituted", substitutionType: "burden",
    substitution: "mike has to prove the evidence for his claim about Jesus is exceptional enough to prove that none of the usual things happened in this case",
    operations: {},
    rationale: "The response replaces Licona's demand that Carrier explain the listed outcomes with an affirmative burden on Licona to exclude ordinary causes. Component operations are not applicable after that burden substitution.",
  },
  "184-move-07": {
    kinds: { "184-target-07-c1": "conclusion", "184-target-07-c2": "rule-comparison" },
    dependsOn: { "184-target-07-c1": ["184-target-07-c2"] },
    relation: "substituted", substitutionType: "object",
    substitution: "whether moral facts figure in the best um explanation of anything right including of my experience",
    operations: {},
    rationale: "The response changes a constitution-of-experience claim into the distinct question whether moral facts enter the best explanation of experience. The original component graph is therefore not annotated.",
  },
  "184-move-09": {
    kinds: { "184-target-09-c1": "rule-comparison" },
    dependsOn: {},
    relation: "substituted", substitutionType: "object",
    substitution: "not is it or is it not classified into this or that drawer but is there anything wrong with it",
    operations: {},
    rationale: "The response explicitly replaces the epistemic-classification target with a normative question about whether the method is wrong. That object substitution makes component contact not applicable.",
  },
  "184-move-10": {
    kinds: { "184-target-10-c1": "rule-comparison", "184-target-10-c2": "rule-comparison", "184-target-10-c3": "burden" },
    dependsOn: { "184-target-10-c3": ["184-target-10-c1", "184-target-10-c2"] },
    relation: "substituted", substitutionType: "comparison-class",
    substitution: "the standards of knowledge that I set for myself",
    operations: {},
    rationale: "The demanded standard is genuine wrongness, but the reply substitutes the speaker's self-adopted epistemic standard. The changed comparison class controls before any component operation is considered.",
  },
  "m12-con-q4-responsive-rules-versus-reactive-attitudes": {
    kinds: { "t12-c1-agreed-penalties": "rule-comparison", "t12-c2-social-cornerstone": "conclusion" },
    dependsOn: { "t12-c2-social-cornerstone": ["t12-c1-agreed-penalties"] },
    relation: "preserved",
    operations: { "t12-c1-agreed-penalties": { operation: "distinguishes", phrase: "not whether or not those practices would be justified but the question about whether certain types of reactive attitudes would be justified" } },
    rationale: "The response distinguishes penalty practices from desert-laden reactive attitudes, contacting the agreed-penalties node. It does not address the separate claim that penalties are a social cornerstone.",
  },
};

const cases = source.cases.map((item) => {
  const spec = specifications[item.moveId]; if (!spec) throw new Error(`missing specification for ${item.moveId}`);
  const components = item.targetPacketV25.indispensableComponents.map((component) => ({
    id: component.id,
    text: component.text,
    kind: spec.kinds[component.id],
    dependsOn: spec.dependsOn[component.id] ?? [],
  }));
  if (components.some((component) => !component.kind)) throw new Error(`${item.moveId}: component kind missing`);
  const componentOperations = spec.relation === "preserved" ? components.map((component) => {
    const operation = spec.operations[component.id] ?? null;
    return { componentId: component.id, operation: operation?.operation ?? null, evidence: operation ? evidence(item.sourceExcerpt, operation.phrase) : null };
  }) : [];
  const finalCoverage = {
    targetRelation: spec.relation,
    substitutionType: spec.substitutionType ?? null,
    substitutionEvidence: spec.substitution ? evidence(item.sourceExcerpt, spec.substitution) : null,
    componentOperations,
    relevantContraryMaterial: Boolean(spec.contrary),
    contraryEvidence: spec.contrary ? evidence(item.sourceExcerpt, spec.contrary) : null,
    derivedTargetCoverage: null,
  };
  finalCoverage.derivedTargetCoverage = deriveCoverage({ interactionMode: "responsive" }, finalCoverage);
  return {
    caseId: item.caseId,
    debateId: item.debateId,
    debateNumber: item.debateNumber,
    moveId: item.moveId,
    speaker: item.speaker,
    sourceSpan: item.sourceSpan,
    sourceExcerpt: item.sourceExcerpt,
    sourceExcerptSha256: item.sourceExcerptSha256,
    provenance: item.provenance,
    v25Disagreements: item.disagreements,
    targetPacket: {
      id: item.targetPacketV25.id,
      targetSpeaker: item.targetPacketV25.targetSpeaker,
      sourceSpan: item.targetPacketV25.sourceSpan,
      sourceExcerpt: item.targetPacketV25.sourceExcerpt,
      claim: item.targetPacketV25.claim,
      targetRelationToMove: "immediate-opponent-claim",
      interveningOpponentClaim: false,
      exceptionRationale: null,
      indispensableComponents: components,
    },
    finalCoverage,
    rationale: spec.rationale,
  };
});
const artifact = {
  schemaVersion: "2.6-target-contact-development",
  workflowVersion: "Slugfester Reassessment Workflow v2.6",
  rubricVersion: "Slugfester Reassessment Rubric v2.6",
  sourceGateId: source.sourceGateId,
  heldOutEligible: false,
  retiredDebates: source.retiredDebates,
  cases,
  audit: {
    caseCount: cases.length,
    componentContactDisagreementCount: source.audit.componentContactDisagreementCount,
    coverageDisagreementCount: source.audit.coverageDisagreementCount,
    targetRelationDisagreementCount: source.audit.targetRelationDisagreementCount,
    operationEvidenceErrors: 0,
    substitutionEvidenceErrors: 0,
    graphErrors: 0,
    derivationErrors: 0,
    heldOutContamination: 0,
  },
};
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), outputPath), caseCount: cases.length }, null, 2));
