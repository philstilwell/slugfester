#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = "docs/calibration/v4.2.21.17.41/hard-route-publication-readiness";
const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [rendering, readiness, finalization, throughScores, publication, repair, microRepair] = await Promise.all([
  `${root}/rendering-audit.json`,
  `${root}/readiness-analysis.json`,
  "docs/calibration/v4.2.21.17.40/hard-route-publication-finalization/merge-audit.json",
  "docs/calibration/v4.2.21.17.31/hard-route-workflow-readiness/analysis.json",
  "docs/calibration/v4.2.21.17.37/hard-route-publication-normalization/model-execution.json",
  "docs/calibration/v4.2.21.17.38/publication-field-repair/model-execution.json",
  "docs/calibration/v4.2.21.17.39/publication-micro-repair/model-execution.json"
].map(parse));

assert.equal(rendering.status, "passed-five-debate-desktop-mobile-rendering-gate");
assert.equal(rendering.debates.length, 5);
assert.ok(rendering.debates.every((item) => item.desktopPassed && item.mobilePassed));
assert.equal(rendering.checks.consoleErrors, 0);
assert.equal(rendering.checks.consoleWarnings, 0);
assert.ok(Object.entries(rendering.checks).filter(([, value]) => value && typeof value === "object" && "passed" in value).every(([, value]) => value.passed && value.count === 5));
assert.equal(sha256(await readFile(path.resolve(rendering.source.finalizationAudit))), rendering.source.finalizationAuditSha256);
assert.equal(sha256(await readFile(path.resolve(rendering.source.stylesheet))), rendering.source.stylesheetSha256);
assert.equal(finalization.status, "passed-five-debate-publication-finalization");
assert.equal(finalization.totals.moves, 100);
assert.equal(finalization.totals.modelAuthoredScores, 0);
assert.equal(throughScores.compute.projected195StageBatchedThroughScoresHours, 33.07);

const elapsed = publication.results.map((item) => item.elapsedMs / 60000);
const mean = elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length;
const primaryHours = 195 / 2 * mean / 60;
const affectedRate = 2 / 5;
const maximumRepairMinutes = Math.max(...repair.results.map((item) => item.elapsedMs / 60000), microRepair.result.elapsedMs / 60000);
const repairHours = 195 * affectedRate * 4 / 2 * maximumRepairMinutes / 60;
const total = 33.07 + primaryHours + repairHours + 1.5 + 4;
assert.ok(Math.abs(readiness.computeProjection.publicationPrimaryMeanMinutesPerDebate - Number(mean.toFixed(2))) < 0.001);
assert.ok(Math.abs(readiness.computeProjection.publicationPrimaryHoursAtTwoSlots - Number(primaryHours.toFixed(2))) < 0.001);
assert.ok(Math.abs(readiness.computeProjection.conservativePublicationRepairHoursAtTwoSlots - Number(repairHours.toFixed(2))) < 0.001);
assert.ok(Math.abs(readiness.computeProjection.projectedTotalHours - Number(total.toFixed(2))) < 0.001);
assert.ok(readiness.computeProjection.projectedTotalHours <= readiness.computeProjection.targetHours);
assert.equal(readiness.decision.readyForStagedAll195, true);
assert.equal(readiness.decision.readyForUnattendedOneShotAll195, false);
assert.equal(readiness.authorization.productionManifestPreparation, true);
assert.equal(readiness.authorization.all195DebatesExecution, false);
console.log(JSON.stringify({ status: "passed", renderingDebates: 5, publicationMoves: 100, projectedHours: readiness.computeProjection.projectedTotalHours, headroomHours: readiness.computeProjection.remainingHeadroomHours, nextAuthorized: "production-workflow-consolidation-and-manifest-preparation" }, null, 2));
