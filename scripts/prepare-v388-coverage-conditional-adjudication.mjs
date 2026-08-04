#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import {
  V388_CONSENSUS_ROOT,
  V388_DEBATE_NUMBERS,
  V388_REVIEW_ROOT,
  assert,
  canonicalJson,
  resolveCoverageFields,
  stableRefResolver,
  validateCoverageAdjudicationOutput
} from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const outputRoot = `${V388_CONSENSUS_ROOT}/conditional-adjudication`;
const normalized = (value) => String(value).replace(/\s+/g, " ").trim();
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const recovered = [];

const disagreements = await readJson(`${V388_CONSENSUS_ROOT}/initial-disagreements.json`);
const maps = await readJson(`${V388_CONSENSUS_ROOT}/adjudication-option-map.json`);
const execution = await readJson(`${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`);
assert(execution.validOutputContexts === 3 && execution.results.every((item) => item.gateAcceptancePassed), "primary adjudications incomplete");

for (const debateNumber of V388_DEBATE_NUMBERS) {
  const dispute = disagreements.debates[debateNumber];
  const [packet, mapping, review, adjudicationPacket, adjudicationSchema, adjudicationOutput] = await Promise.all([
    readJson(`${V388_REVIEW_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${V388_REVIEW_ROOT}/private-mappings/debate-${debateNumber}.json`),
    readJson(`${V388_REVIEW_ROOT}/outputs/debate-${debateNumber}.json`),
    readJson(dispute.adjudicationPacket),
    readJson(dispute.adjudicationSchema),
    readJson(dispute.adjudicationOutput)
  ]);
  validateCoverageAdjudicationOutput(adjudicationOutput, adjudicationPacket, adjudicationSchema);
  const resolved = resolveCoverageFields(dispute.comparisons, adjudicationOutput, maps.debates[debateNumber]);
  const finalById = new Map(resolved.map((field) => [field.fieldId, field.finalValue]));
  const toStable = stableRefResolver(mapping);
  for (const reviewed of review.candidateReviews.filter((item) => !item.candidateValid)) {
    const entry = mapping.mappingEntries.find((item) => item.candidateRef === reviewed.candidateRef);
    assert(entry, `${debateNumber}.${reviewed.candidateRef}: mapping absent`);
    const finalValid = finalById.get(`candidate:${entry.stableRef}:valid`);
    if (!finalValid) continue;
    const candidate = packet.candidates.find((item) => item.candidateRef === reviewed.candidateRef);
    const proposal = entry.proposalSnapshot;
    const comparisons = [
      { fieldName: "speakerSide", proposalValue: { speaker: proposal.speaker, side: proposal.side }, reviewValue: { speaker: reviewed.speaker, side: reviewed.side } },
      { fieldName: "proposition", proposalValue: normalized(proposal.proposition), reviewValue: normalized(reviewed.proposition) },
      { fieldName: "attributionConfidence", proposalValue: proposal.attributionConfidence, reviewValue: reviewed.attributionConfidence },
      { fieldName: "moveKind", proposalValue: proposal.moveKind, reviewValue: reviewed.moveKind },
      { fieldName: "respondsToRefs", proposalValue: proposal.respondsToRefs.map(toStable).sort(), reviewValue: reviewed.respondsToRefs.map(toStable).sort() }
    ].map((item) => ({ ...item, agreed: same(item.proposalValue, item.reviewValue) }));
    assert(proposal.selectionRole === "load-bearing-constructive" && proposal.moveKind === "constructive", `${entry.stableRef}: revived role cannot be derived by the closed constructive invariant`);
    recovered.push({
      debateNumber,
      debateId: packet.debateId,
      candidateRef: reviewed.candidateRef,
      stableRef: entry.stableRef,
      context: { motion: packet.motion, candidate },
      comparisons,
      derivedField: {
        fieldName: "selectionRole",
        finalValue: "load-bearing-constructive",
        basis: "The two-vote final validity decision retains the move, both source passes identify it as constructive with no response target, and the closed role-kind invariant requires a selected constructive move to use load-bearing-constructive."
      }
    });
  }
}

const supplementalDisputes = recovered.flatMap((item) => item.comparisons.filter((field) => !field.agreed).map((field) => ({ recovered: item, field })));
assert(recovered.length === 1, `expected one revived candidate, received ${recovered.length}`);
assert(supplementalDisputes.length === 1 && supplementalDisputes[0].field.fieldName === "proposition", "conditional audit must expose exactly one proposition dispute");
const [{ recovered: subject, field }] = supplementalDisputes;
const values = [
  { origin: "review", value: field.reviewValue },
  { origin: "proposal", value: field.proposalValue }
];
const fieldId = `candidate:${subject.stableRef}:proposition`;
const packet = {
  schemaVersion: "3.8.8-coverage-conditional-adjudication-packet",
  debateNumber: subject.debateNumber,
  debateId: subject.debateId,
  reviewerRole: "conditional-field-adjudicator",
  reason: "conditional-field-live-after-validity-resolution",
  disputedFields: [{
    fieldId,
    subjectType: "candidate",
    subjectId: subject.stableRef,
    fieldName: "proposition",
    context: subject.context,
    candidates: values.map((item, index) => ({ optionId: `option-${index + 1}`, value: item.value }))
  }]
};
const optionMap = {
  schemaVersion: "3.8.8-coverage-conditional-adjudication-option-map",
  fields: [{ fieldId, options: values.map((item, index) => ({ optionId: `option-${index + 1}`, ...item })) }]
};
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v388-coverage-conditional-adjudication",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "fields"],
  properties: {
    schemaVersion: { type: "string", const: "3.8.8-coverage-conditional-adjudication-output" },
    debateNumber: { type: "string", const: subject.debateNumber },
    debateId: { type: "string", const: subject.debateId },
    reviewerRole: { type: "string", const: "conditional-field-adjudicator" },
    fields: {
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
          rationale: { type: "string", minLength: 80 }
        }
      }
    }
  }
};
const audit = {
  schemaVersion: "3.8.8-coverage-conditional-field-audit",
  status: "one-supplemental-proposition-adjudication-required",
  revivedCandidates: recovered.map((item) => ({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    stableRef: item.stableRef,
    recoveredTwoVoteAgreements: item.comparisons.filter((field) => field.agreed).map((field) => ({ fieldName: field.fieldName, finalValue: field.proposalValue, finalVotes: 2 })),
    derivedFields: [{ ...item.derivedField, upstreamVotes: { valid: 2, moveKind: 2, respondsToRefs: 2 } }],
    supplementalDisputes: item.comparisons.filter((field) => !field.agreed).map((field) => ({ fieldName: field.fieldName, proposalValue: field.proposalValue, reviewValue: field.reviewValue }))
  })),
  counts: {
    revivedCandidates: recovered.length,
    recoveredTwoVoteAgreements: recovered.reduce((sum, item) => sum + item.comparisons.filter((field) => field.agreed).length, 0),
    deterministicallyDerivedFields: recovered.length,
    supplementalDisputes: supplementalDisputes.length,
    supplementalModelContextsRequired: 1,
    scoreFields: 0
  },
  artifacts: {
    packet: `${outputRoot}/packet.json`,
    schema: `${outputRoot}/schema.json`,
    privateOptionMap: `${outputRoot}/private-option-map.json`,
    output: `${outputRoot}/output.json`,
    execution: `${outputRoot}/model-execution.json`
  }
};
assert(!containsScoreField(packet) && !containsScoreField(audit), "conditional audit contains score field");
if (shouldWrite) {
  await mkdir(path.resolve(root, outputRoot), { recursive: true });
  for (const [file, value] of [["packet.json", packet], ["schema.json", schema], ["private-option-map.json", optionMap], ["conditional-field-audit.json", audit]]) {
    await writeFile(path.resolve(root, `${outputRoot}/${file}`), `${JSON.stringify(value, null, 2)}\n`);
  }
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", ...audit.counts, debateNumber: subject.debateNumber, stableRef: subject.stableRef }, null, 2));
