#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileV422116LockedInventory, V422116_PROTOCOL_ID } from "./lib/v422116-decomposed-consensus.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] = process.argv.slice(2);
assertV4(proposalPath && preparationPath && debateNumber, "usage: validate-v422116-inventory.mjs PROPOSAL PREPARATION DEBATE [--write]");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.protocolId === V422116_PROTOCOL_ID && preparation.status === "retired-partition-three-inventory-contexts-prepared", "inventory preparation unavailable");
const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
assertV4(context, `${debateNumber}: unknown inventory context`);
const [proposal, evidenceBundle, eventsDocument] = await Promise.all([proposalPath, context.candidateEvidenceBundle, context.originalEvents].map((file) => readFile(file, "utf8").then(JSON.parse)));
const compiled = compileV422116LockedInventory(proposal, evidenceBundle, eventsDocument);
const summary = { schemaVersion: "4.2.21.16-score-blind-inventory-validation", protocolId: V422116_PROTOCOL_ID, status: "passed", debateNumber, sections: compiled.lockedInventory.sections.length, moves: compiled.lockedInventory.moves.length, lockedInventorySha256PendingPacketConstruction: true, finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact, ratingsAbsent: compiled.validation.ratingsAbsent, responseTopologyAbsent: compiled.validation.responseTopologyAbsent, semanticRepairPerformed: false, scoresDerived: 0 };
if (writeFlag === "--write") {
  for (const output of [context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput]) await mkdir(path.dirname(output), { recursive: true });
  await writeFile(context.lockedInventoryOutput, `${JSON.stringify(compiled.lockedInventory, null, 2)}\n`);
  await writeFile(context.validationOutput, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(context.provenanceOutput, `${JSON.stringify(compiled.provenance, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
