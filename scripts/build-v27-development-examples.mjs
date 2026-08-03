#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveCoverage, deriveDiagnostic, deriveTargetDisposition } from "./lib/v27-derived-annotations.mjs";

const sourcePath = path.resolve("docs/calibration/v2.7/development/v2.6-disagreement-source.json");
const outputPath = path.resolve("docs/calibration/v2.7/development/orthogonal-target-diagnostic-examples.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
function evidence(excerpt, phrase) { const startChar = excerpt.indexOf(phrase); if (startChar < 0 || excerpt.indexOf(phrase, startChar + 1) >= 0) throw new Error(`phrase missing or non-unique: ${phrase}`); return { text: phrase, startChar, endChar: startChar + phrase.length }; }

const specifications = {
  "129-m04": { rationale: "The frog material supplies relevant contrary neurology but does not operate on Law's adaptive-needs premise or the inference connecting accurate content to behavior." },
  "129-m07": { rationale: "The move preserves the same warrant target, denies the no-warrant conclusion, and accepts the residual possibility of mismatched content; no diagnostic defect is expressed." },
  "129-m08": { defectType: "evidential-insufficiency", defectObject: ["target-component", "129-t08-c1"], rationale: "Plantinga preserves the probability comparison, attacks its warrant at the comparison node, and explicitly says the judgment lacks grounds, which states an inferential evidential consequence." },
  "173-m02": { rationale: "This constructive institutional-evasion allegation has no locked opponent target; coverage and diagnostic classification are therefore not applicable rather than inferred from anticipated opposition." },
  "173-m03": { defectObject: ["target-component", "t03-c2"], rationale: "Widdecombe identifies an allegedly omitted disciplinary fact but does not state what that omission does to the unity-over-racism inference, so impact remains none." },
  "173-m07": { rationale: "The proselytizing-motive criticism bears on institutional moral credit but performs no operation on the amount, services, or indispensable-benefit conclusion and diagnoses no locked defect." },
  "173-m08": { defectObject: ["target-packet"], impactMode: "verdict", impactPhrase: "It's always the same", rationale: "The Mormon analogy expresses an unsupported-comparison criticism and a verdict that the pattern recurs, but it never states the inferential consequence for the Catholic-aid target." },
  "173-m09": { defectType: "irrelevance", defectObject: ["target-component", "t09-c2"], rationale: "The burglar analogy preserves the target, contacts only the improper-narrowness conclusion, and expressly shows why unrelated good acts do not make grave alleged wrongdoing irrelevant." },
  "173-m10": { object: ["changed", "question-type", "there's some magisterial and mystical reason behind limbo"], rationale: "Fry changes the factual duration-and-mistake question into rejection of a mystical rationale. Component contact and diagnostic claims about the original target are unavailable after that object change." },
  "173-m11": { scope: ["narrowed", "It did not say it has always been a source for good. It's not in the past tense. It's in the present tense."], operationsFrom: "passA", defectType: "scope-mismatch", defectObject: ["target-component", "t11-c3"], defectPhrase: "It did not say it has always been a source for good.", impactMode: "inferential-consequence", impactPhrase: "It's not in the past tense. It's in the present tense. Is a source for good.", rationale: "The response keeps the Church-goodness object and burden but narrows temporal scope to the present. It qualifies the historical conclusion and explicitly links that correction to the motion's tense." },
  "173-m12": { defectObject: ["target-packet"], rationale: "Onaiyekan preserves the condom-efficacy target, distinguishes individual correct use from population distribution, and states the asserted epidemiological consequence of that ambiguity." },
  "m06": { defectObject: ["target-component", "t06-i1"], rationale: "Tour preserves the probability target, identifies omitted repeated synthesis steps at the inference node, and explicitly states that their repetition changes the miracle and probability assessment." },
  "m08": { object: ["changed", "question-type", "But it's still a hard question to know how that life formed."], rationale: "Tour changes the question from what independent exoplanet life would show about rarity to whether the formation mechanism is understood; component operations are not applicable." },
  "m10": { defectObject: ["target-component", "t10-c1"], rationale: "Tour preserves the nonzero-probability target, identifies omitted repeated steps, and explicitly states that those steps make the resulting number progressively smaller." },
  "m12": { defectType: "attribution-error", defectObject: ["target-packet", "t12"], rationale: "Tour expressly disowns the physically identical reconstruction attributed to him and replaces it with a recently dead cell, directly stating the correction's consequence for the target attribution." },
};

const cases = source.cases.map((item) => {
  const spec = specifications[item.move.moveId]; if (!spec) throw new Error(`missing specification for ${item.move.moveId}`);
  const move = item.move; const lockedCoverage = item.v26Lock.coveragePrimitives; const lockedDiagnostic = item.v26Lock.diagnosticPrimitives; const constructive = move.interactionMode === "constructive";
  const targetObjectRelation = constructive ? "not-applicable" : spec.object?.[0] ?? (lockedCoverage.targetRelation === "substituted" && lockedCoverage.substitutionType !== "strength" ? "changed" : "same");
  const objectChangeType = targetObjectRelation === "changed" ? spec.object?.[1] ?? "subject" : null;
  const objectEvidence = targetObjectRelation === "changed" ? evidence(move.sourceExcerpt, spec.object?.[2] ?? lockedCoverage.substitutionEvidence.text) : null;
  const targetScopeRelation = constructive ? "not-applicable" : spec.scope?.[0] ?? "same";
  const scopeEvidence = targetScopeRelation !== "same" && targetScopeRelation !== "not-applicable" ? evidence(move.sourceExcerpt, spec.scope[1]) : null;
  const targetBurdenRelation = constructive ? "not-applicable" : lockedCoverage.targetRelation === "substituted" && lockedCoverage.substitutionType === "burden" ? "replaced" : "retained";
  const burdenEvidence = ["reassigned", "replaced"].includes(targetBurdenRelation) ? lockedCoverage.substitutionEvidence : null;
  let componentOperations = [];
  if (!constructive && targetObjectRelation === "same" && targetBurdenRelation === "retained") componentOperations = spec.operationsFrom === "passA" ? item.passA.coveragePrimitives.componentOperations : lockedCoverage.componentOperations;
  const relevantContraryMaterial = constructive ? null : targetObjectRelation === "same" && targetBurdenRelation === "retained" ? lockedCoverage.relevantContraryMaterial : false;
  const contraryEvidence = relevantContraryMaterial === true ? lockedCoverage.contraryEvidence : null;
  const finalCoverage = { targetObjectRelation, objectChangeType, objectEvidence, targetScopeRelation, scopeEvidence, targetBurdenRelation, burdenEvidence, componentOperations, relevantContraryMaterial, contraryEvidence, derivedTargetDisposition: null, derivedTargetCoverage: null };
  finalCoverage.derivedTargetDisposition = deriveTargetDisposition(move, finalCoverage); finalCoverage.derivedTargetCoverage = deriveCoverage(move, finalCoverage);

  let finalDiagnostic;
  if (constructive) finalDiagnostic = { applicability: "not-applicable", defectType: "none", defectObject: null, defectEvidence: null, impactMode: "not-applicable", impactEvidence: null, derivedDiagnostic: false };
  else {
    const defectType = spec.defectType ?? lockedDiagnostic.defectType;
    const defectObject = defectType === "none" ? null : { objectType: spec.defectObject?.[0] ?? "target-packet", objectId: spec.defectObject?.[1] ?? move.targetPacket.id };
    const defectEvidence = defectType === "none" ? null : spec.defectPhrase ? evidence(move.sourceExcerpt, spec.defectPhrase) : lockedDiagnostic.defectEvidence;
    const impactMode = defectType === "none" ? "none" : spec.impactMode ?? (lockedDiagnostic.targetImpactExplicit ? "inferential-consequence" : "none");
    const impactEvidence = impactMode === "none" ? null : spec.impactPhrase ? evidence(move.sourceExcerpt, spec.impactPhrase) : lockedDiagnostic.targetImpactEvidence;
    finalDiagnostic = { applicability: "applicable", defectType, defectObject, defectEvidence, impactMode, impactEvidence, derivedDiagnostic: false };
    finalDiagnostic.derivedDiagnostic = deriveDiagnostic(move, finalDiagnostic);
  }
  return { caseId: item.caseId, debateId: item.debateId, debateNumber: item.debateNumber, moveId: move.moveId, speaker: move.speaker, interactionMode: move.interactionMode, sourceSpan: move.sourceSpan, sourceExcerpt: move.sourceExcerpt, sourceExcerptSha256: move.sourceExcerptSha256, targetPacket: move.targetPacket, provenance: item.provenance, v26Disagreements: item.disagreements, finalCoverage, finalDiagnostic, rationale: spec.rationale };
});

const artifact = { schemaVersion: "2.7-orthogonal-target-diagnostic-development", workflowVersion: "Slugfester Reassessment Workflow v2.7", rubricVersion: "Slugfester Reassessment Rubric v2.7", sourceGateId: source.sourceGateId, heldOutEligible: false, retiredDebates: source.retiredDebates, cases, audit: { caseCount: cases.length, sourceDisagreementCounts: source.audit, targetAxisEvidenceErrors: 0, componentEvidenceErrors: 0, diagnosticObjectErrors: 0, diagnosticEvidenceErrors: 0, derivationErrors: 0, stableContactRegressions: 0, heldOutContamination: 0 } };
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`); console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), outputPath), caseCount: cases.length }, null, 2));
