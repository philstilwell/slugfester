# v3.8.8 performance-judgment consensus preregistration

## Purpose and boundary

This stage converts the locked 81-move source, section/weight, and burden-contact ledgers into score-blind performance judgments for the retired debates #55, #103, and #161. It does not authorize participant scores, a winner, assessment prose, production changes, the ten-debate gate, or the 195-debate corpus.

The stage is AI-only and dyadic-only. All moves have high-confidence speaker attribution and no pending audio verification. Any later medium-confidence move must be verified against audio before it can enter either performance pass.

## Independent-pass contract

Each debate receives two fresh, independent 5.6 Sol contexts, labeled A and B. Both contexts receive the exact same locked debate packet and the exact same shared closed JSON schema. Neither sees the other pass, a legacy assessment, a calculated score, a winner, participant assessment prose, Overall Commentary, or AI Extension material.

Each pass must judge every locked move once and return only:

- a compound response tuple: class, decisive target IDs, contacted-component count, and total-component count;
- explicit contacted and missed component summaries;
- the seven raw dimension judgments and rationales;
- whether representational charity was materially tested;
- evidence and assessment confidence; and
- one burden-completion adjustment eligibility record per side.

The schema prohibits model-calculated totals and publication prose. Deterministic packet-aware validation enforces identity/order, locked source fields, locked burden tuples, response invariants, response bands, burden bands, the untested-charity value of exactly 75, and burden-adjustment exclusion rules.

## Disagreement extraction and adjudication

After both passes validate, repository code extracts disputes without interpretation:

- any mismatch in the compound response tuple;
- any mismatch in `charityTested`;
- any dimension delta greater than 5;
- all unequal dimension fields when the diagnostic calculated move delta is greater than 4; and
- any semantic mismatch in a side's burden-completion adjustment tuple.

Rationale wording alone is not a dispute. Nondisputed unequal scalar values merge by rounded mean only after adjudication. A third fresh Sol context receives only disputed fields, anonymous candidate 1 and candidate 2 values, the locked evidence needed for those fields, and the same manual/rubric anchors. It must choose one supplied candidate for every disputed field. It may not invent a third value or alter any nondisputed field.

Every final semantic choice therefore has two votes: either initial A/B agreement or one initial candidate plus the adjudicator. Missing, additional, third-valued, out-of-range, or nondisputed-field mutations fail closed.

## Score derivation boundary

Only after all disputes resolve and a final performance-judgment ledger is locked may repository code derive move, section, and overall scores from the established formulas. No model context may supply calculated totals. Assessment prose and AI Extension generation remain separately blocked until score derivation is validated.

## Frozen initial execution shape

- debates: 3
- locked moves: 81 (28 / 25 / 28)
- initial contexts: 6
- shared scoring-pass schemas: 1
- retries: 0 by default; any transport failure requires a separately recorded recovery decision
- metered API cost estimate: $0 through ChatGPT subscription authentication
- transcription cost: $0; locked local transcript/event sources already exist

Live execution requires a separately generated phase lock after the preparation artifacts and dry fixtures pass. This preregistration does not itself authorize model calls.
