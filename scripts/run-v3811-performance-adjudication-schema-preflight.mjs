#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V3811_PERFORMANCE_ROOT, assertV3811 } from "./lib/v3811-performance-judgment.mjs";
import { V3811_ADJUDICATION_ROOT, validateV3811AdjudicationOutput } from "./lib/v3811-performance-adjudication.mjs";

const root = process.cwd();
const preflightRoot = `${V3811_ADJUDICATION_ROOT}/schema-preflight`;
const outputPath = `${preflightRoot}/output.json`;
const executionPath = `${preflightRoot}/execution.json`;
const packetPath = `${preflightRoot}/synthetic-packet.json`;
const preparationPath = `${V3811_ADJUDICATION_ROOT}/preparation-audit.json`;
const schemaPath = `${V3811_ADJUDICATION_ROOT}/adjudication-schema.json`;
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const run = (command, args, options = {}) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
});

assertV3811(!(await exists(preflightRoot)), `${preflightRoot} already exists`);
const preparation = JSON.parse(await bytes(preparationPath));
assertV3811(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.authorization.freezeAdjudicationExecutionManifest && !preparation.authorization.adjudicationModelExecution, "adjudication preparation invalid");
await access(codex);
await access(authSource);

const syntheticPacket = {
  schemaVersion: "3.8.11-performance-adjudication-packet",
  protocolId: "v3.8.11-performance-judgment-consensus",
  debateNumber: "55",
  debateId: "synthetic-schema-preflight",
  disputedMoves: [{
    moveId: "synthetic-move-1",
    candidates: {
      responseTuple: { candidate1: { class: "full-answer" }, candidate2: { class: "partial-answer" } },
      charityPair: null,
      ratings: { logicalCoherence: { candidate1: 70, candidate2: 80, absoluteDelta: 10 } },
    },
  }],
  burdenAdjustmentDisputes: [{ side: "pro", candidates: { candidate1: { value: 0 }, candidate2: { value: 1 } } }],
};
await mkdir(path.resolve(root, preflightRoot), { recursive: true });
await writeFile(path.resolve(root, packetPath), `${JSON.stringify(syntheticPacket, null, 2)}\n`);

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v3811-adjudication-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v3811-home-adjudication-preflight-"));
let execution;
try {
  await copyFile(path.resolve(root, schemaPath), path.join(temporary, "schema.json"));
  await copyFile(path.resolve(root, packetPath), path.join(temporary, "packet.json"));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAI_ORG_ID;
  delete environment.CODEX_API_KEY;
  const prompt = "Read packet.json completely. Return one synthetic adjudication JSON object using its debateNumber, debateId, move ID, candidate fields, and burden-adjustment side exactly. Include exactly one move decision: responseTupleChoice 1, charityPairChoice null, one logicalCoherence rating choice selecting 1, and a rationale of at least 40 characters. Include exactly one burden-adjustment decision selecting 1 with a rationale of at least 40 characters. Affirm every required isolation and audit field exactly. Do not include any other fields.";
  const startedAt = new Date().toISOString();
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", "gpt-5.6-sol", "-c", "model_reasoning_effort=\"low\"", "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment });
  assertV3811(invocation.code === 0 && invocation.signal === null, "adjudication schema endpoint preflight failed");
  await copyFile(path.join(temporary, "result.json"), path.resolve(root, outputPath));
  const output = JSON.parse(await bytes(outputPath));
  const validation = validateV3811AdjudicationOutput(output, syntheticPacket);
  execution = {
    schemaVersion: "3.8.11-performance-adjudication-schema-preflight-execution",
    protocolId: "v3.8.11-performance-judgment-consensus",
    status: "passed-exact-schema-endpoint-and-packet-validation",
    startedAt,
    completedAt: new Date().toISOString(),
    model: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    attempts: 1,
    retries: 0,
    commandExitCode: invocation.code,
    schemaPath,
    schemaSha256: sha256(await bytes(schemaPath)),
    packetPath,
    packetSha256: sha256(await bytes(packetPath)),
    outputPath,
    outputSha256: sha256(await bytes(outputPath)),
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    validation,
    authorization: {
      freezeThreeContextAdjudicationExecutionManifest: true,
      adjudicationModelExecution: false,
      scoreDerivation: false,
    },
  };
  await writeFile(path.resolve(root, executionPath), `${JSON.stringify(execution, null, 2)}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}

console.log(JSON.stringify({ status: execution.status, exactSharedSchemaEndpointAccepted: true, packetAwareValidationPassed: true, attempts: 1, meteredApiCostUsd: 0, freezeThreeContextAdjudicationExecutionManifestAuthorized: true, adjudicationModelExecutionAuthorized: false, scoreDerivationAuthorized: false }, null, 2));
