#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const SOURCE_PREPARATION = "docs/calibration/v4.2.21.12/simplified-partition-discovery/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.17/transport-canary";
const MANIFEST = `${ROOT}/canary-manifest.json`;
const SCHEMA = `${ROOT}/canary.schema.json`;
const RESULT = `${ROOT}/result.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
if (shouldWrite) for (const file of [MANIFEST, SCHEMA, RESULT, EXECUTION]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);

const sourcePreparation = JSON.parse(await readFile(SOURCE_PREPARATION, "utf8"));
const debate = sourcePreparation.contexts.find((context) => context.debateNumber === "133");
assertV4(debate && debate.chunks.length === 4, "retired Debate 133 canary source unavailable");
const chunk = debate.chunks[0];
const packet = JSON.parse(await readFile(debate.packet, "utf8"));
const schema = makeV422112DiscoverySchema({ packet, chunk });
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const span = schema.properties.candidates.items.properties.sourceSpan.properties;
const allowedSpeakers = schema.properties.candidates.items.properties.speaker.enum;
assertV4(span.startEvent.minimum === chunk.coreStartEvent && span.startEvent.maximum === chunk.coreEndEvent, "canary start-event bounds unavailable");
assertV4(span.endEvent.minimum === chunk.contextStartEvent && span.endEvent.maximum === chunk.contextEndEvent, "canary end-event bounds unavailable");
assertV4(allowedSpeakers.length === 2, "canary speaker allowlist unavailable");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.17.md",
  SOURCE_PREPARATION,
  sourcePreparation.inputs.manual,
  debate.packet,
  debate.plan,
  debate.fullLedger,
  debate.originalEvents,
  chunk.chunkLedgerPath,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/validate-v422112-discovery.mjs",
  "scripts/prepare-v42211717-transport-canary.mjs",
  "scripts/run-v42211717-transport-canary.mjs",
  "scripts/test-v42211717-transport-canary.mjs",
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.17.17-retired-transport-canary-manifest",
  protocolId: "v4.2.21.17.17-retired-transport-canary",
  status: "frozen-one-retired-transport-canary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  heldOut: false,
  retiredEvidenceOnly: true,
  source: {
    preparation: SOURCE_PREPARATION,
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    packet: debate.packet,
    plan: debate.plan,
    fullLedger: debate.fullLedger,
    originalEvents: debate.originalEvents,
    manual: sourcePreparation.inputs.manual,
    chunkId: chunk.chunkId,
    chunkLedgerPath: chunk.chunkLedgerPath,
    coreStartEvent: chunk.coreStartEvent,
    coreEndEvent: chunk.coreEndEvent,
    contextStartEvent: chunk.contextStartEvent,
    contextEndEvent: chunk.contextEndEvent,
  },
  schema: {
    path: SCHEMA,
    sha256: sha256(schemaBytes),
    candidateStartOwnedCoreBounds: true,
    candidateEndAvailableContextBounds: true,
    speakerAllowlist: allowedSpeakers,
  },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [1, 3] },
  executionPolicy: {
    attempts: 1,
    retriesMaximum: 0,
    timeoutMs: 300000,
    freshTemporaryCodexHome: true,
    freshSourceDirectory: true,
    APIKeysRemoved: true,
    separateFailedStdoutAndStderrTails: true,
  },
  artifacts: { result: RESULT, execution: EXECUTION },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [RESULT, EXECUTION],
  authorization: {
    oneRetiredModelContext: true,
    deterministicValidation: true,
    retry: false,
    freshHeldOutExecution: false,
    independentJudgmentExecution: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(SCHEMA, schemaBytes);
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debateNumber: debate.debateNumber,
  chunkId: chunk.chunkId,
  contextBytes: chunk.contextBytes,
  speakerAllowlist: allowedSpeakers,
  attempts: 1,
  retriesMaximum: 0,
  timeoutMinutes: 5,
  expectedWallMinutes: [1, 3],
  authentication: "ChatGPT subscription",
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0,
}, null, 2));
