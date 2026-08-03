# Slugfester Adjudicated Consensus Workflow v3.0

Workflow v3.0 replaces single-pass classification with an adjudicated consensus architecture. It is calibration-only until a retired three-debate execution test and a later, separately preregistered held-out gate both pass. It does not itself authorize production scorecards, ranking changes, Overall Commentary, or AI Extension copy.

## Core architecture

For every debate:

1. freeze the complete local transcript chain, motion, sides, burdens, target packets, component graphs, move inventory, section weights, and move importance before any assessment pass;
2. verify every medium- or low-confidence selected move against audio before it can enter a pass;
3. run Pass A and Pass B in separate, fresh 5.6 Sol contexts with identical allowlisted inputs and no access to legacy assessments, gold keys, each other, numerical totals, or production prose;
4. compare the two artifacts mechanically at the compound primitive-field level, including the associated exact evidence span;
5. build a dispute packet containing only disagreed fields, the relevant locked source material, and the two candidate values;
6. run a third fresh 5.6 Sol context that may adjudicate only those disputed fields and cannot see the gold key, legacy assessment, numerical totals, or nondisputed pass fields;
7. merge identical fields and adjudicated fields deterministically into a final consensus lock while preserving both raw passes and every resolution;
8. validate the final lock against its source, and only then construct any numerical-scoring input; and
9. derive move, section, and overall performance scores only from the final consensus lock plus the frozen rubric, weights, and source packet.

Raw A/B agreement is a monitoring measure. It is not the promotion gate. Promotion is based on the final adjudicated lock's performance against an independently constructed gold key, together with source, isolation, and merge-integrity gates.

## Pass isolation

Pass A and Pass B must run in separate ephemeral workspaces that contain only:

- this workflow;
- the v3.0 rubric;
- the annotation manual;
- the pass output schema; and
- one debate-specific frozen input.

The adjudicator's ephemeral workspace contains only the workflow, rubric, adjudication instructions, adjudication output schema, and the deterministic dispute packet. The dispute packet may show the two candidate values for a disputed field but must omit every nondisputed field. The adjudicator must not reconstruct or reannotate the complete pass.

All contexts use the model actually selected by the editor and record the exact user-facing label. For the v3.0 calibration line, the required label is `5.6 Sol`. Subscription-authenticated execution is preferred; `OPENAI_API_KEY` must be removed from the launch environment when the subscription path is used.

## Scoring-relevant primitive contract

Each raw pass records the v2.9.1 primitive set:

- original-target contact and exact evidence;
- expressly connected example and exact evidence;
- target scope relation;
- burden adjustment;
- binary contact and evidence for every indispensable target component;
- relevant contrary material when no component is contacted;
- expressed defect type and a separately stated consequence;
- malformed-demand explanation and replacement demand;
- the highest evidenced eligible burden-route tier and bridge; and
- a content-grounded rationale.

Code derives target disposition, coverage, diagnostic status, reframe status, burden relevance, and the exact derived tuple. Raw passes, dispute packets, adjudications, and consensus locks must not contain participant-performance scores.

## Deterministic disagreement extraction

The extractor compares these compound fields:

- `targetContact` = value plus target evidence;
- `connectedExample` = value plus connection evidence;
- `scope` = relation plus evidence;
- `burdenAdjustment` = relation plus evidence;
- one `componentContact.<componentId>` = value plus evidence for each component;
- `relevantContraryMaterial` = value plus evidence;
- `defect` = type plus cue;
- `consequence` = value plus cue;
- `malformedDemand` = value plus cue;
- `replacementDemand` = value plus cue; and
- `burdenContact` = tier, bridge, and evidence.

Canonical JSON equality determines agreement. Any value or evidence difference creates exactly one dispute for that compound field. Rationale wording is preserved in the raw passes but is not itself a dispute. The extractor must produce the same ordered packet from the same two pass hashes.

## Dispute-only adjudication and merge

Each adjudication resolution names one packet dispute ID and returns a canonical JSON value plus a source-grounded rationale. The resolved value may match A, match B, or supply a third valid value. A third value is allowed only when it satisfies the same semantic and exact-evidence validation as a raw pass.

The merger must:

- copy every agreed compound field without alteration;
- replace every disputed compound field with exactly one validated resolution;
- reject missing, duplicate, unexpected, or malformed resolutions;
- reject any attempted change to a nondisputed field;
- recompute all derived labels in code; and
- record the A, B, dispute-packet, adjudication, input, and source hashes.

An unresolved dispute or a nondisputed-field alteration blocks scoring.

## Transcript and audio gate

The canonical `transcript.txt`, `events.json`, and `manifest.json` must exist under `.assessment-cache/captions/<videoId>/` and match their recorded SHA-256 hashes. Full transcripts remain local; committed calibration artifacts retain hashes and bounded excerpts.

Every selected move with medium or low speaker-attribution confidence must have:

- `audioChecked: true`;
- a local verification clip or source-audio reference;
- a matching SHA-256 digest;
- `status: "verified"`; and
- a resolved speaker matching the inventory.

The validator fails closed before either Sol pass when this rate is below 100 percent. Audio verification corrects source identity; it does not improve a participant's score.

## Post-adjudication scoring boundary

No numerical scoring input may be built until the final consensus lock validates. The scoring-input builder must cite the final-lock hash and expose only the final derived classifications, frozen source anchors, burdens, sections, weights, and importance values. It must not average conflicting primitive judgments.

Responsiveness and relevance/burden bands are constrained by the final classifications under the v3.0 rubric. The remaining dimensions are assessed against the same final source packet. The repository calculator remains the only component permitted to derive move, section, and overall totals. A failed calibration gate produces no production score.

## Retired three-debate test

Before any new held-out gate, test the architecture on three retired debates selected before launching the new passes:

- one straightforward dyadic debate;
- one difficult dyadic debate containing diagnostic or reframe boundaries; and
- one multi-speaker debate.

The gold key must predate the new passes and must have been built independently of them. Passes and adjudication cannot access it. Freeze the sample, input hashes, gold hashes, source hashes, thresholds, output paths, and stop rules in a manifest before Pass A begins.

The retired test passes only if:

- both raw passes and every adjudication validate;
- every disagreement is resolved and no nondisputed field changes;
- transcript-chain validation and the 100-percent medium/low audio gate pass;
- the final adjudicated classifications meet every frozen gold-key threshold;
- diagnostic and reframe positive recall meet their frozen floors; and
- no score, production prose, AI Extension, ranking, or debate object was produced before authorization.

Failure freezes the attempt and returns the workflow to development. Success authorizes only a new, disjoint, preregistered held-out classification gate. It does not authorize all 195 debates.

## Production sequence after later promotion

After a held-out gate passes and the editor explicitly promotes v3.0:

1. acquire and hash the complete source;
2. build and review the blind packet;
3. lock burdens, move inventory, sections, weights, and importance;
4. perform required audio verification;
5. run two isolated consensus passes;
6. extract and adjudicate disputes;
7. validate the final lock;
8. build the scoring input and calculate scores;
9. draft critiques and Overall Commentary from participant material only;
10. draft the visibly labeled, default-collapsed AI Extension independently and audit novelty; and
11. run schema, transcript, calculator, design, and accordion checks before any editorial promotion.

