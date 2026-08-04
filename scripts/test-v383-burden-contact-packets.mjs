#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V383_DEBATES,
  V383_OUTPUT_SCHEMA_VERSION,
  V383_PASSES,
  V383_ROOT,
  assert,
  canonicalJson,
  validateV383Output
} from "./lib/v383-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V383_ROOT}/sealed-option-map.json`);
const audit = await readJson(`${V383_ROOT}/packet-construction-audit.json`);
const inventory = await readJson("docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/final-source-inventory.json");
let initialContextCount = 0;
let counterbalancedSemanticPositions = true;
let leakageFreePackets = true;
const provisionalCategoryBalance = { noContact: 0, support: 0, attack: 0, motion: 0, central: 0, subsidiary: 0 };

for (const debate of inventory.debates) {
  for (const move of debate.moves) {
    const contact = move.provisionalBurdenContact;
    if (contact === null) provisionalCategoryBalance.noContact += 1;
    else {
      provisionalCategoryBalance[contact.polarity] += 1;
      provisionalCategoryBalance[contact.tier] += 1;
    }
  }
}

for (const reviewerPass of V383_PASSES) {
  for (const debateNumber of V383_DEBATES) {
    const packet = await readJson(`${V383_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`);
    const schema = await readJson(`${V383_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
    assert(packet.bundles.length === 4 && packet.allSpeakerAttributionConfidenceHigh === true, `${reviewerPass}.${debateNumber}: packet shape invalid`);
    const packetText = canonicalJson(packet);
    for (const forbiddenKey of ["provisionalBurdenContact", "provisionalLabelWarning", "attributionBasis", "matchesProvisionalAid"]) {
      if (packetText.includes(forbiddenKey)) leakageFreePackets = false;
    }
    const synthetic = {
      schemaVersion: V383_OUTPUT_SCHEMA_VERSION,
      debateNumber,
      reviewerPass,
      bundles: packet.bundles.map((bundle) => {
        const mapped = mapping.passes[reviewerPass][bundle.bundleId];
        assert(mapped.options.length === 21, `${reviewerPass}.${bundle.bundleId}: candidate count invalid`);
        assert(mapped.options.filter((item) => item.matchesProvisionalAid).length === 1, `${reviewerPass}.${bundle.bundleId}: provisional aid mapping invalid`);
        const semantic = mapped.options.map((item) => item.semanticTuple);
        assert(semantic.filter((item) => item.burdenContact === null).length === 1, `${reviewerPass}.${bundle.bundleId}: no-contact universe invalid`);
        assert(semantic.filter((item) => item.burdenContact?.polarity === "support").length === 10, `${reviewerPass}.${bundle.bundleId}: support universe invalid`);
        assert(semantic.filter((item) => item.burdenContact?.polarity === "attack").length === 10, `${reviewerPass}.${bundle.bundleId}: attack universe invalid`);
        assert(semantic.filter((item) => item.burdenContact?.tier === "motion").length === 4, `${reviewerPass}.${bundle.bundleId}: motion universe invalid`);
        assert(semantic.filter((item) => item.burdenContact?.tier === "central").length === 4, `${reviewerPass}.${bundle.bundleId}: central universe invalid`);
        assert(semantic.filter((item) => item.burdenContact?.tier === "subsidiary").length === 12, `${reviewerPass}.${bundle.bundleId}: subsidiary universe invalid`);
        const counterpartPass = reviewerPass === "pass-a" ? "pass-b" : "pass-a";
        const counterpart = mapping.passes[counterpartPass][bundle.bundleId];
        assert(canonicalJson(semantic.map(canonicalJson).sort()) === canonicalJson(counterpart.options.map((item) => canonicalJson(item.semanticTuple)).sort()), `${reviewerPass}.${bundle.bundleId}: pass universes differ`);
        for (const option of mapped.options) {
          const other = counterpart.options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(option.semanticTuple));
          assert(other, `${reviewerPass}.${bundle.bundleId}: counterpart tuple absent`);
          if (other.optionId === option.optionId) counterbalancedSemanticPositions = false;
        }
        const selected = mapped.options.find((item) => item.matchesProvisionalAid);
        return {
          bundleId: bundle.bundleId,
          optionId: selected.optionId,
          evidenceText: bundle.atomicExcerpt,
          rationale: "The atomic proposition supplies a direct reason for or against the exact selected bridge, so contact, polarity, tier, and bridge identity form one composite decision. The closest alternative is excluded by the compatibility check and the motion-level candidate is excluded unless the complete conclusion is expressed."
        };
      })
    };
    validateV383Output(synthetic, packet, schema);
    initialContextCount += 1;
  }
}

assert(leakageFreePackets, "provisional source-preparation labels leaked into packets");
assert(counterbalancedSemanticPositions, "semantic candidate positions were not counterbalanced");
assert(audit.status === "passed" && audit.totals.uniqueLocalEventMatches === 12, "packet-construction audit invalid");
assert(audit.totals.requiredAudioVerifications === 0 && audit.totals.pendingAudioVerifications === 0, "audio gate invalid");
assert(canonicalJson(provisionalCategoryBalance) === canonicalJson({ noContact: 3, support: 5, attack: 4, motion: 2, central: 2, subsidiary: 5 }), "provisional selection balance changed");

const fixture = {
  schemaVersion: "3.8.3-heldout-burden-contact-packet-dry-fixture",
  passed: true,
  dyadicOnly: true,
  debateCount: 3,
  initialContextCount,
  compositeCaseCount: 12,
  casesPerDebate: 4,
  candidateCountPerCase: 21,
  completeTwoRouteCandidateUniverse: true,
  explicitNoContactCandidate: true,
  supportAttackPolarityExplicit: true,
  propositionBearingBridges: true,
  semanticCandidatePositionsCounterbalanced: counterbalancedSemanticPositions,
  provisionalLabelsHiddenFromPackets: leakageFreePackets,
  provisionalCategoryBalance,
  uniqueLocalEventMatches: audit.totals.uniqueLocalEventMatches,
  highConfidenceAttributions: audit.totals.highConfidenceAttributions,
  requiredAudioVerifications: audit.totals.requiredAudioVerifications,
  pendingAudioVerifications: audit.totals.pendingAudioVerifications,
  scoringFields: 0,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0
};

if (shouldWrite) {
  await mkdir(path.resolve(root, V383_ROOT), { recursive: true });
  await writeFile(path.resolve(root, V383_ROOT, "packet-dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
