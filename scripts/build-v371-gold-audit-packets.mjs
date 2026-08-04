#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./lib/v36-decision-cards.mjs";
import { makeAuditSchema, optionValues, questionFor, V371_AUDIT_SOURCE, V371_DEBATES, V371_INITIAL_PASSES, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const source = JSON.parse(await readFile(path.resolve(root, V371_AUDIT_SOURCE), "utf8"));
const disputes = [...source.consensusAgainstRetiredGold, ...source.crossModelDisagreements].sort((left, right) => left.key.localeCompare(right.key));
const mapping = { schemaVersion: "3.7.1-sealed-option-map", status: "sealed-from-model-contexts", passes: {} };
let auditIndex = 0;

function contextOnly(sourceCase) {
  const omitted = new Set(["family", "caseId", "moveId", "debateId", "debateNumber", "lane", "speakerAttributionConfidence", "sourceExcerpt"]);
  return Object.fromEntries(Object.entries(sourceCase).filter(([key]) => !omitted.has(key)));
}

for (const reviewerPass of V371_INITIAL_PASSES) {
  mapping.passes[reviewerPass] = {};
  for (const debateNumber of V371_DEBATES) {
    const debateDisputes = disputes.filter((item) => item.sourceCase.debateNumber === debateNumber);
    const decisions = debateDisputes.map((dispute) => {
      const auditId = `audit-${String(++auditIndex).padStart(3, "0")}`;
      const values = optionValues(dispute);
      const shift = reviewerPass === "pass-a" ? (auditIndex - 1) % values.length : auditIndex % values.length;
      const ordered = [...values.slice(shift), ...values.slice(0, shift)];
      const candidates = ordered.map((value, index) => ({ optionId: `option-${index + 1}`, value }));
      const options = candidates.map((candidate) => ({
        optionId: candidate.optionId,
        semanticValue: candidate.value,
        matchesRetiredExpected: canonicalJson(candidate.value) === canonicalJson(dispute.retiredExpected),
        selectedByTerra: canonicalJson(candidate.value) === canonicalJson(dispute.terra),
        selectedBySol: canonicalJson(candidate.value) === canonicalJson(dispute.sol)
      }));
      return { dispute, auditId, candidates, options };
    });
    const packet = {
      schemaVersion: "3.7.1-audit-packet",
      debateNumber,
      reviewerPass,
      lane: debateDisputes[0]?.sourceCase.lane,
      allSpeakerAttributionConfidenceHigh: debateDisputes.every((item) => item.sourceCase.speakerAttributionConfidence === "high"),
      decisions: decisions.map(({ dispute, auditId, candidates }) => ({
        auditId,
        family: dispute.family,
        caseId: dispute.caseId,
        moveId: dispute.sourceCase.moveId,
        fieldPath: dispute.fieldPath,
        speakerAttributionConfidence: dispute.sourceCase.speakerAttributionConfidence,
        sourceExcerpt: dispute.sourceCase.sourceExcerpt,
        decisionContext: contextOnly(dispute.sourceCase),
        question: questionFor(dispute),
        candidates
      }))
    };
    const schema = makeAuditSchema(packet);
    mapping.passes[reviewerPass][debateNumber] = { decisions: decisions.map(({ dispute, auditId, options }) => ({ auditId, key: dispute.key, family: dispute.family, caseId: dispute.caseId, fieldPath: dispute.fieldPath, options })) };
    if (shouldWrite) {
      const packetPath = path.resolve(root, V371_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`);
      const schemaPath = path.resolve(root, V371_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
  auditIndex = 0;
}

const mappingPath = path.resolve(root, V371_ROOT, "sealed-option-map.json");
if (shouldWrite) { await mkdir(path.dirname(mappingPath), { recursive: true }); await writeFile(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debateCount: V371_DEBATES.length, passCount: V371_INITIAL_PASSES.length, disputedFieldCount: disputes.length }, null, 2));
