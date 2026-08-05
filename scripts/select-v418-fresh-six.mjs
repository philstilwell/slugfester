#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");

const poolPath = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const priorSamplePath = "docs/calibration/v4.1.7/fresh-six-gate/source-only-sample.json";
const workflowPath = "docs/assessment-workflow-v4.1.8.md";
const scriptPath = "scripts/select-v418-fresh-six.mjs";
const outputPath = "docs/calibration/v4.1.8/source-integrity-fresh-six-gate/source-only-sample.json";
const salt = "slugfester-v4.1.8-event-aware-fresh-six-source-only";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite && await exists(outputPath)) throw new Error(`${outputPath} already exists`);

const [poolText, priorSampleText] = await Promise.all([
  readFile(path.resolve(root, poolPath), "utf8"),
  readFile(path.resolve(root, priorSamplePath), "utf8")
]);
const pool = JSON.parse(poolText);
const priorSample = JSON.parse(priorSampleText);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only eligible pool boundary invalid");
if (priorSample.status !== "frozen-before-legacy-score-access" || priorSample.selectionBoundary.legacyAssessmentContentAccessed) throw new Error("v4.1.7 source-only exclusion sample invalid");

const familyRules = [
  ["resurrection-history", /resurrection|gospel|historical|history|jesus|early christian|new testament/i],
  ["morality-ethics", /moral|morality|ethic|euthyphro|value theory/i],
  ["mind-agency", /conscious|mind|free will|personal identity|soul|agency|mental caus/i],
  ["evil-hiddenness", /evil|suffering|hiddenness|nonbelief|hell|salvation|damnation/i],
  ["science-origins", /science|origin of life|evolution|cosmolog|fine-tun|universe|physics|naturalism|big bang/i]
];
const classify = (motion) => familyRules.find(([, pattern]) => pattern.test(motion))?.[0] ?? "general-theism-religion";
const families = [...familyRules.map(([name]) => name), "general-theism-religion"];
const v416DevelopmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011"];
const v417Ids = priorSample.debates.map((debate) => debate.debateId);
const exclusions = new Set([...pool.retiredDebateIds, ...v416DevelopmentIds, ...v417Ids]);

const candidates = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const manifestText = await readFile(path.resolve(root, manifestPath), "utf8");
  const manifest = JSON.parse(manifestText);
  if (manifest.videoId !== debate.videoId || !Number.isFinite(manifest.durationSeconds) || manifest.durationSeconds <= 0) throw new Error(`${debate.debateId}: local manifest invalid`);
  const family = classify(debate.motion);
  candidates.push({
    ...debate,
    family,
    durationSeconds: manifest.durationSeconds,
    durationBand: manifest.durationSeconds < 5400 ? "under-90-minutes" : manifest.durationSeconds > 7200 ? "over-120-minutes" : "90-to-120-minutes",
    manifestPath,
    manifestSha256: sha256(manifestText),
    selectionRankSha256: sha256(`${salt}:${family}:${debate.debateId}`)
  });
}

const byFamily = new Map(families.map((family) => [family, candidates.filter((candidate) => candidate.family === family).sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256))]));
for (const family of families) if (!byFamily.get(family)?.length) throw new Error(`${family}: no eligible candidate`);
const rankIndex = new Map(candidates.map((candidate) => [candidate.debateId, byFamily.get(candidate.family).findIndex((item) => item.debateId === candidate.debateId)]));

let best = null;
for (const shortFamily of families) {
  for (const longFamily of families) {
    if (shortFamily === longFamily) continue;
    const selected = [];
    let valid = true;
    for (const family of families) {
      const list = byFamily.get(family);
      const candidate = family === shortFamily
        ? list.find((item) => item.durationSeconds < 5400)
        : family === longFamily
          ? list.find((item) => item.durationSeconds > 7200)
          : list[0];
      if (!candidate) {
        valid = false;
        break;
      }
      selected.push(candidate);
    }
    if (!valid) continue;
    const aggregateRank = selected.reduce((sum, candidate) => sum + rankIndex.get(candidate.debateId), 0);
    const tieBreak = selected.map((candidate) => candidate.debateId).sort().join("|");
    if (!best || aggregateRank < best.aggregateRank || (aggregateRank === best.aggregateRank && tieBreak < best.tieBreak)) best = { selected, aggregateRank, tieBreak, shortFamily, longFamily };
  }
}

if (!best) throw new Error("no topic-complete tuple satisfies duration extremes");
const selected = families.map((family) => best.selected.find((candidate) => candidate.family === family));
if (new Set(selected.map((candidate) => candidate.debateId)).size !== 6 || !selected.some((candidate) => candidate.durationSeconds < 5400) || !selected.some((candidate) => candidate.durationSeconds > 7200)) throw new Error("v4.1.8 fresh-six selection invariants failed");
if (selected.some((candidate) => v417Ids.includes(candidate.debateId))) throw new Error("v4.1.8 sample overlaps v4.1.7");

const sourceHashes = {
  [poolPath]: sha256(poolText),
  [priorSamplePath]: sha256(priorSampleText),
  [workflowPath]: sha256(await readFile(path.resolve(root, workflowPath))),
  [scriptPath]: sha256(await readFile(path.resolve(root, scriptPath)))
};
for (const debate of selected) sourceHashes[debate.manifestPath] = debate.manifestSha256;

const artifact = {
  schemaVersion: "4.1.8-source-integrity-fresh-six-sample",
  protocolId: "v4.1.8-source-integrity-fresh-six-validation",
  status: "frozen-before-legacy-score-access",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  selectionBoundary: {
    dyadicOnly: true,
    topicFamilies: families,
    durationRequirement: "at least one under 90 minutes and at least one over 120 minutes",
    fixedSalt: salt,
    rankingInput: "family and debate ID only",
    legacyAssessmentContentAccessed: false,
    legacyScoresAccessed: false,
    legacyWinnersAccessed: false,
    legacyCritiquesAccessed: false,
    candidateRanksInspectedBeforeAlgorithmFreeze: false
  },
  exclusions: {
    priorCalibrationIdsFromPool: pool.retiredDebateIds.length,
    v416DevelopmentDebates: ["55", "103", "161"],
    v417DiagnosticDebates: priorSample.debates.map((debate) => debate.number),
    excludedDebateIds: [...exclusions].sort()
  },
  eligibleAfterExclusions: candidates.length,
  tupleOptimization: { aggregateFamilyRank: best.aggregateRank, shortDurationFamily: best.shortFamily, longDurationFamily: best.longFamily },
  debates: selected.map(({ manifestSha256, ...debate }) => debate),
  audit: {
    debates: selected.length,
    distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size,
    distinctDebateIds: new Set(selected.map((debate) => debate.debateId)).size,
    v417Overlap: selected.filter((debate) => v417Ids.includes(debate.debateId)).length,
    minimumDurationSeconds: Math.min(...selected.map((debate) => debate.durationSeconds)),
    maximumDurationSeconds: Math.max(...selected.map((debate) => debate.durationSeconds)),
    localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length,
    legacyAssessmentFields: 0
  },
  authorization: { sourcePacketPreparation: true, primaryModelExecution: false, legacyComparison: false, paidTranscription: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  sourceHashes
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
  await writeFile(path.resolve(root, outputPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)) })),
  aggregateFamilyRank: best.aggregateRank,
  minimumDurationMinutes: Number((artifact.audit.minimumDurationSeconds / 60).toFixed(1)),
  maximumDurationMinutes: Number((artifact.audit.maximumDurationSeconds / 60).toFixed(1)),
  v417Overlap: artifact.audit.v417Overlap,
  legacyAssessmentContentAccessed: false,
  sourcePacketPreparationAuthorized: true
}, null, 2));
