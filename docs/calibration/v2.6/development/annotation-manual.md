# v2.6 Target-Contact Annotation Manual

This manual governs the v2.6 target-contact layer. The eight examples cover all ten component-contact, six coverage, and three target-relation disagreements from the retired v2.5 held-out gate.

## First decision: target relation

Ask whether the response continues to answer the locked claim with the same object, strength, modality, comparison class, and burden.

- If yes, choose `preserved`; do not cite substitution evidence; annotate every typed component.
- If no, choose `substituted`; select exactly one substitution type; cite the shortest exact phrase showing the change; leave component operations empty.
- Do not use substitution as a synonym for weak, indirect, incomplete, or zero-contact response.

## Second decision: node-specific operation

For each component of a preserved target, choose null or the most directly expressed qualifying operation: accepts, denies, distinguishes, qualifies, explains, or undermines. Every non-null operation requires an exact phrase from the responding move.

Contact never propagates along graph edges. An attack on a conclusion does not contact its premises. A denial of a premise does not contact the dependent inference unless the move separately attacks that inference. A phrase referring to a conjunction or theory does not accept each constituent claim unless it explicitly grants or relies on each one.

## Component graph reading

Kinds identify the node's function; `dependsOn` identifies its locked parents. Treat each node as a distinct response obligation. Inference and conclusion nodes must have at least one dependency. Do not reward a response for contacting an ancestor or descendant it did not actually accept, deny, distinguish, qualify, explain, or undermine.

## Relevant contrary material

Relevant contrary material is available only for a preserved target with no component operation. It requires exact evidence. It captures material such as case-specific facts that bear on the target but do not operate on its exact baseline, inference, or burden nodes.

## Development lessons

1. A naturalistic explanation of why a conjunction is rare undermines the comparative inference; it does not contact the truth of every historical premise in the conjunction.
2. Once a response substitutes an affirmative burden, component contacts are not applicable even if the response gestures toward one original premise.
3. Replacing an epistemic-classification question with a normative-wrongness question is an object substitution.
4. Replacing a genuine-wrongness standard with a self-adopted epistemic standard is a comparison-class substitution.
5. Distinguishing sanctions from reactive attitudes contacts the sanctions node but does not contact a separate social-cornerstone conclusion.
6. Case-specific contrary facts do not contact an ordinary baseline or exclusion burden merely because they make the case rhetorically distinctive.

## Evidence and derivation audit

All offsets are zero-based and end-exclusive into the responding `sourceExcerpt`. Positive operation, substitution, and contrary-material evidence must reproduce exactly with `sourceExcerpt.slice(startChar, endChar)`. Coverage is calculator-derived and may not be selected independently.
