#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_ADJUDICATOR_MODEL, V32_PASS_MODELS, V32_RUBRIC, V32_WORKFLOW, applyCompoundField,
  assert, canonicalEvidenceChoice, compoundFields, derivedTuple, sameSemantic, scoringBands,
  sha256, validateAdjudicatedValue, validateAnnotation
} from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`);
const manifest = JSON.parse(manifestText);
const summaries = [];
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText, packetText, adjudicationText] = await Promise.all([
    read(debate.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication)
  ]);
  const input = JSON.parse(inputText), passA = JSON.parse(passAText), passB = JSON.parse(passBText);
  const packet = JSON.parse(packetText), adjudication = JSON.parse(adjudicationText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  const packetByKey = new Map();
  for (const itemCase of packet.cases) for (const field of itemCase.fields) packetByKey.set(`${field.caseId}::${field.fieldPath}`, { field, challengeCase: itemCase.lockedCase });
  const resolutionById = new Map(adjudication.resolutions.map((item) => [item.disputeId, item]));
  let adjudicatedFieldCount = 0, semanticConflictCount = 0, riskAgreementCount = 0, dependencyCompanionCount = 0;
  let retainedAgreementCount = 0, overrideCount = 0, evidenceCanonicalizations = 0, unflaggedAlterations = 0;
  const cases = [];
  for (const challengeCase of input.cases) {
    const annotationA = aById.get(challengeCase.caseId), annotationB = bById.get(challengeCase.caseId);
    const fieldsB = new Map(compoundFields(annotationB));
    const finalAnnotation = structuredClone(annotationA);
    const provenance = [];
    for (const [fieldPath, candidateA] of compoundFields(annotationA)) {
      const candidateB = fieldsB.get(fieldPath);
      const packetEntry = packetByKey.get(`${challengeCase.caseId}::${fieldPath}`);
      let selected = candidateA;
      let source = "unflagged-agreement";
      const candidates = [candidateA, candidateB];
      if (packetEntry) {
        const resolution = resolutionById.get(packetEntry.field.disputeId);
        assert(resolution, `${packetEntry.field.disputeId}: missing resolution`);
        const validated = validateAdjudicatedValue(packetEntry.field, resolution, challengeCase, packetEntry.field.disputeId);
        selected = validated.resolved;
        candidates.push(validated.resolved);
        adjudicatedFieldCount += 1;
        if (packetEntry.field.triggerKind === "semantic-conflict") semanticConflictCount += 1;
        else if (packetEntry.field.triggerKind === "high-risk-agreement") riskAgreementCount += 1;
        else dependencyCompanionCount += 1;
        if (resolution.selection === "override") overrideCount += 1;
        if (resolution.selection === "retain") retainedAgreementCount += 1;
        source = `${packetEntry.field.triggerKind}:${resolution.selection}`;
      } else {
        assert(sameSemantic(fieldPath, candidateA, candidateB), `${challengeCase.caseId}.${fieldPath}: unflagged semantic disagreement`);
      }
      const canonical = canonicalEvidenceChoice(fieldPath, selected, candidates);
      if (JSON.stringify(canonical) !== JSON.stringify(selected)) evidenceCanonicalizations += 1;
      applyCompoundField(finalAnnotation, fieldPath, canonical);
      if (!packetEntry && !sameSemantic(fieldPath, canonical, candidateA)) unflaggedAlterations += 1;
      provenance.push({ fieldPath, source });
    }
    finalAnnotation.rationale = "The v3.2 final annotation combines unflagged cross-model agreement with validated risk adjudication and deterministic evidence canonicalization.";
    validateAnnotation(finalAnnotation, challengeCase, `${debate.debateId}.${challengeCase.caseId}`);
    cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, annotation: finalAnnotation, derived: derivedTuple(challengeCase, finalAnnotation), scoringBands: scoringBands(challengeCase, finalAnnotation), provenance });
  }
  const audit = {
    caseCount: cases.length, compoundFieldCount: cases.reduce((sum, item) => sum + compoundFields(item.annotation).length, 0),
    adjudicatedFieldCount, semanticConflictCount, riskAgreementCount, dependencyCompanionCount, retainedAgreementCount, overrideCount,
    unflaggedAgreementCount: cases.reduce((sum, item) => sum + compoundFields(item.annotation).length, 0) - adjudicatedFieldCount,
    unflaggedAlterations, evidenceCanonicalizations, unresolvedFields: 0, participantPerformanceScoresPresent: false
  };
  assert(unflaggedAlterations === 0 && adjudicatedFieldCount === packet.fieldCount, `${debate.debateId}: merge audit failed`);
  const finalLock = {
    schemaVersion: "3.2-final-hybrid-lock", workflowVersion: V32_WORKFLOW, rubricVersion: V32_RUBRIC,
    models: { passA: V32_PASS_MODELS.A, passB: V32_PASS_MODELS.B, adjudicator: V32_ADJUDICATOR_MODEL },
    debateId: debate.debateId, debateNumber: debate.debateNumber, builtAt: new Date().toISOString(),
    sources: { manifestSha256: sha256(manifestText), inputSha256: sha256(inputText), passASha256: sha256(passAText), passBSha256: sha256(passBText), disputePacketSha256: sha256(packetText), adjudicationSha256: sha256(adjudicationText) },
    cases, audit
  };
  const finalText = `${JSON.stringify(finalLock, null, 2)}\n`;
  const scoringInput = {
    schemaVersion: "3.2-post-adjudication-scoring-input", workflowVersion: V32_WORKFLOW, rubricVersion: V32_RUBRIC,
    debateId: debate.debateId, debateNumber: debate.debateNumber, calibrationOnly: true, builtAt: new Date().toISOString(),
    finalLockPath: outputs.finalLock, finalLockSha256: sha256(finalText), builtOnlyAfterValidatedRiskAdjudication: true,
    numericalScoresPresent: false, cases: cases.map(({ caseId, moveId, derived, scoringBands: bands }) => ({ caseId, moveId, derived, permittedBands: { responsiveness: bands.responsiveness, relevanceBurden: bands.relevanceBurden } }))
  };
  const scoringText = `${JSON.stringify(scoringInput, null, 2)}\n`;
  if (shouldWrite) {
    await writeFile(path.resolve(root, outputs.finalLock), finalText);
    await writeFile(path.resolve(root, outputs.scoringInput), scoringText);
  }
  summaries.push({ debateId: debate.debateId, audit, finalLockSha256: sha256(finalText), scoringInputSha256: sha256(scoringText) });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: summaries }, null, 2));
