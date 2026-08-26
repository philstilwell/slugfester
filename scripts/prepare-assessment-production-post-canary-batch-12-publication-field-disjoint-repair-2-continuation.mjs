#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEBATE_PLANS, MODEL, PROTOCOL_ID, ROOT, buildFieldDisjointRepairSchema
} from "./lib/assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs";
import { validatePostCanaryBatch12PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-12-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/publication-reconstruction";
const RESUMPTION_ROOT = `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-2`;
const ORIGINAL_PREPARATION = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const MANUAL = `${ROOT}/manual.md`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";
const FAILED_DEBATES = DEBATE_PLANS.map((plan) => plan.debateNumber);
const ALL_DEBATES = ["131", "07", "15"];

const [originalPreparationBytes, originalActivationBytes,
  originalExecutionBytes, originalAnalysisBytes] = await Promise.all([
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
assertV4(
  originalExecution.status === "eight-context-publication-resumption-completed-with-failure" &&
    originalExecution.contextsAttempted === 8 && originalExecution.contextsUnattempted === 0 &&
    originalExecution.validContexts === 5 && originalExecution.invalidContexts === 3 &&
    originalExecution.attempts === 8 &&
    originalExecution.retries === 0 && originalExecution.timeoutExtensions === 0 &&
    originalExecution.correctionContexts === 0 &&
    canonicalJson(originalExecution.results.filter((item) => !item.gateAcceptancePassed)
      .map((item) => item.debateNumber)) === canonicalJson(FAILED_DEBATES) &&
    originalAnalysis.status === "eight-context-publication-resumption-failed",
  "Batch 12 publication resumption failure boundary changed"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `original publication source hash mismatch: ${file}`);
}

const allArtifacts = new Map();
for (const debateNumber of ALL_DEBATES) {
  const output = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const outputBytes = await readFile(path.resolve(output));
  const packetBytes = await readFile(path.resolve(packet));
  allArtifacts.set(debateNumber, {
    debateNumber, output, outputBytes, outputJson: JSON.parse(outputBytes),
    packet, packetBytes, packetJson: JSON.parse(packetBytes)
  });
}
const structuralStandIn = Object.values(allArtifacts.get("15").outputJson.moveProse)
  .map((entry) => entry.critique)
  .find((critique) => {
    const words = wordCount(critique);
    return words >= 105 && words <= 130 && critique.length >= 880;
  });
assertV4(structuralStandIn, "the failed cohort has no validation-clean critique stand-in");
const allExtensionItems = (output) => ["pro", "con"].flatMap((side) => {
  const extension = output.aiExtension[side];
  return [
    { side, slot: "thesis", index: null, item: extension.thesis },
    ...extension.premises.map((item, index) => ({ side, slot: "premises", index, item })),
    { side, slot: "conclusion", index: null, item: extension.conclusion },
    ...extension.newArguments.map((item, index) => ({ side, slot: "newArguments", index, item }))
  ];
});
const locateExtensionItem = (output, target) =>
  allExtensionItems(output).find((entry) => entry.item.id === target.itemId)?.item;
const noveltyStandIn = allExtensionItems(allArtifacts.get("07").outputJson)
  .map((entry) => entry.item.novelty.explanation)
  .find((explanation) => wordCount(explanation) >= 8);
assertV4(noveltyStandIn, "Debate 07 has no validation-clean novelty stand-in");

const expectedCritiqueCounts = { "131": 20, "07": 0, "15": 8 };
const expectedNoveltyCounts = { "131": 0, "07": 1, "15": 0 };
const diagnostics = [];
const targetsByDebate = new Map();
for (const plan of DEBATE_PLANS) {
  const artifact = allArtifacts.get(plan.debateNumber);
  const invalidCritiques = artifact.packetJson.moves.filter((move) => {
    const critique = artifact.outputJson.moveProse[move.moveId].critique;
    const words = wordCount(critique);
    return words < 105 || words > 130;
  });
  assertV4(invalidCritiques.length === expectedCritiqueCounts[plan.debateNumber],
    `Debate ${plan.debateNumber}: failed critique set changed`);
  const quoteIssues = [];
  for (const side of ["pro", "con"]) {
    const quote = artifact.outputJson.representativeQuotes[side];
    const move = artifact.packetJson.moves.find((candidate) => candidate.moveId === quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible,
      `Debate ${plan.debateNumber} ${side}: quote source changed`);
    if (!move.sourceExcerpt.includes(quote.text)) quoteIssues.push({ side, quote, move });
  }
  assertV4(quoteIssues.length === 0,
    `Debate ${plan.debateNumber}: quote failure set changed`);
  const invalidNovelty = allExtensionItems(artifact.outputJson).filter(
    (entry) => wordCount(entry.item.novelty.explanation) < 8
  );
  assertV4(invalidNovelty.length === expectedNoveltyCounts[plan.debateNumber],
    `Debate ${plan.debateNumber}: failed novelty set changed`);
  const auditClone = structuredClone(artifact.outputJson);
  for (const move of invalidCritiques) {
    const critique = auditClone.moveProse[move.moveId].critique;
    assertV4(wordCount(critique) > 130 && critique.length >= 880,
      `Debate ${plan.debateNumber} ${move.moveId}: diagnosed critique changed`);
    auditClone.moveProse[move.moveId].critique = structuralStandIn;
  }
  if (quoteIssues.length) {
    const issue = quoteIssues[0];
    auditClone.representativeQuotes[issue.side].text =
      issue.move.sourceExcerpt.trim().split(/\s+/).slice(0, 8).join(" ");
  }
  for (const entry of invalidNovelty) {
    const auditItem = locateExtensionItem(auditClone, { itemId: entry.item.id });
    auditItem.novelty.explanation = noveltyStandIn;
  }
  const nonTargetAudit = validatePostCanaryBatch12PublicationOutput(
    auditClone, artifact.packetJson
  );
  assertV4(nonTargetAudit.status === "passed",
    `Debate ${plan.debateNumber}: validation-clean non-target fields changed`);
  const targets = [];
  if (quoteIssues.length) {
    const issue = quoteIssues[0];
    targets.push({
      kind: "quote",
      field: `representativeQuotes.${issue.side}.text`,
      side: issue.side,
      sourceMoveId: issue.move.moveId,
      sourceExcerpt: issue.move.sourceExcerpt,
      immutableContext: issue.quote.context,
      originalValueSha256: sha256(issue.quote.text)
    });
  }
  for (const move of invalidCritiques) {
    const critique = artifact.outputJson.moveProse[move.moveId].critique;
    targets.push({
      kind: "critique",
      field: `moveProse.${move.moveId}.critique`,
      moveId: move.moveId,
      move,
      originalWords: wordCount(critique),
      originalCharacters: critique.length,
      originalValueSha256: sha256(critique)
    });
  }
  for (const entry of invalidNovelty) {
    const explanation = entry.item.novelty.explanation;
    targets.push({
      kind: "novelty",
      field: `aiExtension.${entry.side}.${entry.slot}${entry.index === null ? "" : `.${entry.index}`}.novelty.explanation`,
      side: entry.side,
      slot: entry.slot,
      index: entry.index,
      itemId: entry.item.id,
      itemText: entry.item.text,
      classification: entry.item.novelty.classification,
      sourceMoveIds: entry.item.novelty.sourceMoveIds,
      originalWords: wordCount(explanation),
      originalCharacters: explanation.length,
      originalValueSha256: sha256(explanation)
    });
  }
  targetsByDebate.set(plan.debateNumber, targets);
  diagnostics.push({
    debateNumber: plan.debateNumber,
    invalidCritiques: invalidCritiques.map((move) => ({
      moveId: move.moveId,
      field: `moveProse.${move.moveId}.critique`,
      words: wordCount(artifact.outputJson.moveProse[move.moveId].critique),
      characters: artifact.outputJson.moveProse[move.moveId].critique.length
    })),
    invalidQuotes: quoteIssues.map((issue) => ({
      side: issue.side,
      field: `representativeQuotes.${issue.side}.text`,
      sourceMoveId: issue.move.moveId,
      words: wordCount(issue.quote.text)
    })),
    invalidNoveltyExplanations: invalidNovelty.map((entry) => ({
      itemId: entry.item.id,
      field: `aiExtension.${entry.side}.${entry.slot}${entry.index === null ? "" : `.${entry.index}`}.novelty.explanation`,
      words: wordCount(entry.item.novelty.explanation),
      characters: entry.item.novelty.explanation.length
    })),
    nonTargetStructuralAudit: nonTargetAudit
  });
}
assertV4(diagnostics.reduce((sum, item) => sum + item.invalidCritiques.length, 0) === 28 &&
  diagnostics.reduce((sum, item) => sum + item.invalidQuotes.length, 0) === 0 &&
  diagnostics.reduce((sum, item) => sum + item.invalidNoveltyExplanations.length, 0) === 1,
"diagnosed 29-field repair scope changed");

const manualText = `# Batch 12 field-disjoint publication repair\n\n` +
  `Author only the correction strings required by packet.json and schema.json. ` +
  `The schema is authoritative. Every critique must contain exactly four ordered labeled sentences: ` +
  `Strongest feature:, Principal limitation:, Live burden:, Locked score:. Count every whitespace-separated ` +
  `token, including all label words. Target 112–118 total tokens and do not exceed 122 by your own count; ` +
  `the repository accepts 105–130. Each critique must contain at least 880 characters, with terminal ` +
  `punctuation on every sentence. A quote correction must be a 3–18 word exact contiguous substring ` +
  `of its supplied sourceExcerpt. A novelty explanation correction must contain at least eight words ` +
  `and accurately explain the supplied classification and source-move relationship. ` +
  `Participant judgments and scores are closed. Do not author scores, ` +
  `change any non-target field, add tags, or consult outside material. The rejected prior strings are ` +
  `unavailable and must not be inferred. Return one JSON object and nothing else.\n`;
const manualBytes = Buffer.from(manualText);

const contexts = [];
let contextIndex = 0;
for (const plan of DEBATE_PLANS) {
  const artifact = allArtifacts.get(plan.debateNumber);
  const allTargets = targetsByDebate.get(plan.debateNumber);
  const quoteTargets = allTargets.filter((target) => target.kind === "quote");
  const critiqueTargets = allTargets.filter((target) => target.kind === "critique");
  const noveltyTargets = allTargets.filter((target) => target.kind === "novelty");
  let critiqueOffset = 0;
  for (let shardIndex = 0; shardIndex < plan.critiqueShardSizes.length; shardIndex += 1) {
    const size = plan.critiqueShardSizes[shardIndex];
    const shardTargets = critiqueTargets.slice(critiqueOffset, critiqueOffset + size);
    critiqueOffset += size;
    if (shardIndex === 0) shardTargets.unshift(...quoteTargets, ...noveltyTargets);
    const keyedTargets = shardTargets.map((target, fieldIndex) => ({
      ...target,
      fieldKey: `field_${String(fieldIndex + 1).padStart(2, "0")}`
    }));
    const shardId = `debate-${plan.debateNumber}-shard-${shardIndex + 1}`;
    const packet = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-packet",
      protocolId: PROTOCOL_ID,
      contextIndex,
      shardId,
      productionCanary: false,
      batchNumber: 12,
      stagingOnly: true,
      debateNumber: plan.debateNumber,
      debateId: artifact.packetJson.debateId,
      assessmentModel: MODEL.label,
      correctionType: "user-authorized-multi-field-field-disjoint-publication-repair",
      writableFieldCount: keyedTargets.length,
      writableFields: keyedTargets.map((target) => target.field),
      targets: keyedTargets,
      rejectedPriorStringsAvailable: false,
      failedPublicationOutputAvailable: false,
      allOtherFieldsUnavailableAndImmutable: true,
      participantJudgmentClosed: true,
      publicationScoreLocked: true,
      scoresRepositoryOwnedAndImmutable: true,
      constraints: {
        critiqueSentenceCount: 4,
        critiqueOrderedLabels: [
          "Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"
        ],
        critiqueWordsMinimum: 105,
        critiqueWordsMaximum: 130,
        critiqueWordsTargetMinimum: 112,
        critiqueWordsTargetMaximum: 118,
        critiqueCharactersMinimum: 880,
        terminalPunctuationRequired: true,
        quoteWordsMinimum: 3,
        quoteWordsMaximum: 18,
        quoteExactContiguousSourceSubstringRequired: true,
        noveltyExplanationWordsMinimum: 8,
        namedFallacyOrBiasFieldsWritable: false
      }
    };
    const schema = buildFieldDisjointRepairSchema(packet);
    const packetPath = `${ROOT}/packets/context-${contextIndex}.json`;
    const schemaPath = `${ROOT}/schemas/context-${contextIndex}.schema.json`;
    const packetBytes = pretty(packet);
    const schemaBytes = pretty(schema);
    contexts.push({
      contextIndex,
      shardId,
      debateNumber: plan.debateNumber,
      debateId: artifact.packetJson.debateId,
      writableFields: packet.writableFields,
      writableFieldCount: packet.writableFieldCount,
      packet: packetPath,
      packetBytes,
      packetSha256: sha256(packetBytes),
      schema: schemaPath,
      schemaBytes,
      schemaSha256: sha256(schemaBytes),
      output: `${ROOT}/outputs/context-${contextIndex}.json`,
      validation: `${ROOT}/validations/context-${contextIndex}.json`,
      provenance: `${ROOT}/provenance/context-${contextIndex}.json`
    });
    contextIndex += 1;
  }
  assertV4(critiqueOffset === critiqueTargets.length,
    `Debate ${plan.debateNumber}: shard coverage changed`);
}
assertV4(contexts.length === 15 &&
  contexts.every((context) => context.writableFieldCount >= 1 && context.writableFieldCount <= 2) &&
  contexts.reduce((sum, context) => sum + context.writableFieldCount, 0) === 29 &&
  new Set(contexts.flatMap((context) => context.writableFields)).size === 29,
"fifteen-shard, 29-field coverage changed");

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs",
  "scripts/run-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-2-continuation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-12-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
  ORIGINAL_ANALYSIS,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  ...ALL_DEBATES.flatMap((debateNumber) => {
    const artifact = allArtifacts.get(debateNumber);
    const files = [artifact.output, artifact.packet];
    const validation = `${PUBLICATION_ROOT}/validations/debate-${debateNumber}.json`;
    const provenance = `${PUBLICATION_ROOT}/provenance/debate-${debateNumber}.json`;
    return [...files, validation, provenance];
  }),
  ...sourceScripts
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
sourceHashes[MANUAL] = sha256(manualBytes);
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}

const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  `${ROOT}/complete-cohort-analysis.json`,
  ...contexts.flatMap((context) => [context.output, context.validation, context.provenance]),
  ...FAILED_DEBATES.flatMap((debateNumber) => [
    `${ROOT}/corrected/debate-${debateNumber}.json`,
    `${ROOT}/complete-validations/debate-${debateNumber}.json`,
    `${ROOT}/merge-audits/debate-${debateNumber}.json`
  ])
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-field-disjoint-repair-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-fifteen-context-twenty-nine-field-batch-12-publication-repair-level-2-continuation-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  userAuthorization: {
    source: "Batch 12 complete-workflow standing authorization",
    resolvedScope: "fifteen fresh field-disjoint shards completing recovery level 2 by correcting exactly 28 rejected critiques and one rejected novelty explanation across Debates 131, 07, and 15 while retaining every validation-clean field",
    workflowException: null,
    contexts: 15,
    writableFields: 29,
    writableFieldsMaximumPerPacket: 2,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  model: MODEL,
  contexts: contexts.map(({ packetBytes, schemaBytes, ...context }) => context),
  diagnosis: {
    status: "deterministically-confirmed-twenty-nine-field-level-2-continuation",
    debates: diagnostics,
    totals: { debates: 3, invalidCritiques: 28, invalidQuotes: 0, invalidNoveltyExplanations: 1, writableFields: 29 },
    everyNonTargetFieldStructurallyValidated: true,
    temporaryStandInsWrittenOrRetained: false
  },
  diagnosticStandIn: {
    source: "validation-clean-critique-and-novelty-explanation-from-the-preserved-failed-cohort",
    persistedAsCorrection: false
  },
  modelInputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    repairManual: MANUAL,
    filesPerContext: [
      "production-workflow.md", "readiness-workflow.md", "output-contract.md",
      "repair-manual.md", "packet.json", "schema.json"
    ]
  },
  isolation: {
    oneDebatePerContext: true,
    freshContextPerShard: true,
    onlyFrozenInputsAvailable: true,
    failedPublicationOutputsUnavailable: true,
    rejectedPriorStringsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    participantJudgmentClosed: true,
    scoresRepositoryOwnedAndImmutable: true,
    allNonTargetFieldsUnavailableAndImmutable: true,
    fieldDisjointAcrossShards: true
  },
  retentionContract: {
    acceptedOriginalDebatesRetained: 0,
    validationCleanFieldsRetainedDeterministically: true,
    rejectedPriorStringsRetained: false,
    eachTargetFieldReplacedAtMostOnce: true,
    completeDebateValidationRequiredAfterMerge: true,
    completeTenDebateCohortReplayRequiredAfterThisFinalLevel2Continuation: true
  },
  executionEnvironment: {
    codexPath: CODEX,
    codexCliVersion: execFileSync(CODEX, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 15,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    furtherCorrectionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    continueIndependentFrozenShardsAfterFailure: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noFurtherAutomaticCorrection: true,
    noPaidServices: true,
    noProductionMutationUntilEveryDebatePasses: true,
    stopBeforeBatch13: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    completeCohortAnalysis: `${ROOT}/complete-cohort-analysis.json`
  },
  totals: {
    debates: 3, contexts: 15, critiqueFields: 28, quoteFields: 0,
    noveltyExplanationFields: 1, writableFields: 29,
    modelContextsExecuted: 0, modelAuthoredScores: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    preparation: true, activation: true, modelExecution: true,
    deterministicValidationMergeAndCohortReplay: true,
    retries: false, timeoutExtensions: false, furtherCorrections: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-level-2-continuation-shards-then-activate"
};
assertV4(manifest.model.slug === "gpt-5.6-sol" &&
  manifest.model.reasoningEffort === "low" &&
  manifest.model.authentication === "ChatGPT subscription",
"authorized model settings changed");
if (shouldWrite) {
  await mkdir(path.resolve(`${ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(`${ROOT}/schemas`), { recursive: true });
  await writeFile(path.resolve(MANUAL), manualBytes);
  for (const context of contexts) {
    await writeFile(path.resolve(context.packet), context.packetBytes);
    await writeFile(path.resolve(context.schema), context.schemaBytes);
  }
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debates: FAILED_DEBATES,
  contexts: 15,
  critiqueFields: 28,
  quoteFields: 0,
  noveltyExplanationFields: 1,
  writableFields: 29,
  maximumParallelContexts: 2,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  furtherCorrectionsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
