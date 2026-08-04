#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyCompoundField, assert, canonicalEvidenceChoice, compoundFields, derivedTuple, isDualOverrideEligible,
  sameSemantic, scoringBands, semanticValue, sha256, validateAnnotation, validateReviewArtifact
} from "./lib/v34-conservative-review.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const [workflowText, rubricText, manualText, schemaText] = await Promise.all([read("docs/assessment-workflow-v3.4.md"), read("docs/reassessment-rubric-v3.4.md"), read(`${gateRoot}/review-manual.md`), read(`${gateRoot}/review-schema.json`)]);
const summaries = [];

for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, passAText, passBText, packetText, sealText, terraText, solText] = await Promise.all([
    read(source.input.path), read(source.passA.path), read(source.passB.path), read(outputs.reviewPacket), read(outputs.rawFieldSeal), read(outputs.reviews.terra), read(outputs.reviews.sol)
  ]);
  const input = JSON.parse(inputText), passA = JSON.parse(passAText), passB = JSON.parse(passBText), packet = JSON.parse(packetText), seal = JSON.parse(sealText), terraArtifact = JSON.parse(terraText), solArtifact = JSON.parse(solText);
  const sourceTexts = { packetSha256: packetText, workflowSha256: workflowText, rubricSha256: rubricText, manualSha256: manualText, schemaSha256: schemaText };
  const terraAnnotations = validateReviewArtifact(terraArtifact, packet, "terra", sourceTexts), solAnnotations = validateReviewArtifact(solArtifact, packet, "sol", sourceTexts);
  const A = new Map(passA.annotations.map((item) => [item.caseId, item])), B = new Map(passB.annotations.map((item) => [item.caseId, item])), T = new Map(terraAnnotations.map((item) => [item.caseId, item])), S = new Map(solAnnotations.map((item) => [item.caseId, item]));
  const sealByKey = new Map(seal.fields.map((item) => [`${item.caseId}::${item.fieldPath}`, item]));
  let conflictCount = 0, terraMappedA = 0, terraMappedB = 0, unresolvedFields = 0, sharedRetains = 0, dualOverridesApplied = 0, unilateralSharedOverridesApplied = 0, unilateralOverrideAttemptsRejected = 0, ineligibleConvergencesRejected = 0, invalidDualOverrides = 0, coherenceFallbackCases = 0;
  const cases = [];
  for (const challengeCase of input.cases) {
    const a = A.get(challengeCase.caseId), b = B.get(challengeCase.caseId), t = T.get(challengeCase.caseId), s = S.get(challengeCase.caseId);
    const bFields = new Map(compoundFields(b)), tFields = new Map(compoundFields(t)), sFields = new Map(compoundFields(s));
    let finalAnnotation = structuredClone(a), caseUnresolved = false;
    const provenance = [];
    for (const [fieldPath, candidateA] of compoundFields(a)) {
      const key = `${challengeCase.caseId}::${fieldPath}`, sealed = sealByKey.get(key), candidateB = bFields.get(fieldPath), terraValue = tFields.get(fieldPath), solValue = sFields.get(fieldPath);
      assert(sealed && sealed.rawAgreement === sameSemantic(fieldPath, candidateA, candidateB), `${key}: raw seal mismatch`);
      let selected, disposition;
      if (!sealed.rawAgreement) {
        conflictCount += 1;
        const matchesA = sameSemantic(fieldPath, terraValue, candidateA), matchesB = sameSemantic(fieldPath, terraValue, candidateB);
        if (matchesA !== matchesB) {
          selected = canonicalEvidenceChoice(fieldPath, matchesA ? candidateA : candidateB, [candidateA, candidateB]);
          disposition = matchesA ? "terra-conflict-A" : "terra-conflict-B";
          if (matchesA) terraMappedA += 1; else terraMappedB += 1;
        } else {
          selected = canonicalEvidenceChoice(fieldPath, candidateA, [candidateA, candidateB]);
          disposition = "unresolved-terra-conflict"; unresolvedFields += 1; caseUnresolved = true;
        }
      } else {
        const terraAlternative = !sameSemantic(fieldPath, terraValue, candidateA), solAlternative = !sameSemantic(fieldPath, solValue, candidateA), convergedAlternative = terraAlternative && solAlternative && sameSemantic(fieldPath, terraValue, solValue);
        if (convergedAlternative && isDualOverrideEligible(fieldPath)) {
          selected = canonicalEvidenceChoice(fieldPath, terraValue, [terraValue, solValue]);
          disposition = "dual-confirmed-shared-override"; dualOverridesApplied += 1;
        } else {
          selected = canonicalEvidenceChoice(fieldPath, candidateA, [candidateA, candidateB]);
          disposition = "shared-retain"; sharedRetains += 1;
          if (terraAlternative !== solAlternative) unilateralOverrideAttemptsRejected += 1;
          if (convergedAlternative && !isDualOverrideEligible(fieldPath)) ineligibleConvergencesRejected += 1;
          if (terraAlternative && solAlternative && !sameSemantic(fieldPath, terraValue, solValue)) invalidDualOverrides += 1;
        }
      }
      applyCompoundField(finalAnnotation, fieldPath, selected);
      provenance.push({ fieldPath, disposition, rawAgreement: sealed.rawAgreement, terraSemantic: semanticValue(fieldPath, terraValue), solSemantic: semanticValue(fieldPath, solValue) });
    }
    finalAnnotation.rationale = "The v3.4 classification lock applies Terra-only conflict arbitration, conservative dual confirmation for eligible shared changes, and deterministic evidence selection.";
    try {
      validateAnnotation(finalAnnotation, challengeCase, `${debate.debateId}.${challengeCase.caseId}.final`);
    } catch (error) {
      finalAnnotation = structuredClone(a);
      finalAnnotation.rationale = "The v3.4 merge encountered a coupled-field coherence failure, marked the case unresolved, and retained raw Pass A solely to preserve a valid diagnostic artifact.";
      validateAnnotation(finalAnnotation, challengeCase, `${debate.debateId}.${challengeCase.caseId}.fallback`);
      unresolvedFields += 1; coherenceFallbackCases += 1; caseUnresolved = true;
      provenance.push({ fieldPath: "__case__", disposition: "coherence-fallback-raw-A", reason: error.message });
    }
    cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, annotation: finalAnnotation, derived: derivedTuple(challengeCase, finalAnnotation), permittedScoringBands: scoringBands(challengeCase, finalAnnotation), unresolved: caseUnresolved, provenance });
  }
  const audit = {
    caseCount: cases.length, compoundFieldCount: cases.reduce((sum, item) => sum + compoundFields(item.annotation).length, 0), conflictCount, terraMappedA, terraMappedB,
    unresolvedFields, sharedRetains, dualOverridesApplied, unilateralSharedOverridesApplied, unilateralOverrideAttemptsRejected, ineligibleConvergencesRejected, invalidDualOverrides,
    coherenceFallbackCases, modelSchemaOrInvariantRetries: 0, participantPerformanceScoresPresent: false
  };
  const lock = {
    schemaVersion: "3.4-final-conservative-lock", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion,
    debateId: debate.debateId, debateNumber: debate.debateNumber, calibrationOnly: true, builtAt: new Date().toISOString(),
    sources: { manifestSha256: sha256(manifestText), inputSha256: sha256(inputText), v32PassASha256: sha256(passAText), v32PassBSha256: sha256(passBText), packetSha256: sha256(packetText), sealSha256: sha256(sealText), terraReviewSha256: sha256(terraText), solReviewSha256: sha256(solText) },
    cases, audit
  };
  const lockText = `${JSON.stringify(lock, null, 2)}\n`;
  if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputs.finalLock)), { recursive: true }); await writeFile(path.resolve(root, outputs.finalLock), lockText); }
  summaries.push({ debateId: debate.debateId, ...audit, lockSha256: sha256(lockText) });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: summaries }, null, 2));
