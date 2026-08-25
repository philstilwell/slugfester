#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("../", import.meta.url).pathname);
const rel = (path) => resolve(root, path);
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-tiekoetter-range-recovery-19";
const correctionPlanPath = `${stage}/correction-1-plan.json`;
const correctionActivationPath = `${stage}/correction-1-activation.json`;
const originalRunnerPath = "scripts/run-assessment-production-post-canary-batch-09-debate-183-tiekoetter-range-recovery-19.mjs";
const temporaryRunnerPath = "scripts/.batch-09-debate-183-tiekoetter-range-recovery-19-correction-1.tmp.mjs";
const from = "completeThree-sourceFourClipCohortReady: true";
const to = "completeThreeSourceFourClipCohortReady: true";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => sha256(await read(path));

const plan = await readJson(correctionPlanPath);
const activation = await readJson(correctionActivationPath);
assert.equal(activation.plan.sha256, await fileHash(correctionPlanPath));
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await fileHash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} source hash mismatch`);
for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} activation source hash mismatch`);
assert.equal(await stat(rel(temporaryRunnerPath)).then(() => true, () => false), false, `${temporaryRunnerPath} already exists`);

const original = (await read(originalRunnerPath)).toString("utf8");
assert.equal(sha256(original), plan.originalRunner.sha256);
assert.equal(original.split(from).length - 1, 1, "frozen invalid key occurrence count mismatch");
const corrected = original.replace(from, to);
assert.equal(sha256(corrected), activation.reconstructedRunnerSha256);
await writeFile(rel(temporaryRunnerPath), corrected, { flag: "wx" });
try {
  const { stdout, stderr } = await execFileAsync(process.execPath, [rel(temporaryRunnerPath)], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    timeout: 240000
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
} finally {
  await unlink(rel(temporaryRunnerPath)).catch(() => {});
}
