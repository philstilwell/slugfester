#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V30_MODEL, V30_RUBRIC, V30_WORKFLOW, applyCompoundField, assert, canonicalJson,
  compoundFields, derivedTuple, parseCanonicalJson, scoringBands, sha256, validateAnnotation
} from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
const summaries = [];
await mkdir(path.resolve(root, gateRoot, "final-locks"), { recursive: true });
await mkdir(path.resolve(root, gateRoot, "scoring-inputs"), { recursive: true });
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText, packetText, adjudicationText, sourceAuditText] = await Promise.all([
    read(debate.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication), read(debate.sourceAudit.path)
  ]);
  const input = JSON.parse(inputText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const packet = JSON.parse(packetText);
  const adjudication = JSON.parse(adjudicationText);
  const sourceAudit = JSON.parse(sourceAuditText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  const disputeById = new Map(packet.cases.flatMap((item) => item.disputes.map((dispute) => [dispute.disputeId, { ...dispute, caseId: item.caseId }])));
  const resolutions = new Map(adjudication.resolutions.map((item) => [item.disputeId, item]));
  assert(resolutions.size === disputeById.size, `${debate.debateId}: unresolved or duplicate disputes`);
  const finalCases = [];
  let nondisputedAlterations = 0;
  for (const challengeCase of input.cases) {
    const a = aById.get(challengeCase.caseId);
    const b = bById.get(challengeCase.caseId);
    assert(a && b, `${challengeCase.caseId}: missing pass input`);
    const finalAnnotation = structuredClone(a);
    const bFields = new Map(compoundFields(b));
    const caseDisputes = packet.cases.find((item) => item.caseId === challengeCase.caseId)?.disputes ?? [];
    const disputeByField = new Map(caseDisputes.map((item) => [item.fieldPath, item]));
    for (const [fieldPath, aValue] of compoundFields(a)) {
      const bValue = bFields.get(fieldPath);
      const agreed = canonicalJson(aValue) === canonicalJson(bValue);
      const dispute = disputeByField.get(fieldPath);
      if (agreed) {
        if (dispute) nondisputedAlterations += 1;
        continue;
      }
      assert(dispute, `${challengeCase.caseId}: missing deterministic dispute for ${fieldPath}`);
      const resolution = resolutions.get(dispute.disputeId);
      assert(resolution, `${challengeCase.caseId}: unresolved ${fieldPath}`);
      applyCompoundField(finalAnnotation, fieldPath, parseCanonicalJson(resolution.resolvedJson));
    }
    finalAnnotation.rationale = `${a.rationale.trim()} Final consensus used ${caseDisputes.length} dispute-only resolution${caseDisputes.length === 1 ? "" : "s"}; both raw rationales remain preserved by hash.`;
    validateAnnotation(finalAnnotation, challengeCase, `${challengeCase.caseId}.final`);
    finalCases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, annotation: finalAnnotation, derived: derivedTuple(challengeCase, finalAnnotation), scoringBands: scoringBands(challengeCase, finalAnnotation), disputeIds: caseDisputes.map((item) => item.disputeId) });
  }
  assert(nondisputedAlterations === 0, `${debate.debateId}: nondisputed alteration detected`);
  const finalLock = {
    schemaVersion: "3.0-final-consensus-lock",
    workflowVersion: V30_WORKFLOW,
    rubricVersion: V30_RUBRIC,
    model: V30_MODEL,
    gateId: manifest.gateId,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    lane: debate.lane,
    calibrationOnly: true,
    source: {
      manifestPath, manifestSha256: sha256(manifestText), inputPath: debate.path, inputSha256: sha256(inputText),
      sourceAuditPath: debate.sourceAudit.path, sourceAuditSha256: sha256(sourceAuditText), passAPath: outputs.passA, passASha256: sha256(passAText),
      passBPath: outputs.passB, passBSha256: sha256(passBText), disputePacketPath: outputs.disputePacket, disputePacketSha256: sha256(packetText),
      adjudicationPath: outputs.adjudication, adjudicationSha256: sha256(adjudicationText)
    },
    cases: finalCases,
    audit: { caseCount: finalCases.length, disputeCount: disputeById.size, resolvedDisputeCount: resolutions.size, unresolvedDisputes: disputeById.size - resolutions.size, nondisputedAlterations, derivedFieldsRecomputed: true, participantPerformanceScoresPresent: false }
  };
  const finalLockText = `${JSON.stringify(finalLock, null, 2)}\n`;
  const scoringInput = {
    schemaVersion: "3.0-post-adjudication-scoring-input",
    workflowVersion: V30_WORKFLOW,
    rubricVersion: V30_RUBRIC,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    calibrationOnly: true,
    finalLockPath: outputs.finalLock,
    finalLockSha256: sha256(finalLockText),
    builtOnlyAfterValidatedConsensus: true,
    numericalScoresPresent: false,
    moves: finalCases.map((item) => ({ caseId: item.caseId, moveId: item.moveId, derived: item.derived, responsivenessBand: item.scoringBands.responsiveness, relevanceBurdenBand: item.scoringBands.relevanceBurden }))
  };
  const scoringInputText = `${JSON.stringify(scoringInput, null, 2)}\n`;
  if (shouldWrite) {
    await writeFile(path.resolve(root, outputs.finalLock), finalLockText);
    await writeFile(path.resolve(root, outputs.scoringInput), scoringInputText);
  } else {
    process.stdout.write(finalLockText);
  }
  summaries.push({ debateId: debate.debateId, caseCount: finalCases.length, disputeCount: disputeById.size, finalLockSha256: sha256(finalLockText), scoringInputSha256: sha256(scoringInputText) });
}
if (shouldWrite) console.log(JSON.stringify({ status: "written", debates: summaries }, null, 2));

