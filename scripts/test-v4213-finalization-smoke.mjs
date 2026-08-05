#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
const ROOT = "docs/calibration/v4.2.13/compact-finalization-smoke", preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-one-retired-finalization-smoke" && preparation.policy.scoresLockedFromPacket && !preparation.policy.scoresDerived, "v4.2.13 preparation invalid");
execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", preparation.validationInputs.priorValidOutput, preparation.inputs.packet], { stdio: "pipe" });
for (const future of [preparation.output, `${ROOT}/execution-manifest.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed", debateNumber: preparation.debateNumber, priorFixtureValidated: true, scoresLockedFromPacket: true, runtimeThresholdMinutes: preparation.policy.runtimeThresholdMinutes, futureOutputsAbsent: 4, scoresDerived: 0 }, null, 2));
