#!/usr/bin/env node

import { getReferenceDefinition } from "../src/data/references.js";
import {
  V388_RECON_BYLINE, V388_RECON_MODEL, V388_RECON_PROTOCOL,
  assertV388Recon, displayedLanguagePasses, readJson, wordCount
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const [outputPath, packetPath] = process.argv.slice(2);
assertV388Recon(outputPath && packetPath, "usage: validate-v388-reconstruction-output.mjs <output> <packet>");
const output = await readJson(root, outputPath);
const packet = await readJson(root, packetPath);
const sc = output.scorecard;
assertV388Recon(output.schemaVersion === "3.8.8-assessment-reconstruction" && output.protocolId === V388_RECON_PROTOCOL, "output protocol mismatch");
assertV388Recon(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.assessmentModel === V388_RECON_MODEL.label && output.calibrationOnly === true, "output identity mismatch");
assertV388Recon(!Number.isNaN(Date.parse(output.completedAt)), "completedAt invalid");
for (const key of ["title", "label", "date", "duration", "youtubeUrl", "motion"]) assertV388Recon(sc[key] === packet.metadata[key], `${key}: metadata mutation`);
for (const side of ["pro", "con"]) {
  assertV388Recon(sc.sides[side].name === packet.sides[side].label && sc.sides[side].speaker === packet.sides[side].speakers.join(" & "), `${side}: participant identity mismatch`);
  assertV388Recon(sc.sides[side].color === (side === "pro" ? "teal" : "coral"), `${side}: color mismatch`);
  const expectedOverall = packet.calculatedScores.overall[side].final.score;
  assertV388Recon(sc.score[side] === expectedOverall && sc.overall[side].score === expectedOverall, `${side}: overall score mismatch`);
  const lockedQuote = packet.representativeQuotes[side];
  assertV388Recon(sc.quotes[side].text === lockedQuote.text && sc.quotes[side].sourceMoveId === lockedQuote.sourceMoveId && sc.quotes[side].audioVerified === true, `${side}: representative quote mismatch`);
  assertV388Recon(wordCount(sc.quotes[side].context) >= 20 && wordCount(sc.quotes[side].context) <= 80, `${side}: quote context word count`);
  assertV388Recon(sc.overall[side].strengths.length >= 3 && sc.overall[side].blunders.length >= 1, `${side}: Overall Commentary minimums`);
}

const validateTags = (tags, label) => {
  for (const tag of tags) {
    const reference = getReferenceDefinition(tag.type, tag.slug);
    assertV388Recon(reference && reference.label.toLowerCase() === tag.label.toLowerCase(), `${label}: unknown or mislabeled tag ${tag.type}/${tag.slug}`);
  }
};
const moveMap = new Map(packet.moves.map((m) => [m.moveId, m]));
const scoreMap = new Map(packet.calculatedScores.sections.flatMap((section) => ["pro", "con"].flatMap((side) => section.sides[side].moves.map((m) => [m.moveId, m.finalScore]))));
assertV388Recon(sc.sections.length === packet.sections.length, "section count mismatch");
const displayed = new Set();
let argumentsChecked = 0, critiquesChecked = 0, tagsChecked = 0;
for (let index = 0; index < sc.sections.length; index += 1) {
  const section = sc.sections[index], locked = packet.sections[index], calculated = packet.calculatedScores.sections[index];
  assertV388Recon(section.sectionId === locked.sectionId && section.title === locked.title, `${locked.sectionId}: section identity/order mismatch`);
  assertV388Recon(section.score.pro === calculated.sides.pro.finalScore && section.score.con === calculated.sides.con.finalScore, `${locked.sectionId}: section score mismatch`);
  const seenSides = { pro: 0, con: 0 };
  for (const exchange of section.exchanges) {
    assertV388Recon(exchange.pro || exchange.con, `${locked.sectionId}: empty exchange`);
    for (const side of ["pro", "con"]) {
      const argument = exchange[side];
      if (!argument) continue;
      const move = moveMap.get(argument.moveId);
      assertV388Recon(move && move.sectionId === locked.sectionId && move.side === side, `${argument.moveId}: move/section/side mismatch`);
      assertV388Recon(!displayed.has(argument.moveId), `${argument.moveId}: duplicate displayed move`);
      displayed.add(argument.moveId); seenSides[side] += 1;
      assertV388Recon(argument.time === move.displayTime, `${argument.moveId}: timestamp mismatch`);
      assertV388Recon(argument.score === scoreMap.get(argument.moveId), `${argument.moveId}: move score mismatch`);
      assertV388Recon(wordCount(argument.words) >= 8 && wordCount(argument.words) <= 55, `${argument.moveId}: displayed words outside 8-55`);
      assertV388Recon(wordCount(argument.critique) >= 105 && wordCount(argument.critique) <= 130, `${argument.moveId}: critique outside 105-130`);
      validateTags(argument.tags, argument.moveId);
      argumentsChecked += 1; critiquesChecked += 1; tagsChecked += argument.tags.length;
    }
  }
  assertV388Recon(seenSides.pro >= 1 && seenSides.con >= 1, `${locked.sectionId}: both sides must be represented`);
}
for (const side of ["pro", "con"]) for (const blunder of sc.overall[side].blunders) validateTags(blunder.tags, `${side} blunder`);

assertV388Recon(output.aiExtension.aiGenerated === true && /AI-generated/i.test(output.aiExtension.disclaimer) && /not transcript/i.test(output.aiExtension.disclaimer), "AI disclosure incomplete");
const allMoveIds = new Set(packet.moves.map((m) => m.moveId));
let noveltyItems = 0, introducedItems = 0, newArguments = 0;
for (const side of ["pro", "con"]) {
  const extension = output.aiExtension[side];
  assertV388Recon(extension.premises.length >= 4 && extension.premises.length <= 6, `${side}: premise count`);
  assertV388Recon(extension.newArguments.length >= 2 && extension.newArguments.length <= 4, `${side}: new argument count`);
  const items = [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments];
  const ids = new Set();
  for (const item of items) {
    assertV388Recon(!ids.has(item.id), `${side}: duplicate extension item ID ${item.id}`); ids.add(item.id);
    const novelty = item.novelty;
    assertV388Recon(["extends", "repairs", "introduces"].includes(novelty.classification), `${item.id}: novelty class`);
    assertV388Recon(new Set(novelty.sourceMoveIds).size === novelty.sourceMoveIds.length, `${item.id}: duplicate novelty move ID`);
    assertV388Recon(novelty.sourceMoveIds.every((id) => allMoveIds.has(id)), `${item.id}: invalid novelty move ID`);
    if (novelty.classification === "introduces") { assertV388Recon(novelty.sourceMoveIds.length === 0, `${item.id}: introduced item has source moves`); introducedItems += 1; }
    else assertV388Recon(novelty.sourceMoveIds.length >= 1, `${item.id}: mapped item lacks source moves`);
    noveltyItems += 1;
  }
  for (const item of extension.newArguments) {
    assertV388Recon(wordCount(item.text) >= 45 && wordCount(item.text) <= 130, `${item.id}: new argument outside 45-130`);
    newArguments += 1;
  }
}
assertV388Recon(output.displayContract.sectionTitle === "AI Extension" && output.displayContract.placement === "immediately-after-overall-commentary" && output.displayContract.defaultCollapsed === true && output.displayContract.visualVariant === "ai-distinct", "AI Extension display contract mismatch");
assertV388Recon(output.displayContract.byline === V388_RECON_BYLINE && output.displayContract.prohibitedLanguageScanPassed === true, "byline or language affirmation mismatch");
assertV388Recon(displayedLanguagePasses({ scorecard: sc, aiExtension: output.aiExtension }), "prohibited display language detected");

console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, argumentsChecked, critiquesChecked, tagsChecked, displayedMoveCoverage: Number((displayed.size / packet.moves.length).toFixed(6)), scoreIdentityPassed: true, representativeQuotesVerified: 2, overallMinimumsPassed: true, noveltyItems, introducedItems, newArguments, extensionBalancePassed: true, exactPlacementAccordionBylinePassed: true, prohibitedLanguageHits: 0 }, null, 2));
