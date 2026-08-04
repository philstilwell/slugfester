#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, validateCaseReview } from "./lib/v34-conservative-review.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifest = JSON.parse(await read(`${gateRoot}/gate-manifest.json`));
const first = manifest.sample.debates[0], packet = JSON.parse(await read(first.reviewPacket.path));
let assertionCount = 0;
const expectFailure = (fn, pattern) => {
  let matched = false;
  try { fn(); } catch (error) { matched = pattern.test(error.message); }
  assert(matched, `expected failure matching ${pattern}`);
  assertionCount += 1;
};

assert(packet.blindness.rawValuesAbsent && packet.blindness.rawModelIdentitiesAbsent && packet.blindness.agreementStatusAbsent && packet.blindness.goldAbsent, "packet blindness declaration invalid");
assert(!JSON.stringify(packet).includes("candidateA") && !JSON.stringify(packet).includes("rawAgreement"), "packet leaks raw comparison data");
assertionCount += 2;

const defaultReview = (challengeCase) => ({
  caseId: challengeCase.caseId, moveId: challengeCase.moveId,
  originalTargetContact: false, targetEvidence: null,
  connectedExample: false, connectionEvidence: null, exampleClassification: "none", boundaryEvidence: null,
  scopeRelation: "same", scopeEvidence: null, burdenAdjustment: "retained", burdenEvidence: null,
  componentReviews: challengeCase.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, contacted: false, evidence: null, contactMode: "none", licenseText: null })),
  relevantContraryMaterial: false, contraryEvidence: null, contraryClassification: "none",
  defectCuePresent: false, defectType: "none", defectCue: null,
  consequenceCuePresent: false, consequenceStated: false, consequenceCue: null, consequenceClauseDistinct: false,
  malformedDemandExplained: false, malformedDemandCue: null, replacementDemandStated: false, replacementDemandCue: null,
  burdenContact: { tier: "none", bridgeId: null, evidence: null },
  rationale: "No nondefault field is licensed by this deliberately empty validation fixture response classification."
});
const challengeCase = packet.cases[0], valid = defaultReview(challengeCase);
validateCaseReview(valid, challengeCase, "valid");
assertionCount += 1;

const leakedGlobalAssent = structuredClone(valid);
const evidence = { startChar: 0, endChar: Math.min(20, challengeCase.sourceExcerpt.length), text: challengeCase.sourceExcerpt.slice(0, Math.min(20, challengeCase.sourceExcerpt.length)) };
leakedGlobalAssent.originalTargetContact = true; leakedGlobalAssent.targetEvidence = evidence;
leakedGlobalAssent.componentReviews[0].contacted = true; leakedGlobalAssent.componentReviews[0].contactMode = "explicit-global-assent"; leakedGlobalAssent.componentReviews[0].evidence = evidence;
leakedGlobalAssent.contraryClassification = "component-contact-precludes-contrary";
expectFailure(() => validateCaseReview(leakedGlobalAssent, challengeCase, "global"), /licenseText/);

const sameClause = structuredClone(valid);
sameClause.defectCuePresent = true; sameClause.defectType = "ambiguity"; sameClause.defectCue = evidence;
sameClause.consequenceCuePresent = true; sameClause.consequenceStated = true; sameClause.consequenceCue = evidence; sameClause.consequenceClauseDistinct = true;
expectFailure(() => validateCaseReview(sameClause, challengeCase, "diagnostic"), /distinct from the defect cue/);

const badBoundary = structuredClone(valid);
badBoundary.connectedExample = true; badBoundary.connectionEvidence = evidence; badBoundary.exampleClassification = "inside-locked-target"; badBoundary.boundaryEvidence = evidence;
expectFailure(() => validateCaseReview(badBoundary, challengeCase, "boundary"), /connected-example boundary mismatch/);

const badContrary = structuredClone(valid);
badContrary.relevantContraryMaterial = true; badContrary.contraryEvidence = evidence; badContrary.contraryClassification = "none";
expectFailure(() => validateCaseReview(badContrary, challengeCase, "contrary"), /contrary boundary mismatch/);

const result = {
  schemaVersion: "3.4-dry-fixture-results", gateId: manifest.gateId, runAt: new Date().toISOString(), passed: true,
  fixtureCount: 5, assertionCount, modelContextsExecuted: 0, modelSchemaOrInvariantRetries: 0,
  checks: ["packet-blindness", "valid-default-review", "global-assent-license-rejection", "same-clause-diagnostic-rejection", "inside-target-example-rejection", "contrary-boundary-rejection"]
};
if (process.argv.includes("--write")) await writeFile(path.resolve(root, manifest.dryFixtureResultPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
