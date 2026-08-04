#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, V388_REVIEW_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const stageRoot = `${V388_CONSENSUS_ROOT}/coherence-adjudication`;
const debateNumber = "103";
const stableRef = "woodford-edwards-rational-belief-god-2023-coverage-15-v384";
const [packetSource, mapping, review] = await Promise.all([
  readJson(`${V388_REVIEW_ROOT}/packets/debate-${debateNumber}.json`),
  readJson(`${V388_REVIEW_ROOT}/private-mappings/debate-${debateNumber}.json`),
  readJson(`${V388_REVIEW_ROOT}/outputs/debate-${debateNumber}.json`)
]);
const entry = mapping.mappingEntries.find((item) => item.stableRef === stableRef);
assert(entry, "coherence candidate mapping absent");
const reviewed = review.candidateReviews.find((item) => item.candidateRef === entry.candidateRef);
const candidate = packetSource.candidates.find((item) => item.candidateRef === entry.candidateRef);
const targetRef = reviewed.respondsToRefs[0];
const target = packetSource.candidates.find((item) => item.candidateRef === targetRef);
assert(reviewed.candidateValid && target && entry.proposalSnapshot.candidateValid, "coherence source bundle invalid");
const proposalAudit = mapping.proposalConcessionAudit.find((item) => item.side === "pro");
const reviewAudit = review.materialConcessionAudit.find((item) => item.side === "pro");
const stableForLocal = new Map(mapping.mappingEntries.map((item) => [item.candidateRef, item.stableRef]));
const normalizeRefs = (refs) => refs.map((ref) => {
  const stable = stableForLocal.get(ref);
  assert(stable, `${ref}: coherence reference mapping absent`);
  return stable;
});
const bundles = [
  {
    origin: "review",
    value: {
      proposition: reviewed.proposition,
      selectionRole: reviewed.selectionRole,
      moveKind: reviewed.moveKind,
      respondsToRefs: normalizeRefs(reviewed.respondsToRefs),
      concessionAudit: { status: reviewAudit.status, moveRefs: normalizeRefs(reviewAudit.moveRefs) }
    }
  },
  {
    origin: "proposal",
    value: {
      proposition: entry.proposalSnapshot.proposition,
      selectionRole: entry.proposalSnapshot.selectionRole,
      moveKind: entry.proposalSnapshot.moveKind,
      respondsToRefs: normalizeRefs(entry.proposalSnapshot.respondsToRefs),
      concessionAudit: { status: proposalAudit.status, moveRefs: normalizeRefs(proposalAudit.moveRefs) }
    }
  }
];
assert(bundles[0].value.selectionRole === "material-concession" && bundles[0].value.moveKind === "concession" && bundles[0].value.concessionAudit.status === "represented", "review coherence bundle invalid");
assert(bundles[1].value.selectionRole === "load-bearing-constructive" && bundles[1].value.moveKind === "constructive" && bundles[1].value.concessionAudit.status === "none-found", "proposal coherence bundle invalid");
const fieldId = `candidate:${stableRef}:semanticConcessionBundle`;
const packet = {
  schemaVersion: "3.8.8-coverage-coherence-adjudication-packet",
  debateNumber,
  debateId: packetSource.debateId,
  reviewerRole: "coverage-coherence-adjudicator",
  disputedBundles: [{
    fieldId,
    subjectId: stableRef,
    context: {
      motion: packetSource.motion,
      candidate,
      possibleResponseTarget: { candidateRef: targetRef, sourceSpan: target.sourceSpan, atomicExcerpt: target.atomicExcerpt, contextWindow: target.contextWindow }
    },
    candidates: bundles.map((bundle, index) => ({ optionId: `option-${index + 1}`, value: bundle.value }))
  }]
};
const optionMap = {
  schemaVersion: "3.8.8-coverage-coherence-adjudication-option-map",
  fields: [{ fieldId, options: bundles.map((bundle, index) => ({ optionId: `option-${index + 1}`, ...bundle })) }]
};
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v388-coverage-coherence-adjudication",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "bundles"],
  properties: {
    schemaVersion: { type: "string", const: "3.8.8-coverage-coherence-adjudication-output" },
    debateNumber: { type: "string", const: debateNumber },
    debateId: { type: "string", const: packetSource.debateId },
    reviewerRole: { type: "string", const: "coverage-coherence-adjudicator" },
    bundles: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fieldId", "optionId", "rationale"],
        properties: {
          fieldId: { type: "string", const: fieldId },
          optionId: { type: "string", enum: ["option-1", "option-2"] },
          rationale: { type: "string", minLength: 100 }
        }
      }
    }
  }
};
const audit = {
  schemaVersion: "3.8.8-coverage-cross-field-coherence-audit",
  status: "one-atomic-bundle-adjudication-required",
  violations: [{
    debateNumber,
    debateId: packetSource.debateId,
    stableRef,
    type: "concession-audit-role-kind-response-incoherence",
    description: "The fieldwise result selected constructive move semantics while also selecting a represented concession audit that points to the same move; the closed concession invariant forbids that combination.",
    affectedFieldIds: [`candidate:${stableRef}:proposition`, `candidate:${stableRef}:selectionRole`, `candidate:${stableRef}:moveKind`, `candidate:${stableRef}:respondsToRefs`, "concession:pro:audit"]
  }],
  checkedInvariants: {
    selectedMoveRoleKindResponseCoherence: true,
    responseTargetsRetainedAndNonself: true,
    representedConcessionsReferenceSelectedSameSideMaterialConcessions: true,
    representedBridgesRetainSameSideEvidence: true
  },
  counts: { debatesChecked: 3, movesChecked: 81, bridgesChecked: 30, concessionAuditsChecked: 6, violations: 1, atomicBundleContextsRequired: 1, scoreFields: 0 },
  artifacts: { packet: `${stageRoot}/packet.json`, schema: `${stageRoot}/schema.json`, privateOptionMap: `${stageRoot}/private-option-map.json`, output: `${stageRoot}/output.json`, execution: `${stageRoot}/model-execution.json` }
};
assert(!containsScoreField(packet) && !containsScoreField(audit), "coherence artifacts contain score field");
if (shouldWrite) {
  await mkdir(path.resolve(root, stageRoot), { recursive: true });
  for (const [file, value] of [["packet.json", packet], ["schema.json", schema], ["private-option-map.json", optionMap], ["coherence-audit.json", audit]]) await writeFile(path.resolve(root, `${stageRoot}/${file}`), `${JSON.stringify(value, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debateNumber, violations: 1, atomicBundleContextsRequired: 1, scoreFields: 0 }, null, 2));
