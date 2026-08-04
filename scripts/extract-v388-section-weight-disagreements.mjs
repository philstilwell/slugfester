#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, assert, sectionPlansAgree, validateSectionPlan } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const execution = await readJson(`${V388_SECTION_ROOT}/initial-model-execution.json`);
assert(execution.validOutputContexts === 6 && execution.results.every((item) => item.gateAcceptancePassed), "initial section plans incomplete");
const combinedMap = { schemaVersion: "3.8.8-section-weight-adjudication-option-map-set", debates: {} };
const debates = {};
const contexts = [];
for (let index = 0; index < V388_SECTION_DEBATES.length; index += 1) {
  const debateNumber = V388_SECTION_DEBATES[index];
  const packetPath = `${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const outputAPath = `${V388_SECTION_ROOT}/initial-outputs/debate-${debateNumber}-pass-a.json`;
  const outputBPath = `${V388_SECTION_ROOT}/initial-outputs/debate-${debateNumber}-pass-b.json`;
  const [planningPacket, planSchema, planA, planB] = await Promise.all([readJson(packetPath), readJson(schemaPath), readJson(outputAPath), readJson(outputBPath)]);
  validateSectionPlan(planA, planningPacket, planSchema); validateSectionPlan(planB, planningPacket, planSchema);
  const agreed = sectionPlansAgree(planA, planB);
  const values = index % 2 === 0 ? [{ origin: "pass-a", value: planA }, { origin: "pass-b", value: planB }] : [{ origin: "pass-b", value: planB }, { origin: "pass-a", value: planA }];
  const fieldId = `debate:${planningPacket.debateId}:sectionWeightPlan`;
  const adjudicationPacket = {
    schemaVersion: "3.8.8-section-weight-adjudication-packet",
    debateNumber,
    debateId: planningPacket.debateId,
    reviewerRole: "section-weight-adjudicator",
    planningContext: planningPacket,
    disputedPlans: agreed ? [] : [{ fieldId, candidates: values.map((item, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, value: item.value })) }]
  };
  const map = { schemaVersion: "3.8.8-section-weight-adjudication-option-map", debateNumber, debateId: planningPacket.debateId, fields: agreed ? [] : [{ fieldId, options: values.map((item, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, ...item })) }] };
  const adjudicationSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v388-section-weight-adjudication-${debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "plans"],
    properties: {
      schemaVersion: { type: "string", const: "3.8.8-section-weight-adjudication-output" },
      debateNumber: { type: "string", const: debateNumber },
      debateId: { type: "string", const: planningPacket.debateId },
      reviewerRole: { type: "string", const: "section-weight-adjudicator" },
      plans: { type: "array", minItems: agreed ? 0 : 1, maxItems: agreed ? 0 : 1, items: { type: "object", additionalProperties: false, required: ["fieldId", "optionId", "rationale"], properties: { fieldId: { type: "string", const: fieldId }, optionId: { type: "string", enum: ["option-1", "option-2"] }, rationale: { type: "string", minLength: 120 } } } }
    }
  };
  const packetOut = `${V388_SECTION_ROOT}/adjudication/packets/debate-${debateNumber}.json`;
  const schemaOut = `${V388_SECTION_ROOT}/adjudication/schemas/debate-${debateNumber}.schema.json`;
  const outputOut = `${V388_SECTION_ROOT}/adjudication/outputs/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetOut)), { recursive: true }); await mkdir(path.dirname(path.resolve(root, schemaOut)), { recursive: true });
    await writeFile(path.resolve(root, packetOut), `${JSON.stringify(adjudicationPacket, null, 2)}\n`); await writeFile(path.resolve(root, schemaOut), `${JSON.stringify(adjudicationSchema, null, 2)}\n`);
  }
  combinedMap.debates[debateNumber] = map;
  debates[debateNumber] = { debateId: planningPacket.debateId, semanticPlanAgreement: agreed, semanticDisagreements: agreed ? 0 : 1, excludedWordingFields: ["section title", "section rationale", "move-assignment rationale", "bridge-mapping rationale"], packet: packetOut, schema: schemaOut, output: outputOut, initialOutputs: { passA: outputAPath, passB: outputBPath } };
  if (!agreed) contexts.push({ debateNumber, debateId: planningPacket.debateId, packet: packetOut, schema: schemaOut, output: outputOut, disputedPlans: 1 });
  assert(!containsScoreField(adjudicationPacket), `${debateNumber}: score leaked to section adjudication`);
}
const artifact = { schemaVersion: "3.8.8-section-weight-initial-disagreements", status: "initial-plans-compared", debates, counts: { debates: 3, semanticAgreements: Object.values(debates).filter((item) => item.semanticPlanAgreement).length, semanticDisagreements: contexts.length, adjudicationContexts: contexts.length, scoreFields: 0 }, adjudicationContexts: contexts };
if (shouldWrite) { await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/initial-disagreements.json`), `${JSON.stringify(artifact, null, 2)}\n`); await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/adjudication-option-map.json`), `${JSON.stringify(combinedMap, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", ...artifact.counts, byDebate: Object.fromEntries(Object.entries(debates).map(([number, value]) => [number, value.semanticPlanAgreement ? "agreement" : "whole-plan-dispute"])) }, null, 2));
