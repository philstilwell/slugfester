#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { parseLedger } from "./lib/v429-long-context-partition.mjs";
import { buildV4212GoldProposal, buildV4212LeanBundle, compileAndValidateV4212, makeV4212Schema, V4212_PROTOCOL_ID, V4212_ROOT } from "./lib/v4212-lean-integrated-primary.mjs";

const shouldWrite = process.argv.includes("--write"), priorRoot = "docs/calibration/v4.2.10/integrated-long-context-primary";
const [authorization, priorPreparation, priorOutput, sourceBundle, packet, eventsBytes, ledgerBytes] = await Promise.all([
  readFile("docs/calibration/v4.2.11/lean-structural-correction/analysis.json", "utf8").then(JSON.parse),
  readFile(`${priorRoot}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/primary-output.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/candidate-bundle.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json", "utf8").then(JSON.parse),
  readFile(".assessment-cache/captions/UWCvKiWjV0g/events.json"),
  readFile(".assessment-cache/compact-ledgers/v4.2.4/debate-99.jsonl")
]);
assertV4(authorization.authorization.baseRuntimeOptimization && priorPreparation.status === "prepared-one-integrated-long-context-primary", "v4.2.12 base-runtime optimization unavailable");
const fullRows = parseLedger(ledgerBytes), leanBundle = buildV4212LeanBundle(sourceBundle), included = new Set(), contextRadius = 6;
for (const candidate of leanBundle.candidates) for (let event = Math.max(0, candidate.sourceSpan.startEvent - contextRadius); event <= Math.min(fullRows.length - 1, candidate.sourceSpan.endEvent + contextRadius); event += 1) included.add(event);
const sparseRows = [...included].sort((left, right) => left - right).map((eventId) => fullRows[eventId]), bundlePath = `${V4212_ROOT}/candidate-bundle.json`, sparsePath = `${V4212_ROOT}/candidate-context-ledger.jsonl`, schemaPath = `${V4212_ROOT}/schema.json`, goldPath = `${V4212_ROOT}/gold-fixture.json`;
const gold = buildV4212GoldProposal(priorOutput, leanBundle); compileAndValidateV4212(gold, leanBundle, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
if (shouldWrite) {
  await mkdir(V4212_ROOT, { recursive: true });
  await writeFile(bundlePath, `${JSON.stringify(leanBundle)}\n`);
  await writeFile(sparsePath, Buffer.from(sparseRows.map(JSON.stringify).join("\n") + "\n"));
  await writeFile(schemaPath, `${JSON.stringify(makeV4212Schema())}\n`);
  await writeFile(goldPath, `${JSON.stringify(gold, null, 2)}\n`);
}
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V4212_ROOT}/manual.md`, schema: schemaPath, packet: "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json", candidateBundle: bundlePath, candidateContextLedger: sparsePath };
const inputBytes = (await Promise.all(Object.values(inputs).map((file) => stat(file).then((entry) => entry.size)))).reduce((sum, bytes) => sum + bytes, 0), sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = { schemaVersion: "4.2.12-lean-integrated-primary-preparation", protocolId: V4212_PROTOCOL_ID, status: shouldWrite ? "prepared-one-lean-integrated-primary" : "preview", developmentOnly: true, AIOnly: true, debateNumber: "99", model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, source: { priorPreparation: `${priorRoot}/preparation-manifest.json`, priorValidOutput: `${priorRoot}/primary-output.json`, fullCandidateBundle: `${priorRoot}/candidate-bundle.json`, fullLedger: packet.transportChain.sourceLedgerPath, originalEvents: packet.sourceChain.eventsPath }, inputs, validationInputs: { goldFixture: goldPath, priorAnalysis: `${priorRoot}/analysis.json`, correctionAnalysis: "docs/calibration/v4.2.11/lean-structural-correction/analysis.json" }, sparseContext: { radiusEvents: contextRadius, originalEvents: packet.eventCount, deliveredEvents: sparseRows.length, deliveredFraction: Number((sparseRows.length / packet.eventCount).toFixed(4)), allCandidateSpansIncluded: leanBundle.candidates.every((candidate) => { for (let event = candidate.sourceSpan.startEvent; event <= candidate.sourceSpan.endEvent; event += 1) if (!included.has(event)) return false; return true; }), sparseLedgerSha256: sha256(Buffer.from(sparseRows.map(JSON.stringify).join("\n") + "\n")) }, outputs: { proposal: `${V4212_ROOT}/proposal.json`, primary: `${V4212_ROOT}/primary-output.json`, compiled: `${V4212_ROOT}/primary-compiled.json` }, policy: { oneAttempt: true, retries: 0, timeoutMs: 600000, scoreDerivationAuthorized: false, fullTranscriptDeliveredToIntegratedJudge: false, modelEmitsEvaluativeFieldsOnly: true }, totals: { candidates: leanBundle.candidateCount, copiedInputBytes: inputBytes, baselineInputBytes: priorPreparation.totals.copiedInputBytes, inputReductionFraction: Number((1 - inputBytes / priorPreparation.totals.copiedInputBytes).toFixed(4)), modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { executionManifest: false, modelExecution: false, validation: true, scoring: false, productionMutation: false } };
if (shouldWrite) await writeFile(`${V4212_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, candidates: leanBundle.candidateCount, sparseEvents: sparseRows.length, inputBytes, inputReductionFraction: preparation.totals.inputReductionFraction, goldFixtureValidated: true, meteredApiCostUsdMaximum: 0 }, null, 2));
