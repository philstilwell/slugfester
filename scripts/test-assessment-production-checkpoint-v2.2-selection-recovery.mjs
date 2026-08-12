#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const selection = JSON.parse(
  await readFile(`${ROOT}/selection.json`, "utf8")
);
const preparation = JSON.parse(
  await readFile(`${ROOT}/selection-recovery-preparation.json`, "utf8")
);
const failure = JSON.parse(
  await readFile(`${ROOT}/selection-failure.json`, "utf8")
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
assert.equal(
  selection.status,
  "fresh-disjoint-ten-debate-production-checkpoint-v2.2-source-gate-passed-after-exact-source-repair"
);
for (const [file, expected] of Object.entries(selection.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    expected,
    `${file}: recovered selection source hash mismatch`
  );
}
assert.deepEqual(
  selection.selected.map((item) => item.debateNumber),
  failure.deterministicProspectiveSelection.map((item) => item.debateNumber)
);
assert.deepEqual(
  selection.selected.map((item) => item.debateNumber),
  preparation.prospectiveSelection.map((item) => item.debateNumber)
);
assert.deepEqual(
  selection.selected.map((item) => item.debateNumber),
  ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"]
);
assert.equal(selection.productionCanary, true);
assert.equal(selection.developmentValidationOnly, false);
assert.equal(selection.stagingOnly, true);
assert.equal(selection.activePolicy.version, "v2.2");
assert.equal(selection.selected.length, 10);
assert.equal(
  selection.selected.filter((item) => item.sourceChainOverlayApplied).length,
  1
);
assert.equal(
  selection.selected.find((item) => item.debateNumber === "167")
    .sourceChainOverlayApplied,
  true
);
for (const item of selection.selected) {
  const events = normalizeV418Events(
    JSON.parse(await readFile(item.sourceChain.events, "utf8"))
  );
  assert.equal(events.length, item.eventCount);
  assert(Object.values(item.sourceGate).every(Boolean));
}
assert.equal(selection.recoveryBoundary.deterministicRankingChanged, false);
assert.equal(selection.recoveryBoundary.replacementDebatesUsed, 0);
assert.equal(selection.recoveryBoundary.sourceChainOverlaysUsed, 1);
assert.equal(selection.selectionPolicy.scoreAccessed, false);
assert.equal(selection.selectionPolicy.winnerAccessed, false);
assert.equal(selection.selectionPolicy.legacyAssessmentAccessed, false);
assert.equal(selection.modelBoundary.label, "5.6 Sol");
assert.equal(selection.modelBoundary.reasoningEffort, "low");
assert.equal(selection.modelBoundary.authentication, "ChatGPT subscription");
assert.equal(selection.modelBoundary.scoreBlind, true);
assert(Object.values(selection.stopRules).every(Boolean));
assert.equal(selection.totals.sourceGateFailuresAfterRepair, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidTranscriptionCalls, 0);
assert.equal(selection.totals.scoresDerived, 0);
assert.equal(selection.authorization.checkpointManifestPreparation, true);
assert.equal(selection.authorization.sourcePacketPreparation, false);
assert.equal(selection.authorization.discoveryModelExecution, false);
assert.equal(selection.authorization.paidTranscription, false);
assert.equal(selection.authorization.scoreDerivation, false);
assert.equal(selection.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      selectedDebates: selection.selected.map((item) => item.debateNumber),
      sourceGateFailuresAfterRepair: 0,
      sourceChainOverlays: 1,
      replacementDebates: 0,
      modelContexts: 0,
      nextAuthorizedAction: selection.nextAuthorizedAction,
    },
    null,
    2
  )
);
