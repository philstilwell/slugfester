# Slugfester Reassessment Rubric v4.0

Judge only argumentative performance in the locked full transcript. Do not score worldview truth, popularity, moral appeal, pedigree, speaking style, accent, speed, status, confidence of delivery, or audience reaction. Workflow v4.0 changes when a second judgment is required; it does not relax the v3.8.11 performance anchors.

## Shared score bands

| Band | Operational meaning |
| --- | --- |
| 95–100 | Exceptional and unusually complete; the route, warrant, engagement, and qualifications require little material repair. |
| 85–94 | Very strong; the move substantially advances its burden and survives the strongest live objection with bounded residual gaps. |
| 75–84 | Strong/competent; coherent and relevant, but one important warrant, bridge, or qualification remains compressed. |
| 65–74 | Mixed; a useful core remains materially underdeveloped. |
| 50–64 | Weak; a central burden or live issue is insufficiently discharged despite some relevant content. |
| 25–49 | Very weak; the inference, support, or engagement is seriously defective. |
| 0–24 | Non-performance on the assigned issue or no recoverable argumentative route. |

Use boundaries rather than default magnets. A change of five or more points requires a named transcript feature or missing bridge.

## Logical coherence — 25%

- **90–100:** explicit, mutually consistent premises, intermediate steps, scope, and conclusion; the strongest live validity challenge is resolved.
- **80–89:** stable inferential route with one bounded implicit bridge.
- **70–79:** intelligible route with one material bridge, scope condition, or ambiguity unresolved.
- **50–69:** substantial equivocation, unsupported conditional, false dilemma, tension, or non sequitur.
- **0–49:** self-undermining, plainly invalid at its core, or no usable inferential route.

Evidence weakness belongs under evidence/warrant unless it creates a distinct inferential failure.

## Evidence and warrant — 20%

- **90–100:** specific, sourceable, representative evidence, defended warrants, and serious comparison with live alternatives.
- **80–89:** strong support with one bounded documentation, independence, base-rate, or rival-hypothesis gap.
- **70–79:** appropriate support with one material warrant or verification step compressed.
- **50–69:** assertion, anecdote, authority, selective examples, or speculation carries substantial weight.
- **0–49:** a fact-dependent conclusion is effectively unsupported or contradicted within the source.

An absent inline citation is not itself a deduction. Judge how much verification the inference requires and supplies.

## Responsiveness — 20%

Repository validation derives the permitted class from the selected move's locked response targets and indispensable component findings. The judge rates only the quality of the contact inside the permitted band.

| Class | Structural test | Range |
| --- | --- | ---: |
| Constructive opening | Advances the motion or adopted burden without an earlier target. | 0–100 |
| Full answer | Contacts every indispensable component of the strongest selected target. | 80–100 |
| Diagnostic defeat | Identifies a defect and separately states its defeating consequence. | 80–100 |
| Justified reframe | Diagnoses a malformed demand and answers a replacement preserving the legitimate issue. | 80–100 |
| Partial answer | Contacts at least one but not every indispensable component. | 55–79 |
| Relevant nonanswer | Supplies issue-bearing contrary material without component contact. | 40–69 |
| Nonanswer | Supplies neither component contact nor issue-bearing contrary material. | 0–39 |

Within a full answer, 90+ requires explicit contact with the decisive premise or inference. Within a partial answer, use 70–79 when the decisive component is contacted and 55–69 when only a secondary component is contacted. A later answer never repairs the selected span retroactively.

## Relevance and burden — 15%

| Contact | Range | Test |
| --- | ---: | --- |
| Motion bridge | 90–100 | Supports or attacks the complete motion-level conclusion proportionately. |
| Central bridge | 75–89 | Materially advances or defeats the route's central bridge. |
| Subsidiary bridge | 55–74 | Advances or defeats one necessary subsidiary bridge. |
| No exact route contact | 0–54 | Topical but peripheral, directed at an unadopted burden, or irrelevant. |

Support and attack receive the same tier. A critic does not inherit a positive contrary burden merely by criticizing a constructive case.

## Precision and clarity — 10%

Record four closed findings before choosing a value: proposition recoverability, term stability, scope stability, and qualification explicitness.

- **90–100:** all four are stable and explicit.
- **80–89:** proposition, terms, and scope are stable; one bounded qualification remains implicit.
- **70–79:** the proposition is recoverable, but one material term, scope, or qualification is only partly stable.
- **50–69:** at least one material term, scope, referent, or distinction is unstable enough to obscure evaluation.
- **0–49:** the proposition is not reliably recoverable.

Truth, evidence, and response quality are not precision findings. Fluency and technical density receive no independent credit.

## Epistemic calibration — half of the final 10%

Record the move's strongest asserted force and the fit between that force and the warrant before choosing a value.

- **90–100:** force and warrant match; necessary qualifications and live uncertainty are explicit.
- **80–89:** force and warrant match with one bounded implicit caveat.
- **70–79:** the force is slightly stronger than the supplied warrant or one material caveat is missing.
- **50–69:** the force materially exceeds the warrant or applies selective skepticism.
- **0–49:** certainty is radically disproportionate to the warrant.

A cautious tone earns no credit when the proposition still overclaims. Advocacy confidence is not overconfidence when its warrant supports it.

## Representational charity — half of the final 10%

Lock `charityTested` from whether the move represents, attacks, or relies upon a live alternative.

- **90–100:** states the strongest live alternative accurately, including its decisive qualification.
- **80–89:** fair and materially accurate with one minor omission.
- **Exactly 75:** charity is not tested.
- **50–69:** a weaker reconstruction, omitted decisive qualification, or unsupported motive attribution affects the argument.
- **0–49:** the move depends on a gross caricature.

Politeness is not charity. Disagreement, compression that does not weaken the alternative, and failure to answer do not by themselves establish uncharity.

## Burden-completion adjustment

Zero is the default. A nonzero value from −5 to +5 requires one debate-wide consequence that changes a named success criterion and is absent from every move rating, response link, omission record, importance value, section weight, and other adjustment. The record must name the affected burden IDs, related move IDs, criterion, distinct consequence, every tested duplicate location, and a counterfactual.

Any duplicate capture, incomplete inventory, style judgment, repetition, cumulative impression, worldview plausibility, dissatisfaction with weights, or disagreement between the two passes about the consequence forces zero.

## Penalty and aggregation controls

- Give each defect one primary home; score another dimension only for a distinct source-grounded consequence.
- Compatibility is not explanation, and possibility does not establish probability.
- Familiar arguments receive no pedigree bonus.
- Fallacy and bias tags never add numerical penalties.
- Missing replies are recorded structurally, not fabricated as paired moves.
- AI Extension material is outside the transcript and never changes participant scores.

Repository code combines calibration and charity, calculates move scores with weights `25/20/20/15/10/10`, calculates importance-weighted section means, and calculates the section-weighted overall plus only an eligible burden-completion adjustment.
