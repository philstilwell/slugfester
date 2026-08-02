#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { calculateV21Ledger, V21_WORKFLOW } from "./lib/reassessment-scoring.mjs";

const root = process.cwd();
const calibrationDirectory = path.resolve(root, "docs/calibration/v2.1");
const ledgerDirectory = path.join(calibrationDirectory, "ledgers");
const definitionDirectory = path.join(calibrationDirectory, "benchmark-definitions");
const sourceManifestDirectory = path.join(calibrationDirectory, "source-manifests");
const pilot = JSON.parse(
  await readFile(path.join(calibrationDirectory, "pilot-manifest.json"), "utf8")
);
const errors = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

expect(pilot.workflowVersion === V21_WORKFLOW, "pilot manifest workflow version is wrong");
expect(pilot.calibrationOnly === true, "pilot manifest must remain calibration-only");
expect(pilot.selectionLockedBeforeScoring === true, "pilot selection lock is missing");
expect(pilot.debates?.length === 10, "the varied-debate pilot must contain exactly 10 debates");

const expectedIds = new Set(pilot.debates.map((debate) => debate.debateId));
expect(expectedIds.size === pilot.debates.length, "pilot debate IDs must be unique");

const ledgerEntries = (await readdir(ledgerDirectory)).filter((entry) => entry.endsWith(".json")).sort();
const definitionEntries = (await readdir(definitionDirectory)).filter((entry) => entry.endsWith(".json")).sort();
const sourceEntries = (await readdir(sourceManifestDirectory)).filter((entry) => entry.endsWith(".json")).sort();

for (const [label, entries] of [
  ["ledger", ledgerEntries],
  ["benchmark definition", definitionEntries],
  ["source manifest", sourceEntries]
]) {
  expect(entries.length === expectedIds.size, `${label} count must match the pilot selection`);
  const entryIds = new Set(entries.map((entry) => entry.replace(/\.json$/, "")));
  for (const debateId of expectedIds) {
    expect(entryIds.has(debateId), `missing ${label}: ${debateId}`);
  }
  for (const debateId of entryIds) {
    expect(expectedIds.has(debateId), `unexpected ${label}: ${debateId}`);
  }
}

for (const selected of pilot.debates) {
  const debateId = selected.debateId;
  try {
    const [ledgerSource, definitionSource, sourceManifestSource] = await Promise.all([
      readFile(path.join(ledgerDirectory, `${debateId}.json`), "utf8"),
      readFile(path.join(definitionDirectory, `${debateId}.json`), "utf8"),
      readFile(path.join(sourceManifestDirectory, `${debateId}.json`), "utf8")
    ]);
    const ledger = JSON.parse(ledgerSource);
    const definition = JSON.parse(definitionSource);
    const sourceManifest = JSON.parse(sourceManifestSource);
    const calculated = `${JSON.stringify(calculateV21Ledger(ledger), null, 2)}\n`;

    expect(calculated === ledgerSource, `${debateId}: computed ledger fields are stale or mismatched`);
    expect(ledger.calibrationOnly === true, `${debateId}: ledger must remain calibration-only`);
    expect(ledger.debateId === debateId, `${debateId}: ledger ID mismatch`);
    expect(definition.debateId === debateId, `${debateId}: definition ID mismatch`);
    expect(sourceManifest.debateId === debateId, `${debateId}: source manifest ID mismatch`);
    expect(definition.selectionProtocol?.lockedBeforeScoring === true, `${debateId}: benchmark selection was not locked`);
    expect(sourceManifest.sourceUrl === selected.youtubeUrl, `${debateId}: source URL mismatch`);
    expect(isSha256(sourceManifest.rawCaptionSha256), `${debateId}: raw-caption hash is invalid`);
    expect(isSha256(sourceManifest.normalizedEventsSha256), `${debateId}: normalized-event hash is invalid`);
    expect(isSha256(sourceManifest.transcriptSha256), `${debateId}: transcript hash is invalid`);
    expect(isSha256(sourceManifest.blindPacketSha256), `${debateId}: blind-packet hash is invalid`);
    expect(definition.transcriptSha256 === sourceManifest.transcriptSha256, `${debateId}: definition transcript hash mismatch`);
    expect(ledger.blindPacketSha256 === sourceManifest.blindPacketSha256, `${debateId}: ledger blind-packet hash mismatch`);
    expect(
      ledger.sourceManifest === `docs/calibration/v2.1/source-manifests/${debateId}.json`,
      `${debateId}: ledger source-manifest link mismatch`
    );
    expect(
      Date.parse(ledger.assessmentPasses.passA.completedAt) <=
        Date.parse(ledger.assessmentPasses.passB.completedAt),
      `${debateId}: Pass B must not precede Pass A`
    );

    const ledgerMoveIds = new Set();
    for (const side of ["pro", "con"]) {
      const definitionMove = definition.section.moves[side];
      const ledgerMove = ledger.sections[0].sides[side].moves[0];
      ledgerMoveIds.add(ledgerMove.id);
      expect(ledgerMove.id === definitionMove.id, `${debateId}.${side}: move ID mismatch`);
      expect(ledgerMove.timestamp === definitionMove.timestamp, `${debateId}.${side}: timestamp mismatch`);
      expect(
        ledgerMove.sourceSpan?.start === definitionMove.sourceSpan?.start &&
          ledgerMove.sourceSpan?.end === definitionMove.sourceSpan?.end,
        `${debateId}.${side}: source span mismatch`
      );
      expect(ledgerMove.sourceExcerpt === definitionMove.sourceExcerpt, `${debateId}.${side}: excerpt mismatch`);
      const excerptWordCount = ledgerMove.sourceExcerpt.split(/\s+/).filter(Boolean).length;
      expect(excerptWordCount === definitionMove.sourceExcerptWordCount, `${debateId}.${side}: excerpt word count mismatch`);
      expect(excerptWordCount <= 90, `${debateId}.${side}: committed source excerpt exceeds 90 words`);
      expect(
        sha256(ledgerMove.sourceExcerpt) === definitionMove.sourceExcerptSha256,
        `${debateId}.${side}: excerpt hash mismatch`
      );
      expect(
        !("score" in definitionMove) && !("critique" in definitionMove) && !("tags" in definitionMove),
        `${debateId}.${side}: benchmark definition leaked a legacy assessment field`
      );
    }
    for (const candidate of ledger.tagReview.candidates) {
      expect(ledgerMoveIds.has(candidate.moveId), `${debateId}: tag candidate references unknown move`);
    }
  } catch (error) {
    errors.push(`${debateId}: ${error.message}`);
  }
}

if (errors.length) {
  console.error(
    `v2.1 calibration validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`
  );
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${ledgerEntries.length} v2.1 calibration ledgers and their source chain.`);
