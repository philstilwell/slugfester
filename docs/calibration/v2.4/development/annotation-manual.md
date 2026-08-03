# v2.4 Orthogonal Annotation Manual

**Model:** 5.6 Sol  
**Workflow:** Slugfester Reassessment Workflow v2.4  
**Rubric:** Slugfester Reassessment Rubric v2.4

This is a development manual for the classification-only v2.4 annotation stage. Its examples come from the complete set of v2.3 class disagreements. Those older mutually exclusive classes are diagnostic history, not executable labels: no legacy class mechanically determines interaction mode, coverage, either mechanism flag, or burden relation.

## Annotator authority

Treat the reviewed inventory as frozen. Do not change:

- move boundaries or speaker identity;
- `interactionMode`;
- target identity, target components, or target wording;
- burden IDs or success criteria; or
- source excerpts or source hashes.

If a frozen field appears defective, report an inventory violation instead of silently repairing it through a classification choice. Annotate only the selected speaker's atomic act. Never import a questioner's premise into the respondent's act or a respondent's answer into the questioner's act.

## One-pass decision procedure

Complete every field in this order, but decide each on its own test.

### 1. Confirm interaction mode

Copy the inventory-locked value exactly.

- `constructive` means the act principally builds the speaker's case against the motion or toward an adopted burden.
- `responsive` means the act principally engages the frozen target packet.

This is a functional distinction, not a chronological one. Openings can reply; closings can construct. A moderator's substantive characterization or objection can be a response target. An open invitation to state one's view normally is not.

Do not infer interaction mode from whether the act also helps the speaker's burden. A responsive answer can substantially build the speaker's case, and a constructive act can contain generic criticism.

### 2. Assign target coverage

For `constructive`, assign `not-applicable` and stop the coverage test.

For `responsive`, compare the selected act only with the frozen indispensable target components. Make a small component checklist before choosing:

- `full`: every indispensable component receives substantive contact;
- `partial`: at least one indispensable component receives substantive contact and at least one does not;
- `relevant-nonanswer`: the act supplies contrary or cautionary material relevant to the actual target, but addresses none of its indispensable components; or
- `substitution`: the act changes the issue, transfers the burden, attacks a materially weaker claim, or otherwise answers something other than the actual target.

“Addresses” means the act supplies a proposition that accepts, denies, distinguishes, qualifies, explains, or undermines that component. Mere topic overlap, rhetorical pressure, or a request for clarification is not component contact.

Coverage is structural, not evaluative. Do not reduce `full` because an answer is asserted, poorly evidenced, incoherent, or ultimately false. Do not elevate a well-supported counterargument when it misses the frozen target. A single general reply may cover several examples when it expressly applies to all of them; enumeration is not required unless the target components are genuinely distinct.

The boundary between `relevant-nonanswer` and `substitution` turns on preservation of the target. Use `relevant-nonanswer` when the act concerns the actual claim but leaves every indispensable component untouched. Use `substitution` when the act changes that claim's content, strength, burden, or object.

### 3. Assign the diagnostic flag

Set `diagnostic: true` only when both conditions are present:

1. the act identifies a contradiction, missing premise, ambiguity, invalid inference, or comparable defect; and
2. the act explains or makes explicit why that defect matters to the frozen target.

Otherwise assign `false`. The following are insufficient by themselves:

- a bare denial or competing theory;
- a rhetorical or clarification question;
- an assertion that evidence is weak;
- generic methodological advice;
- naming an ambiguity without connecting it to the target inference; or
- a diagnosis aimed at a stronger demand than the opponent actually made.

Diagnostic is a mechanism, not a coverage class. It can coexist with `full`, `partial`, or `relevant-nonanswer`. A diagnosis of one component in a compound packet can be true while coverage remains partial. Conversely, an answer can be full without using a diagnostic mechanism.

### 4. Assign the reframe flag

Set `reframe: true` only when both conditions are present:

1. the act explains why the original demand is malformed, confused, reversed, or otherwise improperly framed; and
2. the act states the corrected demand that should replace it.

The corrected demand need not be answered for the flag to be true; coverage records what the act does with the frozen target. Ordinary qualification, narrowing one's own conclusion, disambiguating a term, reversing a premise, offering a rival ontology, or asking a different question is not automatically a reframe.

Reframe is independent of diagnostic and coverage. The same act may expose the malformed demand, supply the corrected demand, answer every component, and therefore be diagnostic, reframing, and full. No priority ordering suppresses those coexisting facts.

### 5. Assign burden relation

Judge the selected atomic act against only the locked burden IDs and observable success criteria:

- `completes`: if successful, this act itself satisfies a motion-level success criterion or decisively defeats the opponent's adopted burden;
- `advances-central`: it materially advances the main adopted route, but at least one motion-level bridge remains;
- `advances-sub-burden`: it establishes or attacks a necessary subsidiary issue without yet supplying the motion-level consequence;
- `topical-peripheral`: it concerns the subject but is nonessential, rhetorically adjacent, repetitive without new burden work, or directed at a route the side does not need; or
- `unadopted-or-irrelevant`: it depends on a burden no side adopted or has no material route to a locked burden.

Apply a strict exclusion rule. Do not import:

- completion supplied later in the exchange;
- cumulative force from repeated moves;
- a distinct theory offered by an allied speaker;
- a positive contrary burden the critic never adopted;
- the motion-level consequence of a premise the act merely states; or
- better evidence, clarity, or rhetoric as a substitute for burden contact.

The “if successful” clause removes truth evaluation; it does not remove missing bridges. A premise or distinction can be fully answered relative to its target yet remain only a sub-burden. A relevant nonanswer can still advance a central burden when it supplies central independent caution. Conversely, full target coverage may be merely subsidiary to the motion.

## Recurring lessons from the development set

1. **Do not force exclusivity across axes.** Examples `02`, `11`, `23`, and `29` show that full coverage can coexist with diagnostic and reframe mechanisms. Examples `15` and `25` show that diagnosis can coexist with only partial coverage.
2. **Keep soundness out of coverage.** Examples `08`, `13`, `17`, and `20` reach all indispensable components even though their warrants can remain contestable.
3. **Decompose compound targets.** Examples `09`, `10`, `14`, `15`, `25`, `26`, `27`, `31`, and `32` answer one component while leaving another open.
4. **Preserve the target's strength.** Example `01` substitutes a stronger modal claim. Examples `21` and `22` stay relevant to the actual issue but do not contact the property-based reasons offered for it.
5. **Do not over-credit questions.** Example `04` supplies useful testing pressure, but the selected questions do not themselves state the resulting defect.
6. **Distinguish reframe from qualification.** Example `03` narrows the speaker's own confidence without repairing the opponent's demand. Example `28` clarifies a disputed sense without establishing a malformed demand. Example `26` objects to direct external checking when the actual target asks for indirect controls.
7. **Use functional interaction mode.** Example `06` is constructive despite occurring in a closing. Examples `14`, `19`, and `24` are responsive despite missing a useful legacy target ID. Examples `18` and `30` build adopted standards after open moderator prompts.
8. **Respect speaker ownership and atomicity.** Example `04` demonstrates why a mixed transcript span cannot transfer one participant's answer to another participant's act.
9. **Separate target coverage from burden progress.** Example `20` is full on a local comparison but only advances a sub-burden. Example `12` is a relevant nonanswer to its target while materially advancing a central epistemic-restraint burden. Example `16` is unusually sufficient to complete its locked burden if successful.
10. **Treat mechanism flags as descriptions only.** A diagnostic or reframe flag never improves coverage, burden relation, or later numerical quality by itself.

## Final self-audit

Before submitting a pass, verify:

- every interaction mode exactly copies the inventory;
- every constructive move has `targetCoverage: not-applicable`;
- every responsive move uses exactly one of the four responsive coverage values;
- every claimed full answer touches every frozen indispensable component;
- every diagnostic true names both a defect and its relevance;
- every reframe true contains both a malformed-demand explanation and a corrected demand;
- every burden relation is justified by the selected act alone;
- mechanism flags were decided independently of coverage; and
- no score, prior assessment, other classifier output, or legacy winner judgment entered the decision.

The development examples in `orthogonal-examples.json` preserve legacy source identity and excerpts for training, but their `legacyTargetMoveIds` are contextual provenance rather than substitutes for the reviewed v2.4 target packets used in annotation.
