#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_ADJUDICATION_INPUTS, V32_ADJUDICATOR_MODEL, V32_RUBRIC, V32_WORKFLOW,
  assert, equal, sha256, validateAdjudicatedValue
} from "./lib/v32-risk-adjudication.mjs";
import { exactKeys } from "./lib/v30-consensus.mjs";

const [adjudicationArgument, packetArgument] = process.argv.slice(2);
if (!adjudicationArgument || !packetArgument) throw new Error("Usage: node scripts/validate-v32-risk-adjudication.mjs <adjudication.json> <dispute-packet.json>");
const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [adjudicationText, packetText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(adjudicationArgument), read(packetArgument), read("docs/assessment-workflow-v3.2.md"), read("docs/reassessment-rubric-v3.2.md"),
  read(`${gateRoot}/adjudication-manual.md`), read(`${gateRoot}/risk-adjudication-schema.json`)
]);
const adjudication = JSON.parse(adjudicationText), packet = JSON.parse(packetText);
JSON.parse(schemaText);
exactKeys(adjudication, ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "completedAt", "isolation", "source", "resolutions", "audit"], "adjudication");
assert(adjudication.schemaVersion === "3.2-risk-adjudication" && adjudication.workflowVersion === V32_WORKFLOW && adjudication.rubricVersion === V32_RUBRIC && adjudication.model === V32_ADJUDICATOR_MODEL, "adjudication identity invalid");
assert(adjudication.debateId === packet.debateId && adjudication.debateNumber === packet.debateNumber && !Number.isNaN(Date.parse(adjudication.completedAt)), "adjudication debate or time invalid");
assert(adjudication.isolation.method === "fresh-ephemeral-v3.2-risk-adjudication" && equal([...adjudication.isolation.allowedInputs].sort(), [...V32_ADJUDICATION_INPUTS].sort()), "adjudication isolation invalid");
for (const key of ["goldUnavailable", "completePassesUnavailable", "unflaggedFieldsUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable"]) assert(adjudication.isolation[key] === true, `adjudication.isolation.${key} invalid`);
assert(adjudication.isolation.statement.trim().length >= 50, "adjudication isolation statement too short");
assert(adjudication.source.disputePacketPath === "dispute-packet.json" && adjudication.source.disputePacketSha256 === sha256(packetText), "adjudication packet source mismatch");
assert(adjudication.source.workflowSha256 === sha256(workflowText) && adjudication.source.rubricSha256 === sha256(rubricText) && adjudication.source.manualSha256 === sha256(manualText) && adjudication.source.schemaSha256 === sha256(schemaText), "adjudication source hash mismatch");
const expected = new Map();
for (const itemCase of packet.cases) for (const field of itemCase.fields) expected.set(field.disputeId, { field, challengeCase: itemCase.lockedCase });
const seen = new Set();
for (const [index, resolution] of adjudication.resolutions.entries()) {
  exactKeys(resolution, ["disputeId", "caseId", "fieldPath", "selection", "resolvedJson", "rationale"], `resolutions[${index}]`);
  assert(expected.has(resolution.disputeId) && !seen.has(resolution.disputeId), `resolutions[${index}]: unexpected or duplicate dispute`);
  seen.add(resolution.disputeId);
  const { field, challengeCase } = expected.get(resolution.disputeId);
  assert(resolution.caseId === field.caseId && resolution.fieldPath === field.fieldPath, `resolutions[${index}]: identity mismatch`);
  validateAdjudicatedValue(field, resolution, challengeCase, `resolutions[${index}]`);
  assert(typeof resolution.rationale === "string" && resolution.rationale.trim().length >= 60, `resolutions[${index}]: rationale too short`);
}
assert(seen.size === packet.fieldCount && adjudication.resolutions.length === packet.fieldCount, "adjudication coverage mismatch");
assert(adjudication.audit.disputeCount === packet.fieldCount && adjudication.audit.allDisputesResolvedOnce === true && adjudication.audit.unexpectedFieldsAdded === 0 && adjudication.audit.scoresPresent === false, "adjudication audit invalid");
console.log(JSON.stringify({ status: "passed", debateId: packet.debateId, fieldCount: packet.fieldCount, counts: packet.counts, adjudicationSha256: sha256(adjudicationText) }, null, 2));
