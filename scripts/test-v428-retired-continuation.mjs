#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { canonicalJson, assertV4 } from "./lib/v41-lean-production.mjs";
import { compileV425PrimaryOutput, validateV425PrimaryOutput } from "./lib/v425-conservative-excerpt.mjs";
import { validateV426SourceLedger } from "./lib/v426-retired-completion.mjs";
import { compileV427Correction, validateV427Correction } from "./lib/v427-bounded-correction.mjs";
import { V428_DEBATE_NUMBERS, V428_ROOT } from "./lib/v428-retired-continuation.mjs";

const preparation = JSON.parse(await readFile(`${V428_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-four-untouched-retired-primaries", "v4.2.8 preparation invalid");
assertV4(canonicalJson(preparation.contexts.map((context) => context.debateNumber)) === canonicalJson(V428_DEBATE_NUMBERS), "v4.2.8 context order changed");

for (const context of preparation.contexts) {
  const [packet, eventBytes, ledgerBytes] = await Promise.all([
    readFile(context.packet, "utf8").then(JSON.parse),
    readFile(context.originalEvents),
    readFile(context.sourceLedger)
  ]);
  validateV426SourceLedger(ledgerBytes, JSON.parse(eventBytes), packet.transportChain.sourceLedgerSha256);
  await access(context.rawOutput).then(
    () => { throw new Error(`${context.debateNumber}: future raw output already exists`); },
    () => true
  );
  await access(context.compiledOutput).then(
    () => { throw new Error(`${context.debateNumber}: future compiled output already exists`); },
    () => true
  );
}

const anchor = preparation.inheritedValidatedContexts.anchor;
const anchorPacket = JSON.parse(await readFile("docs/calibration/v4.2.5/conservative-excerpt-smoke/packet.json", "utf8"));
const [anchorOutput, anchorCompiled, anchorEventsBytes, anchorLedgerBytes] = await Promise.all([
  readFile(anchor.rawOutput, "utf8").then(JSON.parse),
  readFile(anchor.compiledOutput, "utf8").then(JSON.parse),
  readFile(anchorPacket.sourceChain.eventsPath),
  readFile(anchorPacket.transportChain.sourceLedgerPath)
]);
validateV425PrimaryOutput(anchorOutput, anchorPacket, JSON.parse(anchorEventsBytes), anchorEventsBytes, anchorLedgerBytes);
assertV4(canonicalJson(compileV425PrimaryOutput(anchorOutput, anchorPacket, JSON.parse(anchorEventsBytes))) === canonicalJson(anchorCompiled), "Debate 131 compilation replay failed");

const corrected = preparation.inheritedValidatedContexts.corrected;
const priorRoot = "docs/calibration/v4.2.6/conservative-excerpt-retired-completion";
const [correctedOutput, originalOutput, correctedCompiled, correctedPacket, correctedEventsBytes, correctedLedgerBytes] = await Promise.all([
  readFile(corrected.correctedOutput, "utf8").then(JSON.parse),
  readFile(corrected.originalRaw, "utf8").then(JSON.parse),
  readFile(corrected.correctedCompiledOutput, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/packets/debate-106.json`, "utf8").then(JSON.parse),
  readFile(".assessment-cache/captions/syP-OtdCIho/events.json"),
  readFile(".assessment-cache/compact-ledgers/v4.2.4/debate-106.jsonl")
]);
validateV427Correction(correctedOutput, originalOutput, correctedPacket, JSON.parse(correctedEventsBytes), correctedEventsBytes, correctedLedgerBytes);
assertV4(canonicalJson(compileV427Correction(correctedOutput, correctedPacket, JSON.parse(correctedEventsBytes))) === canonicalJson(correctedCompiled), "Debate 106 correction compilation replay failed");

console.log(JSON.stringify({
  status: "passed",
  inheritedContextsReplayed: 2,
  untouchedContextsValidated: preparation.contexts.length,
  compactLedgersReplayedExactly: preparation.contexts.length,
  futureOutputsAbsent: preparation.contexts.length * 2,
  scoreFieldsAuthorized: 0
}, null, 2));
