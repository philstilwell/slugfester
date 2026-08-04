#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT } from "./lib/v388-burden-contact.mjs";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const packetPath = `${V388_CONTACT_ROOT}/evidence-recovery/packet.json`;
const schemaPath = `${V388_CONTACT_ROOT}/evidence-recovery/schema.json`;
const packet = JSON.parse(await readFile(path.resolve(root, packetPath), "utf8"));
const dryPath = `${V388_CONTACT_ROOT}/evidence-recovery/dry-output.json`;
const dry = { schemaVersion: "3.8.8-burden-contact-evidence-recovery-output", recoveryId: packet.recoveryId, reviewerRole: "evidence-recovery-reviewer", repairs: packet.targets.map((target) => ({ bundleId: target.bundleId, replacementEvidenceText: target.atomicExcerpt, evidenceRationale: "The full locked atomic excerpt is necessarily an exact case-sensitive substring of itself and occurs once. It preserves the immutable selected option and rationale while proving that this recovery schema can repair only the textual evidence anchor." })) };
if (shouldWrite) await writeFile(path.resolve(root, dryPath), `${JSON.stringify(dry, null, 2)}\n`);
const result = spawnSync(process.execPath, ["scripts/validate-v388-contact-evidence-recovery.mjs", dryPath, packetPath, schemaPath], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
console.log(JSON.stringify({ schemaVersion: "3.8.8-contact-evidence-recovery-dry-fixture", status: "passed", recoveryId: packet.recoveryId, contexts: 1, repairs: 2, semanticChanges: 0, scoreFields: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
