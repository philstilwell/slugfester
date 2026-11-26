# Writing assessments for readers

Use this guide when preparing a new publication contract, writing or repairing assessment prose, and reviewing the first unsaved draft. It applies to source and scoring notes, argument descriptions, critiques, overall commentary, tag explanations, and the separately disclosed AI Contribution. It governs wording, not scoring or evidence selection.

## Explain the argument directly

Write for an interested reader who has not seen the assessment's internal records. Use familiar words, active sentences, and concrete references to what the speaker argued. Explain a necessary technical term when it first matters. Do not replace a precise philosophical distinction with a looser claim just to shorten a sentence.

- Say what the speaker claims, what supports it, and what the reasoning establishes or leaves unresolved.
- Describe the actual strength and limitation. Do not fill a length requirement with interchangeable praise, criticism, or process language.
- Preserve who needs to establish what. A critic who withholds acceptance does not automatically have to prove the opposite conclusion.
- Preserve uncertainty, negation, conditions, alternatives, and the difference between possibility, probability, evidence, and proof. Do not turn a reported claim into an established fact.
- Keep direct quotations exact, with all meaning-changing qualifications. Simplify the surrounding explanation, never the quoted words.

## Critique headings for new writing

New publication contracts must require exactly these four headings, in this order:

1. **Main strength:** Explain the contribution the argument actually makes.
2. **Main limitation:** Identify the most important unresolved weakness supported by the assessment record.
3. **What remains to be shown:** State the reasoning or evidence still needed and who must supply it; do not invent a new obligation.
4. **Why this score:** Explain how the established strengths and limitations support the already calculated score.

Keep the existing four-sentence contract: one terminally punctuated sentence per heading, 105–130 words total, at least 880 characters, with a target of 112–118 words. Count the headings in the word total. Preserve any run-specific requirement to state the exact score, such as `84/100`. A writing repair cannot change that score or its justification.

The supported structure check is `hasStructuredCritique` from `src/data/critique-format.js`. For a new run, call it with `{ labels: Object.values(critiqueLabels) }` so its publication checker requires the new headings. Hash-pin that module with the checker; the standalone runner does this for newly prepared publication plans. Keep the separate word, character, exact-score, source-fidelity, and substantive review checks. Do not copy an old debate's label list into a new contract or checker.

## Prefer reader wording

These are context-dependent writing choices, not search-and-replace rules for quotations or philosophical subject matter.

| Internal or older wording | Reader wording |
| --- | --- |
| By explicit editorial approval, this assessment… | This assessment… followed by the actual coverage and exclusions |
| Constructive | Argument for this side |
| Load-bearing constructive | Central argument for this side |
| Supporting constructive | Supporting argument for this side |
| Load-bearing reply | Central reply |
| Diagnostic challenge | Challenge testing the argument |
| The locked/frozen/fixed score of 84 | The score of 84, or the published score of 84 |
| Frozen assessment record | Saved assessment record |
| Eligible passage | Passage included in the assessment |
| Substantive intervention | Contribution to the argument |
| Speaker attribution | Identifying who is speaking |
| Automatic diarization | Automatic separation of audio by speaker |
| Adjudication | Review to resolve disagreements; if needed, define the reviewer as an adjudicator |
| Rubric | Scoring criteria, while retaining the exact rubric name when identifying the method |

Use the clearer role labels when creating a new publication skeleton. Internal schema keys, move IDs, source anchors, and scoring categories keep their existing meanings and exact values. Never rename a frozen role or identifier in an existing run to make its prose look simpler.

Terms such as burden of proof, Bayesian inference, canonical texts, provenance, and a locked-room account may be part of the argument itself. Retain them when necessary and explain them accurately; do not apply process-wording substitutions to them.

## Source, scope, and method notes

Lead with what was assessed and which source was used. State the assessed intervals, excluded participants or exchanges, and any dependent replies excluded with them. Preserve the fact that neither side receives credit, penalty, or an inference from absence for excluded material whenever that restriction applies.

For example, when supported by the actual scope record: “This assessment covers the main discussion. Audience questions and the replies that depend on them are excluded; neither side is scored on that material.” Supply the actual times and other required qualifications from the record. This example grants no scope exception.

Distinguish captions, automated audio transcription, targeted audio checks, and direct listening. Do not claim complete audio verification when only selected passages were checked. Keep precise source limitations and explain their significance. Record approvals, file paths, hashes, packet names, and execution details in the audit records rather than opening the reader's note with them.

Where method details help the reader, explain them plainly: separate AI reviewers assess the evidence, another AI reviewer resolves disagreements, and software calculates the totals. State the actual arrangement and its limitations; separate sessions do not imply different models or freedom from shared bias. Describe a score as finalized before explanation-writing when that timing matters, not as immune to future correction.

## Review before the first saved submission

Read the complete draft against its source and resolved judgments. Check that each sentence is understandable without internal workflow knowledge, every limitation and exclusion remains explicit, and all numbers, timestamps, quotations, roles, and conclusions agree with the frozen record. Record this review alongside the existing source-fidelity and score-consistency findings; clarity does not replace those checks.

Keep the AI Contribution visibly separate and excluded from participant scores. Within that section, write the proposed reasoning directly and preserve the existing nonformulaic-prose and novelty requirements.

## Existing assessments and resumed work

Do not rewrite historical prompts, approved source notices, saved outputs, or hash-locked contracts. A resumed run keeps its frozen schema and headings unless an authorized, documented change permits otherwise. Its prose can still use clear wording within the existing writable fields. The site supports both heading sets and displays older labels in their clearer form. New runs must freeze this guide with the publication instructions before writing begins; do not add it to blind scoring packets or change scoring rules to satisfy a writing preference.
