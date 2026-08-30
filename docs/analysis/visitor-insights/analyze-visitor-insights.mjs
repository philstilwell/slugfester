import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { publishedDebates } from "../../../src/data/debates.js";
import { avatarsForSpeakerText } from "../../../src/data/interlocutors.js";

const multiSpeakerManifest = JSON.parse(
  await readFile(
    new URL("../../assessment-production/multi-speaker-approximation-v1/manifest.json", import.meta.url),
    "utf8"
  )
);

const multiSpeakerIds = new Set(
  multiSpeakerManifest.debates.map((debate) => debate.debateId)
);

const round = (value, digits = 1) => Number(value.toFixed(digits));
const percentage = (part, whole) => round((part / whole) * 100, 1);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
};

function interlocutorsForSide(debate, sideKey) {
  return [
    ...new Map(
      avatarsForSpeakerText(debate.sides[sideKey].speaker).map((person) => [
        person.slug || person.name,
        person
      ])
    ).values()
  ];
}

function sectionLeadChanges(debate) {
  const leaders = debate.sections
    .map((section) => Math.sign(section.score.pro - section.score.con))
    .filter(Boolean);
  return leaders.slice(1).reduce(
    (changes, leader, index) => changes + Number(leader !== leaders[index]),
    0
  );
}

function moveRows(debate) {
  return debate.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) =>
      ["pro", "con"]
        .map((sideKey) => exchange[sideKey])
        .filter(Boolean)
    )
  );
}

const overallMargins = publishedDebates.map((debate) =>
  Math.abs(debate.score.pro - debate.score.con)
);
const sectionRows = publishedDebates.flatMap((debate) => debate.sections);
const sectionSideScores = sectionRows.flatMap((section) => [
  section.score.pro,
  section.score.con
]);
const moves = publishedDebates.flatMap(moveRows);
const taggedMoves = moves.filter((move) => move.tags?.length);
const fallacyTags = moves.flatMap((move) => move.tags || []).filter((tag) =>
  tag.type === "fallacy" || tag.url?.includes("logfall.com")
);
const biasTags = moves.flatMap((move) => move.tags || []).filter((tag) =>
  tag.type === "bias" || tag.url?.includes("cogbias.site")
);

const tiedDebates = overallMargins.filter((margin) => margin === 0).length;
const withinThree = overallMargins.filter((margin) => margin <= 3).length;
const withinFive = overallMargins.filter((margin) => margin <= 5).length;
const withinTen = overallMargins.filter((margin) => margin <= 10).length;

const marginBands = [
  { band: "Tie", debates: tiedDebates },
  { band: "1–3 points", debates: withinThree - tiedDebates },
  { band: "4–5 points", debates: withinFive - withinThree },
  { band: "6–10 points", debates: withinTen - withinFive },
  { band: "11+ points", debates: publishedDebates.length - withinTen }
].map((row) => ({
  ...row,
  share: round(row.debates / publishedDebates.length, 3)
}));

const bothSidesWinASection = publishedDebates.filter((debate) => {
  const sectionLeaders = debate.sections.map((section) =>
    Math.sign(section.score.pro - section.score.con)
  );
  return sectionLeaders.includes(1) && sectionLeaders.includes(-1);
}).length;

const nonTiedDebates = publishedDebates.filter(
  (debate) => debate.score.pro !== debate.score.con
);
const overallWinnerLostASection = nonTiedDebates.filter((debate) => {
  const winner = debate.score.pro > debate.score.con ? "pro" : "con";
  const loser = winner === "pro" ? "con" : "pro";
  return debate.sections.some(
    (section) => section.score[winner] < section.score[loser]
  );
}).length;

const rankingEligibleDebates = publishedDebates.filter(
  (debate) =>
    debate.interlocutorRankingEligible !== false && !multiSpeakerIds.has(debate.id)
);
const appearances = new Map();
for (const debate of rankingEligibleDebates) {
  for (const sideKey of ["pro", "con"]) {
    for (const person of interlocutorsForSide(debate, sideKey)) {
      const key = person.slug || person.name;
      appearances.set(key, {
        name: person.name,
        count: (appearances.get(key)?.count || 0) + 1
      });
    }
  }
}

const appearanceCounts = [...appearances.values()].map((person) => person.count);
const appearanceBands = [
  { band: "1 scorecard", interlocutors: appearanceCounts.filter((count) => count === 1).length },
  { band: "2 scorecards", interlocutors: appearanceCounts.filter((count) => count === 2).length },
  { band: "3–4 scorecards", interlocutors: appearanceCounts.filter((count) => count >= 3 && count <= 4).length },
  { band: "5–9 scorecards", interlocutors: appearanceCounts.filter((count) => count >= 5 && count <= 9).length },
  { band: "10+ scorecards", interlocutors: appearanceCounts.filter((count) => count >= 10).length }
].map((row) => ({
  ...row,
  share: round(row.interlocutors / appearances.size, 3)
}));

const leadChangeExamples = publishedDebates
  .map((debate) => ({
    number: debate.number,
    id: debate.id,
    title: debate.title,
    leadChanges: sectionLeadChanges(debate),
    proScore: debate.score.pro,
    conScore: debate.score.con,
    margin: Math.abs(debate.score.pro - debate.score.con),
    multiSpeaker: multiSpeakerIds.has(debate.id)
  }))
  .sort((a, b) => b.leadChanges - a.leadChanges || a.margin - b.margin || Number(a.number) - Number(b.number));

const scoreSum = (sideKey) =>
  publishedDebates.reduce((sum, debate) => sum + debate.score[sideKey], 0);
const proWins = publishedDebates.filter(
  (debate) => debate.score.pro > debate.score.con
).length;
const conWins = publishedDebates.filter(
  (debate) => debate.score.con > debate.score.pro
).length;

const result = {
  generatedAt: "2026-08-30",
  source: "SLUGFESTER production dataset in src/data/debates.js",
  corpus: {
    debates: publishedDebates.length,
    sections: sectionRows.length,
    sectionSideScores: sectionSideScores.length,
    moves: moves.length,
    sectionsPerDebateMedian: median(publishedDebates.map((debate) => debate.sections.length)),
    movesPerDebateMedian: median(publishedDebates.map((debate) => moveRows(debate).length))
  },
  competitiveness: {
    medianOverallMargin: median(overallMargins),
    ties: tiedDebates,
    withinFive,
    withinFiveShare: percentage(withinFive, publishedDebates.length),
    withinTen,
    withinTenShare: percentage(withinTen, publishedDebates.length),
    bothSidesWinASection,
    bothSidesWinASectionShare: percentage(bothSidesWinASection, publishedDebates.length),
    nonTiedDebates: nonTiedDebates.length,
    overallWinnerLostASection,
    overallWinnerLostASectionShare: percentage(
      overallWinnerLostASection,
      nonTiedDebates.length
    )
  },
  selectivity: {
    taggedMoves: taggedMoves.length,
    taggedMoveShare: percentage(taggedMoves.length, moves.length),
    fallacyTags: fallacyTags.length,
    biasTags: biasTags.length
  },
  rankings: {
    excludedMultiSpeakerDebates: publishedDebates.length - rankingEligibleDebates.length,
    eligibleOneToOneDebates: rankingEligibleDebates.length,
    recognizedInterlocutors: appearances.size,
    belowThreeAppearances: appearanceCounts.filter((count) => count < 3).length,
    belowThreeShare: percentage(
      appearanceCounts.filter((count) => count < 3).length,
      appearances.size
    )
  },
  sideLabelAudit: {
    proAverage: round(scoreSum("pro") / publishedDebates.length, 1),
    conAverage: round(scoreSum("con") / publishedDebates.length, 1),
    conMinusPro: round((scoreSum("con") - scoreSum("pro")) / publishedDebates.length, 1),
    proWins,
    conWins,
    ties: tiedDebates
  },
  marginBands,
  appearanceBands,
  recommendations: [
    { priority: 1, module: "Closest scorecards", evidence: `${withinFive} of ${publishedDebates.length} finish within five points`, placement: "Landing page or Rankings" },
    { priority: 2, module: "Most back-and-forth debates", evidence: `${bothSidesWinASection} scorecards give sections to both sides`, placement: "Topics or Rankings" },
    { priority: 3, module: "Ranking sample-size tiers", evidence: `${appearanceCounts.filter((count) => count < 3).length} of ${appearances.size} people have fewer than three eligible appearances`, placement: "Rankings" },
    { priority: 4, module: "Reasoning-flag selectivity", evidence: `Only ${percentage(taggedMoves.length, moves.length)}% of moves carry a flag`, placement: "Backend" },
    { priority: 5, module: "Pro/con column audit", evidence: `Con averages ${round((scoreSum("con") - scoreSum("pro")) / publishedDebates.length, 1)} points higher in this non-random corpus`, placement: "Backend" }
  ],
  leadChangeExamples: leadChangeExamples.slice(0, 8),
  validation: {
    uniqueDebateIds: new Set(publishedDebates.map((debate) => debate.id)).size === publishedDebates.length,
    uniqueDebateNumbers: new Set(publishedDebates.map((debate) => debate.number)).size === publishedDebates.length,
    everyDebateHasNumericOverallScores: publishedDebates.every((debate) =>
      [debate.score.pro, debate.score.con].every(Number.isFinite)
    ),
    everySectionHasNumericSideScores: sectionRows.every((section) =>
      [section.score.pro, section.score.con].every(Number.isFinite)
    ),
    marginBandsSumToCorpus: marginBands.reduce((sum, row) => sum + row.debates, 0) === publishedDebates.length,
    appearanceBandsSumToPeople: appearanceBands.reduce((sum, row) => sum + row.interlocutors, 0) === appearances.size
  }
};

const serializedResult = `${JSON.stringify(result, null, 2)}\n`;
const outputFlagIndex = process.argv.indexOf("--output");

if (outputFlagIndex >= 0) {
  const outputPath = process.argv[outputFlagIndex + 1];
  if (!outputPath) throw new Error("--output requires a file path");
  await writeFile(resolve(outputPath), serializedResult, "utf8");
} else {
  process.stdout.write(serializedResult);
}
