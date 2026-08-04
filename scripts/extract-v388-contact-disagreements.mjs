#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_DEBATES, V388_CONTACT_ROOT, assert, canonicalJson, decodeV388Contact, validateV388ContactOutput } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contactRoot = V388_CONTACT_ROOT;
const sealed = await readJson(`${contactRoot}/sealed-option-map.json`);
const recoveryAudit = await readJson(`${contactRoot}/evidence-recovery/recovery-audit.json`);
assert(recoveryAudit.status === "recovered-output-valid" && recoveryAudit.changedFieldCount === 2 && recoveryAudit.semanticChanges === 0 && recoveryAudit.disagreementExtractionAuthorized, "valid evidence recovery required");

const mapping = { schemaVersion: "3.8.8-burden-contact-adjudication-private-option-map", status: "sealed-from-adjudicators", debates: {} };
const debateReports = [];
let globalDisputeIndex = 0;
for (const debateNumber of V388_CONTACT_DEBATES) {
  const packetAPath = `${contactRoot}/packets/pass-a/debate-${debateNumber}.json`;
  const packetBPath = `${contactRoot}/packets/pass-b/debate-${debateNumber}.json`;
  const schemaAPath = `${contactRoot}/schemas/pass-a/debate-${debateNumber}.schema.json`;
  const schemaBPath = `${contactRoot}/schemas/pass-b/debate-${debateNumber}.schema.json`;
  const outputAPath = debateNumber === "55" ? `${contactRoot}/evidence-recovery/recovered-output.json` : `${contactRoot}/initial-outputs/pass-a/debate-${debateNumber}.json`;
  const outputBPath = `${contactRoot}/initial-outputs/pass-b/debate-${debateNumber}.json`;
  const [packetA, packetB, schemaA, schemaB, outputA, outputB] = await Promise.all([readJson(packetAPath), readJson(packetBPath), readJson(schemaAPath), readJson(schemaBPath), readJson(outputAPath), readJson(outputBPath)]);
  validateV388ContactOutput(outputA, packetA, schemaA); validateV388ContactOutput(outputB, packetB, schemaB);
  assert(canonicalJson(packetA.bundles.map((item) => item.bundleId)) === canonicalJson(packetB.bundles.map((item) => item.bundleId)), `${debateNumber}: pass bundle identities differ`);
  const decodedA = new Map(decodeV388Contact(outputA, sealed.passes["pass-a"]).map((item) => [item.bundleId, item]));
  const decodedB = new Map(decodeV388Contact(outputB, sealed.passes["pass-b"]).map((item) => [item.bundleId, item]));
  const agreements = [], disputes = [], adjudicationBundles = [];
  mapping.debates[debateNumber] = {};
  for (const sourceBundle of packetA.bundles) {
    const left = decodedA.get(sourceBundle.bundleId), right = decodedB.get(sourceBundle.bundleId);
    assert(left && right && left.moveId === right.moveId && left.moveId === sourceBundle.moveId, `${sourceBundle.bundleId}: decoded identity mismatch`);
    if (canonicalJson(left.semanticTuple) === canonicalJson(right.semanticTuple)) agreements.push({ bundleId: sourceBundle.bundleId, moveId: left.moveId, finalSemanticTuple: left.semanticTuple, supportingVotes: 2, sources: ["pass-a", "pass-b"] });
    else {
      const ordered = globalDisputeIndex % 2 === 0 ? [{ origin: "pass-a", semanticTuple: left.semanticTuple }, { origin: "pass-b", semanticTuple: right.semanticTuple }] : [{ origin: "pass-b", semanticTuple: right.semanticTuple }, { origin: "pass-a", semanticTuple: left.semanticTuple }];
      globalDisputeIndex += 1;
      const candidates = ordered.map((item, index) => ({ optionId: `option-${index + 1}`, values: item.semanticTuple }));
      mapping.debates[debateNumber][sourceBundle.bundleId] = { moveId: sourceBundle.moveId, options: ordered.map((item, index) => ({ optionId: `option-${index + 1}`, origin: item.origin, semanticTuple: item.semanticTuple })) };
      disputes.push({ bundleId: sourceBundle.bundleId, moveId: sourceBundle.moveId, passATuple: left.semanticTuple, passBTuple: right.semanticTuple });
      adjudicationBundles.push({ bundleId: sourceBundle.bundleId, family: "burden-contact-dispute", moveId: sourceBundle.moveId, sourceSpan: sourceBundle.sourceSpan, atomicExcerpt: sourceBundle.atomicExcerpt, speakerAttributionConfidence: sourceBundle.speakerAttributionConfidence, decisionContext: sourceBundle.decisionContext, candidates });
    }
  }
  const packet = { schemaVersion: "3.8.8-burden-contact-adjudication-packet", protocolId: "v3.8.8-burden-contact-consensus", debateNumber, debateId: packetA.debateId, reviewerRole: "burden-contact-adjudicator", verifiedSourceChain: packetA.verifiedSourceChain, passIdentityVisible: false, initialRationalesVisible: false, thirdValueAllowed: false, bundles: adjudicationBundles };
  const optionIds = ["option-1", "option-2"];
  const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-v388-contact-adjudication-${debateNumber}`, type: "object", additionalProperties: false, required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "bundles"], properties: { schemaVersion: { type: "string", const: "3.8.8-burden-contact-adjudication-output" }, debateNumber: { type: "string", const: debateNumber }, debateId: { type: "string", const: packet.debateId }, reviewerRole: { type: "string", const: "burden-contact-adjudicator" }, bundles: { type: "array", minItems: adjudicationBundles.length, maxItems: adjudicationBundles.length, items: { type: "object", additionalProperties: false, required: ["bundleId", "optionId", "evidenceText", "rationale"], properties: { bundleId: { type: "string", enum: adjudicationBundles.map((item) => item.bundleId) }, optionId: { type: "string", enum: optionIds }, evidenceText: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 160 } } } } } };
  const report = { debateNumber, debateId: packet.debateId, comparedMoves: packetA.bundles.length, agreements, disputes, agreementCount: agreements.length, disputeCount: disputes.length, packet: `${contactRoot}/adjudication/packets/debate-${debateNumber}.json`, schema: `${contactRoot}/adjudication/schemas/debate-${debateNumber}.schema.json`, output: `${contactRoot}/adjudication/outputs/debate-${debateNumber}.json`, outputA: outputAPath, outputB: outputBPath };
  debateReports.push(report);
  if (shouldWrite) {
    await mkdir(path.resolve(root, `${contactRoot}/adjudication/packets`), { recursive: true }); await mkdir(path.resolve(root, `${contactRoot}/adjudication/schemas`), { recursive: true });
    await writeFile(path.resolve(root, report.packet), `${JSON.stringify(packet, null, 2)}\n`); await writeFile(path.resolve(root, report.schema), `${JSON.stringify(schema, null, 2)}\n`);
  }
}
const comparison = { schemaVersion: "3.8.8-burden-contact-initial-comparison", status: "disputes-extracted", sources: { sealedOptionMap: `${contactRoot}/sealed-option-map.json`, sealedOptionMapSha256: sha256(await readBytes(`${contactRoot}/sealed-option-map.json`)), recoveryAudit: `${contactRoot}/evidence-recovery/recovery-audit.json`, recoveryAuditSha256: sha256(await readBytes(`${contactRoot}/evidence-recovery/recovery-audit.json`)) }, debateReports, totals: { debates: 3, newMoves: 72, initialAgreements: debateReports.reduce((sum, item) => sum + item.agreementCount, 0), initialDisagreements: debateReports.reduce((sum, item) => sum + item.disputeCount, 0), agreementRate: debateReports.reduce((sum, item) => sum + item.agreementCount, 0) / 72, adjudicationContextsRequired: debateReports.filter((item) => item.disputeCount > 0).length, inheritedTwoVoteTuples: 9, pendingAudioVerifications: 0, scoringFields: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, decision: { adjudicationPreregistrationAuthorized: true, adjudicationModelExecutionAuthorized: false, scoringAuthorized: false } };
assert(comparison.totals.initialAgreements === 61 && comparison.totals.initialDisagreements === 11 && comparison.totals.adjudicationContextsRequired === 3, "unexpected contact disagreement totals");
if (shouldWrite) { await mkdir(path.resolve(root, `${contactRoot}/adjudication`), { recursive: true }); await writeFile(path.resolve(root, `${contactRoot}/initial-comparison.json`), `${JSON.stringify(comparison, null, 2)}\n`); await writeFile(path.resolve(root, `${contactRoot}/adjudication/private-option-map.json`), `${JSON.stringify(mapping, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", newMoves: 72, initialAgreements: 61, initialDisagreements: 11, agreementRate: comparison.totals.agreementRate, disputesByDebate: Object.fromEntries(debateReports.map((item) => [item.debateNumber, item.disputeCount])), adjudicationContextsRequired: 3, scoringAuthorized: false }, null, 2));
