# Slugfester Lean Production Workflow v4.0

Workflow v4.0 is a production-candidate redesign intended to keep a complete 195-debate reassessment near 50 aggregate model-hours without weakening transcript provenance, rubric anchors, repository-owned calculation, required audio verification, or the visibly separate AI Extension. It replaces universal consensus with deterministic risk-triggered consensus. Until the retired-control and held-out gates pass and the editor explicitly promotes it, v4.0 is calibration-only.

## Governing tradeoff

Every debate receives one fresh, isolated 5.6 Sol primary judgment. A second isolated Sol judgment is mandatory only when repository code exposes a predeclared risk trigger or selects the debate for the frozen control sample. A third context adjudicates only fields disputed by those two judgments. No result may be described as two-pass or adjudicated unless those contexts actually ran.

This design measures corpus reliability through controls and concentrates duplicate computation on decisions most likely to change a score, band, or winner. It does not provide universal per-debate inter-pass reliability.

## Invariants retained from v3.8.11

- The complete timestamped local transcript and events file are mandatory and hash-locked.
- Legacy scores, winners, critiques, tags, Overall Commentary, and AI Extension material are excluded from judgment contexts.
- The motion and neutral side identities are locked before judgment.
- Scores are calculated only by `scripts/lib/reassessment-scoring.mjs`; model-supplied move, section, overall, range, or winner totals are prohibited.
- Medium- or low-confidence source attribution on a selected move requires audio verification before the move can enter a final ledger.
- Every triggered second pass is isolated. Every disagreement is extracted deterministically. Adjudication sees only disputed fields and may select only exposed candidates.
- The burden-completion adjustment defaults to zero and remains subject to the complete duplicate-exclusion rule.
- The AI Extension is generated after judgment closes, is never scored as participant performance, and remains a visibly distinct default-collapsed accordion immediately after Overall Commentary.

## Consolidated primary judgment

One primary context reads the workflow, rubric, source-only packet, transcript, events, and exact endpoint schema. In one output it supplies:

1. one burden route per side with observable success criteria and motion, central, and subsidiary bridges;
2. four to seven weighted sections totaling 100%;
3. a chronological inventory of load-bearing constructives, replies, concessions, and consequential omissions sufficient for the scorecard;
4. source spans, attribution confidence, importance, burden contact, response targets, and indispensable response components;
5. closed structural findings for responsiveness, precision, calibration, and charity;
6. seven raw dimension judgments with evidence-based rationales; and
7. one burden-completion eligibility record per side.

The primary output contains no calculated totals and no publication prose. Consolidation removes repeated full-transcript reads; it does not authorize skipping argument coverage or inventing paired moves.

## Required sequence

1. **Freeze the batch.** Select debates, freeze the 10% control sample, record source hashes, and exclude legacy assessment data.
2. **Validate sources.** Require local `transcript.txt`, `events.json`, and `manifest.json` with matching hashes. Full paid transcription requires a new cost estimate and approval. Existing cached sources incur no transcription fee.
3. **Build source-only packets.** Include debate identity, motion, neutral sides, speakers, duration, event count, source paths and hashes, and whether the debate is in the frozen control sample. Include no argument, score, prose, or winner data.
4. **Run the primary Sol judgment.** Use a fresh temporary Codex home, ChatGPT subscription authentication, API keys removed, one attempt, and the exact shared schema.
5. **Validate and derive.** Validate coverage, chronology, source spans, response components, burden bands, closed subanchors, charity state, adjustment exclusion, and absence of calculated fields. Repository code then derives move, section, and provisional overall scores.
6. **Extract risk triggers.** Apply the deterministic trigger engine below. The model may not waive, add, or hide a trigger.
7. **Complete audio checks.** Verify every selected move with medium or low source-attribution confidence against audio. A pending required check blocks the ledger whether or not a second scoring pass is triggered.
8. **Run triggered Pass B.** For each escalated debate, freeze the primary inventory and weights as a score-blind packet. A fresh isolated Sol context judges every locked move without seeing primary ratings, totals, trigger reasons, or legacy data.
9. **Extract and adjudicate.** Compare the two raw artifacts mechanically. A third isolated context receives only disputed response tuples, charity pairs, scalar candidates, and burden-adjustment candidates. Nondisputed fields cannot change.
10. **Calculate final scores.** Non-escalated debates use the validated primary raw judgments. Escalated debates use the adjudicated ledger. Repository code alone derives scores, sections, overall totals, bands, and winners.
11. **Finalize prose.** One compact Sol context per debate receives the full source packet and closed final ledger, but no legacy assessment. It produces participant argument condensations, critiques, representative quotes, Overall Commentary, and AI Extension content under the output contract.
12. **Audit and render.** Deterministic checks run on every debate. Isolated adversarial audits run on the frozen control sample, all winner-sensitive debates, every debate with a nonzero adjustment, and any debate with unresolved semantic warnings. Render checks cover desktop, mobile, keyboard, reduced motion, and the default-collapsed AI Extension accordion.
13. **Release in batches.** Production runs use small batches with frozen controls. A control failure pauses later batches; it never silently lowers a threshold.

## Deterministic second-pass triggers

A debate requires Pass B when any condition is true:

- it belongs to the frozen 10% control sample;
- the provisional pro/con margin is at most 5 points;
- either provisional side score is within 2 points of an overall score-band boundary: 25, 50, 65, 75, 85, or 95;
- an importance-3 move has medium or low assessment confidence;
- either side proposes a nonzero burden-completion adjustment;
- structural validation emits a semantic-integrity warning that cannot be resolved deterministically; or
- a source-attribution ambiguity affects a load-bearing move after required audio review.

Triggers are cumulative and recorded. Required audio verification is a separate hard obligation, not a substitute for Pass B. The target escalation rate is 15%; a rate above 25% fails the 50-hour operating objective and pauses production for redesign, but never suppresses a required escalation.

## Disagreement and adjudication

For escalated debates, use the v3.8.11 dispute rules: any response-tuple mismatch, charity-state mismatch, raw scalar delta greater than 5, diagnostic move-score delta greater than 4, or burden-adjustment mismatch is disputed. Adjudication is candidate-bound and field-only. Scores are derived only after adjudication closes.

## Scores and uncertainty

Move, section, and overall formulas remain unchanged from v3.8.11. Non-escalated debates display an operational uncertainty note rather than a two-pass agreement range. Escalated debates may display the usual agreement range derived from Pass A, Pass B, and final calculated totals. A one-pass result must never be presented as consensus.

## Compute budget

The frozen planning assumptions are:

- primary Sol judgment: 7.75 minutes per debate;
- compact finalization: 4.25 minutes per debate;
- Pass B on 15% of debates: 7.75 minutes per escalated debate;
- adjudication on half of escalated debates: 5.6 minutes per adjudicated debate;
- audio, deterministic QA, and rendering allowance: 5 aggregate hours.

For 195 debates, this projects to approximately 48.8 aggregate computer-hours. The production gate requires a central projection no greater than 52 hours and a conservative projection no greater than 60 hours. Actual quality triggers override the budget.

## Promotion gates

The first gate replays retired Debates 55, 103, and 161 without exposing their v3.8.11 scores to model contexts. It must preserve all three winner classifications, keep every final side score within 5 points of the adjudicated v3.8.11 diagnostic comparator, correctly fire every synthetic escalation fixture, complete required audio checks, and project within the compute budget.

A passed retired gate authorizes a preregistered ten-debate held-out end-to-end gate. Only a passed held-out gate plus explicit editorial approval authorizes reassessment of the 195 debates. Production begins in controlled batches, not one unattended corpus run.
