#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V31_FAMILIES, V31_MODEL, V31_RUBRIC, V31_WORKFLOW, applyCompoundField, assert,
  canonicalEvidenceChoice, canonicalJson, compoundFields, defaultAnnotation, derivedTuple,
  parseCanonicalJson, sameSemantic, scoringBands, sha256, validateAnnotation
} from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
const summaries = [];
await mkdir(path.resolve(root, gateRoot, "final-locks"), { recursive: true });
await mkdir(path.resolve(root, gateRoot, "scoring-inputs"), { recursive: true });
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const verificationPaths = V31_FAMILIES.map((family) => outputs.verifications[family]);
  const [inputText, passAText, passBText, disagreementText, sourceAuditText, ...verificationTexts] = await Promise.all([
    read(debate.path), read(outputs.passA), read(outputs.passB), read(outputs.semanticDisagreements), read(debate.sourceAudit.path), ...verificationPaths.map(read)
  ]);
  const input = JSON.parse(inputText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const disagreement = JSON.parse(disagreementText);
  const verifications = verificationTexts.map(JSON.parse);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  const focused = new Map();
  for (const verification of verifications) {
    for (const judgment of verification.judgments) {
      const key = `${judgment.caseId}::${judgment.fieldPath}`;
      assert(!focused.has(key), `${debate.debateId}: duplicate focused field ${key}`);
      focused.set(key, parseCanonicalJson(judgment.resolvedJson));
    }
  }
  const finalCases = [];
  let fieldCount = 0;
  let sharedAgreementOverrides = 0;
  let semanticConflictResolutions = 0;
  let evidenceCanonicalizations = 0;
  for (const challengeCase of input.cases) {
    const a = aById.get(challengeCase.caseId);
    const b = bById.get(challengeCase.caseId);
    assert(a && b, `${challengeCase.caseId}: missing raw pass annotation`);
    const bFields = new Map(compoundFields(b));
    const finalAnnotation = defaultAnnotation(challengeCase);
    const fieldSources = [];
    for (const [fieldPath, aValue] of compoundFields(a)) {
      fieldCount += 1;
      const bValue = bFields.get(fieldPath);
      const verifierValue = focused.get(`${challengeCase.caseId}::${fieldPath}`);
      assert(bValue !== undefined && verifierValue !== undefined, `${challengeCase.caseId}: unresolved ${fieldPath}`);
      const rawAgreement = sameSemantic(fieldPath, aValue, bValue);
      const verifierAgreesA = sameSemantic(fieldPath, verifierValue, aValue);
      const verifierAgreesB = sameSemantic(fieldPath, verifierValue, bValue);
      if (rawAgreement && !verifierAgreesA) sharedAgreementOverrides += 1;
      if (!rawAgreement) semanticConflictResolutions += 1;
      const chosen = canonicalEvidenceChoice(fieldPath, verifierValue, [aValue, bValue, verifierValue]);
      if (canonicalJson(chosen) !== canonicalJson(verifierValue)) evidenceCanonicalizations += 1;
      applyCompoundField(finalAnnotation, fieldPath, chosen);
      fieldSources.push({ fieldPath, rawAgreement, verifierAgreesA, verifierAgreesB, focusedSemanticAuthoritative: true, evidenceSource: canonicalJson(chosen) === canonicalJson(verifierValue) ? "verifier" : canonicalJson(chosen) === canonicalJson(aValue) ? "A" : "B" });
    }
    finalAnnotation.rationale = "All semantic primitives were independently rejudged by four source-only focused AI verifiers; exact evidence was then canonicalized mechanically from matching AI results.";
    validateAnnotation(finalAnnotation, challengeCase, `${challengeCase.caseId}.final`);
    finalCases.push({
      caseId: challengeCase.caseId, moveId: challengeCase.moveId, annotation: finalAnnotation,
      derived: derivedTuple(challengeCase, finalAnnotation), scoringBands: scoringBands(challengeCase, finalAnnotation), fieldSources
    });
  }
  assert(focused.size === fieldCount, `${debate.debateId}: focused field count mismatch`);
  const source = {
    manifestPath, manifestSha256: sha256(manifestText), inputPath: debate.path, inputSha256: sha256(inputText), sourceAuditPath: debate.sourceAudit.path, sourceAuditSha256: sha256(sourceAuditText),
    passAPath: outputs.passA, passASha256: sha256(passAText), passBPath: outputs.passB, passBSha256: sha256(passBText),
    semanticDisagreementPath: outputs.semanticDisagreements, semanticDisagreementSha256: sha256(disagreementText),
    verifications: Object.fromEntries(V31_FAMILIES.map((family, index) => [family, { path: outputs.verifications[family], sha256: sha256(verificationTexts[index]) }]))
  };
  const finalLock = {
    schemaVersion: "3.1-final-verification-lock", workflowVersion: V31_WORKFLOW, rubricVersion: V31_RUBRIC, model: V31_MODEL,
    gateId: manifest.gateId, debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, calibrationOnly: true,
    source, cases: finalCases,
    audit: {
      caseCount: finalCases.length, compoundFieldCount: fieldCount, focusedJudgmentCount: focused.size, unresolvedFields: fieldCount - focused.size,
      semanticConflictResolutions, sharedAgreementOverrides, evidenceCanonicalizations, allDerivedFieldsRecomputed: true,
      participantPerformanceScoresPresent: false
    }
  };
  const finalLockText = `${JSON.stringify(finalLock, null, 2)}\n`;
  const scoringInput = {
    schemaVersion: "3.1-post-verification-scoring-input", workflowVersion: V31_WORKFLOW, rubricVersion: V31_RUBRIC,
    debateId: debate.debateId, debateNumber: debate.debateNumber, calibrationOnly: true, finalLockPath: outputs.finalLock,
    finalLockSha256: sha256(finalLockText), builtOnlyAfterValidatedFocusedVerification: true, numericalScoresPresent: false,
    moves: finalCases.map((item) => ({ caseId: item.caseId, moveId: item.moveId, derived: item.derived, responsivenessBand: item.scoringBands.responsiveness, relevanceBurdenBand: item.scoringBands.relevanceBurden }))
  };
  const scoringInputText = `${JSON.stringify(scoringInput, null, 2)}\n`;
  if (shouldWrite) {
    await writeFile(path.resolve(root, outputs.finalLock), finalLockText);
    await writeFile(path.resolve(root, outputs.scoringInput), scoringInputText);
  } else process.stdout.write(finalLockText);
  summaries.push({ debateId: debate.debateId, caseCount: finalCases.length, compoundFieldCount: fieldCount, semanticConflictResolutions, sharedAgreementOverrides, evidenceCanonicalizations, finalLockSha256: sha256(finalLockText), scoringInputSha256: sha256(scoringInputText) });
}
if (shouldWrite) console.log(JSON.stringify({ status: "written", debates: summaries }, null, 2));
