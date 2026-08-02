#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  calculateV21Ledger,
  V21_RUBRIC,
  V21_WORKFLOW
} from "./lib/reassessment-scoring.mjs";

const definitionsDirectory = path.resolve("docs/calibration/v2.1/benchmark-definitions");
const ledgersDirectory = path.resolve("docs/calibration/v2.1/ledgers");
const pilotManifest = JSON.parse(
  await readFile(path.resolve("docs/calibration/v2.1/pilot-manifest.json"), "utf8")
);
const judgments = JSON.parse(
  await readFile(path.resolve("docs/calibration/v2.1/pilot-judgments.json"), "utf8")
);

await mkdir(ledgersDirectory, { recursive: true });

function sourceConfidence(debateId, side) {
  if (debateId === "rasmussen-oppy-ultimate-reality-naturalism-2020" && side === "pro") {
    return "low";
  }
  return "medium";
}

for (const selected of pilotManifest.debates) {
  const debateId = selected.debateId;
  const [definitionSource, sourceManifestSource] = await Promise.all([
    readFile(path.join(definitionsDirectory, `${debateId}.json`), "utf8"),
    readFile(
      path.resolve("docs/calibration/v2.1/source-manifests", `${debateId}.json`),
      "utf8"
    )
  ]);
  const definition = JSON.parse(definitionSource);
  const sourceManifest = JSON.parse(sourceManifestSource);
  const debateJudgments = judgments.debates[debateId];
  if (!debateJudgments) throw new Error(`Missing pilot judgment: ${debateId}`);

  const sideMoves = Object.fromEntries(
    ["pro", "con"].map((side) => {
      const move = definition.section.moves[side];
      const scored = debateJudgments[side];
      return [
        side,
        {
          moves: [
            {
              ...move,
              speakerAttributionConfidence: sourceConfidence(debateId, side),
              audioChecked: false,
              passA: scored.passA,
              passB: scored.passB,
              ...(scored.adjudication ? { adjudication: scored.adjudication } : {})
            }
          ]
        }
      ];
    })
  );

  const tagCandidates = (judgments.tagReviews?.[debateId] || []).map((candidate) => ({
    ...candidate,
    moveId: definition.section.moves[candidate.moveSide].id
  }));

  const rawLedger = {
    schemaVersion: "2.1",
    workflowVersion: V21_WORKFLOW,
    rubricVersion: V21_RUBRIC,
    calibrationOnly: true,
    pilotScope: "single-section, two-move benchmark",
    debateId,
    debateNumber: selected.number,
    model: judgments.model,
    sourceManifest: definition.sourceManifest,
    blindPacketSha256: sourceManifest.blindPacketSha256,
    assessmentPasses: {
      passA: {
        model: judgments.model,
        completedAt: judgments.passACompletedAt,
        contextIsolation:
          "Legacy scores, critiques, tags, Overall Commentary, and AI Extension were excluded from the benchmark definition."
      },
      passB: {
        model: judgments.model,
        completedAt: judgments.passBCompletedAt,
        contextIsolation:
          "Pass B used the same active model task and therefore had only procedural, not contextual, separation from Pass A."
      }
    },
    passIndependence: judgments.passIndependence,
    motionType: definition.motionType,
    motion: definition.motion,
    burdens: definition.burdens,
    sectionWeightsLockedBeforeScoring: true,
    moveImportanceLockedBeforeScoring: true,
    sections: [
      {
        id: definition.section.id,
        title: definition.section.title,
        weightPercent: definition.section.weightPercent,
        weightRationale: definition.section.weightRationale,
        sides: sideMoves
      }
    ],
    burdenCompletionAdjustment: Object.fromEntries(
      ["pro", "con"].map((side) => [
        side,
        {
          passA: {
            value: 0,
            rationale:
              "A single sampled move cannot justify a full-debate burden-completion adjustment."
          },
          passB: {
            value: 0,
            rationale:
              "A single sampled move cannot justify a full-debate burden-completion adjustment."
          }
        }
      ])
    ),
    tagReview: {
      performedAfterScoring: true,
      candidates: tagCandidates,
      scoringEffect: "none; accepted tags describe defects already represented in dimensions"
    },
    aiExtensionReview: {
      performedAfterAssessment: true,
      status: "not-applicable-to-targeted-scoring-benchmark",
      noveltyMap: [],
      rationale:
        "This pilot tests rubric scoring mechanics on sampled moves, not full scorecard or AI Extension composition."
    }
  };

  const calculated = calculateV21Ledger(rawLedger);
  await writeFile(
    path.join(ledgersDirectory, `${debateId}.json`),
    `${JSON.stringify(calculated, null, 2)}\n`
  );
}

console.log(`Built and calculated ${pilotManifest.debates.length} v2.1 calibration ledgers.`);
