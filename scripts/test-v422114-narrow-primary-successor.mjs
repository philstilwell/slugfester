#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { buildV422114FixtureProposal, compileAndValidateV422114Primary, makeV422114PrimarySchema } from "./lib/v422114-narrow-primary-successor.mjs";

const primaryRoot = "docs/calibration/v4.2.21.13/partition-primary-a";
const preparation = JSON.parse(await readFile(`${primaryRoot}/preparation-manifest.json`, "utf8"));
async function inputs(debateNumber) {
  const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
  const [packet, candidateBundle, eventsBytes, fullLedgerBytes] = await Promise.all([context.packet, context.candidateBundle, context.originalEvents, context.fullLedger].map((file) => readFile(file)).map(async (promise, index) => index < 2 ? JSON.parse(await promise) : promise));
  return { context, packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes };
}
const validInputs = await inputs("178");
const predecessorProposal = JSON.parse(await readFile(`${primaryRoot}/primary-proposals/debate-178.json`, "utf8"));
const successorProposal = buildV422114FixtureProposal(predecessorProposal, validInputs.candidateBundle);
const result = compileAndValidateV422114Primary(successorProposal, validInputs);
const predecessorRaw = JSON.parse(await readFile(`${primaryRoot}/primary-outputs/debate-178.json`, "utf8"));
assert.equal(canonicalJson(result.output), canonicalJson(predecessorRaw));
assert.equal(result.validation.narrowPrimarySuccessor.status, "passed");
const schema = makeV422114PrimarySchema({ packet: validInputs.packet, candidateBundle: validInputs.candidateBundle });
for (const key of ["proSelections", "conSelections"]) {
  const move = schema.properties.sectionJudgments.items.properties[key].items;
  assert.ok(move.required.includes("moveKind"));
  assert.equal(Object.hasOwn(move.properties.response.properties, "diagnosticConsequenceExplicit"), false);
  assert.equal(Object.hasOwn(move.properties.response.properties, "replacementDemandAnswered"), false);
  assert.deepEqual(move.properties.response.properties.specialResponseMode.enum, ["none", "diagnostic-defeat", "justified-reframe"]);
}
const conflictProposal = JSON.parse(await readFile(`${primaryRoot}/primary-proposals/debate-182.json`, "utf8"));
const conflictInputs = await inputs("182");
assert.throws(() => buildV422114FixtureProposal(conflictProposal, conflictInputs.candidateBundle), /cannot migrate without semantic choice/);
const advisoryInputs = { ...validInputs, candidateBundle: structuredClone(validInputs.candidateBundle) };
const authoredReply = successorProposal.sectionJudgments.flatMap((section) => [...section.proSelections, ...section.conSelections]).find((selection) => selection.moveKind === "reply");
assert.ok(authoredReply);
advisoryInputs.candidateBundle.candidates.find((candidate) => candidate.qualifiedCandidateId === authoredReply.qualifiedCandidateId).moveKind = "constructive";
const kindResult = compileAndValidateV422114Primary(successorProposal, advisoryInputs);
assert.ok(kindResult.provenance.some((item) => item.moveKindChangedFromDiscovery));
console.log(JSON.stringify({ status: "passed", exactValidPredecessorReplay: true, outerStructuralContractRetained: true, primaryAAuthoredMoveKind: true, discoveryMoveKindOverrideFixturePassed: true, specialResponseEnumStructurallyExclusive: true, conflictingPredecessorBooleansNotAutoMigrated: true, unchangedV4220ValidatorPassed: true, acceptedPredecessorOutputReusableInSuccessorGate: false, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
