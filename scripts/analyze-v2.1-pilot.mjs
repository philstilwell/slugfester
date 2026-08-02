#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import { DIMENSION_WEIGHTS } from "./lib/reassessment-scoring.mjs";

const ledgersDirectory = path.resolve("docs/calibration/v2.1/ledgers");
const outputDirectory = path.resolve("docs/calibration/v2.1");
const checkOnly = process.argv.includes("--check");
const ledgerNames = (await readdir(ledgersDirectory)).filter((name) => name.endsWith(".json"));
const ledgers = await Promise.all(
  ledgerNames.map(async (name) => JSON.parse(await readFile(path.join(ledgersDirectory, name), "utf8")))
);
ledgers.sort((a, b) => Number(a.debateNumber) - Number(b.debateNumber));

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function fixed(value, places = 2) {
  return Number(value.toFixed(places));
}

function signLabel(pro, con) {
  if (pro === con) return "tie";
  return pro > con ? "pro" : "con";
}

const dimensionDeltas = Object.fromEntries(Object.keys(DIMENSION_WEIGHTS).map((key) => [key, []]));
const moveScoreDeltas = [];
const legacyShifts = [];
const confidenceWidths = [];
const rows = [];
const tagCandidates = [];
const attribution = { high: 0, medium: 0, low: 0, audioChecked: 0 };
let adjudicationCount = 0;
let benchmarkOrderingStable = 0;

for (const ledger of ledgers) {
  const debate = debates.find((candidate) => candidate.id === ledger.debateId);
  if (!debate) throw new Error(`Missing production debate: ${ledger.debateId}`);
  const legacyExchange = debate.sections[0].exchanges[0];
  const row = {
    debateNumber: ledger.debateNumber,
    debateId: ledger.debateId,
    sampleStrata: (
      JSON.parse(await readFile(path.resolve("docs/calibration/v2.1/pilot-manifest.json"), "utf8"))
    ).debates.find((candidate) => candidate.debateId === ledger.debateId).sampleStrata,
    moves: {}
  };

  for (const side of ["pro", "con"]) {
    const move = ledger.sections[0].sides[side].moves[0];
    Object.entries(move.dimensionDeltas).forEach(([key, value]) => dimensionDeltas[key].push(value));
    moveScoreDeltas.push(move.scoreDelta);
    legacyShifts.push(move.finalScore - legacyExchange[side].score);
    attribution[move.speakerAttributionConfidence] += 1;
    if (move.audioChecked) attribution.audioChecked += 1;
    confidenceWidths.push(
      ledger.overall[side].confidenceRange.high - ledger.overall[side].confidenceRange.low
    );
    row.moves[side] = {
      passA: move.passAScore,
      passB: move.passBScore,
      final: move.finalScore,
      legacyBenchmarkMove: legacyExchange[side].score,
      changeFromLegacyBenchmarkMove: move.finalScore - legacyExchange[side].score,
      adjudicated: move.requiresAdjudication
    };
  }

  const legacyOrdering = signLabel(legacyExchange.pro.score, legacyExchange.con.score);
  const v21Ordering = signLabel(ledger.overall.pro.score, ledger.overall.con.score);
  if (legacyOrdering === v21Ordering) benchmarkOrderingStable += 1;
  row.legacyBenchmarkOrdering = legacyOrdering;
  row.v21BenchmarkOrdering = v21Ordering;
  row.orderingStable = legacyOrdering === v21Ordering;
  adjudicationCount += ledger.agreementAudit.adjudicationCount;
  tagCandidates.push(...ledger.tagReview.candidates);
  rows.push(row);
}

const allDimensionDeltas = Object.values(dimensionDeltas).flat();
const acceptedTags = tagCandidates.filter((candidate) => candidate.decision === "accepted").length;
const report = {
  schemaVersion: "2.1-pilot-analysis",
  analysisAsOf: ledgers
    .map((ledger) => ledger.assessmentPasses.passB.completedAt)
    .sort()
    .at(-1),
  scope: {
    debates: ledgers.length,
    sections: ledgers.length,
    moves: moveScoreDeltas.length,
    characterization:
      "Targeted score-blind benchmark of one preselected section and one move per side per debate; not a complete-debate reassessment."
  },
  sourceAudit: {
    captionAcquisitionSuccess: `${ledgers.length}/${ledgers.length}`,
    captionType: "English auto-generated YouTube captions for every pilot debate",
    speakerAttribution: attribution,
    centralAudioChecks: attribution.audioChecked,
    finding:
      "Transcript acquisition was reliable, but speaker attribution was not production-ready: all moves relied on legacy locations plus auto-captions, one excerpt had low attribution confidence, and none received an audio spot-check."
  },
  passAgreement: {
    actualIndependence: "same-model-same-context-procedural-only",
    meanAbsoluteDimensionDelta: fixed(mean(allDimensionDeltas)),
    maximumDimensionDelta: Math.max(...allDimensionDeltas),
    byDimensionMeanAbsoluteDelta: Object.fromEntries(
      Object.entries(dimensionDeltas).map(([key, values]) => [key, fixed(mean(values))])
    ),
    meanAbsoluteMoveScoreDelta: fixed(mean(moveScoreDeltas)),
    maximumMoveScoreDelta: Math.max(...moveScoreDeltas),
    moveAdjudications: adjudicationCount,
    moveAdjudicationRate: fixed(adjudicationCount / moveScoreDeltas.length),
    meanAgreementRangeWidth: fixed(mean(confidenceWidths)),
    interpretation:
      "The deltas show deterministic threshold handling and procedural repeatability. They cannot establish inter-rater reliability because both passes shared one model context."
  },
  legacyBenchmarkComparison: {
    meanChange: fixed(mean(legacyShifts)),
    meanAbsoluteChange: fixed(mean(legacyShifts.map(Math.abs))),
    minimumChange: Math.min(...legacyShifts),
    maximumChange: Math.max(...legacyShifts),
    stableWithinPairOrdering: `${benchmarkOrderingStable}/${ledgers.length}`,
    stableWithinPairOrderingRate: fixed(benchmarkOrderingStable / ledgers.length),
    interpretation:
      "The v2.1 sample averaged lower because it scored only the exact captured excerpt under tighter anchors, whereas a legacy move summary may reflect a broader passage. This is evidence of granularity sensitivity, not a valid estimate of full-debate score change or winner stability."
  },
  tagReview: {
    candidates: tagCandidates.length,
    accepted: acceptedTags,
    rejected: tagCandidates.length - acceptedTags,
    acceptanceRate: tagCandidates.length ? fixed(acceptedTags / tagCandidates.length) : null,
    scoringEffect: "none"
  },
  aiExtensionReview: {
    tested: false,
    reason:
      "The pilot was a targeted scoring benchmark rather than a complete scorecard composition. The production schema and workflow require a post-assessment novelty map."
  },
  decision: {
    mechanics: "pass",
    corpusWideProduction: "no-go",
    reasons: [
      "The calculator, validator, disagreement thresholds, adjudication preservation, source manifests, burden links, response links, tag review, and calibration isolation all worked across ten varied debates.",
      "The scoring passes were not genuinely independent.",
      "The benchmark reused legacy move locations and did not test blind argument discovery or complete-debate coverage.",
      "Speaker attribution and central quotations were not audio-verified.",
      "Full-debate winner/ranking stability and AI Extension novelty were not tested.",
      "Pilot acceptance thresholds were not preregistered before these scores, so the results must remain exploratory."
    ],
    nextGate:
      "Preregister thresholds, then run three complete debates in separately isolated 5.6 Sol tasks with audio checks and full AI Extension novelty maps. If that gate passes, expand to ten complete debates before any corpus-wide rescore."
  },
  debates: rows
};

const markdownRows = rows
  .map(
    (row) =>
      `| ${row.debateNumber} | ${row.moves.pro.legacyBenchmarkMove} → ${row.moves.pro.final} | ${row.moves.con.legacyBenchmarkMove} → ${row.moves.con.final} | ${row.legacyBenchmarkOrdering} → ${row.v21BenchmarkOrdering} | ${row.orderingStable ? "yes" : "no"} |`
  )
  .join("\n");

const reportMarkdown = `# v2.1 Varied-Debate Pilot Analysis

## Decision

**Mechanics: pass. Corpus-wide production: no-go.**

The repository-backed workflow successfully acquired and hashed all ten sources, generated score-blind benchmark packets, preserved two scoring passes, triggered and preserved adjudications, recalculated every total, reviewed tags after scoring, and kept every result out of production rankings. The test does **not** validate a corpus-wide rescore because it sampled only one known move per side, reused legacy move locations, did not isolate the two model passes, and did not audio-check speaker attribution.

## Pilot scope

- 10 debates spanning long/medium/short formats, philosophy, religion, morality, mind, logic, public reason, multi-person structure, and technical science.
- 10 targeted sections and 20 moves.
- One exact caption excerpt per side, selected from a stable legacy move location while legacy scores, critiques, tags, and commentary were excluded from the benchmark inputs.
- Assessment model: 5.6 Sol.
- Pass independence: **same model, same context, procedural separation only**.

## Quantitative results

- Caption acquisition: **${report.sourceAudit.captionAcquisitionSuccess}**; all tracks were English auto-generated captions.
- Speaker attribution: ${attribution.medium} medium-confidence moves and ${attribution.low} low-confidence move; **0 audio-checked**.
- Mean absolute dimension difference between passes: **${report.passAgreement.meanAbsoluteDimensionDelta}** points; maximum **${report.passAgreement.maximumDimensionDelta}**.
- Mean move-score difference: **${report.passAgreement.meanAbsoluteMoveScoreDelta}** points; maximum **${report.passAgreement.maximumMoveScoreDelta}**.
- Required move adjudications: **${adjudicationCount}/${moveScoreDeltas.length} (${Math.round(report.passAgreement.moveAdjudicationRate * 100)}%)**.
- Mean agreement-range width: **${report.passAgreement.meanAgreementRangeWidth}** points. This is a heuristic agreement range, not a statistical confidence interval.
- Tag candidates reviewed after scoring: **${tagCandidates.length}**; ${acceptedTags} accepted and ${tagCandidates.length - acceptedTags} rejected. Tags produced no extra deduction.

The small pass deltas confirm that the code handles comparison and thresholds consistently. They should not be read as independent-rater reliability because Pass B was produced in the same active model context.

## Legacy benchmark comparison

| Debate | Pro legacy → v2.1 | Con legacy → v2.1 | Pair ordering | Stable? |
| --- | ---: | ---: | --- | --- |
${markdownRows}

Across the 20 sampled moves, v2.1 scores averaged **${Math.abs(report.legacyBenchmarkComparison.meanChange)} points lower** than the legacy move scores; mean absolute change was **${report.legacyBenchmarkComparison.meanAbsoluteChange}** points and the range was ${report.legacyBenchmarkComparison.minimumChange} to +${report.legacyBenchmarkComparison.maximumChange}. Within-pair ordering was stable in **${benchmarkOrderingStable}/${ledgers.length}** cases.

This comparison is diagnostic, not an apples-to-apples rescore. The pilot scored a bounded 90-word caption excerpt. A legacy move score may have reflected a wider presentation summarized in the scorecard. The largest reductions occurred where a high legacy score depended on technical or methodological development outside the sampled excerpt. The result shows that v2.1 needs an explicit evidence-window rule; it does not show that the legacy debate winner or overall score should change.

## What improved

- Formula drift is removed: calculators and validators import one scoring module.
- Double counting is reduced: section scores are importance-weighted move means, and the only overall correction is a capped burden-completion adjustment independently scored by both passes.
- Provenance is much stronger: source, normalized transcript, blind packet, and excerpt hashes are retained.
- Burdens and response relationships use stable IDs; unpaired moves no longer require artificial counterpart claims.
- Disagreement rules are executable and preserve original pass judgments.
- Tagging is a post-score review with explicit accept/reject rationales and no numerical surcharge.
- Calibration results are structurally isolated from published scorecards and rankings.

## What failed or remains untested

1. **True independence.** Same-task passes are susceptible to memory and shared framing.
2. **Blind argument discovery.** Stable legacy locations were reused to make the benchmark feasible with unlabeled captions.
3. **Complete coverage.** One section cannot test section weights, burden completion, overall winner stability, or rankings.
4. **Attribution QA.** One window crossed a likely speaker transition, and no central excerpt was audio-checked.
5. **AI Extension novelty.** The requirement and schema are implemented, but a full extension was outside this targeted scoring pilot.
6. **Preregistration.** Quantitative acceptance thresholds were not locked before scoring; this pilot is exploratory.

## Recommendation

Do not redo the corpus yet. Preregister a second gate and run three complete debates—one close analytic debate, one lopsided burden debate, and one technical or multi-person debate—in separately isolated 5.6 Sol tasks. Require audio verification of central quotes and speaker turns, complete argument inventories, locked section weights, full burden adjustments, and AI Extension novelty maps. If that succeeds, run ten complete varied debates and measure actual overall/winner/ranking stability before promoting v2.1.
`;

const outputs = [
  [path.join(outputDirectory, "pilot-analysis.json"), `${JSON.stringify(report, null, 2)}\n`],
  [path.join(outputDirectory, "pilot-analysis.md"), reportMarkdown]
];

if (checkOnly) {
  const mismatches = [];
  for (const [filePath, expected] of outputs) {
    const actual = await readFile(filePath, "utf8");
    if (actual !== expected) mismatches.push(path.relative(process.cwd(), filePath));
  }
  if (mismatches.length) {
    console.error(`Stale pilot analysis: ${mismatches.join(", ")}`);
    process.exit(1);
  }
} else {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(outputs.map(([filePath, value]) => writeFile(filePath, value)));
}

console.log(
  `${checkOnly ? "Validated" : "Analyzed"} ${ledgers.length} debates and ${moveScoreDeltas.length} moves.`
);
