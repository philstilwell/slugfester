#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { V213_AUDIO_ADJ_ROOT } from "./lib/assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs";
import {
  classifyTransportEventCount,
  extractTransportEvents
} from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const manifest = JSON.parse(
  await readFile(`${V213_AUDIO_ADJ_ROOT}/execution-manifest.json`, "utf8")
);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  manifest.status === "frozen-one-v2.1.3-audio-attribution-context-authorized" &&
    manifest.authorization.modelExecution &&
    manifest.model.label === "5.6 Sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.model.authentication === "ChatGPT subscription",
  "v2.1.3 audio-attribution execution unauthorized"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  await access(future).then(
    () => { throw new Error(`future output already exists: ${future}`); },
    () => true
  );
}
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const temporary = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-v213-audio-adj-")
);
const temporaryCodexHome = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-v213-audio-home-")
);
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  const copies = [
    [manifest.context.workflow, "workflow.md"],
    [manifest.context.manual, "manual.md"],
    [manifest.context.schema, "schema.json"],
    [manifest.context.packet, "packet.json"],
    [manifest.context.rawDiarizedTranscripts[0], "audio-transcript.json"],
    [manifest.context.diagnosis, "diagnosis.json"]
  ];
  for (const [source, target] of copies) {
    await copyFile(path.resolve(root, source), path.join(temporary, target));
  }
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
    delete environment[key];
  }
  const prompt =
    "Read workflow.md, manual.md, schema.json, packet.json, audio-transcript.json, and diagnosis.json completely and no other files. Act only as the isolated 5.6 Sol/low audio-attribution adjudicator for Debate 78. Decide only whether the expected speaker authored the locked core proposition and cite exact diarized segment indexes. Ratings, scores, legacy data, other debates, winners, and publication prose are unavailable. Return exactly one schema-conforming JSON object and no commentary.";
  const invocation = await run(
    codex,
    [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "--model",
      manifest.model.slug,
      "-c",
      `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
      "--disable", "plugins",
      "--disable", "remote_plugin",
      "--disable", "skill_search",
      "--disable", "apps",
      "--disable", "memories",
      "--disable", "multi_agent",
      "--disable", "browser_use",
      "--disable", "computer_use",
      "--disable", "workspace_dependencies",
      "--sandbox", "read-only",
      "--output-schema", "schema.json",
      "--output-last-message", "result.json",
      prompt
    ],
    { cwd: temporary, env: environment },
    manifest.executionPolicy.perInvocationTimeoutMs
  );
  const events = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(events.length, 2, 8);
  const base = {
    debateNumber: manifest.context.debateNumber,
    disputedMoves: manifest.context.disputedMoves,
    model: manifest.model.label,
    reasoningEffort: manifest.model.reasoningEffort,
    attemptCount: 1,
    retryCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    timedOut: invocation.timedOut,
    terminationSignal: invocation.signal,
    commandExitCode: invocation.code,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    meteredApiCostUsd: 0,
    paidTranscriptionCalls: 0,
    recoverableStreamEvents: events.length,
    transportClassification,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    stderrTail: invocation.stderr.trim().slice(-6000) || null
  };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) {
    record = {
      ...base,
      status: invocation.timedOut ? "timed-out" : "transport-failed",
      outputWritten: false,
      deterministicValidationPassed: false,
      gateAcceptancePassed: false
    };
  } else {
    await copyFile(path.join(temporary, "result.json"), manifest.context.output);
    const validation = await run(
      process.execPath,
      [
        "scripts/validate-assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs",
        manifest.context.output,
        manifest.context.packet
      ],
      { cwd: root, env: process.env },
      120000
    );
    const valid = validation.code === 0 && transportClassification !== "invalid";
    record = {
      ...base,
      status: valid
        ? `completed-valid-${transportClassification}`
        : validation.code !== 0
          ? "output-validation-failed"
          : "transport-event-limit-exceeded",
      outputWritten: true,
      outputSha256: sha256(await readFile(manifest.context.output)),
      deterministicValidationPassed: validation.code === 0,
      gateAcceptancePassed: valid,
      validationSummary:
        validation.code === 0 ? JSON.parse(validation.stdout) : null,
      validationMessage:
        validation.code === 0
          ? null
          : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000)
    };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}
const execution = {
  schemaVersion:
    "1.0-score-stability-v2.1.3-audio-attribution-adjudication-model-execution",
  protocolId: manifest.protocolId,
  status: record.gateAcceptancePassed
    ? "v2.1.3-audio-attribution-adjudication-execution-passed"
    : "v2.1.3-audio-attribution-adjudication-execution-failed",
  contexts: 1,
  attempts: 1,
  retries: 0,
  meteredApiCostUsd: 0,
  paidTranscriptionCalls: 0,
  scoresDerived: 0,
  result: record,
  authorization: {
    analysis: record.gateAcceptancePassed,
    furtherRetry: false,
    disputeAdjudicationPacketPreparation: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: execution.status,
      elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)),
      attempts: 1,
      retries: 0,
      deterministicValidationPassed: record.deterministicValidationPassed,
      meteredApiCostUsd: 0,
      paidTranscriptionCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
assertV4(
  record.gateAcceptancePassed,
  "v2.1.3 audio-attribution adjudication failed; downstream work is blocked"
);
