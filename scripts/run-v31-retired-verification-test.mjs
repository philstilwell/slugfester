#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V31_FAMILIES, assert } from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const manifest = JSON.parse(await readFile(path.resolve(root, gateRoot, "gate-manifest.json"), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const concurrency = Number(process.env.SLUGFESTER_SOL_CONCURRENCY ?? 3);
const skipRaw = process.argv.includes("--skip-raw");
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
};
const onlyFamily = valueAfter("--only-family");
const onlyDebates = new Set((valueAfter("--only-debates") ?? "").split(",").filter(Boolean));
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_SOL_CONCURRENCY must be 1-4");
assert(onlyFamily === null || V31_FAMILIES.includes(onlyFamily), "--only-family must name a v3.1 verification family");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}\n${stdout.slice(-4000)}\n${stderr.slice(-4000)}`)));
  });
}

async function pool(tasks) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      await tasks[index]();
    }
  });
  await Promise.all(workers);
}

async function solTask({ label, mappings, schemaName, outputPath, prompt }) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v31-"));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v31-home-"));
  try {
    for (const [source, target] of mappings) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(path.join(os.homedir(), ".codex", "auth.json"), path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    environment.CODEX_HOME = temporaryCodexHome;
    process.stdout.write(`\n[v3.1] starting ${label}\n`);
    await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", "gpt-5.6-sol", "-c", "model_reasoning_effort=\"xhigh\"",
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", schemaName, "--output-last-message", "result.json", prompt
    ], { cwd: temporary, env: environment });
    await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, outputPath));
    process.stdout.write(`[v3.1] completed ${label}\n`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

const sharedRaw = [
  ["docs/assessment-workflow-v3.1.md", "workflow.md"], ["docs/reassessment-rubric-v3.1.md", "rubric.md"],
  [`${gateRoot}/annotation-manual.md`, "manual.md"], [`${gateRoot}/consensus-pass-schema.json`, "schema.json"]
];
const rawTasks = [];
for (const debate of manifest.sample.debates) {
  for (const pass of ["A", "B"]) {
    const destination = manifest.outputs[debate.debateId][pass === "A" ? "passA" : "passB"];
    rawTasks.push(() => solTask({
      label: `Debate ${debate.debateNumber} Pass ${pass}`,
      mappings: [...sharedRaw, [debate.path, "input.json"]], schemaName: "schema.json", outputPath: destination,
      prompt: `Read all five allowlisted files in this directory. This is independent Pass ${pass}. Annotate every input case exactly once under workflow v3.1 and return only the JSON object required by schema.json. Compute every source SHA-256 from the local files. Use model label 5.6 Sol, pass ${pass}, calibrationOnly true, isolation method fresh-ephemeral-v3.1-consensus-pass, and allowedInputs [\"workflow.md\",\"rubric.md\",\"manual.md\",\"schema.json\",\"input.json\"]. No gold, other pass, verifier result, legacy assessment, score, commentary, or AI Extension is available. Do not browse or inspect anything outside this directory.`
    }));
  }
}
if (!skipRaw) await pool(rawTasks);

for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  await run(process.execPath, ["scripts/validate-v31-consensus-pass.mjs", outputs.passA, debate.path], { cwd: root, env: process.env });
  await run(process.execPath, ["scripts/validate-v31-consensus-pass.mjs", outputs.passB, debate.path], { cwd: root, env: process.env });
}
await run(process.execPath, ["scripts/extract-v31-semantic-disagreements.mjs", "--write"], { cwd: root, env: process.env });

const sharedVerification = [
  ["docs/assessment-workflow-v3.1.md", "workflow.md"], ["docs/reassessment-rubric-v3.1.md", "rubric.md"],
  [`${gateRoot}/verification-manual.md`, "manual.md"], [`${gateRoot}/field-verification-schema.json`, "schema.json"]
];
const verificationTasks = [];
for (const debate of manifest.sample.debates) {
  for (const family of V31_FAMILIES) {
    if (onlyFamily !== null && family !== onlyFamily) continue;
    if (onlyDebates.size > 0 && !onlyDebates.has(debate.debateId)) continue;
    const packet = debate.fieldPackets[family].path;
    const destination = manifest.outputs[debate.debateId].verifications[family];
    verificationTasks.push(() => solTask({
      label: `Debate ${debate.debateNumber} ${family} verifier`,
      mappings: [...sharedVerification, [packet, "field-packet.json"]], schemaName: "schema.json", outputPath: destination,
      prompt: `Read all five allowlisted files in this directory. Independently verify every ${family} field in field-packet.json, in packet order, and return only the JSON object required by schema.json. Compute every source SHA-256 from the local files. Use model label 5.6 Sol, family ${family}, isolation method fresh-ephemeral-v3.1-field-family-verification, and allowedInputs [\"workflow.md\",\"rubric.md\",\"manual.md\",\"schema.json\",\"field-packet.json\"]. Inside each resolvedJson, evidence offsets must use the exact keys startChar and endChar; never use start or end. For defect fields, the only eligible values are none, attribution-error, contradiction, ambiguity, scope-mismatch, unsupported-comparison, missing-premise, invalid-inference, evidential-insufficiency, and irrelevance; never invent, substitute, or output another label. No raw pass, candidate answer, agreement status, gold, other family, legacy assessment, score, commentary, or AI Extension is available. Prefer defaults unless exact source language satisfies the positive rule. Do not browse or inspect anything outside this directory.`
    }));
  }
}
await pool(verificationTasks);

for (const debate of manifest.sample.debates) {
  for (const family of V31_FAMILIES) {
    await run(process.execPath, ["scripts/validate-v31-field-verification.mjs", manifest.outputs[debate.debateId].verifications[family], debate.fieldPackets[family].path], { cwd: root, env: process.env });
  }
}
await run(process.execPath, ["scripts/merge-v31-verification-locks.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/analyze-v31-retired-verification-test.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/validate-v31-retired-verification-test.mjs"], { cwd: root, env: process.env });
console.log(JSON.stringify({ status: "complete", gateId: manifest.gateId, rawSolContextsExecuted: skipRaw ? 0 : rawTasks.length, rawSolContextsPreserved: skipRaw ? rawTasks.length : 0, focusedSolContexts: verificationTasks.length, meteredApiCostUsd: 0 }, null, 2));
