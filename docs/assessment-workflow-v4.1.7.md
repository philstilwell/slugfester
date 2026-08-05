# Slugfester Fresh-Sample Validation Workflow v4.1.7

This prospective amendment inherits v4.0 through v4.1.6. It responds to the frozen v4.1.6 retired score-gate failure without changing, repairing, offsetting, or rerunning that result. Debates 55, 103, and 161 are development diagnostics from this point forward and cannot count toward v4.1.7 acceptance.

## Governing interpretation

The v4.1.6 mechanics succeeded, but its six final side totals were systematically 2–6 points above the retired comparator while all three winners and near-identical margins were preserved. The old comparator is diagnostic rather than gold: its own frozen reliability gate failed its 0.90 rank-correlation requirement. The new workflow therefore retains raw v4 rubric scores and tests them prospectively on a fresh disjoint sample. It does not apply a global offset, relax the failed v4.1.6 rule after the fact, or alter any dimension anchor or score formula.

The production objective is internal consistency under one tightened rubric across all 195 reassessments. Legacy scores remain useful external diagnostics after new scores lock, but they cannot enter model contexts or determine the new sample.

## Fresh six-debate sample

Repository code selects six dyadic debates using only the previously frozen source-only metadata pool and local transcript manifests. It excludes every debate identified as prior calibration in that pool plus Debates 55, 103, and 161. It classifies motions into six predeclared topic families:

1. resurrection and historical Christianity;
2. morality and ethics;
3. mind, consciousness, free will, and personal identity;
4. evil, suffering, hiddenness, hell, and salvation;
5. science, origins, cosmology, evolution, and fine-tuning; and
6. general theism and religion.

Within each family, candidates are ranked by SHA-256 of the fixed salt, family, and debate ID. The selected tuple minimizes aggregate rank while containing at least one debate under 90 minutes and at least one over 120 minutes. Tuple identity, source hashes, durations, and the selection script hash are frozen before any legacy score, winner, critique, tag, ranking, or comparator content is opened.

## Judgment and consensus

The judgment pipeline remains unchanged:

- 5.6 Sol/low performs one fresh isolated primary judgment from the complete local transcript and timestamped events.
- Repository code validates the bounded inventory, derives chronology, identifies required audio checks, and fires deterministic escalation triggers.
- Every triggered debate receives a fresh isolated 5.6 Sol/high Pass B over the locked inventory and complete transcript with the nonredundant event ledger.
- Disagreements are extracted mechanically under the v4.1.6 rules.
- A third isolated 5.6 Sol/high context selects only supplied candidates for disputed fields.
- Audio verification is mandatory for every selected medium- or low-confidence attribution before disagreement extraction or final-ledger lock.
- Repository code builds one final scoring-input ledger and derives every score only after all required adjudication closes.

No context may see legacy scores, other-pass scores or rationales, winner labels, publication prose, or AI Extension material.

## Mandatory compression audit

All six calibration debates receive a fresh score-blind compression audit after the raw final ledger locks but before scores are derived or legacy results are opened. The auditor receives the complete transcript, timestamped events, routes, sections, selected moves, and their source evidence, but no dimension values, calculated totals, other-pass identities, legacy material, or publication prose.

For each section and side, the audit asks whether the bounded inventory omitted any distinct load-bearing constructive, direct reply, concession, or consequential nonresponse that could change a selected move's response status, alter a route's completion, or move the section across a shared rubric band. Repetition, illustrations already captured by a proposition, rhetoric, moderator summaries, and merely possible additions do not count. Every alleged omission must include a transcript span, proposition, affected route or response, and counterfactual consequence.

Any substantiated material omission fails that debate's gate. The audit cannot add a move, change a score, repair the ledger, or trigger an automatic rerun. In later production, this audit remains mandatory for the frozen control sample, winner-sensitive cases, nonzero burden adjustments, and semantic warnings; the six-debate calibration runs it universally to measure the compression risk.

## Prospective acceptance rules

The six-debate gate passes only if all of the following hold:

1. all six local transcript chains and hashes validate;
2. all required model contexts pass on one attempt with no workflow retry or output normalization;
3. every deterministic trigger, audio requirement, disagreement, dependency pair, and adjudication choice is honored;
4. all six compression audits find zero substantiated material omissions;
5. all final ledgers pass exact deterministic replay and one scoring-pass validation;
6. every legacy winner with an original margin of at least six points is preserved, and at least five of six winner classifications are preserved overall;
7. across twelve side totals, median absolute legacy-score difference is at most seven points, no difference exceeds twelve points, and absolute mean signed drift is at most five points;
8. median absolute winning-margin difference is at most five points and no margin difference exceeds ten points;
9. the measured production projection remains at most 52 central hours and 60 conservative hours; and
10. no paid transcription, publication finalization, production mutation, held-out promotion, or corpus authorization occurs outside its separately frozen boundary.

These legacy comparisons are computed only after the new score artifact is immutable. A failure is reported unchanged and stops the gate. No threshold, formula, sample, or score may be adjusted after results are revealed.

## Compute and promotion boundary

The current production projections remain 40.42 central hours and 56.47 conservative hours for 195 debates, including five fixed audio/QA/rendering hours and a separate two-hour transport contingency. Universal compression auditing in this six-debate calibration sample is not projected as a universal production context; production uses the risk-based audit scope above within the fixed QA allowance.

A passed v4.1.7 fresh-six gate authorizes preparation—but not execution—of a preregistered ten-debate held-out end-to-end gate. Only a passed held-out gate plus explicit editorial promotion can authorize controlled-batch reassessment of the 195 debates.
