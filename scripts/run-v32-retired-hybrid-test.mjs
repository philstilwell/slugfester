#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  V32_ADJUDICATOR_MODEL_SLUG, V32_PASS_MODELS, V32_PASS_MODEL_SLUGS, assert
} from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const manifest = JSON.parse(await readFile(path.resolve(root, gateRoot, "gate-manifest.json"), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 3);
const skipRaw = process.argv.includes("--skip-raw");
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
};
const onlyDebates = new Set((valueAfter("--only-debates") ?? "").split(",").filter(Boolean));
const onlyRaw = new Set((valueAfter("--only-raw") ?? "").split(",").filter(Boolean));
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_MODEL_CONCURRENCY must be 1-4");

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
    while (next < tasks.length) await tasks[next++]();
  });
  await Promise.all(workers);
}

async function modelTask({ label, model, mappings, schemaName, outputPath, prompt }) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v32-"));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v32-home-"));
  try {
    for (const [source, target] of mappings) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(path.join(os.homedir(), ".codex", "auth.json"), path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.2] starting ${label} with ${model}\n`);
    await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model, "-c", "model_reasoning_effort=\"xhigh\"",
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", schemaName, "--output-last-message", "result.json", prompt
    ], { cwd: temporary, env: environment });
    await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, outputPath));
    process.stdout.write(`[v3.2] completed ${label}\n`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

const sharedRaw = [
  ["docs/assessment-workflow-v3.2.md", "workflow.md"], ["docs/reassessment-rubric-v3.2.md", "rubric.md"],
  [`${gateRoot}/annotation-manual.md`, "manual.md"], [`${gateRoot}/hybrid-pass-schema.json`, "schema.json"]
];
const rawTasks = [];
for (const debate of manifest.sample.debates) {
  for (const pass of ["A", "B"]) {
    if (onlyRaw.size > 0 && !onlyRaw.has(`${pass}@${debate.debateId}`)) continue;
    const destination = manifest.outputs[debate.debateId][pass === "A" ? "passA" : "passB"];
    const modelLabel = V32_PASS_MODELS[pass];
    rawTasks.push(() => modelTask({
      label: `Debate ${debate.debateNumber} Pass ${pass} (${modelLabel})`, model: V32_PASS_MODEL_SLUGS[pass],
      mappings: [...sharedRaw, [debate.path, "input.json"]], schemaName: "schema.json", outputPath: destination,
      prompt: `Read all five allowlisted files in this directory. This is independent Pass ${pass}. Annotate every input case exactly once under workflow v3.2 and return only the JSON object required by schema.json. Compute every source SHA-256 from the local files. Use model label ${modelLabel}, pass ${pass}, calibrationOnly true, isolation method fresh-ephemeral-v3.2-hybrid-pass, and allowedInputs [\"workflow.md\",\"rubric.md\",\"manual.md\",\"schema.json\",\"input.json\"]. Defect values are limited to none, attribution-error, contradiction, ambiguity, scope-mismatch, unsupported-comparison, missing-premise, invalid-inference, evidential-insufficiency, and irrelevance. Enforce these structural invariants before returning: if any component contact is true, relevantContraryMaterial must be false with null evidence; if target contact is false, every component is false, relevantContraryMaterial is false with null evidence, scope is same, and defect is none; consequence true requires a non-none defect. For every evidence object, verify sourceExcerpt.slice(startChar,endChar) equals text exactly; do not guess offsets. No gold, other pass, dispute packet, adjudication, legacy assessment, score, commentary, or AI Extension is available. Apply defaults first and do not browse or inspect anything outside this directory.`
    }));
  }
}
if (!skipRaw) await pool(rawTasks);

for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  await run(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", outputs.passA, debate.path], { cwd: root, env: process.env });
  await run(process.execPath, ["scripts/validate-v32-hybrid-pass.mjs", outputs.passB, debate.path], { cwd: root, env: process.env });
}
await run(process.execPath, ["scripts/extract-v32-risk-disputes.mjs", "--write"], { cwd: root, env: process.env });

const sharedAdjudication = [
  ["docs/assessment-workflow-v3.2.md", "workflow.md"], ["docs/reassessment-rubric-v3.2.md", "rubric.md"],
  [`${gateRoot}/adjudication-manual.md`, "manual.md"], [`${gateRoot}/risk-adjudication-schema.json`, "schema.json"]
];
const adjudicationTasks = [];
for (const debate of manifest.sample.debates) {
  if (onlyDebates.size > 0 && !onlyDebates.has(debate.debateId)) continue;
  const outputs = manifest.outputs[debate.debateId];
  adjudicationTasks.push(() => modelTask({
    label: `Debate ${debate.debateNumber} conservative risk adjudication`, model: V32_ADJUDICATOR_MODEL_SLUG,
    mappings: [...sharedAdjudication, [outputs.disputePacket, "dispute-packet.json"]], schemaName: "schema.json", outputPath: outputs.adjudication,
    prompt: `Read all five allowlisted files in this directory. Resolve every dispute-packet field exactly once, in packet order, and return only the JSON object required by schema.json. Compute source SHA-256 values locally. Use model label 5.6 Sol, isolation method fresh-ephemeral-v3.2-risk-adjudication, and allowedInputs [\"workflow.md\",\"rubric.md\",\"manual.md\",\"schema.json\",\"dispute-packet.json\"]. For semantic-conflict choose A or B only and copy that candidate JSON exactly. For high-risk-agreement or dependency-companion prefer retain; override only when the field card's exact rule is satisfied. Use only eligible defect values and exact startChar/endChar evidence keys. No gold, complete pass, unflagged field, legacy material, numerical score, commentary, or AI Extension is available. Do not browse or inspect anything outside this directory.`
  }));
}
await pool(adjudicationTasks);

for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  await run(process.execPath, ["scripts/validate-v32-risk-adjudication.mjs", outputs.adjudication, outputs.disputePacket], { cwd: root, env: process.env });
}
await run(process.execPath, ["scripts/merge-v32-hybrid-locks.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/analyze-v32-retired-hybrid-test.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/validate-v32-retired-hybrid-test.mjs"], { cwd: root, env: process.env });
console.log(JSON.stringify({ status: "complete", gateId: manifest.gateId, rawContextsExecuted: skipRaw ? 0 : rawTasks.length, rawContextsPreserved: skipRaw ? rawTasks.length : 0, adjudicatorContextsExecuted: adjudicationTasks.length, meteredApiCostUsd: 0 }, null, 2));
