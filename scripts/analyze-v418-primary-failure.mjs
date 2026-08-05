#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateV417PrimaryOutput } from "./lib/v417-fresh-validation.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import {
  V418_ROOT,
  bagOfWordsRecall,
  compileV418PrimaryOutput,
  lexicalTokens,
  orderedTokenCoverage,
  toV417CompiledPrimary
} from "./lib/v418-source-integrity.mjs";

const shouldWrite = process.argv.includes("--write");
const execution = JSON.parse(await readFile(path.resolve(V418_ROOT, "primary-model-execution.json"), "utf8"));
assertV4(execution.status === "primary-execution-failed-fast" && execution.contextsAttempted === 1 && execution.contextsSkipped === 5, "expected v4.1.8 fail-fast execution unavailable");
const result = execution.results[0];
assertV4(result.debateNumber === "52" && result.status === "output-validation-failed" && result.attemptCount === 1 && result.retryCount === 0, "unexpected v4.1.8 failure context");

const preparation = JSON.parse(await readFile(path.resolve(V418_ROOT, "preparation-manifest.json"), "utf8"));
const context = preparation.debates.find((item) => item.debateNumber === result.debateNumber);
const [packet, output, eventsBytes, rawBytes] = await Promise.all([
  readFile(context.packet, "utf8").then(JSON.parse),
  readFile(context.rawOutput, "utf8").then(JSON.parse),
  readFile(JSON.parse(await readFile(context.packet, "utf8")).sourceChain.eventsPath),
  readFile(context.rawOutput)
]);
const eventsDocument = JSON.parse(eventsBytes);
const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument.events;
const moves = output.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).map((move) => {
  const spanText = events.slice(move.sourceSpan.startEvent, move.sourceSpan.endEvent + 1).map((event) => event.text).join(" ");
  const tokenCount = lexicalTokens(move.sourceSpan.excerpt).length;
  return {
    moveId: move.moveId,
    excerptCharacters: move.sourceSpan.excerpt.length,
    excerptTokens: tokenCount,
    lexicalRecall: Number(bagOfWordsRecall(move.sourceSpan.excerpt, spanText).toFixed(6)),
    orderedCoverage: Number(orderedTokenCoverage(move.sourceSpan.excerpt, spanText).toFixed(6)),
    exceededFrozenNinetyTokenMaximum: tokenCount > 90
  };
});
const compiled = compileV418PrimaryOutput(output, packet, eventsDocument);
const inheritedPacket = { ...packet, schemaVersion: "4.1.7-bounded-source-only-packet", protocolId: "v4.1.7-fresh-six-validation" };
const inheritedValidation = validateV417PrimaryOutput(toV417CompiledPrimary(compiled), inheritedPacket);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const failure = {
  schemaVersion: "4.1.8-primary-failure-analysis",
  protocolId: "v4.1.8-source-integrity-fresh-six-validation",
  status: "failed-excerpt-compactness-contract",
  execution: { contextsPlanned: 6, contextsAttempted: 1, contextsSkipped: 5, attempts: 1, retries: 0, transportClassification: result.transportClassification, elapsedMs: result.elapsedMs, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  failedContext: { debateNumber: result.debateNumber, debateId: result.debateId, rawOutput: context.rawOutput, rawOutputSha256: sha256(rawBytes), compiledOutputCreated: false },
  diagnosis: {
    firstValidatorMessage: result.validationMessage,
    moves: moves.length,
    excerptsOverNinetyTokens: moves.filter((move) => move.exceededFrozenNinetyTokenMaximum).length,
    lexicalCoverageFailures: moves.filter((move) => move.lexicalRecall < 0.8).length,
    orderedCoverageFailures: moves.filter((move) => move.orderedCoverage < 0.8).length,
    inheritedJudgmentValidationPassed: inheritedValidation.status === "passed",
    sourceProvenanceFailure: false,
    endpointSchemaContainedCharacterMaximum: false,
    proseOnlyTokenMaximumWasInsufficientlyEnforced: true
  },
  moves,
  disposition: {
    v418GatePassed: false,
    rawOutputPreservedUnchanged: true,
    retryAuthorized: false,
    repairAuthorized: false,
    scoreDerivationAuthorized: false,
    legacyComparisonAuthorized: false,
    unusedV418DebatesReusableInNextGate: false,
    nextVersionMayAddProspectiveSchemaCompactnessBound: true
  }
};
if (shouldWrite) await writeFile(path.resolve(V418_ROOT, "primary-failure-analysis.json"), `${JSON.stringify(failure, null, 2)}\n`);
console.log(JSON.stringify({ status: failure.status, ...failure.execution, ...failure.diagnosis, scoreDerivationAuthorized: false, legacyComparisonAuthorized: false }, null, 2));
