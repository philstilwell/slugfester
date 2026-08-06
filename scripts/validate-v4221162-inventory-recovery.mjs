#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileV422116LockedInventory, V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";
import { V4221162_PROTOCOL_ID } from "./lib/v4221162-inventory-transport.mjs";

const [proposalPath, preparationPath, writeFlag] = process.argv.slice(2);
assertV4(proposalPath && preparationPath, "usage: validate-v4221162-inventory-recovery.mjs PROPOSAL PREPARATION [--write]");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.protocolId === V4221162_PROTOCOL_ID && preparation.status === "debate-182-inventory-transport-recovery-prepared", "inventory recovery preparation unavailable");
const context = preparation.context;
assertV4(context.debateNumber === "182", "inventory recovery is limited to Debate 182");
const [proposal, evidenceBundle, eventsDocument] = await Promise.all([proposalPath, context.validatorCandidateEvidenceBundle, context.originalEvents].map((file) => readFile(file, "utf8").then(JSON.parse)));
const compiled = compileV422116LockedInventory(proposal, evidenceBundle, eventsDocument);
const summary = { schemaVersion: "4.2.21.16.2-inventory-transport-recovery-validation", protocolId: V4221162_PROTOCOL_ID, status: "passed", debateNumber: "182", sections: compiled.lockedInventory.sections.length, moves: compiled.lockedInventory.moves.length, everyCandidateAvailableDuringSelection: true, omittedValidatorFieldsRestoredFromFullEvidenceBundle: true, finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact, ratingsAbsent: compiled.validation.ratingsAbsent, responseTopologyAbsent: compiled.validation.responseTopologyAbsent, semanticRepairPerformed: false, scoresDerived: 0 };
if (writeFlag === "--write") {
  for (const output of [context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput]) await mkdir(path.dirname(output), { recursive: true });
  await writeFile(context.lockedInventoryOutput, `${JSON.stringify(compiled.lockedInventory, null, 2)}\n`);
  await writeFile(context.validationOutput, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(context.provenanceOutput, `${JSON.stringify(compiled.provenance, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
