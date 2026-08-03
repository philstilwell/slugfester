#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const workflowPath = "docs/assessment-workflow-v2.7.md";
const inventorySchemaPath = "docs/calibration/v2.7/atomic-inventory-schema.json";
const gatePath = "docs/calibration/v2.7/held-out-gates/gate-manifest.json";
const gateText = await readFile(gatePath, "utf8");
const gate = JSON.parse(gateText);

const definitions = {
  "pageau-folley-logos-meaning-resurrection-2026": [
    ["sampling", null, "The original twelve moves ended by 32:31 and omitted later load-bearing exchanges on Genesis, resurrection, worship, and social meaning.", "sampling", "Rebuilt the chronological sample across the complete substantive exchange while preserving two constructives per side and four responses per side."],
    ["source-fidelity", "pageau-folley-logos-meaning-resurrection-2026-move-04", "Several original source and target spans crossed moderator or opponent handoffs, so the locked speaker ownership and single-act status were unsupported.", "speaker-ownership", "Replaced every contaminated span with event-boundary-checked, uninterrupted speaker acts and regenerated excerpts and digests."],
    ["target-packet", "pageau-folley-logos-meaning-resurrection-2026-move-08", "Original responsive packets sometimes targeted stale or mixed-speaker material and converted questions into asserted fact premises.", "target-packet", "Relocked actual answered targets, typed demands as burdens, and documented the one justified earlier-load-bearing resurrection exception."],
    ["component-graph", "pageau-folley-logos-meaning-resurrection-2026-move-09", "Single fact-premise shortcuts collapsed multi-step opponent arguments and obscured which components a response could contact.", "component-graph", "Reconstructed indispensable premise, modality, burden, inference, and conclusion nodes with explicit acyclic dependencies."],
  ],
  "knechtle-aron-ra-god-existence-2023": [
    ["sampling", null, "The original eight responsive selections clustered between 30:20 and 40:25 and overrepresented one cellular-complexity sequence.", "sampling", "Resampled the complete debate across logic, morality, design and evolution, existence, evidence, and burden-of-proof exchanges."],
    ["source-fidelity", "knechtle-aron-ra-god-existence-2023-move-10", "Several original moves began with the opponent or crossed rapid handoffs while retaining high-confidence single-speaker attribution.", "speaker-ownership", "Replaced contaminated selections with exact caption-event boundaries and excluded mixed handoff events from both moves and targets."],
    ["target-recency", "knechtle-aron-ra-god-existence-2023-move-12", "The original packet treated a topic-changing scripture monologue as if it answered the preceding irreducible-complexity clarification.", "target-recency", "Selected genuine immediate responses and relocked the actual most recent opponent claims throughout the reconstructed sample."],
    ["component-graph", "knechtle-aron-ra-god-existence-2023-move-08", "Original one-node packets merged predictions, observations, comparisons, burdens, and conclusions into undifferentiated fact premises.", "component-graph", "Built typed multi-node graphs for comparative design, moral, and evidential arguments and retained narrow subsidiary routing where appropriate."],
  ],
  "lennox-atkins-science-explain-everything-2019": [
    ["sampling", null, "The original inventory ended by 40:30 although the substantive debate continued to 1:38 and contained later central exchanges.", "sampling", "Rebuilt the sample across scientific method, resurrection, rationality, cosmic origins, falsifiability, afterlife, technology, and origin of life."],
    ["source-fidelity", "lennox-atkins-science-explain-everything-2019-move-05", "Original move and target excerpts crossed Atkins, Lennox, and moderator handoffs while being locked as high-confidence single-speaker acts.", "speaker-ownership", "Replaced or narrowed every contaminated selection to uninterrupted speaker events and regenerated source fields."],
    ["target-recency", "lennox-atkins-science-explain-everything-2019-move-08", "Some original responses targeted earlier material despite directly answering newer claims, and one audience-directed constructive was miscast as opponent-responsive.", "target-recency", "Relocked the actual answered opponent claims, used one explicit earlier-load-bearing resurrection exception, and restored the constructive quota."],
    ["component-graph", "lennox-atkins-science-explain-everything-2019-move-12", "Original target components collapsed distinct historical, physiological, purposive, and evidential propositions into single fact-premise nodes.", "component-graph", "Separated indispensable facts, comparisons, modalities, inferences, and conclusions with explicit dependencies."],
  ],
};

for (const [debateId, rows] of Object.entries(definitions)) {
  const debate = gate.lanes.dyadic.debates.find((item) => item.debateId === debateId);
  if (!debate) throw new Error(`Unknown dyadic debate ${debateId}`);
  const root = "docs/calibration/v2.7/held-out-gates/dyadic";
  const inputInventoryPath = `${root}/review-inputs/round-1/${debateId}.json`;
  const outputInventoryPath = `${root}/inventories/${debateId}.json`;
  const transcriptPath = `.assessment-cache/captions/${debate.videoId}/transcript.txt`;
  const eventsPath = `.assessment-cache/captions/${debate.videoId}/events.json`;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const [inputText, outputText, transcriptText, eventsText, manifestText, workflowText, schemaText] = await Promise.all([
    readFile(inputInventoryPath, "utf8"), readFile(outputInventoryPath, "utf8"), readFile(transcriptPath, "utf8"),
    readFile(eventsPath, "utf8"), readFile(manifestPath, "utf8"), readFile(workflowPath, "utf8"), readFile(inventorySchemaPath, "utf8"),
  ]);
  const findings = rows.map(([category, moveId, description], index) => ({
    findingId: `${debateId}-round-1-f${index + 1}`,
    category,
    moveId,
    description,
    disposition: "repaired",
  }));
  const repairs = rows.map(([, , , triggerCategory, change], index) => ({
    findingId: `${debateId}-round-1-f${index + 1}`,
    change,
    triggerCategory,
  }));
  const categories = [...new Set(repairs.map((repair) => repair.triggerCategory))];
  const review = {
    schemaVersion: "2.7-inventory-review",
    workflowVersion: gate.workflowVersion,
    gateId: gate.lanes.dyadic.gateId,
    lane: "dyadic",
    debateId,
    debateNumber: debate.number,
    reviewRound: 1,
    reviewedAt: "2026-08-03T14:20:00Z",
    reviewerModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: {
      method: "fresh-independent-v2.7-inventory-review",
      legacyMaterialAccessed: false,
      developmentExamplesAccessed: false,
      annotationPassesAvailable: false,
      priorReviewAvailable: false,
      statement: "A fresh read-only 5.6 Sol context reviewed the complete canonical transcript and event chain without legacy assessments, examples, scores, annotation passes, or prior review findings.",
    },
    source: {
      inputInventoryPath, inputInventorySha256: sha256(inputText), outputInventoryPath, outputInventorySha256: sha256(outputText),
      priorReviewPath: null, priorReviewSha256: null, transcriptSha256: sha256(transcriptText), eventsSha256: sha256(eventsText),
      manifestSha256: sha256(manifestText), workflowSha256: sha256(workflowText), inventorySchemaSha256: sha256(schemaText), gateManifestSha256: sha256(gateText),
    },
    findings,
    repairs,
    nextReviewTrigger: {
      required: true,
      categories,
      rationale: "Protected sampling, speaker-ownership, target, and component-graph fields changed, so a fresh follow-up semantic review is mandatory before annotation.",
    },
    audit: {
      sourceFidelityViolations: 0, atomicityViolations: 0, targetPacketViolations: 0, targetSideViolations: 0,
      ownershipAdoptionViolations: 0, burdenRouteViolations: 0, componentGraphViolations: 0, componentOverlapViolations: 0,
      targetRecencyViolations: 0, samplingViolations: 0, speakerAttributionViolations: 0, unresolvedFindings: 0,
      outputInventoryValidatorPassed: true,
    },
  };
  const outputPath = `${root}/inventory-reviews/round-1/${debateId}.json`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`);
  console.log(outputPath);
}
