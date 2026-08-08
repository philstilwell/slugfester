# Production canary inventory execution gate

## Scope

Run exactly ten isolated score-blind inventory curators against the frozen production-canary inventory packets. Each context receives one source packet, the complete unreduced candidate transport for that debate, the score-blind curator manual, and its closed output schema.

## Execution controls

- Use 5.6 Sol at low reasoning effort through the user's ChatGPT subscription.
- Freeze the Codex CLI version, source hashes, model inputs, output paths, prompt boundary, scheduler, timeouts, and acceptance rule before any model call.
- Give every context a fresh source directory and a fresh temporary Codex home containing only the subscription authentication file.
- Remove OpenAI, Azure OpenAI, and Codex API-key environment variables.
- Run the first real debate as an operational canary, then two contexts at concurrency two, then the remaining contexts at concurrency two. Do not expand after a failed canary or failed ramp phase.
- Permit one attempt per context, no retry, no semantic repair, and no post-result tuning.
- Apply a ten-minute per-context timeout and a sixty-minute absolute gate timeout.

## Model boundary

The curator reviews all discovered candidates and may select only candidate IDs allowed by the debate-specific schema. It authors burden routes, issue sections, weights, move IDs, global constructive-or-reply classifications, and source-faithful propositions.

The curator cannot access another debate, legacy assessment material, independent judgments, scores, winners, tags, Overall Commentary, AI Extension, or other publication prose. It cannot author ratings, response topology, response targets, burden-contact judgments, adjustments, or calculated fields.

## Deterministic acceptance

Repository code must validate the proposal without semantic repair, restore repository-owned candidate fields from the full evidence bundle, order moves from source chronology, re-render exact final evidence from the canonical event document, and compile one locked inventory per debate.

All ten contexts must pass. Every inventory must contain four to six sections totaling 100 percent, eight to twenty-four unique moves, and at least four moves per side. Ratings, response topology, and scores must remain absent. A failed context or compilation fails the gate and authorizes diagnosis only.

Selected moves with below-high attribution confidence remain subject to mandatory audio verification before adjudication; medium confidence always triggers verification. This gate performs no audio work.

## Authorization boundary

A passed execution and deterministic analysis may authorize only preparation of the two independent-judgment packets per debate. It does not authorize independent-judgment model execution, retry, paid transcription, audio verification, adjudication, score derivation, publication, production mutation, or the remaining production corpus.
