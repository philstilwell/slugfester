#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileAndValidateV422110Primary } from "./lib/v422110-structural-partition-primary.mjs";
import { compileV4220PrimaryOutput } from "./lib/v4220-source-span-rendering.mjs";

const [proposalPath, preparationPath, debateNumber] = process.argv.slice(2);
const shouldWrite = process.argv.includes("--write");
assertV4(proposalPath && preparationPath && debateNumber, "usage: validate-v422113-primary-a.mjs PROPOSAL PREPARATION DEBATE_NUMBER [--write]");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
assertV4(context, `${debateNumber}: Primary A context missing`);
const [proposal, packet, candidateBundle, eventsBytes, fullLedgerBytes] = await Promise.all([proposalPath, context.packet, context.candidateBundle, context.originalEvents, context.fullLedger].map((file) => readFile(file)).map(async (promise, index) => index < 3 ? JSON.parse(await promise) : promise));
const eventsDocument = JSON.parse(eventsBytes);
const result = compileAndValidateV422110Primary(proposal, { packet, candidateBundle, eventsDocument, eventsBytes, fullLedgerBytes });
const validationPacket = { ...structuredClone(packet), schemaVersion: "4.2.20-source-span-source-packet", protocolId: "v4.2.20-source-span-evidence-rendering" };
const compiled = compileV4220PrimaryOutput(result.output, validationPacket, eventsDocument);
const provenance = { schemaVersion: "4.2.21.13-partition-primary-a-provenance", protocolId: preparation.protocolId, debateNumber, proposal: proposalPath, candidateBundle: context.candidateBundle, rawOutput: context.rawOutput, compiledOutput: context.compiledOutput, moves: result.provenance };
if (shouldWrite) {
  for (const file of [context.rawOutput, context.compiledOutput, context.provenanceOutput]) await mkdir(path.dirname(file), { recursive: true });
  await writeFile(context.rawOutput, `${JSON.stringify(result.output, null, 2)}\n`);
  await writeFile(context.compiledOutput, `${JSON.stringify(compiled, null, 2)}\n`);
  await writeFile(context.provenanceOutput, `${JSON.stringify(provenance, null, 2)}\n`);
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
console.log(JSON.stringify({ status: "passed", debateNumber, sections: result.output.sections.length, moves: result.output.moves.length, structuralSideCounts: result.validation.structuralPartitionPrimary.oneToTwoMovesPerSidePerSection, unchangedV4220ValidatorPassed: true, immutableCandidateFieldsPreserved: result.provenance.every((item) => item.immutableCandidateFieldsPreserved), rawOutputSha256: sha256(Buffer.from(`${JSON.stringify(result.output, null, 2)}\n`)), compiledOutputSha256: sha256(Buffer.from(`${JSON.stringify(compiled, null, 2)}\n`)), modelAuthoredScores: 0, scoresDerived: 0 }, null, 2));
