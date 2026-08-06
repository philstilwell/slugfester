#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV4221175AdjudicationOutput } from "./lib/v4221175-decomposed-adjudication.mjs";

const root = "docs/calibration/v4.2.21.17.5/dispute-only-adjudication";
const manifest = JSON.parse(await readFile(`${root}/execution-manifest.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-three-isolated-dispute-only-adjudication-contexts-authorized" && manifest.authorization.adjudicationModelContexts && !manifest.authorization.scoreDerivation, "adjudication execution is not authorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `v4221175-adjudication-${context.debateNumber}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `v4221175-adjudication-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    const copies = [
      [manifest.modelInputs.rubricBase, "rubric-base.md"],
      [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"],
      [manifest.modelInputs.rubricBounded, "rubric-bounded.md"],
      [manifest.modelInputs.workflow, "workflow.md"],
      [manifest.modelInputs.audioWorkflow, "audio-workflow.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [manifest.modelInputs.schema, "schema.json"],
      [context.packet, "packet.json"],
      ...context.audioTranscriptInputs.map((item) => [item.sourcePath, item.modelInputFile])
    ];
    for (const [source, target] of copies) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    delete env.OPENAI_API_KEY;
    delete env.OPENAI_ORG_ID;
    delete env.CODEX_API_KEY;
    const audioFiles = context.audioTranscriptInputs.map((item) => item.modelInputFile);
    process.stdout.write(`[v4.2.21.17.5-adjudication] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const prompt = `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, workflow.md, audio-workflow.md, manual.md, packet.json, schema.json${audioFiles.length ? `, and ${audioFiles.join(", ")}` : ""}; read nothing else. Act only as the isolated disputed-fields-only adjudicator for Debate ${context.debateNumber}. Decide every required candidate pair and scoring field exactly once from locked evidence. Candidate ordering is anonymous and may reverse independently. Never mix, average, interpolate, repair, rewrite, or invent a candidate. Never calculate a score or infer a pass identity, winner, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.`;
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
    const exists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, audioTranscriptInputs: audioFiles, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !exists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : !exists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, outputWritten: false, failureMessage: `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-8000) };
    } else {
      await mkdir(path.dirname(context.output), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.output);
      let validation = null;
      let validationMessage = null;
      try {
        validation = validateV4221175AdjudicationOutput(JSON.parse(await readFile(context.output, "utf8")), JSON.parse(await readFile(context.packet, "utf8")));
      } catch (error) {
        validationMessage = error.stack ?? error.message;
      }
      record = { ...base, status: validation?.status === "passed" ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: validation?.status === "passed", outputWritten: true, outputSha256: sha256(await readFile(context.output)), validationSummary: validation, validationMessage: validationMessage?.slice(-8000) ?? null };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  results.push(record);
  process.stdout.write(`[v4.2.21.17.5-adjudication] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}
const passed = results.every((result) => result.gateAcceptancePassed);
const execution = {
  schemaVersion: "4.2.21.17.5-dispute-only-adjudication-model-execution",
  protocolId: manifest.protocolId,
  status: passed ? "three-isolated-dispute-only-adjudication-contexts-passed" : "three-isolated-dispute-only-adjudication-contexts-failed",
  contextsPlanned: 3,
  contextsAttempted: results.length,
  validContexts: results.filter((result) => result.gateAcceptancePassed).length,
  attempts: results.length,
  retries: 0,
  corrections: 0,
  totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  meanElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length,
  results,
  meteredApiCostUsd: 0,
  transcriptionCostUsdThisStage: 0,
  scoresDerived: 0,
  authorization: { analysis: true, retry: false, correctionModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, attempts: execution.attempts, retries: 0, elapsedMinutesByDebate: Object.fromEntries(results.map((result) => [result.debateNumber, Number((result.elapsedMs / 60000).toFixed(2))])), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, scoresDerived: 0 }, null, 2));
