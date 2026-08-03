# Slugfester Reassessment Rubric v3.1

Rubric v3.1 retains the v3.0 scoring primitives while tightening the default presumption and making focused field-family verification the sole semantic authority for later scoring.

## Decision discipline

Apply these rules in order:

1. Read the locked target, indispensable components, response excerpt, and burden route literally.
2. Identify exact response language before assigning a positive or changed primitive.
3. Test only the assigned field-family rules; do not reward a generally impressive response by propagating credit into adjacent fields.
4. Prefer the specified default when the positive rule is not textually satisfied.
5. Record the shortest complete evidence clause preserving controlling negation, modality, quantifier, comparison, condition, and referent.

Defaults are not low participant scores. They are abstention about a structural classification.

## Targeting and burden

- **Original-target contact:** true only when exact response language bears on the locked claim or one of its indispensable components. Topical similarity is insufficient.
- **Connected example:** true only when the response expressly connects another case, analogy, counterexample, or model to the locked target. Mere mention of another case is insufficient.
- **Scope:** use `modality-shift` for a change between possibility, probability, necessity, or certainty; otherwise use `narrowed`, `strengthened`, or `same`. A changed scope requires original-target contact plus exact comparative language.
- **Burden adjustment:** default to `retained`. `reassigned` requires express transfer of the same demand to another party. `replaced` requires an expressly installed, materially different governing success condition. Asking for more evidence, adding a subsidiary consideration, narrowing a claim, or offering a counterargument does not by itself change the burden.
- **Burden contact:** choose only the highest eligible tier whose bridge is expressly supported or attacked. Do not infer contact merely because the response concerns the debate topic.

## Coverage and partial answers

Mark each indispensable component independently. A component is contacted only when the response grants, uses, denies, restricts, distinguishes, explains, questions the warrant of, or expressly challenges that component.

- `full`: every indispensable component is contacted;
- `partial`: at least one but not every indispensable component is contacted;
- `relevant-nonanswer`: no component is contacted, but the target or relevant contrary material is expressly addressed; and
- `nonanswer`: neither the target nor relevant contrary material is contacted.

Do not propagate contact through logical dependency. Answering a weaker reconstruction, presenting nearby contrary material, or changing a success condition is not a partial answer unless at least one locked indispensable component is actually contacted.

## Diagnostic

A complete diagnostic requires both:

1. an expressly cued eligible defect; and
2. a separate clause stating what consequently fails, does not follow, is not established, does not explain, cannot bear the claimed weight, or must be limited.

Choose the first clearly expressed eligible defect, not the most philosophically sophisticated defect an analyst could infer. A negative conclusion is not automatically a consequence clause; the excerpt must connect the defect to a stated inferential limitation.

## Reframe

A complete reframe requires both:

1. an explanation of why the governing demand or framing is malformed; and
2. a stated replacement demand.

A different question, an alternative topic, or a narrower claim is not a reframe unless the response explains the defect in the original framing. A criticism without a replacement remains incomplete; a replacement without the malformed-demand explanation is merely redirection.

## Responsiveness anchors

The final structural result constrains later responsiveness scoring:

| Final structural result | Permitted responsiveness band |
| --- | ---: |
| Full component coverage, or a complete diagnostic/reframe that defeats the decisive demand | 80–100 |
| Partial component coverage | 55–79 |
| Relevant nonanswer or issue-bearing counterargument | 40–69 |
| Nonanswer | 0–39 |

Within a band, distinguish direct answers from conditional answers, accurate reconstructions from weaker substitutes, and decisive engagement from merely related material. Constructive openings answer the motion and their locked burden rather than a nonexistent earlier reply.

## Relevance and burden anchors

| Final burden relation | Permitted relevance/burden band |
| --- | ---: |
| Completes the motion-level route | 90–100 |
| Advances a central bridge | 75–89 |
| Advances a subsidiary bridge | 55–74 |
| Topical but peripheral to an adopted route | 25–54 |
| Unadopted, invented, or irrelevant burden | 0–24 |

Critical and constructive contact are symmetric: attacking an eligible bridge may advance a burden as much as supporting it. Do not assign a critic the burden of establishing the contrary unless the critic expressly adopts that burden.

## Charity and calibration

Later performance scoring separately assesses:

- **epistemic calibration:** confidence, modality, and uncertainty fit the support offered; and
- **representational charity:** the move addresses the strongest live version actually advanced, including material concessions and qualifications.

Politeness is not charity, and abrasiveness is not uncharitable unless it distorts the operative argument. A partial answer can still be charitable if it accurately marks its limited scope. A confident answer can be calibrated if its warrant supports the confidence.

## Burden-completion adjustment exclusion

The full-debate adjustment defaults to zero. A nonzero integer from −5 to +5 is eligible only when one debate-wide consequence:

- changes whether an explicit locked success criterion is completed;
- is distinct from every selected move judgment;
- is absent from responsiveness, relevance/burden, other dimensions, section weights, move importance, omission links, and every other adjustment; and
- is documented with the burden ID, related move IDs, counterfactual effect, and exact nonduplication reason.

Failure of any condition forces zero. Style, eloquence, worldview plausibility, general coherence, accumulated impressions, and a second penalty or reward for an already scored omission are categorically excluded.

## Focused verifier rule

The focused verifier sees no A/B answers and judges its assigned family independently. Its semantic result is authoritative for the final lock. Exact evidence is then canonicalized mechanically from all AI sources that independently supplied that same semantic result. All derived labels are recomputed in code, never supplied by a model.
