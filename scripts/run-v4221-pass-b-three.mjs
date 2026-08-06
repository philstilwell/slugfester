#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV4220SourceLedger } from "./lib/v4220-source-span-rendering.mjs";
import { V4221_ROOT, reconstructV4221PassB, validateV4221PassBOutput } from "./lib/v4221-pass-b-consensus.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function invoke(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const manifest = JSON.parse(await readFile(`${V4221_ROOT}/execution-manifest.json`, "utf8"));
assertV4(manifest.status === "frozen-three-isolated-source-span-pass-b-contexts-authorized" && manifest.authorization.passBModelContexts && !manifest.authorization.scoreDerivation, "v4.2.21 Pass B execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
for (const context of manifest.contexts) {
  const [sourcePacket, events, ledger] = await Promise.all([readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
  validateV4220SourceLedger(ledger, JSON.parse(events), sourcePacket.transportChain.sourceLedgerSha256);
}
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(authSource);
const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `v4221-pass-b-${context.debateNumber}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `v4221-pass-b-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(), started = Date.now();
  let record;
  try {
    const copies = [[manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"], [manifest.modelInputs.rubricBounded, "rubric-bounded.md"], [manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [context.passBPacket, "packet.json"], [context.sourceLedger, "source-ledger.jsonl"]];
    for (const [source, target] of copies) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome }; delete env.OPENAI_API_KEY; delete env.OPENAI_ORG_ID; delete env.CODEX_API_KEY;
    process.stdout.write(`[v4.2.21-pass-b] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const prompt = `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, workflow.md, manual.md, packet.json, schema.json, and every line of source-ledger.jsonl; read nothing else. Act only as the isolated Pass B judge for Debate ${context.debateNumber}. Independently judge every locked move in lockedMoveOrder. Do not alter or emit move inventory, source spans, excerpts, quotations, response classes, absolute responsiveness values, totals, scores, winner labels, Overall Commentary, AI Extension material, or publication prose. For reply targets, use only earlier locked moves. Silently verify all schema and rubric rules. Return exactly one schema-conforming JSON object.`;
    const invocation = await invoke(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
    const transportEvents = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEvents.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const exists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, recoverableStreamEvents: transportEvents.length, transportClassification, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !exists) record = { ...base, status: invocation.timedOut ? "timed-out" : !exists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, rawOutputWritten: false, reconstructedOutputWritten: false };
    else {
      await mkdir(path.dirname(context.rawOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.rawOutput);
      let validation = null, validationMessage = null;
      try {
        const [output, packet, sourcePacket, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.passBPacket, "utf8").then(JSON.parse), readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
        validation = validateV4221PassBOutput(output, packet, sourcePacket, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
        if (transportClassification !== "invalid") { await mkdir(path.dirname(context.reconstructedOutput), { recursive: true }); await writeFile(context.reconstructedOutput, `${JSON.stringify(reconstructV4221PassB(packet, output), null, 2)}\n`); }
      } catch (error) { validationMessage = error.stack ?? error.message; }
      const valid = validation?.status === "passed" && transportClassification !== "invalid";
      record = { ...base, status: valid ? `completed-valid-${transportClassification}` : validation ? "transport-event-limit-exceeded" : "output-validation-failed", gateAcceptancePassed: valid, rawOutputWritten: true, rawOutputSha256: sha256(await readFile(context.rawOutput)), reconstructedOutputWritten: valid, reconstructedOutputSha256: valid ? sha256(await readFile(context.reconstructedOutput)) : null, deterministicValidationPassed: validation?.status === "passed", deterministicReconstructionPassed: valid, validationSummary: validation, validationMessage: validationMessage?.slice(-8000) ?? null };
    }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(codexHome, { recursive: true, force: true }); }
  results.push(record);
  process.stdout.write(`[v4.2.21-pass-b] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}
const passed = results.length === manifest.contexts.length && results.every((result) => result.gateAcceptancePassed);
const execution = { schemaVersion: "4.2.21-isolated-pass-b-model-execution", protocolId: manifest.protocolId, status: passed ? "three-isolated-source-span-pass-b-contexts-passed" : "three-isolated-source-span-pass-b-contexts-failed", contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((result) => result.gateAcceptancePassed).length, attempts: results.length, retries: 0, correctionContexts: 0, totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), meanElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length, results, meteredApiCostUsd: 0, transcriptionCostUsd: 0, authorization: { analysis: true, retry: false, correctionModelExecution: false, audioExecution: false, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, attempts: execution.attempts, retries: 0, elapsedMinutesByDebate: Object.fromEntries(results.map((result) => [result.debateNumber, Number((result.elapsedMs / 60000).toFixed(2))])), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, null, 2));
