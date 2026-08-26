import { POST_CANARY_BATCH_10_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_10_PUBLICATION_MODEL } from
  "./assessment-production-post-canary-batch-10-publication.mjs";
import { POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_PROTOCOL_ID,
  validatePostCanaryBatch10CompiledStagingRecord } from
  "./assessment-production-post-canary-batch-10-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-finalization";
export const POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-finalization";
export const POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_ORDER =
  POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER;

export function buildPostCanaryBatch10PublicationFinalization({ compiled, compiledPath,
  compiledSha256, output, packet, identity }) {
  const compilationValidation = validatePostCanaryBatch10CompiledStagingRecord({
    compiled, output, packet, identity });
  assertV4(compiled.stagingAudit?.protocolId === POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    compiled.stagingAudit.productionCanary === false && compiled.stagingAudit.batchNumber === 10 &&
    compiled.stagingAudit.stagingOnly === true && compiled.stagingAudit.productionMutationPerformed === false &&
    compiled.stagingAudit.displayContract.byline === POST_CANARY_BATCH_10_PUBLICATION_BYLINE &&
    compiled.stagingAudit.displayContract.defaultCollapsed === true,
  `${compiled.number}: compiled staging audit changed`);
  const candidate = structuredClone(compiled);
  delete candidate.stagingAudit;
  const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-finalization-provenance",
    protocolId: POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_PROTOCOL_ID,
    status: "staging-only-batch-10-final-candidate-provenance",
    productionCanary: false, batchNumber: 10, debateNumber: compiled.number,
    debateId: compiled.id, compiledInput: compiledPath, compiledInputSha256: compiledSha256,
    allowedTransformation: "remove-stagingAudit-from-display-candidate-and-preserve-it-here",
    displayFieldsChanged: 0, participantScoresChanged: false,
    scorePassesExecuted: 0, modelContexts: 0,
    sourceChain: structuredClone(compiled.stagingAudit.sourceChain),
    calculatedWinner: compiled.stagingAudit.calculatedWinner,
    winningMargin: compiled.stagingAudit.winningMargin,
    scoreProtocolId: compiled.stagingAudit.scoreProtocolId,
    displayContract: structuredClone(compiled.stagingAudit.displayContract),
    noveltyMap: structuredClone(compiled.stagingAudit.noveltyMap),
    modelOutputCompletedAt: compiled.stagingAudit.modelOutputCompletedAt,
    model: { ...POST_CANARY_BATCH_10_PUBLICATION_MODEL,
      independentModelPassesWereIsolated: true, participantJudgmentWasScoreBlind: true,
      integerRoundedScoreTiesPermitted: true }, compilationValidation,
    productionMutationPerformed: false, nextBatchSelectionPerformed: false };
  return { candidate, provenance, compilationValidation };
}

export function validatePostCanaryBatch10PublicationFinalCandidate({ candidate, provenance,
  compiled, output, packet, identity }) {
  const expected = buildPostCanaryBatch10PublicationFinalization({ compiled,
    compiledPath: provenance.compiledInput, compiledSha256: provenance.compiledInputSha256,
    output, packet, identity });
  assertV4(canonicalJson(candidate) === canonicalJson(expected.candidate) &&
    canonicalJson(provenance) === canonicalJson(expected.provenance),
  `${packet.debateNumber}: finalization differs from deterministic replay`);
  const exchanges = candidate.sections.flatMap((section) => section.exchanges);
  const moves = exchanges.flatMap((exchange) => [exchange.pro, exchange.con].filter(Boolean));
  const blunders = ["pro", "con"].flatMap((side) => candidate.overall[side].blunders);
  assertV4(!("stagingAudit" in candidate) && candidate.id === packet.debateId &&
    candidate.number === packet.debateNumber && candidate.assessmentModel === "5.6 Sol" &&
    candidate.score.pro === packet.calculatedScores.overall.pro.score &&
    candidate.score.con === packet.calculatedScores.overall.con.score &&
    candidate.overall.pro.score === candidate.score.pro &&
    candidate.overall.con.score === candidate.score.con && moves.length === packet.moves.length &&
    provenance.displayFieldsChanged === 0 && provenance.participantScoresChanged === false &&
    provenance.productionMutationPerformed === false,
  `${packet.debateNumber}: final candidate invariants failed`);
  return { status: "passed", debateNumber: packet.debateNumber,
    sections: candidate.sections.length, moves: moves.length,
    oneSidedDisplayRows: exchanges.filter((row) => Boolean(row.pro) !== Boolean(row.con)).length,
    overallBlunders: blunders.length,
    emptyOverallReferenceLinks: blunders.filter((item) => item.links.length === 0).length,
    participantScoresChanged: false, displayFieldsChanged: 0, modelContexts: 0,
    modelAuthoredScores: 0, productionMutationPerformed: false };
}

export function buildPostCanaryBatch10PublicationStagingPreviewHtml() {
  const allowed = JSON.stringify(POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_ORDER);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,nofollow">
    <title>Slugfester Batch 10 publication staging preview</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="/src/styles.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { renderPublicationStagingDebate } from "/src/app.js";
      const allowedHosts = new Set(["127.0.0.1", "localhost"]);
      const allowedDebates = new Set(${allowed});
      const params = new URLSearchParams(window.location.search);
      const debateNumber = params.get("debate") || "21";
      if (!allowedHosts.has(window.location.hostname)) {
        document.querySelector("#app").innerHTML = "<main><h1>Publication staging preview unavailable</h1></main>";
      } else if (!allowedDebates.has(debateNumber)) {
        document.querySelector("#app").innerHTML = "<main><h1>Unknown Batch 10 publication-staging debate</h1></main>";
      } else {
        const response = await fetch(\`../final-candidates/debate-\${debateNumber}.json\`);
        if (!response.ok) throw new Error(\`Unable to load Debate \${debateNumber} publication candidate\`);
        renderPublicationStagingDebate(await response.json());
      }
    </script>
  </body>
</html>
`;
}
