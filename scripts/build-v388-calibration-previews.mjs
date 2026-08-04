#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getReferenceDefinition } from "../src/data/references.js";
import { sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const previewRoot = "docs/calibration/v3.8.8/reconstruction/previews";
const sourcePaths = {
  "55": "docs/calibration/v3.8.8/reconstruction/validated-outputs/debate-55.json",
  "103": "docs/calibration/v3.8.8/reconstruction/outputs/debate-103.json",
  "161": "docs/calibration/v3.8.8/reconstruction/outputs/debate-161.json"
};

const readBytes = (relativePath) => readFile(path.resolve(root, relativePath));
const referenceUrl = (tag) => tag.type === "fallacy"
  ? `https://logfall.com/fallacies/${tag.slug}/`
  : `https://cogbias.site/biases/${tag.slug}/`;
const mapTag = (tag) => {
  const reference = getReferenceDefinition(tag.type, tag.slug);
  if (!reference || reference.label.toLowerCase() !== tag.label.toLowerCase()) {
    throw new Error(`Unknown reconstruction tag ${tag.type}/${tag.slug}`);
  }
  return { ...tag, url: referenceUrl(tag) };
};
const mapArgument = (argument) => argument
  ? { ...argument, tags: argument.tags.map(mapTag) }
  : null;
const mapOverall = (overall) => Object.fromEntries(["pro", "con"].map((side) => [side, {
  ...overall[side],
  blunders: overall[side].blunders.map((blunder) => ({
    text: blunder.text,
    links: blunder.tags.map(mapTag)
  }))
}]));
const mapExtensionSide = (side) => ({
  finalArgument: {
    thesis: side.thesis.text,
    premises: side.premises.map((item) => item.text),
    conclusion: side.conclusion.text
  },
  newArguments: side.newArguments.map(({ title, text }) => ({ title, text }))
});

function adaptReconstruction(reconstruction) {
  const scorecard = reconstruction.scorecard;
  return {
    ...scorecard,
    id: `calibration-v388-${reconstruction.debateNumber}`,
    number: reconstruction.debateNumber,
    assessmentModel: reconstruction.assessmentModel,
    assessmentRubric: "Slugfester Reassessment Rubric v2",
    sections: scorecard.sections.map((section) => ({
      ...section,
      exchanges: section.exchanges.map((exchange) => ({
        pro: mapArgument(exchange.pro),
        con: mapArgument(exchange.con)
      }))
    })),
    overall: mapOverall(scorecard.overall),
    logicalExtension: {
      pro: mapExtensionSide(reconstruction.aiExtension.pro),
      con: mapExtensionSide(reconstruction.aiExtension.con)
    },
    calibration: {
      calibrationOnly: true,
      protocolId: reconstruction.protocolId,
      sourceDebateId: reconstruction.debateId,
      displayContract: reconstruction.displayContract,
      noveltyMap: {
        pro: reconstruction.aiExtension.pro,
        con: reconstruction.aiExtension.con
      }
    }
  };
}

const outputs = [];
for (const [debateNumber, sourcePath] of Object.entries(sourcePaths)) {
  const bytes = await readBytes(sourcePath);
  const reconstruction = JSON.parse(bytes);
  const preview = adaptReconstruction(reconstruction);
  const outputPath = `${previewRoot}/debate-${debateNumber}.json`;
  outputs.push({
    debateNumber,
    outputPath,
    sourcePath,
    sourceSha256: sha256(bytes),
    previewSha256: sha256(`${JSON.stringify(preview, null, 2)}\n`),
    sectionCount: preview.sections.length,
    overallScores: preview.score,
    aiExtensionIncluded: Boolean(preview.logicalExtension)
  });
  if (write) {
    await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
    await writeFile(path.resolve(root, outputPath), `${JSON.stringify(preview, null, 2)}\n`);
  }
}

const audit = {
  schemaVersion: "3.8.8-calibration-preview-build-audit",
  status: "passed",
  calibrationOnly: true,
  productionDebateDataMutated: false,
  rankingsMutated: false,
  productionRendererEntryPoint: "renderCalibrationDebate",
  outputs
};
if (write) await writeFile(path.resolve(root, `${previewRoot}/build-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
