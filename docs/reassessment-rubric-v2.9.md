# Slugfester Reassessment Rubric v2.9

This is the single-pass, classification-only rubric for Workflow v2.9. It contains no numerical debate scores.

## Decision order

For each move, make the following decisions without reasoning backward from a desired result.

1. **Original target:** true only with an exact clause bearing on the locked claim or component.
2. **Connected example:** true only with an express link from the new case to the original target.
3. **Exclusive substitution:** true only when a changed object answers instead and original-target contact is false.
4. **Scope:** modality first, then narrower, stronger, or same.
5. **Burden adjustment:** retain unless the same demand is expressly transferred or a different success condition is expressly installed.
6. **Components:** mark each contacted or not contacted; do not classify response posture.
7. **Diagnostic:** select an expressed defect and independently locate its stated consequence.
8. **Reframe:** require both the defect in the original demand and the replacement demand.
9. **Burden relevance:** select only the highest evidenced eligible route tier.

## Contrastive anchors

### Target and example

- “Your claim that X is false because …” → original contact true.
- “Consider Y; it shows why X fails …” → original contact true and connected example true.
- “Y is interesting” next to discussion of X → connected example false unless the link is stated.
- “The real question is Y,” with no clause about X → exclusive substitution may be true.
- “X is mistaken; the more useful question is Y” → original contact true, exclusive substitution false; assess burden and reframe separately.

### Burden adjustment

- “You must now prove X” → retained unless the original live demand was expressly transferred.
- “I am asking Y” → retained unless Y is expressly proposed as the governing success condition.
- “The issue is not whether X; the standard we should use is Y” → replaced when both clauses are exact.
- An answer followed by a counterquestion → retained unless the counterquestion expressly replaces the standard.

### Component contact

- Granting, denying, qualifying, distinguishing, explaining, using, or attacking the warrant of a component all count as contact.
- Mentioning only a downstream topic does not contact an unstated premise.
- A clause with plural or conjunctive grammatical scope may contact multiple components; an inferred downstream effect may not.

### Diagnostic consequence

- “That premise is unsupported” → defect cue only; diagnostic false without an expressed consequence.
- “That premise is unsupported, so the conclusion does not follow” → defect plus consequence; diagnostic true.
- “That is absurd” → neither a qualifying defect cue nor a consequence.
- “You said X, but I did not claim X; therefore that objection misses my argument” → attribution error plus consequence.

### Reframe

- “Why Y?” → no reframe.
- “X is the wrong standard because it confuses A with B; the relevant test is Y” → reframe.
- “X is wrong; also Y matters” → no reframe unless Y is stated as the replacement demand.
- A move can contact the original target and still reframe the broader question.

### Burden relevance

- No exact eligible bridge contact → `none`.
- Contact with an eligible subsidiary bridge → `subsidiary` unless a higher tier is also contacted.
- Contact with the central route → `central`.
- Contact with the side's complete motion-level success condition → `motion`.
- Supporting and attacking the same tier are equally relevant; direction is assessed elsewhere.

## Defaults

When an explicitness test fails: original-target contact false, connected example false, exclusive substitution false, scope same, burden retained, component contact false, no defect, no consequence, no reframe, and burden tier none. Defaults are not a shortcut: the rationale must state what the excerpt does and why the positive threshold is not met.

## Output rule

Annotators record only schema primitives and exact evidence. Code derives responsive coverage, diagnostic, reframe, burden relevance, and the exact tuple. The scoring pass must not contain performance scores, Overall Commentary, AI Extension, rankings, or production edits.

