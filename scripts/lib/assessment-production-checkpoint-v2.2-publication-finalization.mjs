import {
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_MODEL
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  validateCheckpointV22CompiledStagingRecord
} from "./assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization";
export const CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-publication-finalization";
export const CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER =
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER;

function stripStagingAudit(compiled) {
  const candidate = structuredClone(compiled);
  delete candidate.stagingAudit;
  return candidate;
}

export function buildCheckpointV22PublicationFinalization({
  compiled,
  compiledPath,
  compiledSha256,
  output,
  packet,
  identity
}) {
  const compilationValidation = validateCheckpointV22CompiledStagingRecord({
    compiled,
    output,
    packet,
    identity
  });
  assertV4(
    compiled.stagingAudit?.protocolId ===
        "assessment-production-checkpoint-v2.2-1-deterministic-publication-compilation" &&
      compiled.stagingAudit.productionCanary === true &&
      compiled.stagingAudit.stagingOnly === true &&
      compiled.stagingAudit.productionMutationPerformed === false &&
      compiled.stagingAudit.displayContract.byline === CHECKPOINT_V22_PUBLICATION_BYLINE &&
      compiled.stagingAudit.displayContract.defaultCollapsed === true,
    `${compiled.number}: compiled staging audit changed`
  );
  const candidate = stripStagingAudit(compiled);
  const provenance = {
    schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-provenance",
    protocolId: CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
    status: "staging-only-final-candidate-provenance",
    debateNumber: compiled.number,
    debateId: compiled.id,
    compiledInput: compiledPath,
    compiledInputSha256: compiledSha256,
    allowedTransformation: "remove-stagingAudit-from-display-candidate-and-preserve-it-here",
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    scorePassesExecuted: 0,
    modelContexts: 0,
    sourceChain: structuredClone(compiled.stagingAudit.sourceChain),
    calculatedWinner: compiled.stagingAudit.calculatedWinner,
    winningMargin: compiled.stagingAudit.winningMargin,
    scoreProtocolId: compiled.stagingAudit.scoreProtocolId,
    displayContract: structuredClone(compiled.stagingAudit.displayContract),
    noveltyMap: structuredClone(compiled.stagingAudit.noveltyMap),
    modelOutputCompletedAt: compiled.stagingAudit.modelOutputCompletedAt,
    model: {
      label: CHECKPOINT_V22_PUBLICATION_MODEL.label,
      slug: CHECKPOINT_V22_PUBLICATION_MODEL.slug,
      reasoningEffort: CHECKPOINT_V22_PUBLICATION_MODEL.reasoningEffort,
      authentication: CHECKPOINT_V22_PUBLICATION_MODEL.authentication,
      participantJudgmentWasScoreBlind: true
    },
    compilationValidation,
    productionMutationPerformed: false
  };
  return { candidate, provenance, compilationValidation };
}

export function validateCheckpointV22PublicationFinalCandidate({
  candidate,
  provenance,
  compiled,
  output,
  packet,
  identity
}) {
  const expected = buildCheckpointV22PublicationFinalization({
    compiled,
    compiledPath: provenance.compiledInput,
    compiledSha256: provenance.compiledInputSha256,
    output,
    packet,
    identity
  });
  assertV4(
    canonicalJson(candidate) === canonicalJson(expected.candidate) &&
      canonicalJson(provenance) === canonicalJson(expected.provenance),
    `${packet.debateNumber}: publication finalization differs from deterministic replay`
  );
  const moves = candidate.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) =>
      [exchange.pro, exchange.con].filter(Boolean)
    )
  );
  const overallBlunders = ["pro", "con"].flatMap(
    (side) => candidate.overall[side].blunders
  );
  assertV4(
    !("stagingAudit" in candidate) &&
      candidate.id === packet.debateId &&
      candidate.number === packet.debateNumber &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2" &&
      candidate.score.pro === packet.calculatedScores.overall.pro.score &&
      candidate.score.con === packet.calculatedScores.overall.con.score &&
      candidate.overall.pro.score === candidate.score.pro &&
      candidate.overall.con.score === candidate.score.con &&
      moves.length === packet.moves.length &&
      provenance.displayFieldsChanged === 0 &&
      provenance.participantScoresChanged === false &&
      provenance.productionMutationPerformed === false,
    `${packet.debateNumber}: final candidate invariants failed`
  );
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    sections: candidate.sections.length,
    moves: moves.length,
    overallBlunders: overallBlunders.length,
    emptyOverallReferenceLinks: overallBlunders.filter(
      (item) => item.links.length === 0
    ).length,
    participantScoresChanged: false,
    displayFieldsChanged: 0,
    modelContexts: 0,
    modelAuthoredScores: 0,
    productionMutationPerformed: false
  };
}

export function buildCheckpointV22PublicationStagingPreviewHtml() {
  const allowed = JSON.stringify(CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,nofollow">
    <title>Slugfester production checkpoint v2.2 publication staging preview</title>
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
      const debateNumber = params.get("debate") || "50";
      if (!allowedHosts.has(window.location.hostname)) {
        document.querySelector("#app").innerHTML = "<main><h1>Publication staging preview unavailable</h1><p>This harness is restricted to local review.</p></main>";
      } else if (!allowedDebates.has(debateNumber)) {
        document.querySelector("#app").innerHTML = "<main><h1>Unknown publication-staging debate</h1></main>";
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
