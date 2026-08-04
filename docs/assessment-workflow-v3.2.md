# Slugfester Hybrid Risk Adjudication Workflow v3.2

Workflow v3.2 is an AI-only calibration workflow. It uses model diversity and conservative arbitration to reduce the correlated over-classification measured in v3.0 and v3.1. It remains calibration-only until the retired three-debate development gate and a later disjoint held-out gate both pass and are explicitly accepted.

## Architecture

For each debate, run exactly three fresh subscription-authenticated contexts:

1. Pass A uses **5.6 Terra, Extra High**.
2. Pass B uses **5.6 Sol, Extra High**.
3. The adjudicator uses **5.6 Sol, Extra High** and receives only deterministically disputed primitives.

The two complete passes receive the same five allowlisted inputs and never see gold, legacy assessments, the other pass, numerical scores, Overall Commentary, or AI Extension material. The adjudicator receives the workflow, rubric, adjudication manual, output schema, and one deterministic dispute packet. It never sees gold, complete pass files, unflagged fields, numerical scores, or production prose.

## Required sequence

1. Freeze the local transcript chain, source hashes, motion, sides, burdens, target packets, component graphs, move inventory, weights, risk rules, schemas, thresholds, and stop rules.
2. Verify every selected move with medium or low speaker-attribution confidence against retained audio. Any missing verification blocks the model passes.
3. Run Terra Pass A and Sol Pass B independently in fresh ephemeral workspaces.
4. Compare semantic values separately from evidence. Evidence-only differences never enter AI adjudication.
5. Deterministically construct one dispute packet per debate from semantic conflicts and preregistered high-risk agreements. Add only the dependency companions required to keep diagnostic and reframe decisions coherent.
6. Run one isolated Sol adjudication per debate. For semantic conflicts it must select A or B; a novel third semantic value is prohibited. For a flagged agreement it must retain the shared value or expressly override it under the field-specific rule.
7. Validate every resolution. An agreement override is eligible only for a preregistered risk trigger and must differ semantically from the shared value. A nondefault override requires exact source evidence.
8. Merge deterministically. Unflagged agreements cannot change. For each final semantic value, choose the shortest valid matching evidence span from A, B, or the adjudicator, with deterministic offset and JSON tie-breaks.
9. Validate the complete cross-field annotation and recompute coverage, diagnostic, reframe, burden relevance, and the exact derived tuple in code.
10. Create a numerical-scoring input only after every final lock and provenance audit passes. The retired gate remains classification-only and does not calculate participant scores.

## Deterministic dispute policy

Every A/B semantic conflict is disputed. A shared agreement is risk-disputed only under these frozen rules:

- connected example: shared `true`;
- scope: any non-`same` value, or shared `same` when the response contains a modality or explicit comparison cue;
- burden adjustment: any non-`retained` value;
- component contact: shared `true`, or shared `false` when at least one normalized content word overlaps the component and response;
- relevant contrary material: every agreement, because its boundary depends on the complete component-contact result;
- diagnostic: a non-`none` defect, a true consequence, or an explicit diagnostic cue; both defect and consequence become disputed companions;
- reframe: a true malformed-demand or replacement-demand field, or an explicit replacement/framing cue; both reframe primitives become disputed companions; and
- target contact and burden contact: agreements are retained because both prior retired tests found no shared semantic error in those fields. Conflicts remain disputed.

Risk rules are recall devices, not semantic decisions. A trigger merely permits the adjudicator to inspect the field; it does not authorize an override.

## Conservative override rule

Shared agreement is the default lock. The adjudicator may override only when its packet labels that exact field as a high-risk agreement or dependency companion and the response satisfies the field's positive, changed-value, or default-restoration rule. Ordinary disagreement, criticism, redirection, shared vocabulary, or philosophical plausibility is insufficient.

For an A/B semantic conflict, the correct output space is deliberately closed: select A or B. Prior testing showed that one raw candidate was usually correct; closing the space prevents a third unsupported label.

## Field-specific adjudication cards

Each packet includes a concise decision card with the governing default, positive rule, and near-miss exclusions. Cards are generic calibration guidance derived from the retired error profile; they contain no gold answers or case-specific legacy judgments.

The diagnostic card distinguishes the ten eligible defect labels and defaults to `none` when the response merely denies a claim, supplies a counterposition, or redirects the discussion. The reframe card requires both primitives separately and excludes a merely different question. The scope card excludes topic shifts from narrowing or strengthening. The component card requires proposition-level contact rather than word overlap alone. The burden card treats support and attack on an eligible bridge symmetrically.

## Scoring and prose boundary

No participant-performance score appears in either pass, the dispute packet, adjudication, or final classification lock. Scores are derived once from the validated lock by repository-owned code. Overall Commentary and the visibly labeled, default-collapsed AI Extension are produced only after scores lock; Terra may draft them from the adjudicated record, while a later quality policy may route flagged debates to Sol.

## Retired development gate

Use the same three retired debates, 13 cases, preexisting gold key, source audits, and thresholds as v3.0 and v3.1. This is a development rerun informed by earlier failures, not a held-out estimate. Success requires every frozen accuracy threshold, zero unresolved fields, zero unflagged alterations, no score leakage, and 100-percent audio verification for medium/low-confidence moves.

Failure keeps held-out transcripts, numerical scoring, rankings, production prose, and all 195 production debates closed. Success authorizes only preregistration of a new disjoint held-out classification gate.

## AI-only operating assumption

All interpretive judgments remain AI-generated. Deterministic code controls routing, evidence validation, merging, derived labels, and scoring. Human adjudication is not a workflow stage; editorial review decides only whether an AI-produced artifact is publishable.
