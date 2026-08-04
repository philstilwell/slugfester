# Slugfester End-to-End Consensus Workflow v3.8.10

Workflow v3.8.10 is a calibration-only clean-execution rerun on retired Debates 55, 103, and 161 after the failed v3.8.9 lexical-validator test. It inherits only the hash-locked source, coverage, section, burden-contact, and audio-verification records from v3.8.8; no v3.8.8 or v3.8.9 performance judgment, score, reconstruction prose, or audit conclusion may enter a model context. It tests first-attempt validity, reply-complete reconstruction, and AI-novelty discipline before another held-out gate. A pass may authorize a separately preregistered ten-debate gate. It cannot authorize the 195-debate rollout by itself.

## v3.8.10 clean-gate amendments

- Every real scoring and reconstruction context gets exactly one attempt. A transport, schema, or deterministic-validation failure is preserved as evidence and fails this gate; a repaired or normalized output never counts toward passage.
- The exact endpoint schema is exercised on a synthetic packet before any real debate context. The scoring schema omits redundant free-text response-summary fields; the canonical response tuple is class, target IDs, contacted-component count, and total-component count, while the rationale must identify contacted and omitted components in ordinary prose.
- Audio verification remains mandatory for every medium-confidence source move and representative quotation. Previously completed, hash-matching audio verification may be inherited. New transcription is allowed only within the preregistered three-debate cap of **$0.12**.
- A two-sided display row must be a direct reply relation or two genuine parallel constructives. A responsive displayed move must include its decisive target in the same section display. A consequential later direct answer to a displayed move must also be shown; if the format cannot show it, a visible reply-closure note must identify the omitted answer and its bearing.
- Every AI Extension item marked `introduces` must be compared against every locked move, not merely the displayed subset. Any substantial source overlap requires `extends` or `repairs` and valid source move IDs.
- The material scalar-dispute rate retains a formal ceiling of 0.25. A rate above 0.23 is a warning band that blocks held-out-gate authorization until anchors are revised or an additional retired calibration passes.
- The gate contains frozen regression fixtures for the Debate 55 false pairing, the Debate 55 false novelty label, and the Debate 161 omitted direct answer.
- Deterministic validators never infer semantic adequacy from preferred words or regular expressions in free-text rationales. They validate closed fields and structural invariants; semantic adequacy remains an independent-model and adjudication responsibility.
- The endpoint preflight exercises every response class, both charity states, component-count boundaries, and zero-adjustment exclusion paths before any real debate context.

## Governing boundary

The v3.8.3 sample contains four deliberately selected burden-contact cases per debate. Those 12 cases are repeatability evidence, not complete assessment inventories. They may be inherited as locked seed decisions, but no debate may be scored until a new coverage audit confirms that the full inventory represents every accepted route bridge, load-bearing constructive argument, major direct reply, material concession, and consequential omission needed for a 4–7-section scorecard.

An undersized inventory, a section created only to satisfy a numeric minimum, or an assessment that silently omits a load-bearing line is a hard failure. Missing coverage must be repaired before weights lock. It may not be repaired with an overall burden adjustment or AI Extension material.

## Required sequence

1. **Freeze the gate.** Commit the sample, source hashes, inherited classifications, coverage rules, schemas, thresholds, costs, and stop rules before any v3.8.10 model call.
2. **Revalidate the local source chain.** Each debate must retain a hash-matching full `transcript.txt`, `events.json`, and `manifest.json`. Metered model API use is prohibited. New transcription is permitted only for a required audio check and only within the frozen $0.12 cap.
3. **Complete the inventory.** Use the adjudicated v3.8.2 source material only as seeds. Inspect the full transcript and add every missing load-bearing move, direct reply, concession, and consequential omission. Give each move an atomic excerpt, context window, speaker, side, proposition, response targets when present, and attribution confidence.
4. **Review source preparation independently.** A separate isolated 5.6 Sol context reviews every proposed source field. Deterministic extraction identifies disagreements, and a third isolated context adjudicates only disputed fields. A final source field requires two matching votes.
5. **Verify audio when required.** Every medium- or low-confidence attribution must be compared with public source audio before it can enter classification. An unresolved attribution blocks the move. Representative displayed quotations must also be checked against audio before composition closes.
6. **Lock sections and weights.** Select 4–7 topical sections, assign each move once, require at least one scored move from each side in each scored section, set integer section weights totaling 100, and assign move importance from 1–3. Lock the complete coverage rationale, section weights, and importance before any scoring judgment is visible.
7. **Resolve burden contact.** Reuse the 12 v3.8.3 final tuples unchanged when their source moves survive the coverage audit. Classify every additional move with two isolated 5.6 Sol passes, deterministic tuple comparison, and a third isolated pass limited to disputed tuples. Every move requires a final two-vote tuple or explicit no-contact decision.
8. **Run Scoring Pass A and Pass B.** Use separate fresh 5.6 Sol contexts with the identical locked packet and the single v3.8.10 scoring-judgment schema. Neither context may access the other pass, legacy scores or prose, calculated totals, a winner, Overall Commentary, or AI Extension material.
9. **Extract scoring disagreements mechanically.** Compare response class as a compound field, each numerical rating, and the burden-adjustment eligibility tuple. Evidence or rationale wording alone is not a semantic disagreement. A categorical mismatch, a scalar delta greater than 5, a diagnostic move-total delta greater than 4, or a burden-adjustment semantic mismatch creates a dispute.
10. **Adjudicate only disputed scoring fields.** A third fresh 5.6 Sol context receives only the disputed fields, their two anonymous candidates, and the minimum locked source context. It must choose one candidate and may not introduce a third score or change a nondisputed field.
11. **Merge before calculation.** Equal categorical fields copy directly. Nondisputed scalar pairs are rounded means. Disputed fields take the selected candidate. The merger rejects missing resolutions, unexpected resolutions, altered source fields, and response or relevance scores outside their locked bands.
12. **Derive scores mechanically.** Only after the final judgment lock validates may repository code calculate combined calibration/charity, move scores, section scores, overall scores, agreement ranges, and winner diagnostics. No model output may supply or override those totals.
13. **Apply the scoring stop rule.** If any source, isolation, schema, merge, reliability, adjustment, or calculation gate fails, preserve the evidence and stop. Do not generate scorecard prose, Overall Commentary, AI Extension material, rendering claims, or production changes.
14. **Reconstruct from the locked ledger.** One fresh 5.6 Sol context per debate receives the full source packet and final calculated ledger, but no legacy assessment. It drafts participant arguments, critiques, tag candidates, representative quotations, Overall Commentary, and the separately labeled AI Extension under the reconstruction schema. Representative selection is constrained by direct-reply pairing and one-hop consequential reply closure.
15. **Audit prose, reply closure, and novelty.** Deterministic checks enforce word limits, score identity, source move IDs, direct-reply row integrity, consequential reply closure, Overall Commentary counts, AI Extension balance, novelty mappings, required attribution, accordion metadata, and prohibited language. An isolated adversarial pass checks semantic novelty against the full move inventory and checks whether displayed exchange structure misstates chronology or answer status. Tags are reviewed after scoring and never change a score.
16. **Verify rendering.** Render calibration previews through the production component path without mutating production data. Test desktop and mobile layouts, the default-collapsed accordion, open state, keyboard focus, and reduced motion.
17. **Assess the gate.** Report reliability, coverage, source limitations, audio work, disagreements, adjudications, score stability, prose validity, novelty, rendering, elapsed time, recoveries, and cost. A pass authorizes only preregistration of a ten-debate end-to-end gate.

## Single scoring-judgment contract

Both initial scoring passes use exactly the same closed schema. Each move records:

- a response class and decisive target IDs;
- seven integer judgments: logical coherence, evidence/warrant, responsiveness, relevance/burden, precision/clarity, epistemic calibration, and representational charity;
- one evidence basis, dimension-specific rationales, and assessment confidence; and
- the locked burden-contact tuple copied from the packet.

Each side also records the full burden-completion eligibility tuple. Initial scoring artifacts contain no move total, section total, overall total, confidence range, winner, critique, tag, Overall Commentary, or AI Extension field.

## Scoring anchors and formulas

The final combined dimension is:

`calibration/charity = round((epistemic calibration + representational charity) / 2)`

The move formula remains:

`move = round(.25 logical coherence + .20 evidence/warrant + .20 responsiveness + .15 relevance/burden + .10 precision/clarity + .10 calibration/charity)`

The section and overall formulas remain:

`section = round(sum(move score × importance) / sum(importance))`

`overall = round(weighted section mean + burden-completion adjustment)`

The final agreement range is two points below the lowest diagnostic Pass A, Pass B, or final overall score through two points above the highest, bounded to 0–100. Pass totals are calculated after both raw artifacts close and are used only as reliability diagnostics; they are never model inputs.

## Response and burden constraints

| Final response relation | Permitted responsiveness |
| --- | ---: |
| Constructive opening | 0–100 under motion/burden anchors |
| Full answer | 80–100 |
| Complete diagnostic defeat | 80–100 |
| Justified reframe | 80–100 |
| Partial answer | 55–79 |
| Relevant nonanswer | 40–69 |
| Nonanswer or weaker substitution | 0–39 |

| Final burden contact | Permitted relevance/burden |
| --- | ---: |
| Motion bridge | 90–100 |
| Central bridge | 75–89 |
| Subsidiary bridge | 55–74 |
| No exact route contact | 0–54 |

Support and attack receive the same burden tier. Direction does not supply quality credit by itself.

## Burden-completion exclusion

The default adjustment is zero. A nonzero integer from −5 to +5 is eligible only when one explicit debate-wide consequence:

1. changes completion of a named locked success criterion;
2. is absent from every selected move judgment, dimension, response link, omission record, importance value, section weight, and other adjustment;
3. identifies every related move and every place tested for duplicate capture;
4. states the counterfactual way the weighted score would otherwise misreport burden completion; and
5. is independently identified with the same sign by both initial passes or selected from an exposed dispute by the adjudicator.

Any existing `alreadyCapturedBy` entry forces zero. Inventory incompleteness, omitted moves, cumulative impressions, style, eloquence, worldview plausibility, section coverage, repetition, or dissatisfaction with locked weights are categorically ineligible.

## Composition contract

The scorecard must contain 4–7 sections and remain traceable to final move IDs. Each displayed argument contains 8–55 words, and each critique contains 105–130 words while explaining the strongest feature, principal limitation, live burden, and score band. Overall Commentary contains at least three concrete `Landed` items and at least one material `Whiffed` item per side.

`AI Extension` appears immediately after Overall Commentary in a visibly distinct, default-collapsed accordion. It must say that it is an AI-generated contribution rather than transcript content. Each side receives a thesis, 4–6 premises, a proportionate conclusion, and 2–4 new reinforcing arguments of 45–130 words. Every extension item receives an `extends`, `repairs`, or `introduces` novelty record. Introduced items use an empty source-move list and explain their novelty. AI-added material is never scored as participant performance.

Displayed copy must not use the word `Unassailable` in any capitalization or claim that a position is immune to rational objection. The scoring byline is exactly:

`Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.`

## Gate thresholds

The three-debate gate requires:

- 3/3 complete dyadic source chains and 100% successful required audio verification;
- 3/3 coverage audits passed, 4–7 sections per debate, and no uncovered accepted route bridge without an explicit consequential-omission record;
- two valid initial scoring passes per debate, zero contaminated contexts, and zero model-supplied calculated totals;
- mean absolute raw scalar delta no greater than 5;
- materially disputed scalar-field rate no greater than 0.25;
- materially disputed scalar-field rate no greater than 0.23 for held-out-gate authorization; a rate above 0.23 through 0.25 is a formal reliability pass with a blocking warning;
- final unresolved scoring fields equal to 0 and nondisputed-field mutations equal to 0;
- maximum diagnostic overall pass delta no greater than 5;
- identical diagnostic winner classification in all three debates and Spearman rank correlation of at least 0.90 across the six side/debate totals;
- zero burden-adjustment exclusion violations and zero ledger/calculator mismatches;
- 3/3 complete reconstruction artifacts, 100% score/prose identity, and 100% representative-quote verification;
- 100% AI Extension novelty-map coverage, balanced side structure, exact placement/accordion/byline metadata, and zero prohibited-term hits;
- passed desktop, mobile, keyboard, and reduced-motion rendering checks; and
- zero recovered, normalized, retried, or post-hoc-corrected contexts counted toward passage;
- metered model API cost of $0 and new transcription cost no greater than $0.12.

Threshold failure blocks prose when it occurs before composition and blocks ten-debate authorization in every case. Thresholds may not be relaxed after outputs are visible.
