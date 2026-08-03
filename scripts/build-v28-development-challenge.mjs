#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalBridges, canonicalDiagnosticObject, canonicalOperations, diagnosticObjectEligible, equal } from "./lib/v28-semantics.mjs";

const shouldWrite = process.argv.includes("--write");
const root = process.cwd();
const sourceRoot = "docs/calibration/v2.7/held-out-gates";
const outputRoot = "docs/calibration/v2.8/development";
const sourceGateCommit = "12e43368cc8515a4f5cd76daf5ecf6cc91d348df";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const loadText = (file) => readFile(path.resolve(root, file), "utf8");

function semantic(annotation) {
  const coverage = annotation.coveragePrimitives;
  const diagnostic = annotation.diagnosticPrimitives;
  const reframe = annotation.reframePrimitives;
  const burden = annotation.burdenPrimitives;
  return {
    targetObjectRelation: coverage.targetObjectRelation,
    objectChangeType: coverage.objectChangeType,
    targetScopeRelation: coverage.targetScopeRelation,
    targetBurdenRelation: coverage.targetBurdenRelation,
    componentOperations: canonicalOperations(coverage.componentOperations),
    relevantContraryMaterial: coverage.relevantContraryMaterial,
    derivedTargetDisposition: coverage.derivedTargetDisposition,
    derivedTargetCoverage: coverage.derivedTargetCoverage,
    defectType: diagnostic.defectType,
    defectObject: canonicalDiagnosticObject(diagnostic.defectObject),
    impactMode: diagnostic.impactMode,
    derivedDiagnostic: diagnostic.derivedDiagnostic,
    malformedDemandExplained: reframe.malformedDemandExplained,
    replacementDemandStated: reframe.replacementDemandStated,
    derivedReframe: reframe.derivedReframe,
    contactedBridges: canonicalBridges(burden.contactedBridges),
    derivedBurdenRelation: burden.derivedBurdenRelation,
  };
}

const cases = [];
const keyCases = [];
for (const lane of ["dyadic", "multi-speaker"]) {
  const lockDirectory = path.resolve(root, sourceRoot, lane, "locks");
  const files = (await readdir(lockDirectory)).filter((file) => file.endsWith(".json")).sort();
  for (const file of files) {
    const lockPath = path.join(sourceRoot, lane, "locks", file);
    const lockText = await loadText(lockPath);
    const lock = JSON.parse(lockText);
    const [inventoryText, passAText, passBText] = await Promise.all([
      loadText(lock.source.inventoryPath),
      loadText(lock.source.passAPath),
      loadText(lock.source.passBPath),
    ]);
    const inventory = JSON.parse(inventoryText);
    const passA = JSON.parse(passAText);
    const passB = JSON.parse(passBText);
    const aById = new Map(passA.annotations.map((item) => [item.moveId, item]));
    const bById = new Map(passB.annotations.map((item) => [item.moveId, item]));
    const finalById = new Map(lock.annotations.map((item) => [item.moveId, item]));
    for (const move of inventory.moves) {
      if (move.interactionMode !== "responsive") continue;
      const left = semantic(aById.get(move.moveId));
      const right = semantic(bById.get(move.moveId));
      const final = semantic(finalById.get(move.moveId));
      const v28Adjustments = [];
      const rawDiagnosticObject = finalById.get(move.moveId).diagnosticPrimitives.defectObject;
      if (final.defectType !== "none" && !diagnosticObjectEligible(final.defectType, rawDiagnosticObject, move.targetPacket)) {
        final.defectObject = `target-packet:${move.targetPacket.id}`;
        v28Adjustments.push("Diagnostic object moved to the target packet because the v2.7 component kind is ineligible for this defect under the v2.8 matrix.");
      }
      const disagreementFields = Object.keys(left).filter((field) => !equal(left[field], right[field]));
      const selected = disagreementFields.length > 0 || final.derivedDiagnostic || final.derivedReframe;
      if (!selected) continue;
      const suffix = move.moveId.split("-move-").at(-1);
      const caseId = `v28-dev-${inventory.debateNumber}-${suffix}`;
      const route = inventory.burdenRoutes.find((item) => item.id === move.burdenPacket.primaryRouteId) ?? null;
      cases.push({
        caseId,
        lane,
        debateId: inventory.debateId,
        debateNumber: inventory.debateNumber,
        moveId: move.moveId,
        side: move.side,
        speaker: move.speaker,
        sourceExcerpt: move.sourceExcerpt,
        sourceExcerptSha256: move.sourceExcerptSha256,
        targetPacket: move.targetPacket,
        burdenContext: { burdenPacket: move.burdenPacket, route },
      });
      keyCases.push({
        caseId,
        disagreementFields,
        v28Adjustments,
        expected: final,
        rationale: {
          coverage: finalById.get(move.moveId).coverageRationale,
          mechanism: finalById.get(move.moveId).mechanismRationale,
          burden: finalById.get(move.moveId).burdenRationale,
        },
        provenance: {
          inventoryPath: lock.source.inventoryPath,
          inventorySha256: sha256(inventoryText),
          passAPath: lock.source.passAPath,
          passASha256: sha256(passAText),
          passBPath: lock.source.passBPath,
          passBSha256: sha256(passBText),
          lockPath,
          lockSha256: sha256(lockText),
        },
      });
    }
  }
}

cases.sort((left, right) => left.caseId.localeCompare(right.caseId));
keyCases.sort((left, right) => left.caseId.localeCompare(right.caseId));
const input = {
  schemaVersion: "2.8-development-challenge-input",
  workflowVersion: "Slugfester Reassessment Workflow v2.8",
  rubricVersion: "Slugfester Reassessment Rubric v2.8",
  sourceGateCommit,
  calibrationOnly: true,
  legacyMaterialIncluded: false,
  numericalScoresIncluded: false,
  caseCount: cases.length,
  cases,
};
const inputText = `${JSON.stringify(input, null, 2)}\n`;
const positives = (field) => keyCases.filter((item) => item.expected[field] === true).map((item) => item.caseId);
const negatives = (field) => keyCases.filter((item) => item.expected[field] === false).map((item) => item.caseId);
const key = {
  schemaVersion: "2.8-development-challenge-key",
  workflowVersion: input.workflowVersion,
  rubricVersion: input.rubricVersion,
  sourceGateCommit,
  calibrationOnly: true,
  inputPath: `${outputRoot}/challenge-input.json`,
  inputSha256: sha256(inputText),
  caseCount: keyCases.length,
  rareFeatureAudit: {
    diagnosticPositiveCaseIds: positives("derivedDiagnostic"),
    diagnosticNegativeCaseIds: negatives("derivedDiagnostic"),
    reframePositiveCaseIds: positives("derivedReframe"),
    reframeNegativeCaseIds: negatives("derivedReframe"),
  },
  cases: keyCases,
};
const keyText = `${JSON.stringify(key, null, 2)}\n`;

if (shouldWrite) {
  await writeFile(path.resolve(root, outputRoot, "challenge-input.json"), inputText);
  await writeFile(path.resolve(root, outputRoot, "challenge-key.json"), keyText);
}

console.log(JSON.stringify({
  status: "passed",
  write: shouldWrite,
  caseCount: cases.length,
  diagnosticPositives: key.rareFeatureAudit.diagnosticPositiveCaseIds.length,
  reframePositives: key.rareFeatureAudit.reframePositiveCaseIds.length,
  inputSha256: sha256(inputText),
  keySha256: sha256(keyText),
}, null, 2));
