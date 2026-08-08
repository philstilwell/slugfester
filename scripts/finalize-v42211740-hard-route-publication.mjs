#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { compileV42211732PublicationPreview, V42211732_BYLINE } from "./lib/v42211732-hard-route-publication.mjs";
import { validateV42211736PublicationOutput } from "./lib/v42211736-hard-route-publication-integrity.mjs";
import { normalizeV42211737PublicationOutput } from "./lib/v42211737-hard-route-publication-normalization.mjs";
import { V42211740_DEBATES, V42211740_PROTOCOL_ID, V42211740_ROOT } from "./lib/v42211740-hard-route-publication-finalization.mjs";

const root = path.resolve(V42211740_ROOT);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const wordCount = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
const unexpectedScript = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;
const accepted153 = Object.freeze([
  "move-pro-04-unchosen-wants",
  "move-con-07-interpersonal-responsibility",
  "move-pro-02-substrate-neutral-dilemma",
  "move-pro-08-determinist-compassion",
  "move-con-08-ethical-tension",
  "move-pro-09-evolved-moral-desire",
  "move-pro-05-unchosen-source-regress",
  "move-pro-06-introspective-mechanism-gap"
]);
const superseded153 = new Set(["move-pro-08-determinist-compassion", "move-pro-09-evolved-moral-desire"]);
const critiqueLabels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const paths = {
  workflow: "docs/assessment-workflow-v4.2.21.17.40.md",
  authorization: "docs/calibration/v4.2.21.17.39/publication-micro-repair/analysis.json",
  repair153: "docs/calibration/v4.2.21.17.38/publication-field-repair/repair-outputs/debate-153.json",
  repair153Micro: "docs/calibration/v4.2.21.17.39/publication-micro-repair/repair-output.json",
  repair165: "docs/calibration/v4.2.21.17.38/publication-field-repair/repair-outputs/debate-165.json"
};
const debates = Object.fromEntries(V42211740_DEBATES.map((debateNumber) => [debateNumber, {
  packet: `docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair/packets/debate-${debateNumber}.json`,
  base: debateNumber === "165"
    ? `docs/calibration/v4.2.21.17.37/hard-route-publication-normalization/raw-outputs/debate-${debateNumber}.json`
    : `docs/calibration/v4.2.21.17.37/hard-route-publication-normalization/outputs/debate-${debateNumber}.json`,
  output: `${V42211740_ROOT}/final-outputs/debate-${debateNumber}.json`,
  compiled: `${V42211740_ROOT}/compiled/debate-${debateNumber}.json`
}]));

const validateCritique = (critique, label) => {
  const trimmed = String(critique).trim();
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(wordCount(trimmed) >= 105 && wordCount(trimmed) <= 130, `${label}: critique outside 105–130 words`);
  assertV4(trimmed.length >= 880 && /[.!?]$/u.test(trimmed), `${label}: critique length or terminal punctuation invalid`);
  assertV4(sentences.length === 4, `${label}: critique must contain exactly four sentences`);
  critiqueLabels.forEach((prefix, index) => assertV4(sentences[index].toLowerCase().startsWith(prefix), `${label}: critique label/order mismatch`));
  assertV4(!unexpectedScript.test(trimmed) && !trimmed.includes("�"), `${label}: unexpected script artifact`);
};

await access(`${root}/merge-audit.json`).then(() => { throw new Error(`${V42211740_ROOT} already finalized`); }, () => true);
const authorization = await parse(paths.authorization);
assertV4(authorization.status === "publication-micro-repair-gate-passed" && authorization.authorization.finalMerge === true, "v17.39 final merge authorization missing");

const [repair153, repair153Micro, repair165] = await Promise.all([paths.repair153, paths.repair153Micro, paths.repair165].map(parse));
assertV4(repair153.debateNumber === "153" && repair153Micro.debateNumber === "153" && repair165.debateNumber === "165", "repair debate identity mismatch");
assertV4(canonicalJson(Object.keys(repair153.correctedCritiques).sort()) === canonicalJson([...accepted153].sort()), "v17.38 Debate 153 repair coverage mismatch");
assertV4(canonicalJson(Object.keys(repair153Micro.correctedCritiques).sort()) === canonicalJson([...superseded153].sort()), "v17.39 Debate 153 superseding coverage mismatch");

const sourceFiles = [...new Set([
  ...Object.values(paths),
  ...Object.values(debates).flatMap((item) => [item.packet, item.base])
])].sort();
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));

const results = [];
let critiques = 0;
let quoteMatches = 0;
let repairFields = 0;
for (const debateNumber of V42211740_DEBATES) {
  const config = debates[debateNumber];
  const [packet, base] = await Promise.all([parse(config.packet), parse(config.base)]);
  let candidate = structuredClone(base);
  const transformations = [];

  if (debateNumber === "153") {
    for (const moveId of accepted153) {
      const sourceStage = superseded153.has(moveId) ? "v17.39" : "v17.38";
      const critique = superseded153.has(moveId) ? repair153Micro.correctedCritiques[moveId] : repair153.correctedCritiques[moveId];
      validateCritique(critique, `${sourceStage}.${moveId}`);
      const beforeSha256 = sha256(candidate.moveProse[moveId].critique);
      candidate.moveProse[moveId].critique = critique;
      transformations.push({ field: `moveProse.${moveId}.critique`, operation: "replace-authorized-invalid-field", sourceStage, beforeSha256, afterSha256: sha256(critique) });
      repairFields += 1;
    }
  }

  if (debateNumber === "165") {
    const corrected = repair165.correctedConQuote;
    assertV4(corrected && Object.keys(repair165).filter((key) => key.startsWith("corrected")).length === 1, "Debate 165 repair field set mismatch");
    const source = packet.moves.find((move) => move.moveId === corrected.sourceMoveId && move.side === "con" && move.quoteEligible);
    assertV4(source && wordCount(corrected.text) >= 3 && wordCount(corrected.text) <= 18 && source.sourceExcerpt.includes(corrected.text), "Debate 165 repaired con quote is not an eligible exact source substring");
    const beforeSha256 = sha256(canonicalJson(candidate.representativeQuotes.con));
    candidate.representativeQuotes.con = { ...candidate.representativeQuotes.con, ...corrected };
    transformations.push({ field: "representativeQuotes.con", operation: "replace-authorized-invalid-field", sourceStage: "v17.38", beforeSha256, afterSha256: sha256(canonicalJson(candidate.representativeQuotes.con)) });
    repairFields += 1;
  }

  const normalized = normalizeV42211737PublicationOutput(candidate, packet);
  const validation = validateV42211736PublicationOutput(normalized.output, packet);
  const preview = compileV42211732PublicationPreview(normalized.output, packet);
  assertV4(preview.calibration.displayContract.byline === V42211732_BYLINE && preview.calibration.displayContract.defaultCollapsed === true && preview.logicalExtension, `${debateNumber}: compiled display contract mismatch`);
  await mkdir(path.dirname(path.resolve(config.output)), { recursive: true });
  await mkdir(path.dirname(path.resolve(config.compiled)), { recursive: true });
  await writeFile(path.resolve(config.output), `${JSON.stringify(normalized.output, null, 2)}\n`);
  await writeFile(path.resolve(config.compiled), `${JSON.stringify(preview, null, 2)}\n`);
  critiques += validation.critiques;
  quoteMatches += validation.quoteExactSourceMatches;
  results.push({
    debateNumber,
    moves: validation.moves,
    sections: packet.sections.length,
    scores: preview.score,
    output: config.output,
    outputSha256: sha256(await readFile(path.resolve(config.output))),
    compiled: config.compiled,
    compiledSha256: sha256(await readFile(path.resolve(config.compiled))),
    repairTransformations: transformations,
    quoteNormalizations: normalized.transformations,
    validation,
    aiExtensionIncluded: true,
    byline: V42211732_BYLINE,
    modelAuthoredScores: 0
  });
}

assertV4(results.reduce((sum, item) => sum + item.moves, 0) === 100 && critiques === 100 && quoteMatches === 10 && repairFields === 9, "finalization aggregate mismatch");
const previewHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,nofollow">
    <title>Slugfester v4.2.21.17.40 final publication preview</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="/src/styles.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { renderCalibrationDebate } from "/src/app.js";
      const allowedHosts = new Set(["127.0.0.1", "localhost"]);
      const allowedDebates = new Set(["51", "63", "90", "153", "165"]);
      const params = new URLSearchParams(window.location.search);
      const debateNumber = params.get("debate") || "51";
      if (!allowedHosts.has(window.location.hostname)) {
        document.querySelector("#app").innerHTML = "<main><h1>Calibration preview unavailable</h1><p>This harness is restricted to local review.</p></main>";
      } else if (!allowedDebates.has(debateNumber)) {
        document.querySelector("#app").innerHTML = "<main><h1>Unknown calibration debate</h1></main>";
      } else {
        const response = await fetch(\`../compiled/debate-\${debateNumber}.json\`);
        if (!response.ok) throw new Error(\`Unable to load Debate \${debateNumber} preview data\`);
        renderCalibrationDebate(await response.json());
      }
    </script>
  </body>
</html>
`;
const previewPath = `${V42211740_ROOT}/previews/index.html`;
await mkdir(path.dirname(path.resolve(previewPath)), { recursive: true });
await writeFile(path.resolve(previewPath), previewHtml);
const audit = {
  schemaVersion: "4.2.21.17.40-hard-route-publication-finalization-audit",
  protocolId: V42211740_PROTOCOL_ID,
  status: "passed-five-debate-publication-finalization",
  finalizedAt: new Date().toISOString(),
  calibrationOnly: true,
  sourceHashes,
  totals: { debates: 5, sections: results.reduce((sum, item) => sum + item.sections, 0), moves: 100, critiques: 100, quoteExactSourceMatches: 10, authorizedRepairFields: 9, modelContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  outputs: results,
  preview: { path: previewPath, sha256: sha256(await readFile(path.resolve(previewPath))), localOnly: true, nativeDetailsAccordion: true, defaultCollapsed: true, distinctVisualVariant: "ai-distinct", byline: V42211732_BYLINE },
  production: { debateDataMutated: false, rankingsMutated: false },
  authorization: { renderingVerification: true, readinessPromotion: false, productionMutation: false, all195Debates: false }
};
await writeFile(`${root}/merge-audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: audit.status, totals: audit.totals, scores: Object.fromEntries(results.map((item) => [item.debateNumber, item.scores])), nextAuthorized: "browser-rendering-verification" }, null, 2));

