# v3.6.1 decision-card fixture assessment

## Outcome

**PASS — VALIDATOR AND FIXTURE GATE ONLY.** The v3.6.1 correction resolved the sole ambiguous frozen cue without weakening exact-text uniqueness. All schema, synthetic, adversarial, retired-semantic, and stop-rule checks passed at zero cost.

This does not establish model accuracy. The retired cards were constructed from frozen gold specifically to test whether schemas and deterministic validators can represent the intended classifications.

## Results

- Closed, recursively typed schemas: **4 of 4**.
- Valid synthetic cards accepted: **11 of 11**.
- Invalid mutations rejected for the preregistered reason: **8 of 8**.
- Retired family cards validated: **39 of 39**.
- Retired burden-conflict cards validated: **2 of 2**.
- Frozen semantic assertions reproduced: **137 of 137**.
- Active frozen evidence fields normalized: **36**.
- Fields requiring a larger unique context: **2**—the component and scope cards sharing the same duplicated gold cue.
- Ambiguous evidence fields remaining: **0**.
- Discretionary repairs and fallbacks: **0 / 0**.
- Model contexts, paid transcription, and metered API cost: **0 / 0 / $0**.

## What is now established

The workflow can ask models for compact family judgments without asking them to serialize dependent annotation fields or offsets. The validators enforce:

- component-level partial answers and licensed global assent;
- inside-target versus distinct-example boundaries;
- component/contrary exclusion;
- atomic defect/consequence bundles with an explicit linguistic link;
- linked malformed/replacement reframes;
- burden decisions limited to two frozen candidates; and
- unique evidence provenance through deterministic context and offset resolution.

## Remaining uncertainty

No model has attempted these cards. The fixture pass therefore says nothing about whether Terra or Sol will identify the right cue, label, link, or burden candidate. It also does not test cross-context agreement or semantic generalization.

## Recommended next step

Preregister one remote structured-output compatibility smoke test using a gold-free synthetic packet. Exercise each of the four schemas in a fresh, isolated context, use subscription authentication rather than metered API billing, permit no model-output retry, and record any pre-inference schema rejection separately from an accepted inference.

Use 5.6 Terra for this transport/schema smoke because it is not an accuracy comparison. If all four outputs validate on the first inference, then preregister a small retired semantic card test with independently isolated Terra and Sol passes. Model batches, held-out debates, numerical scoring, Overall Commentary, AI Extension generation, and production changes remain blocked.
