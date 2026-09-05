# Direct slogan study, version 1.0

Protocol written September 4, 2026, before new annotation results were seen.

## Question and fixed population

Across the 187 religious-versus-skeptical debates selected in the September 4,
2026, 253-assessment snapshot, how often does each defended side use a slogan
instead of supporting a claim? How often is that slogan also protected against
criticism? Emotional framing is recorded separately, not presumed to be the cause.

The population is frozen by the hash of the previous analysis's debates.json.
No debate is added, dropped, or selected because of its score or expected result.
The unit for the primary comparison is the debate, with both sides kept together.
These are selected public debates, not a random sample of religious or secular life.

## Source and scope

All 187 retained caption-event files must match their original recorded SHA-256
fingerprints. This proves file identity, not the accuracy of automatic captions.
Review the whole retained transcript, not only previously selected argument cards.
The new research scope is the two primary speakers' substantive discussion of the
debate's subject throughout that transcript. Exclude advertisements, introductions,
housekeeping, audience/moderator speech, unrelated biography, and quoted opinions
the speaker is not adopting. Include substantive answers to audience questions.
This research scope is separate from any narrower historical scoring window.

Speaker attribution is a new judgment. Provide only source-based identity anchors
from the old inventory, never old ratings, critiques, tags, winners, or the old paper.
Anchors are aids to identification, not instructions to accept an attribution
without reading the surrounding exchange. Caption passages whose speaker cannot
be established remain unknown. Do not assign them according to which worldview
their words sound like. Do not repair uncertain words by inventing a quotation.

## Definitions

1. **Slogan form:** a compact, repeatable affirmation or catchphrase that presents
   a general conclusion as settled. Brevity, memorable phrasing, repetition, humor,
   and emotion alone do not make a reasoning defect.
2. **Support substitution:** in its actual use, the affirmation is made to do the
   work of a reason that the speaker has not supplied. Repeating the conclusion,
   appealing to group identity, invoking comfort or fear, or invoking the very
   authority under dispute may substitute for a reason. A brief summary of reasons
   genuinely supplied elsewhere in the exchange does not satisfy this condition.
   Ordinary contestable arguments with disputed premises are not automatically slogans.
3. **Protection from criticism:** positive textual evidence shows how contrary
   evidence or objections are neutralized regardless of their merits. Examples of
   mechanisms are interpreting every outcome as confirmation, treating disagreement
   itself as proof of a critic's defect, making a promised test impossible to fail,
   or expressly ruling relevant evidence out. Merely failing to state a test, making
   a moral or metaphysical claim, expressing faith, or supplying weak evidence is
   NOT enough. Record unclear when the protective use cannot be established.
4. **Emotional device:** an observable appeal to comfort, fear, shame, identity, or
   ridicule. This is a description of language, not a diagnosis of sincerity,
   manipulation, audience response, or the social cause of belief.

The **unsupported-slogan** outcome requires both slogan form and support
substitution to be yes. The **criticism-resistant-slogan** outcome additionally
requires protection from criticism to be yes. A non-slogan argument can still be
protected against criticism; preserve that separate finding rather than redefining
it as a slogan. Unclear is not yes, and not applicable is not a hidden zero.

Mathematics, morals, historical reasoning, and philosophy need not be testable by a
single experiment to be answerable to reasons. Acknowledging uncertainty, stating
limited conclusions, giving relevant reasons, and responding to objections count
against a defect finding when they genuinely address the claim at issue.

## Counting rule and independent review

Two fresh, mutually independent full-transcript reviews use the same protocol.
They receive no hypothesized direction, ideological category labels, old scores,
old critique, old slogan findings, or each other's output. The primary speakers
are called A and B in randomly assigned order; their identities may remain
recognizable in the source. Do not call this fully identity-blind research.
Both reviews use the same recorded model and effort; independence of context is
not independence of model training or a substitute for human validation.

Record each distinct claim-use episode with its exact event span, a short verbatim
quotation, surrounding context, speaker, supporting and contrary reasons, explicit
yes/no/unclear findings, confidence, and the strongest fair interpretation. An
immediate repeated phrase in one uninterrupted claim counts as one episode.
Later renewed use after an intervening reply is a new episode. Do not use target
counts, minimum incident quotas, keyword-only selection, or the old score threshold.
Keep plausible candidates rejected on contextual grounds and at least one actual
well-supported or appropriately limited contrast per side where the source allows.

Require complete, gap-free speaker/scope attribution of all caption events using
A, B, other/excluded, or unknown. Attribute mixed or ambiguous caption events to
unknown unless a defensible primary-speaker assignment is possible. Unknown
speaker words and unresolved quotations must remain visible in coverage results.

Match overlapping candidate episodes deterministically into a candidate union.
Resolve genuinely distinct nearby claims separately; preserve all original output.
Disputed candidate findings receive a fresh, source-based review with enough
surrounding text to inspect both supporting reasons and later qualifications.
No adjudicator is asked to favor one side or to produce a desired frequency.
If context or attribution remains uncertain, keep the uncertainty rather than
forcing a binary label. Any new source recovery has a separate dated record.

## Measures and checks, fixed before results

- Primary: average within-debate difference in unsupported-slogan episodes per
  10,000 substantive attributed words. Report each side's numerator and denominator,
  pooled rates, and equal-debate rates, which answer different questions.
- The same comparisons for criticism-resistant slogans, clearly separated.
- Paired debate presence: how many debates contain at least one episode on each side,
  both sides, or neither. This does not pretend equal exposure within long debates.
- Show separate primary-review results, overlap, disagreement, adjudication changes,
  unknown-word coverage by side where identifiable, and strict both-reviewer agreement.
- Repeat comparisons for earlier/later historical assessment groups, narrowly
  religious topics, and after removing John Lennox's debates. The groups describe
  the archive; they do not explain causes or create independent replications.
- Use 20,000 complete-debate resamples with a fixed seed, retaining both sides and
  all their episodes together. Explain that ranges measure sensitivity to the
  observed mix of debates, not model bias or transcript correctness. Repeated
  speakers limit the independence of debates; inspect a repeated-speaker sensitivity.
- Inspect whether very short denominators, uneven unknown speech, prolific speakers,
  or a few unusually long debates account for the result. Do not silently exclude
  an inconvenient debate. Mark rates unavailable when a usable side denominator is
  absent; retain that debate in coverage and presence tables.
- Examples must include confirmed cases, rejected or uncertain candidates, and
  counterexamples on both sides when available. Select explanatory examples only
  after the complete count, not as the basis for the count.

Pilot a deterministically selected mixed earlier/later sample before bulk execution.
The pilot tests coverage, attribution, quote validity, and operational clarity,
not whether the expected side wins. If substantive definitions change, version the
protocol and rerun all pilot reviews under the final version before pooling them.

## Preservation, cost, and deliverable

Never change original scores, assessment ledgers, source locks, rankings, or other
papers. New research records are dated, versioned additions linked to source hashes.
Full transient transcript packets remain local; publish the method, short evidence
excerpts, annotation records, code, numerical results, and coverage/reliability audit.
No private authentication or incidental user files enter the research outputs.

Expected direct incremental cash cost: $0, using existing ChatGPT-backed Codex
access. Paid API calls, paid transcription, purchased credits, and automatic reset
redemption are not authorized by this protocol. Check the shared allowance between
bounded batches and stop well before exhaustion rather than silently using credits.

Rewrite the existing slogan PDF (originally Paper 2, currently item 3 in the
seven-paper library), preserving its stable download name and the earlier edition
in version history. Use plain language, legended graphs, concrete source examples,
and conclusions that state the premises, findings, and their justified implication.
Do not claim that a slogan count establishes institutional enforcement of belief,
individual motives, the truth of a worldview, or a universal group trait.

PDF is the user-selected primary report surface. Preserve the established series
design, embed every font, inspect rendered pages, and validate all published figures.
Update only the affected library description and links. Commit and push through
the site's checked publication workflow after the completed analysis passes review.
