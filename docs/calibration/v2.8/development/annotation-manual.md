# v2.8 deterministic annotation manual

Use this manual in the order written. Never begin with a desired coverage or diagnostic label.

## A. Target decision tree

1. State internally: “The target says **X about Y under comparison/baseline Z**.”
2. State internally: “The response says **X′ about Y′ under comparison/baseline Z′**.”
3. Ask whether X′ can answer X without changing:
   - subject;
   - referent;
   - comparison class;
   - baseline; or
   - question type.
4. If any changes, select `changed` and the first applicable type in that list. Cite the shortest clause that names the new element.
5. If none changes, select `same`. Do not cite object evidence.

Mapping rule: a new example, analogy, case, or model remains `same` only when the response expressly connects it to the target proposition or inference. Otherwise classify the new object or treat it as contrary material after preserving the target.

Common boundaries:

- existence versus explanation → question-type;
- internal prediction versus external moral adequacy → question-type;
- truth versus usefulness or comfort → question-type;
- a different entity bearing the predicate → subject;
- the same word naming a different phenomenon → referent;
- different rival alternatives → comparison-class;
- different reference point for “better,” “more,” or “unlikely” → baseline.

## B. Scope

Apply scope only to the proposition mapped in A.

- fewer cases, weaker strength, shorter time, smaller population, added condition → narrowed;
- stronger commitment or larger range → strengthened;
- possibility/probability/actuality/necessity/certainty change → modality-shift;
- otherwise → same.

Object change and scope change can coexist. Object change controls substitution. A non-same scope on a preserved target requires at least one affected component marked `qualifies` or `distinguishes`.

## C. Burden

Start at `retained`.

- `reassigned` only if an exact clause transfers the same demand to another party.
- `replaced` only if an exact clause states a materially different success condition.
- A counterquestion, counterexample, symmetry charge, or new argument without an explicit transfer/replacement retains the burden.

Substitution precedence is object change, then burden reassignment, then burden replacement. Record only the first controlling cause.

## D. Component operation

For every component of a preserved target, ask the tests in order and stop at the first “yes”:

1. Does the response expressly say this component is false? → denies.
2. Does it expressly grant or rely on the component? → accepts.
3. Does it limit range, strength, modality, time, population, or conditions? → qualifies.
4. Does it split meanings, cases, referents, or comparison classes? → distinguishes.
5. Does it attack warrant, inference, baseline, or evidential force without denial? → undermines.
6. Does it supply a mechanism or reason while treating the component as a datum? → explains.
7. Otherwise → null.

Do not propagate contact through dependencies. Do not credit a collective phrase to several components unless it grammatically ranges over each one. A rationale may mention secondary effects; coverage uses only the primary operation.

## E. Contrary material and coverage

Only after every component is null, ask whether an exact clause offers material bearing on the target without operating on a component.

- yes → relevant contrary material;
- no → no relevant contrary material.

Coverage is then derived mechanically.

## F. Diagnostic decision tree

Diagnostics require a preserved responsive target.

1. Locate an exact criticism cue.
2. If no cue satisfies one row below, choose `none`, null object, and `none` impact.
3. Choose the narrowest row and permitted object.
4. Classify impact independently.

| Defect | Minimum cue | Component objects allowed |
| --- | --- | --- |
| contradiction | commitments cannot jointly be true | compound inference or conclusion; otherwise packet |
| missing-premise | necessary support is absent | inference, burden, conclusion, or packet |
| ambiguity | term, reading, scope, or referent is unstable | affected component or packet |
| invalid-inference | conclusion does not follow while premises may stand | inference, conclusion, or packet |
| unsupported-comparison | baseline/rival is absent or comparison does not transfer | rule-comparison, inference, conclusion, or packet |
| irrelevance | material does not bear on conclusion/burden | burden, conclusion, or packet |
| evidential-insufficiency | evidence does not warrant claim | fact-premise, inference, conclusion, or packet |
| scope-mismatch | conclusion/demand exceeds relevant scope | rule-comparison, burden, modality, conclusion, or packet |
| attribution-error | respondent disowns attributed claim | attributed component or packet |

Packet selection requires whole-argument scope. “The argument is unclear” without identifying an instability is not enough. A counterexample, rival explanation, disagreement, insult, or analogy is not automatically a defect cue.

## G. Impact decision tree

1. Does an exact clause state what fails, is not established, does not follow, does not explain, does not answer the burden, does not transfer, is not attributable, is incompatible, or must be scope-limited? → inferential-consequence.
2. Otherwise, does it merely call the target wrong, absurd, inadequate, unpersuasive, or similar? → verdict.
3. Otherwise → none.

An inference you can reconstruct is not an expressed inferential consequence. The responding move must state the link.

## H. Evidence

All evidence comes from the responding excerpt and uses zero-based, end-exclusive offsets.

Select the shortest complete clause retaining controlling negation, modality, quantifier, comparison, condition, and named referent. Do not select a pronoun-only fragment when the same clause or an adjacent clause identifies the referent. If spans are equally complete, select the shorter; if tied, the earlier.

Evidence boundaries do not alter semantic-operation agreement, but invalid or materially incomplete evidence fails the hard gate.

## I. Reframe

Set malformed-demand true only with exact language explaining the defect in the demand. Set replacement-demand true only with exact language stating the new demand. Derived reframe is true only when both are present.

## J. Multi-speaker map

Check the locked opponent edge before target classification. Same-side exchanges receive no opponent-responsive credit. Ownership is speaker-only unless an exact adoption record precedes the responding move. Side-level burden contact does not transfer individual argumentative ownership.

## K. Default policy

When explicitness tests are not met:

- preserve the object unless a mapped element actually changes;
- retain the burden;
- use null component operation;
- use no defect;
- use impact none; and
- use no reframe.

Defaults prevent ordinary disagreement or counterargument from being overclassified as substitution or diagnosis.
