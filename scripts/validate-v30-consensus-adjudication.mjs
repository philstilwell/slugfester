#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V30_ADJUDICATION_INPUTS, V30_MODEL, V30_RUBRIC, V30_WORKFLOW, assert, canonicalJson,
  equal, exactKeys, parseCanonicalJson, sha256
} from "./lib/v30-consensus.mjs";

const adjudicationArgument = process.argv[2];
const packetArgument = process.argv[3];
if (!adjudicationArgument || !packetArgument) throw new Error("Usage: node scripts/validate-v30-consensus-adjudication.mjs <adjudication.json> <dispute-packet.json>");
const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const workflowPath = "docs/assessment-workflow-v3.0.md";
const rubricPath = "docs/reassessment-rubric-v3.0.md";
const manualPath = `${gateRoot}/adjudication-manual.md`;
const schemaPath = `${gateRoot}/dispute-adjudication-schema.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [adjudicationText, packetText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(adjudicationArgument), read(packetArgument), read(workflowPath), read(rubricPath), read(manualPath), read(schemaPath)
]);
const adjudication = JSON.parse(adjudicationText);
const packet = JSON.parse(packetText);
JSON.parse(schemaText);
exactKeys(adjudication, ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "completedAt", "isolation", "source", "resolutions", "audit"], "adjudication");
assert(adjudication.schemaVersion === "3.0-dispute-adjudication" && adjudication.workflowVersion === V30_WORKFLOW && adjudication.rubricVersion === V30_RUBRIC && adjudication.model === V30_MODEL, "adjudication version mismatch");
assert(adjudication.debateId === packet.debateId && adjudication.debateNumber === packet.debateNumber && !Number.isNaN(Date.parse(adjudication.completedAt)), "adjudication identity mismatch");
exactKeys(adjudication.isolation, ["method", "allowedInputs", "goldUnavailable", "completePassesUnavailable", "nondisputedFieldsUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"], "adjudication.isolation");
assert(adjudication.isolation.method === "fresh-ephemeral-v3.0-dispute-only-adjudication" && equal([...adjudication.isolation.allowedInputs].sort(), [...V30_ADJUDICATION_INPUTS].sort()), "adjudication isolation invalid");
for (const key of ["goldUnavailable", "completePassesUnavailable", "nondisputedFieldsUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable"]) assert(adjudication.isolation[key] === true, `adjudication.isolation.${key} invalid`);
assert(adjudication.isolation.statement.trim().length >= 50, "adjudication isolation statement too short");
exactKeys(adjudication.source, ["disputePacketPath", "disputePacketSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "adjudication.source");
assert(adjudication.source.disputePacketPath === "dispute-packet.json" && adjudication.source.disputePacketSha256 === sha256(packetText), "adjudication packet hash mismatch");
assert(adjudication.source.workflowSha256 === sha256(workflowText) && adjudication.source.rubricSha256 === sha256(rubricText) && adjudication.source.manualSha256 === sha256(manualText) && adjudication.source.schemaSha256 === sha256(schemaText), "adjudication source hash mismatch");
const disputes = new Map(packet.cases.flatMap((item) => item.disputes.map((dispute) => [dispute.disputeId, { ...dispute, caseId: item.caseId }])));
assert(adjudication.resolutions.length === disputes.size, "adjudication resolution count mismatch");
const seen = new Set();
for (const [index, resolution] of adjudication.resolutions.entries()) {
  exactKeys(resolution, ["disputeId", "caseId", "fieldPath", "selection", "resolvedJson", "rationale"], `resolutions[${index}]`);
  const dispute = disputes.get(resolution.disputeId);
  assert(dispute && !seen.has(resolution.disputeId), `resolutions[${index}]: unexpected or duplicate dispute`);
  seen.add(resolution.disputeId);
  assert(resolution.caseId === dispute.caseId && resolution.fieldPath === dispute.fieldPath, `resolutions[${index}]: identity mismatch`);
  const parsed = parseCanonicalJson(resolution.resolvedJson, `resolutions[${index}].resolvedJson`);
  assert(canonicalJson(parsed) === resolution.resolvedJson && ["A", "B", "novel"].includes(resolution.selection), `resolutions[${index}]: selection invalid`);
  if (resolution.selection === "A") assert(resolution.resolvedJson === dispute.candidateAJson, `resolutions[${index}]: A selection mismatch`);
  if (resolution.selection === "B") assert(resolution.resolvedJson === dispute.candidateBJson, `resolutions[${index}]: B selection mismatch`);
  if (resolution.selection === "novel") assert(resolution.resolvedJson !== dispute.candidateAJson && resolution.resolvedJson !== dispute.candidateBJson, `resolutions[${index}]: novel selection duplicates a candidate`);
  assert(resolution.rationale.trim().length >= 60, `resolutions[${index}]: rationale too short`);
}
exactKeys(adjudication.audit, ["disputeCount", "allDisputesResolvedOnce", "unexpectedFieldsAdded", "scoresPresent"], "adjudication.audit");
assert(adjudication.audit.disputeCount === disputes.size && adjudication.audit.allDisputesResolvedOnce === true && adjudication.audit.unexpectedFieldsAdded === 0 && adjudication.audit.scoresPresent === false, "adjudication audit invalid");
console.log(JSON.stringify({ status: "passed", debateId: packet.debateId, disputeCount: disputes.size, adjudicationSha256: sha256(adjudicationText), selections: Object.fromEntries(["A", "B", "novel"].map((selection) => [selection, adjudication.resolutions.filter((item) => item.selection === selection).length])) }, null, 2));

