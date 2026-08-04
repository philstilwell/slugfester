#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V33_MODELS, applyCompoundField, assert, canonicalEvidenceChoice, compoundFields, derivedTuple,
  sameSemantic, scoringBands, sha256, validateAnnotation, validateBlindAdjudication
} from "./lib/v33-blind-bundles.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const summaries = [];
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, passAText, passBText, packetText] = await Promise.all([read(source.input.path), read(source.passA.path), read(source.passB.path), read(outputs.blindPacket)]);
  const input = JSON.parse(inputText), passA = JSON.parse(passAText), passB = JSON.parse(passBText), packet = JSON.parse(packetText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item])), bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  for (const modelKey of Object.keys(V33_MODELS)) {
    const [adjudicationText, mappingText] = await Promise.all([read(outputs.adjudications[modelKey]), read(outputs.mappingResults[modelKey])]);
    const adjudication = JSON.parse(adjudicationText), mapping = JSON.parse(mappingText);
    const decisions = validateBlindAdjudication(adjudication, packet, modelKey);
    const decisionByKey = new Map(decisions.map((item) => [`${item.caseId}::${item.fieldPath}`, item]));
    const mappingByKey = new Map(mapping.mappings.map((item) => [`${item.caseId}::${item.fieldPath}`, item]));
    let routedFieldCount = 0, unflaggedAgreementCount = 0, unflaggedAlterations = 0, evidenceCanonicalizations = 0;
    const cases = [];
    for (const challengeCase of input.cases) {
      const annotationA = aById.get(challengeCase.caseId), annotationB = bById.get(challengeCase.caseId);
      const fieldsB = new Map(compoundFields(annotationB)), finalAnnotation = structuredClone(annotationA), provenance = [];
      for (const [fieldPath, candidateA] of compoundFields(annotationA)) {
        const candidateB = fieldsB.get(fieldPath), key = `${challengeCase.caseId}::${fieldPath}`, decision = decisionByKey.get(key);
        let selected, sourceLabel;
        if (decision) {
          const mapped = mappingByKey.get(key);
          assert(mapped, `${key}: missing post-context mapping`);
          selected = canonicalEvidenceChoice(fieldPath, decision.compound, [candidateA, candidateB, decision.compound]);
          routedFieldCount += 1;
          sourceLabel = mapped.disposition;
        } else {
          assert(sameSemantic(fieldPath, candidateA, candidateB), `${key}: unrouted raw conflict`);
          selected = canonicalEvidenceChoice(fieldPath, candidateA, [candidateA, candidateB]);
          unflaggedAgreementCount += 1;
          sourceLabel = "unrouted-shared-agreement";
          if (!sameSemantic(fieldPath, selected, candidateA)) unflaggedAlterations += 1;
        }
        if (JSON.stringify(selected) !== JSON.stringify(decision?.compound ?? candidateA)) evidenceCanonicalizations += 1;
        applyCompoundField(finalAnnotation, fieldPath, selected);
        provenance.push({ fieldPath, source: sourceLabel });
      }
      finalAnnotation.rationale = "The v3.3 classification lock combines de novo blind bundled adjudication with mechanically preserved unrouted agreement and deterministic evidence canonicalization.";
      validateAnnotation(finalAnnotation, challengeCase, `${debate.debateId}.${modelKey}.${challengeCase.caseId}`);
      cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, annotation: finalAnnotation, derived: derivedTuple(challengeCase, finalAnnotation), permittedScoringBands: scoringBands(challengeCase, finalAnnotation), provenance });
    }
    const audit = {
      caseCount: cases.length, compoundFieldCount: cases.reduce((sum, item) => sum + compoundFields(item.annotation).length, 0),
      routedFieldCount, unflaggedAgreementCount, unflaggedAlterations, evidenceCanonicalizations,
      unmappedFields: mapping.audit.unmappedFields, unresolvedFields: mapping.audit.unmappedFields,
      modelSchemaOrInvariantRetries: mapping.audit.modelSchemaOrInvariantRetries, participantPerformanceScoresPresent: false
    };
    assert(routedFieldCount === packet.decisionCount && unflaggedAlterations === 0, `${debate.debateId}.${modelKey}: merge audit failed`);
    const lock = {
      schemaVersion: "3.3-final-blind-lock", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion,
      model: V33_MODELS[modelKey], modelKey, debateId: debate.debateId, debateNumber: debate.debateNumber, calibrationOnly: true, builtAt: new Date().toISOString(),
      sources: { manifestSha256: sha256(manifestText), inputSha256: sha256(inputText), v32PassASha256: sha256(passAText), v32PassBSha256: sha256(passBText), packetSha256: sha256(packetText), adjudicationSha256: sha256(adjudicationText), mappingSha256: sha256(mappingText) },
      cases, audit
    };
    const lockText = `${JSON.stringify(lock, null, 2)}\n`;
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, outputs.finalLocks[modelKey])), { recursive: true });
      await writeFile(path.resolve(root, outputs.finalLocks[modelKey]), lockText);
    }
    summaries.push({ debateId: debate.debateId, modelKey, ...audit, lockSha256: sha256(lockText) });
  }
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", variants: summaries }, null, 2));
