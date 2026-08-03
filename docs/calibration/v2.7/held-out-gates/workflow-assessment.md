# v2.7 held-out gate workflow assessment

## Decision

The workflow is not ready to score all 195 debates. It is strong at source control, auditability, contamination prevention, and fail-closed authorization, but its semantic classifications are not yet repeatable enough to support numerical debate scores.

Both lanes failed their preregistered reliability gates. No threshold was changed and no annotation was tuned after the results were observed. Every hard audit gate passed, all disagreements were adjudicated, and no numerical scoring fields were introduced.

| Lane | Gate decision | Hard audit gates | Primitive disagreements | Per-debate failures |
| --- | --- | --- | ---: | --- |
| Dyadic | Failed | Passed; zero violations | 69 | Lennox–Atkins |
| Multi-speaker | Failed | Passed; zero violations | 146 | Koukl–O'Connor–Kanojia; Krauss–Meyer–Lamoureux |

The Hitchens–Kushner–Gomes debate passed every per-debate floor. Three or more speakers are therefore not, by themselves, a sufficient reason to remove a debate. Multi-speaker debates should remain a separately gated and currently suspended production lane.

## What worked

- Complete local transcript, event, and manifest chains were available for every selected debate and were hash-locked.
- Atomic move inventories were reviewed independently before annotation. Protected repairs triggered fresh semantic review as required.
- Pass A and Pass B ran in fresh contexts with identical frozen inputs and no access to each other, legacy assessments, or scores.
- Target packets, ownership, burden routes, and component graphs were locked before classification.
- Primitive disagreements were preserved in the audit trail and resolved in fresh adjudication contexts.
- All evidence offsets, derivations, review chains, attributions, and final locks passed their validators.
- The stop rule worked: failed reliability prevented scores, commentary, AI Extension, and page changes.

These controls make v2.7 a good diagnostic and safety workflow even though it is not yet a production scoring workflow.

## Where reliability failed

The stable areas were target scope, target burden, burden-route contact, reframe classification, and structural validity. The main instability was concentrated in:

1. target-object identity versus a change of question, referent, or comparison class;
2. component-operation selection and canonical evidence spans;
3. derived responsive coverage;
4. defect type, diagnostic object, and whether language states a verdict or an inferential consequence.

Dyadic exact agreement was 0.875 for target object, 0.792 for responsive coverage, 0.683 kappa for responsive coverage, 0.833 for defect type, 0.778 for diagnostic object, and 0.833 for impact mode. The dyadic sample also contained no positive reframe cases, so its minimum-positive gate failed for lack of construct exposure rather than annotator disagreement.

Multi-speaker exact agreement was 0.750 for target object, 0.722 for responsive coverage, 0.592 kappa for responsive coverage, 0.583 for defect type, 0.273 for diagnostic object, and 0.611 for impact mode. Its component-contact agreement was strong at 0.944, showing that the larger problem is how contacted material and criticism are typed, not whether the response touches the opponent at all.

## Required next development cycle

1. Preserve this gate unchanged as a failed held-out result. Do not lower thresholds or reuse these debates as the next held-out sample.
2. Build v2.8 development examples from the adjudicated failures, with a deterministic target-axis decision tree:
   - classify question type, subject, referent, comparison class, and baseline before scope;
   - define precedence when object change and burden reassignment co-occur;
   - include paired positive and negative examples for every boundary.
3. Replace free-form diagnostic selection with an eligibility matrix:
   - require an exact defect cue before selecting a defect type;
   - map each defect type to permitted target objects;
   - distinguish direct verdict language from an explicit inferential consequence;
   - default to no diagnostic when the required cue or consequence is absent.
4. Canonicalize component annotation:
   - classify contact separately for each locked component;
   - apply a fixed operation-precedence rule;
   - select the shortest complete evidence span, with deterministic tie-breaking;
   - score semantic operation agreement separately from evidence-boundary agreement.
5. Move rare-feature prevalence requirements, especially reframe positives, into a preregistered challenge set. A random held-out sample should test agreement only on observed eligible cases and should not fail merely because a rare construct is absent.
6. Keep separate dyadic and multi-speaker lanes. For the multi-speaker lane, add an explicit opponent map, same-side exchange exclusion, adoption rule, and turn-continuity examples. Route format complexity by interaction structure rather than speaker count alone.
7. Preflight every executable branch before freezing the next manifest, including write mode, no-write freshness checks, stale-artifact detection, and complete-gate validation. The v2.7 analyzer's missing equality helper did not affect metric calculation, but it required a process-local shim for the frozen no-write check.
8. After development is frozen, preregister fresh, disjoint classification gates. Run the dyadic lane first; run the multi-speaker lane independently. A passing classification lane may then proceed to its own preregistered numerical gate.

## Quality assessment

| Dimension | Assessment |
| --- | --- |
| Source fidelity and local transcript access | High |
| Inventory and review-chain integrity | High |
| Contamination control and auditability | High |
| Fail-closed authorization | High |
| Burden-route repeatability | High |
| Target and responsive-coverage repeatability | Below gate |
| Diagnostic repeatability | Below gate, especially multi-speaker |
| Readiness for 195-debate scoring | Not ready |

The natural next step is a focused v2.8 development cycle, followed by new disjoint classification gates. Numerical scores should remain blocked until at least one lane passes its classification gate and then its separate numerical gate.
