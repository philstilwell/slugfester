#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  auditDecomposedStrictSchema,
  candidateTransportCanonicalSha256,
  DECOMPOSED_INVENTORY,
  DECOMPOSED_INVENTORY_LIMITS,
} from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  buildCandidateCensus,
  buildCandidateShardedInventoryPlanSchema,
  buildCandidateShardedSideSelectionSchema,
  buildSideCandidateEvidenceTransport,
  candidateShardedFromSidePartitioned,
  candidateShardedPlanFromDecomposed,
  compileCandidateShardedInventory,
  composeCandidateShardedInventoryProposal,
  CANDIDATE_SHARDED_INVENTORY,
  splitSidePartitionedProposalToCandidateSharded,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  convertLegacyProposalToSidePartitionedSelectionMap,
  convertUniqueSelectionMapToSidePartitionedSelectionMap,
} from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

const shouldWrite = process.argv.includes("--write");
const developedIndex = process.argv.indexOf("--developed-at");
const developedAt = developedIndex >= 0 ? process.argv[developedIndex + 1] : null;
assertV4(
  !shouldWrite || (developedAt && !Number.isNaN(Date.parse(developedAt))),
  "--write requires --developed-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ORIGINAL_ROOT = `${VALIDATION_ROOT}/inventory`;
const RECOVERY_ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const UNIQUE_ROOT = `${VALIDATION_ROOT}/inventory-unique-selection-map-successor`;
const SIDE_ROOT =
  `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-successor`;
const DECOMPOSED_ROOT =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-successor`;
const DECOMPOSED_DEVELOPMENT_ROOT =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-development`;
const ROOT = `${VALIDATION_ROOT}/inventory-candidate-sharded-development`;
const GUIDE = `${ROOT}/candidate-sharded-inventory-guide.md`;
const OUTPUT = `${ROOT}/development-analysis.json`;
const PREPARATION = `${SIDE_ROOT}/preparation-manifest.json`;
const CLOSURE = `${VALIDATION_ROOT}/validation-closure-analysis.json`;
const DECOMPOSED_ANALYSIS =
  `${DECOMPOSED_DEVELOPMENT_ROOT}/development-analysis.json`;
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-candidate-sharded-development.mjs";
const SCORE_POLICY =
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md";
const SCORE_POLICY_LIBRARY =
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs";
const PROVEN_INPUT_CEILING_BYTES = 115000;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const clone = (value) => structuredClone(value);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(OUTPUT)),
    `${OUTPUT} already exists; development output is immutable`
  );
}

const [preparationBytes, closureBytes, priorAnalysisBytes, guideBytes] =
  await Promise.all([
    readFile(PREPARATION),
    readFile(CLOSURE),
    readFile(DECOMPOSED_ANALYSIS),
    readFile(GUIDE),
  ]);
const preparation = JSON.parse(preparationBytes);
const closure = JSON.parse(closureBytes);
const priorAnalysis = JSON.parse(priorAnalysisBytes);
assertV4(
  preparation.contexts?.length === 10 &&
    preparation.totals?.candidates === 406 &&
    closure.status ===
      "score-stability-v2-fresh-validation-failed-at-inventory-policy-not-promoted" &&
    closure.inventoryCampaign?.gatesAttempted === 5 &&
    closure.inventoryCampaign?.completeTenDebateGatesPassed === 0 &&
    closure.inventoryCampaign?.contextsAttempted === 36 &&
    closure.inventoryCampaign?.locallyValidIntermediateContexts === 30 &&
    closure.inventoryCampaign?.invalidContexts === 6 &&
    closure.artifactQuarantine?.files === 106 &&
    closure.artifactQuarantine?.reusableForFutureAcceptance === false &&
    priorAnalysis.status ===
      "decomposed-plan-selection-retired-regression-passed-successor-preparation-authorized",
  "closed validation evidence is unavailable or drifted"
);
for (const gate of closure.inventoryCampaign.gates) {
  assertV4(
    gate.completeTenDebateGatePassed === false &&
      gate.validOutputsReusableForAcceptance === false,
    `${gate.gateId}: failed gate disposition drifted`
  );
}
for (const [file, digest] of Object.entries(closure.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `${file}: closure source hash drifted`
  );
}

const manualBytes = await readFile(preparation.inputs.manual);
const contextsByDebate = new Map(
  preparation.contexts.map((context) => [context.debateNumber, context])
);
const priorBoundsByDebate = new Map(
  priorAnalysis.schemas.map((record) => [record.debateNumber, record])
);

function fixedString(prefix, maximum, fill) {
  assertV4(prefix.length <= maximum, `${prefix}: fixed string prefix too long`);
  return `${prefix}${fill.repeat(maximum - prefix.length)}`;
}

function maximumDecomposedPlanFixture({
  legacySchema,
  candidateTransport,
  debateNumber,
}) {
  const routes = ["pro", "con"].map((side) => ({
    routeId: fixedString(
      `route-${side}-`,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      side === "pro" ? "p" : "c"
    ),
    side,
    description: fixedString(
      `${side} route description `,
      DECOMPOSED_INVENTORY_LIMITS.routeDescription,
      side === "pro" ? "P" : "C"
    ),
    successCriteria: fixedString(
      `${side} route success criteria `,
      DECOMPOSED_INVENTORY_LIMITS.routeSuccessCriteria,
      side === "pro" ? "S" : "T"
    ),
    motionBridge: {
      bridgeId: fixedString(
        `${side}-motion-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        "m"
      ),
      tier: "motion",
      description: fixedString(
        `${side} motion bridge `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "M"
      ),
    },
    centralBridges: Array.from({ length: 4 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-central-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "central",
      description: fixedString(
        `${side} central bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "C"
      ),
    })),
    subsidiaryBridges: Array.from({ length: 2 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-subsidiary-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "subsidiary",
      description: fixedString(
        `${side} subsidiary bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "B"
      ),
    })),
  }));
  const weights = [17, 17, 17, 17, 16, 16];
  const sections = weights.map((weightPercent, index) => ({
    sectionId: fixedString(
      `section-${debateNumber}-${index}-`,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      String(index)
    ),
    title: fixedString(
      `Section ${index} `,
      DECOMPOSED_INVENTORY_LIMITS.title,
      "T"
    ),
    weightPercent,
    rationale: fixedString(
      `Section ${index} rationale `,
      DECOMPOSED_INVENTORY_LIMITS.sectionRationale,
      "R"
    ),
  }));
  return {
    schemaVersion: DECOMPOSED_INVENTORY.planSchemaVersion,
    protocolId: DECOMPOSED_INVENTORY.planProtocolId,
    debateNumber: legacySchema.properties.debateNumber.const,
    debateId: legacySchema.properties.debateId.const,
    reviewerRole: DECOMPOSED_INVENTORY.planReviewerRole,
    assessmentModel: DECOMPOSED_INVENTORY.model,
    calibrationOnly: true,
    candidateTransportCanonicalSha256:
      candidateTransportCanonicalSha256(candidateTransport),
    isolation: Object.fromEntries(
      Object.keys(legacySchema.properties.isolation.properties).map((key) => [
        key,
        key === "contaminationDetected" ? false : true,
      ])
    ),
    routes,
    sections,
    audit: {
      completeCandidateEvidenceBundleReviewed: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
}

const schemaRecords = [];
const artifactWrites = [];
for (const context of preparation.contexts) {
  const [legacySchemaBytes, candidateTransportBytes, packetBytes] =
    await Promise.all([
      readFile(context.priorSchema),
      readFile(context.modelCandidateTransport),
      readFile(context.packet),
    ]);
  const legacySchema = JSON.parse(legacySchemaBytes);
  const candidateTransport = JSON.parse(candidateTransportBytes);
  const candidateCensus = buildCandidateCensus(candidateTransport);
  const maximumPlan = candidateShardedPlanFromDecomposed({
    decomposedPlan: maximumDecomposedPlanFixture({
      legacySchema,
      candidateTransport,
      debateNumber: context.debateNumber,
    }),
    candidateTransport,
  });
  const planSchema = buildCandidateShardedInventoryPlanSchema({
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  const planSchemaAudit = auditDecomposedStrictSchema(planSchema);
  const candidateCensusBytes = compactBytes(candidateCensus);
  const maximumPlanBytes = compactBytes(maximumPlan);
  const planSchemaBytes = compactBytes(planSchema);
  const planInputBytes =
    manualBytes.length +
    guideBytes.length +
    packetBytes.length +
    candidateCensusBytes.length +
    planSchemaBytes.length;
  const sideRecords = [];
  for (const side of ["pro", "con"]) {
    const sideTransport = buildSideCandidateEvidenceTransport(
      candidateTransport,
      side
    );
    const sideSchema = buildCandidateShardedSideSelectionSchema({
      side,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
      plan: maximumPlan,
    });
    const sideSchemaAudit = auditDecomposedStrictSchema(sideSchema);
    const sideTransportBytes = compactBytes(sideTransport);
    const sideSchemaBytes = compactBytes(sideSchema);
    const copiedInputBytes =
      manualBytes.length +
      guideBytes.length +
      packetBytes.length +
      sideTransportBytes.length +
      maximumPlanBytes.length +
      sideSchemaBytes.length;
    const sideCandidates = candidateTransport.candidateRows.filter(
      (row) =>
        row[candidateTransport.columnOrder.indexOf("side")] === side
    ).length;
    assertV4(
      sideSchemaAudit.nullableCandidateProperties === sideCandidates &&
        copiedInputBytes <= PROVEN_INPUT_CEILING_BYTES,
      `${context.debateNumber}/${side}: schema or input bound drifted`
    );
    const transportPath =
      `${ROOT}/transports/sides/debate-${context.debateNumber}-${side}.json`;
    const schemaPath =
      `${ROOT}/schemas/sides/maximum-plan-debate-${context.debateNumber}-${side}.schema.json`;
    artifactWrites.push(
      { file: transportPath, bytes: sideTransportBytes },
      { file: schemaPath, bytes: sideSchemaBytes }
    );
    sideRecords.push({
      side,
      candidates: sideCandidates,
      transport: transportPath,
      transportSha256: sha256(sideTransportBytes),
      transportBytes: sideTransportBytes.length,
      schema: schemaPath,
      schemaSha256: sha256(sideSchemaBytes),
      schemaBytes: sideSchemaBytes.length,
      copiedInputBytes,
      strictObjectsAudited: sideSchemaAudit.objectsAudited,
      nullableCandidateProperties:
        sideSchemaAudit.nullableCandidateProperties,
      maximumSchemaTreeDepth: sideSchemaAudit.maximumSchemaTreeDepth,
      totalSchemaStringCharacters:
        sideSchemaAudit.totalSchemaStringCharacters,
    });
  }
  assertV4(
    planSchemaAudit.nullableCandidateProperties === 0 &&
      planInputBytes <= PROVEN_INPUT_CEILING_BYTES,
    `${context.debateNumber}: plan schema or input bound drifted`
  );
  const censusPath =
    `${ROOT}/transports/census/debate-${context.debateNumber}.json`;
  const planSchemaPath =
    `${ROOT}/schemas/plans/debate-${context.debateNumber}.schema.json`;
  artifactWrites.push(
    { file: censusPath, bytes: candidateCensusBytes },
    { file: planSchemaPath, bytes: planSchemaBytes }
  );
  const prior = priorBoundsByDebate.get(context.debateNumber);
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    candidateCensus: censusPath,
    candidateCensusSha256: sha256(candidateCensusBytes),
    candidateCensusBytes: candidateCensusBytes.length,
    candidateCensusColumns: candidateCensus.columnOrder.length,
    planSchema: planSchemaPath,
    planSchemaSha256: sha256(planSchemaBytes),
    planSchemaBytes: planSchemaBytes.length,
    maximumPlanOutputBytes: maximumPlanBytes.length,
    planCopiedInputBytes: planInputBytes,
    priorDecomposedPlanCopiedInputBytes: prior.planCopiedInputBytes,
    planInputReductionBytes: prior.planCopiedInputBytes - planInputBytes,
    planStrictObjectsAudited: planSchemaAudit.objectsAudited,
    planMaximumSchemaTreeDepth: planSchemaAudit.maximumSchemaTreeDepth,
    planTotalSchemaStringCharacters:
      planSchemaAudit.totalSchemaStringCharacters,
    planContainsCandidateSelections: false,
    sideSelectors: sideRecords,
  });
}

const datasets = [
  {
    label: "predecessor-timeout-gate",
    kind: "legacy",
    execution: `${ORIGINAL_ROOT}/model-execution.json`,
    preparation: `${ORIGINAL_ROOT}/preparation-manifest.json`,
  },
  {
    label: "columnar-recovery-gate",
    kind: "legacy",
    execution: `${RECOVERY_ROOT}/model-execution.json`,
    preparation: `${RECOVERY_ROOT}/preparation-manifest.json`,
  },
  {
    label: "unique-selection-successor-gate",
    kind: "unique-map",
    execution: `${UNIQUE_ROOT}/model-execution.json`,
    preparation: `${UNIQUE_ROOT}/preparation-manifest.json`,
  },
  {
    label: "side-partitioned-successor-gate",
    kind: "side-map",
    execution: `${SIDE_ROOT}/model-execution.json`,
    preparation: PREPARATION,
  },
];
const regressionRecords = [];
const regressionSourceFiles = [];
for (const dataset of datasets) {
  const [executionBytes, sourcePreparationBytes] = await Promise.all([
    readFile(dataset.execution),
    readFile(dataset.preparation),
  ]);
  const execution = JSON.parse(executionBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  regressionSourceFiles.push(dataset.execution, dataset.preparation);
  for (const result of execution.results.filter((item) => item.accepted)) {
    const sourceContext = sourcePreparation.contexts[result.contextIndex];
    const context = contextsByDebate.get(result.debateNumber);
    assertV4(sourceContext && context, `${result.debateNumber}: context unavailable`);
    const [
      proposalBytes,
      expectedLockedBytes,
      legacySchemaBytes,
      transportBytes,
      evidenceBundleBytes,
      eventsBytes,
    ] = await Promise.all([
      readFile(sourceContext.proposalOutput),
      readFile(sourceContext.lockedInventoryOutput),
      readFile(context.priorSchema),
      readFile(context.modelCandidateTransport),
      readFile(context.validatorCandidateEvidenceBundle),
      readFile(context.originalEvents),
    ]);
    const sourceProposal = JSON.parse(proposalBytes);
    const candidateTransport = JSON.parse(transportBytes);
    const sideProposal =
      dataset.kind === "legacy"
        ? convertLegacyProposalToSidePartitionedSelectionMap({
            legacyProposal: sourceProposal,
            candidateTransport,
          })
        : dataset.kind === "unique-map"
          ? convertUniqueSelectionMapToSidePartitionedSelectionMap({
              uniqueProposal: sourceProposal,
              candidateTransport,
            })
          : sourceProposal;
    const legacySchema = JSON.parse(legacySchemaBytes);
    const split = candidateShardedFromSidePartitioned({
      proposal: sideProposal,
      candidateTransport,
      legacySchema,
    });
    const compiled = compileCandidateShardedInventory({
      ...split,
      legacySchema,
      candidateTransport,
      evidenceBundle: JSON.parse(evidenceBundleBytes),
      eventsDocument: JSON.parse(eventsBytes),
    });
    assertV4(
      isDeepStrictEqual(compiled.proposal, sideProposal) &&
        isDeepStrictEqual(
          compiled.lockedInventory,
          JSON.parse(expectedLockedBytes)
        ) &&
        compiled.reduction.deterministicallyDeferredCandidates === 0,
      `${dataset.label}/${result.debateNumber}: regression drifted`
    );
    const sideProposalBytes = compactBytes(sideProposal);
    const planBytes = compactBytes(split.plan);
    const proBytes = compactBytes(split.sideSelections.pro);
    const conBytes = compactBytes(split.sideSelections.con);
    assertV4(
      [planBytes, proBytes, conBytes].every(
        (bytes) => bytes.length < sideProposalBytes.length
      ),
      `${dataset.label}/${result.debateNumber}: sharded output did not shrink`
    );
    regressionRecords.push({
      dataset: dataset.label,
      debateNumber: result.debateNumber,
      sourceProposal: sourceContext.proposalOutput,
      sourceProposalSha256: sha256(proposalBytes),
      sideProposalBytes: sideProposalBytes.length,
      planOutputBytes: planBytes.length,
      proSelectionOutputBytes: proBytes.length,
      conSelectionOutputBytes: conBytes.length,
      recomposedSideProposalIdentical: true,
      lockedInventoryCanonicallyIdentical: true,
      deterministicDeferrals: 0,
    });
    regressionSourceFiles.push(
      sourceContext.proposalOutput,
      sourceContext.lockedInventoryOutput,
      context.priorSchema,
      context.modelCandidateTransport,
      context.validatorCandidateEvidenceBundle,
      context.originalEvents
    );
  }
}
assertV4(
  regressionRecords.length === 22,
  "accepted-artifact regression coverage drifted"
);

const decomposedExecutionPath = `${DECOMPOSED_ROOT}/plan-model-execution.json`;
const decomposedPreparationPath = `${DECOMPOSED_ROOT}/preparation-manifest.json`;
const decomposedExecution = JSON.parse(await readFile(decomposedExecutionPath));
const decomposedPreparation = JSON.parse(
  await readFile(decomposedPreparationPath)
);
const planOnlyRegression = [];
for (const result of decomposedExecution.results.filter((item) => item.accepted)) {
  const context = contextsByDebate.get(result.debateNumber);
  const decomposedContext = decomposedPreparation.contexts[result.contextIndex];
  const [decomposedPlan, candidateTransport, legacySchema] = await Promise.all([
    readFile(decomposedContext.planOutput, "utf8").then(JSON.parse),
    readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
    readFile(context.priorSchema, "utf8").then(JSON.parse),
  ]);
  const candidateCensus = buildCandidateCensus(candidateTransport);
  const plan = candidateShardedPlanFromDecomposed({
    decomposedPlan,
    candidateTransport,
  });
  buildCandidateShardedSideSelectionSchema({
    side: "pro",
    legacySchema,
    candidateTransport,
    sideCandidateTransport: buildSideCandidateEvidenceTransport(
      candidateTransport,
      "pro"
    ),
    candidateCensus,
    plan,
  });
  planOnlyRegression.push({
    debateNumber: result.debateNumber,
    sourcePlan: decomposedContext.planOutput,
    sourcePlanSha256: sha256(await readFile(decomposedContext.planOutput)),
    convertedPlanBytes: compactBytes(plan).length,
    validatedAgainstCandidateCensus: true,
  });
  regressionSourceFiles.push(
    decomposedContext.planOutput,
    context.modelCandidateTransport,
    context.priorSchema
  );
}
assertV4(planOnlyRegression.length === 8, "plan-only regression count drifted");

const debate31Context = contextsByDebate.get("31");
const [debate31Transport, debate31LegacySchema, debate31Evidence, debate31Events] =
  await Promise.all([
    readFile(debate31Context.modelCandidateTransport, "utf8").then(JSON.parse),
    readFile(debate31Context.priorSchema, "utf8").then(JSON.parse),
    readFile(debate31Context.validatorCandidateEvidenceBundle, "utf8").then(
      JSON.parse
    ),
    readFile(debate31Context.originalEvents, "utf8").then(JSON.parse),
  ]);
const failedDuplicateProposal =
  `${RECOVERY_ROOT}/inventory-proposals/debate-31.json`;
let legacyDuplicateRejected = false;
try {
  convertLegacyProposalToSidePartitionedSelectionMap({
    legacyProposal: JSON.parse(await readFile(failedDuplicateProposal)),
    candidateTransport: debate31Transport,
  });
} catch {
  legacyDuplicateRejected = true;
}
assertV4(legacyDuplicateRejected, "legacy duplicate fixture was not rejected");

const failedCardinalityProposal =
  `${UNIQUE_ROOT}/inventory-proposals/debate-31.json`;
const overnominatedSideProposal =
  convertUniqueSelectionMapToSidePartitionedSelectionMap({
    uniqueProposal: JSON.parse(await readFile(failedCardinalityProposal)),
    candidateTransport: debate31Transport,
  });
const overnominatedSplit = splitSidePartitionedProposalToCandidateSharded({
  proposal: overnominatedSideProposal,
  candidateTransport: debate31Transport,
  legacySchema: debate31LegacySchema,
});
const overnominatedCompiled = compileCandidateShardedInventory({
  ...overnominatedSplit,
  legacySchema: debate31LegacySchema,
  candidateTransport: debate31Transport,
  evidenceBundle: debate31Evidence,
  eventsDocument: debate31Events,
});
assertV4(
  overnominatedCompiled.reduction.deterministicallyDeferredCandidates === 1,
  "Debate 31 overnomination was not deterministically bounded"
);

const acceptedDebate86 = `${SIDE_ROOT}/inventory-proposals/debate-86.json`;
const debate86Context = contextsByDebate.get("86");
const [debate86Proposal, debate86Transport, debate86LegacySchema] =
  await Promise.all([
    readFile(acceptedDebate86, "utf8").then(JSON.parse),
    readFile(debate86Context.modelCandidateTransport, "utf8").then(JSON.parse),
    readFile(debate86Context.priorSchema, "utf8").then(JSON.parse),
  ]);
const boundSplit = splitSidePartitionedProposalToCandidateSharded({
  proposal: debate86Proposal,
  candidateTransport: debate86Transport,
  legacySchema: debate86LegacySchema,
});

async function rejectsMutation(mutator) {
  const mutated = clone(boundSplit);
  mutator(mutated);
  try {
    composeCandidateShardedInventoryProposal({
      ...mutated,
      legacySchema: debate86LegacySchema,
      candidateTransport: debate86Transport,
    });
    return false;
  } catch {
    return true;
  }
}

const planHashMismatchRejected = await rejectsMutation((mutated) => {
  mutated.sideSelections.pro.inventoryPlanSha256 = "0".repeat(64);
});
const postSelectionPlanMutationRejected = await rejectsMutation((mutated) => {
  mutated.plan.sections[0].title = `${mutated.plan.sections[0].title} changed`;
});
const sideTransportHashMismatchRejected = await rejectsMutation((mutated) => {
  mutated.sideSelections.con.sideCandidateTransportCanonicalSha256 =
    "0".repeat(64);
});
const extraCandidateKeyRejected = await rejectsMutation((mutated) => {
  mutated.sideSelections.pro.candidateSelections["duplicate:key"] = null;
});
const wrongSideCandidateRelocationRejected = await rejectsMutation((mutated) => {
  const candidateId = Object.keys(
    mutated.sideSelections.pro.candidateSelections
  )[0];
  const selection = mutated.sideSelections.pro.candidateSelections[candidateId];
  delete mutated.sideSelections.pro.candidateSelections[candidateId];
  mutated.sideSelections.con.candidateSelections[candidateId] = selection;
});
const emptySectionCoverageRejected = await rejectsMutation((mutated) => {
  const sectionId = mutated.plan.sections[0].sectionId;
  for (const [candidateId, selection] of Object.entries(
    mutated.sideSelections.pro.candidateSelections
  )) {
    if (selection?.sectionId === sectionId) {
      mutated.sideSelections.pro.candidateSelections[candidateId] = null;
    }
  }
});
assertV4(
  [
    planHashMismatchRejected,
    postSelectionPlanMutationRejected,
    sideTransportHashMismatchRejected,
    extraCandidateKeyRejected,
    wrongSideCandidateRelocationRejected,
    emptySectionCoverageRejected,
  ].every(Boolean),
  "candidate-sharded mutation probe was not rejected"
);

const debate137TimeoutOccurrences = closure.inventoryCampaign.gates.filter(
  (gate) =>
    gate.failedDebates.includes("137") && gate.failureModes.includes("timed-out")
).length;
const debate93TimeoutOccurrences = closure.inventoryCampaign.gates.filter(
  (gate) =>
    gate.failedDebates.includes("93") && gate.failureModes.includes("timed-out")
).length;
assertV4(
  debate137TimeoutOccurrences === 3 && debate93TimeoutOccurrences === 1,
  "timeout history drifted"
);

const sourceFiles = [
  PREPARATION,
  CLOSURE,
  DECOMPOSED_ANALYSIS,
  GUIDE,
  preparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  SCORE_POLICY,
  SCORE_POLICY_LIBRARY,
  "scripts/test-assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  LIBRARY,
  SCRIPT,
  TEST,
  decomposedExecutionPath,
  decomposedPreparationPath,
  failedDuplicateProposal,
  failedCardinalityProposal,
  acceptedDebate86,
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.modelCandidateTransport,
    context.validatorCandidateEvidenceBundle,
    context.originalEvents,
    context.priorSchema,
  ]),
  ...regressionSourceFiles,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const allSideRecords = schemaRecords.flatMap((record) => record.sideSelectors);
const analysis = {
  schemaVersion:
    "1.0-score-stability-v2-candidate-sharded-inventory-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2-candidate-sharded-inventory-development",
  status:
    "candidate-sharded-retired-regression-and-adversarial-development-passed-fresh-disjoint-cohort-selection-authorized",
  developedAt: shouldWrite ? developedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  executionBoundary: {
    modelLabel: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemoved: true,
    freshIsolatedContextPerStage: true,
    retries: 0,
    timeoutExtensions: 0,
  },
  scoreStabilityPolicyClarification: {
    prospectivePolicyVersion: "v2.1",
    everyIntegerRoundedTieAccepted: true,
    unroundedDirectionRetainedAsDiagnosticOnly: true,
    publishedOppositeSideReversalRejected: true,
    publicScoreFormulaChanged: false,
    failedV1CanaryReclassified: false,
    frozenV2ProposalAltered: false,
    proposedV2PolicyPromoted: false,
  },
  failedGateDisposition: {
    gatesAttempted: closure.inventoryCampaign.gatesAttempted,
    completeTenDebateGatesPassed:
      closure.inventoryCampaign.completeTenDebateGatesPassed,
    contextsAttempted: closure.inventoryCampaign.contextsAttempted,
    locallyValidIntermediateContexts:
      closure.inventoryCampaign.locallyValidIntermediateContexts,
    invalidContexts: closure.inventoryCampaign.invalidContexts,
    quarantinedFiles: closure.artifactQuarantine.files,
    everyFailedGatePreservedFailed: true,
    priorOutputsReusableForAcceptance: false,
    priorOutputsReusableAsFreshModelInput: false,
    retriesPerformed: 0,
    timeoutExtensionsPerformed: 0,
    semanticCorrectionsPerformed: 0,
  },
  design: {
    protocolVersion: CANDIDATE_SHARDED_INVENTORY.planSchemaVersion,
    stages: [
      "candidate-census-plan",
      "pro-candidate-evidence-selection",
      "con-candidate-evidence-selection",
    ],
    contextsPerDebate: 3,
    plannerWritableDomains: ["routes", "sections"],
    plannerCandidateSelectionUnavailable: true,
    everyCandidatePresentInCensus: true,
    censusOmittedFields: [
      "candidateEvidence.excerpt",
      "candidateEvidence.sourceExact",
    ],
    sideSelectorWritableDomains: ["candidateSelections"],
    sideSelectorRoutesAndSectionsImmutable: true,
    sideSelectorsMutuallyIsolated: true,
    everyOriginalModelVisibleFieldRetainedForSelectedSide: true,
    candidateIdentityStructurallyUnique: true,
    crossSectionDuplicateRepresentable: false,
    positionCollisionRepresentable: false,
    overnominationPermitted: true,
    deterministicCardinalityRule:
      "priority-tier-then-chronology-retain-first-two-per-section-side",
    missingSectionSideCoverageFailsClosed: true,
    canonicalCensusAndFullTransportBoundInPlan: true,
    canonicalSideTransportAndPlanBoundInEachSelector: true,
    deterministicCompositionRequired: true,
    scoreFieldsAvailable: false,
    semanticCandidateDownselectionBeforeSelectors: false,
  },
  schemas: schemaRecords,
  regression: {
    datasets: datasets.map((dataset) => dataset.label),
    acceptedArtifactsTested: regressionRecords.length,
    records: regressionRecords,
    recomposedSideProposalsIdentical: regressionRecords.length,
    lockedInventoriesCanonicallyIdentical: regressionRecords.length,
    everyStageOutputSmallerThanSourceProposal: true,
    decomposedPlanOnlyArtifactsTested: planOnlyRegression.length,
    planOnlyRecords: planOnlyRegression,
    freshModelEvidenceUsed: false,
  },
  failureProbes: {
    failedDebate31LegacyDuplicateRejected: legacyDuplicateRejected,
    failedDebate31OvernominationAcceptedAsDevelopmentFixture: true,
    failedDebate31DeterministicallyDeferredCandidates:
      overnominatedCompiled.reduction.deterministicallyDeferredCandidates,
    failedDebate31CompiledAfterDeterministicReduction: true,
    planHashMismatchRejected,
    postSelectionPlanMutationRejected,
    sideTransportHashMismatchRejected,
    extraCandidateKeyRejected,
    wrongSideCandidateRelocationRejected,
    emptySectionCoverageRejected,
    debate137TimeoutOccurrences,
    debate93TimeoutOccurrences,
    failedOutputsUsedForAcceptance: false,
    semanticRepairAttempted: false,
  },
  stageInputBounds: {
    provenCeilingBytes: PROVEN_INPUT_CEILING_BYTES,
    planMinimumCopiedInputBytes: Math.min(
      ...schemaRecords.map((record) => record.planCopiedInputBytes)
    ),
    planMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.planCopiedInputBytes)
    ),
    sideMinimumCopiedInputBytes: Math.min(
      ...allSideRecords.map((record) => record.copiedInputBytes)
    ),
    sideMaximumCopiedInputBytes: Math.max(
      ...allSideRecords.map((record) => record.copiedInputBytes)
    ),
    everyStageWithinProvenCeiling: true,
    priorDecomposedPlanMaximumCopiedInputBytes:
      priorAnalysis.stageInputBounds.planMaximumCopiedInputBytes,
    candidateShardedPlanMaximumReductionBytes:
      priorAnalysis.stageInputBounds.planMaximumCopiedInputBytes -
      Math.max(...schemaRecords.map((record) => record.planCopiedInputBytes)),
    maximumPlanStringLengthsFrozen: clone(DECOMPOSED_INVENTORY_LIMITS),
  },
  sourceHashes,
  totals: {
    debatesMeasured: schemaRecords.length,
    candidates: preparation.totals.candidates,
    schemaPrototypes: schemaRecords.length + allSideRecords.length,
    transportPrototypes: schemaRecords.length + allSideRecords.length,
    acceptedRetiredOutputsReplayed: regressionRecords.length,
    acceptedRetiredPlansReplayed: planOnlyRegression.length,
    failedOutputsProbed: 2,
    bindingAndStructureTamperProbes: 6,
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    freshDisjointCohortSelection: true,
    successorPreparation: false,
    successorExecutionManifest: false,
    successorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    priorOutputReuseForSuccessorAcceptance: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "select-a-new-disjoint-ten-debate-development-validation-cohort-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of artifactWrites) {
    assertV4(!(await exists(file)), `${file} already exists; artifact is immutable`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(OUTPUT, jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      debatesMeasured: analysis.totals.debatesMeasured,
      candidates: analysis.totals.candidates,
      acceptedArtifactsReplayed:
        analysis.totals.acceptedRetiredOutputsReplayed,
      acceptedPlansReplayed: analysis.totals.acceptedRetiredPlansReplayed,
      debate31DeterministicDeferrals:
        analysis.failureProbes.failedDebate31DeterministicallyDeferredCandidates,
      planMaximumCopiedInputBytes:
        analysis.stageInputBounds.planMaximumCopiedInputBytes,
      sideMaximumCopiedInputBytes:
        analysis.stageInputBounds.sideMaximumCopiedInputBytes,
      modelContextsExecuted: analysis.totals.modelContextsExecuted,
      scoresDerived: analysis.totals.scoresDerived,
      nextAuthorized: "fresh-disjoint-cohort-selection-only",
    },
    null,
    2
  )
);
