# Slugfester Debate Critique Process

Use this process for every debate assessment so each page feels like the same product: quote-forward, compact, logically serious, and explicit about the limits of AI scoring.

For the locked page design and fill-in data skeleton, use [`youtube-debate-assessment-template.md`](youtube-debate-assessment-template.md). That template is canonical for future YouTube debate assessments.

## Goal

Create a condensed debate scorecard, not a full transcript replacement. Each page should help a reader see what each side actually said, how strong the argument or rebuttal was, and where fallacies, bias, weak evidence, or burden-shifting affected the score.

## Required Inputs

- YouTube URL and debate title.
- Transcript source, noted in `sourceNote`.
- Last rendered date in `YYYY-MM-DD` format: the last date this project ran the critique and scores, not the YouTube upload date.
- At least two-digit zero-padded debate number, speaker names, unique debate label, side labels, duration, motion, and a one-sentence summary.
- Topic categorization for `/topics/`: set `topicCategory` to the intended primary category ID from `topicCategoryDefinitions` in `src/app.js`; keep the concise, speaker-free `label` useful for secondary topic chips.
- Short representative quotes for both sides.

Never invent direct quotations. If transcript text is lightly cleaned for readability, say so in `sourceNote`.

## Page Structure

Every debate object should produce this order:

1. Sticky header with Slugfester branding, a `Debates` link, and an `External Sites` capsule for LogFall and CogBias.
2. Hero metadata: `Debate NN` plus debate label plus `Last rendered: YYYY-MM-DD`.
3. Smaller debate title and motion.
4. Representative quotes from both sides.
5. AI-generated scoring note.
6. `◉` interaction guide.
7. Parallel argument columns, aligned by topic and time.
8. Overall commentary with `Landed` and `Whiffed` for each side.
9. A visibly AI-authored, default-collapsed `AI Extension` containing strengthened final arguments and genuinely new arguments for both sides.

## Segmentation

- Use 4-7 topical sections for a long-form debate.
- Each section should cover one clear argumentative movement.
- Use the YouTube/transcript time range in `timebox`; keep upload timing separate from the `date` field. The displayed range links to the YouTube source at the range's start time. The renderer accepts `MM:SS`, long-minute `MMM:SS`, and `H:MM:SS` formats.
- Each exchange should align the two sides on the same issue whenever possible.
- Use YouTube/transcript timestamps in `argument.time`; displayed argument timestamps link to the YouTube source at that exact moment. Keep the visible timestamp faithful to the source transcript.
- Prefer 1-3 exchanges per section rather than exhaustive coverage.

## Quote Standard

- `quotes.pro.text` and `quotes.con.text` should be short, direct quotes or faithful fragments that encapsulate each side's position.
- `argument.words` should stay quote-forward: use the speaker's actual words where short enough, or a tight transcript-grounded condensation when the original is too long.
- Keep excerpts short enough to be legally and visually compact.
- Do not use a quote because it is entertaining if it is not representative.

## Scoring Rubric

Debate #1 currently remains a production v2 reassessment. New methodology testing uses `Slugfester Reassessment Rubric v2.1` under [`assessment-workflow-v2.1.md`](assessment-workflow-v2.1.md) and [`reassessment-rubric-v2.1.md`](reassessment-rubric-v2.1.md). Calibration ledgers stay under `docs/calibration/v2.1/` and do not affect published scores or rankings until the workflow and each full reassessment are explicitly promoted.

Both v2 and v2.1 score every selected move from 0–100 on these dimensions:

- Logical coherence: 25%.
- Evidence and warrant: 20%.
- Responsiveness to the strongest live point: 20%.
- Relevance and burden progress: 15%.
- Precision and clarity: 10%.
- Calibration and charity: 10%.

Calculate `move = round(.25L + .20E + .20R + .15B + .10P + .10C)`.

Under v2.1, lock move importance (`1`–`3`) and section percentages totaling 100 before scoring. Calculate each section as the importance-weighted mean of its moves. Calculate the overall score as the section-weighted mean plus an independently scored burden-completion adjustment from −5 to +5. This replaces v2's overlapping section and overall meta-scores. Do not hand-adjust any computed total.

Run two score-blind passes and preserve both. Adjudicate when any dimension differs by more than 8 points, a move total differs by more than 4, or a burden adjustment differs by more than 2. Same-model sequential passes must be labeled honestly and remain calibration-only unless explicitly accepted.

Controls:

- Use identical definitions and burdens for both sides.
- Score only what the transcript contains; do not silently substitute a published steelman.
- Treat a diagnostic question as a challenge, not as a promised contrary theory.
- Do not require a critic to prove the opposite conclusion unless the critic takes on that burden.
- A possible reply can answer a contradiction claim without answering comparative evidence.
- Do not deduct automatically for a fallacy or bias tag; score the underlying defect once in the dimensions it actually affects.
- Ignore applause, wit, status, and audience response except where clarity or charitable engagement changes the argument.
- Normalize coverage for the speaking opportunity the format supplied.

Score bands:

- `90-100`: exceptional; clear, relevant, well-supported, and resilient under rebuttal.
- `80-89`: strong; persuasive with limited gaps or remaining uncertainty.
- `70-79`: solid; coherent and relevant, but compressed, under-sourced, or only partially developed.
- `60-69`: mixed; understandable but reliant on weak warrants, speculative links, or incomplete rebuttal.
- `50-59`: weak; important gaps, misframing, or poor engagement with the live objection.
- `<50`: seriously defective; fallacious, irrelevant, self-undermining, or unsupported.

## Assessment Model Versioning

- Debates `01` through `130` were assessed with `GPT 5.5 Extra High`.
- After Debate `130`, Slugfester began using `5.6 Terra Extra High`.
- Every new debate from `131` onward must include `assessmentModel: "5.6 Terra Extra High"` in `src/data/debates.js`.
- A full reassessment may use a later model when it replaces the scorecard prose and creates a complete versioned ledger. Such a debate must explicitly set both the model actually used and the rubric actually applied.
- Do not retroactively relabel existing debates. The displayed model should describe the model used for that assessment.
- The renderer selects the historical model by debate number only as a fallback. Explicit reassessment attribution takes precedence.

## Critique Popovers

Each `◉` critique should target about 120 words. The validator allows 105-130 words.

Use this pattern:

1. Name the argumentative move.
2. State what is strongest or fairest about it.
3. Identify the main weakness, missing warrant, fallacy, bias, or unanswered burden.
4. Explain why the numerical score follows from that balance.

Tone rules:

- Be analytical, not snide.
- Do not psychoanalyze motives.
- Do not say a speaker "proved" more than the argument supports.
- Use fallacy names only when the flaw affects the inference.
- Use bias names only when the tendency plausibly shaped the framing or evaluation.

## Fallacies And Biases

Use LogFall for logical fallacies and CogBias for cognitive biases:

- Fallacy links must use `https://logfall.com/fallacies/...`.
- Bias links must use `https://cogbias.site/biases/...`.
- A tag should explain a real weakness, not merely decorate a low score.
- Each tag needs a short context note explaining why that label applies to the specific argument or rebuttal.
- The Rankings page aggregates named fallacy and bias tags by each scorecard's primary topic and displays each ranked interlocutor's own fallacy and bias tag rates. The per-interlocutor bars use only that person's side of each qualifying scorecard, respect the active topic filter, and normalize to tags per 100 scored moves. No extra analytics fields are required, but accurately typed `fallacy` and `bias` tags are necessary for these views to remain useful.
- The Rankings page's head-to-head comparison and each `/interlocutor/<speaker>/` profile are derived automatically from the debate sides, overall side scores, topic categories, and typed move tags. New scorecards therefore update sample confidence, topic and opponent breakdowns, score distributions, linked profile cards, and comparison results without new profile-specific fields.
- Pills should show a hover/focus popover with the basic definition, contextual explanation, and the note `Click button for more info.`
- Pills should also open a local Slugfester reference page first; that page gives the basic definition, debate context, and the in-depth LogFall or CogBias link.
- Debate-page pills should include a `#` occurrence anchor that jumps to the exact debate/interlocutor context card on the local reference page.
- Prefer no tag over a forced tag.

## Overall Commentary

Each side needs:

- One overall score.
- At least two `Landed` points (the strongest parts of that side's case).
- At least one `Whiffed` point (a material logical weakness or overreach).
- Links for named fallacies or biases in the `Whiffed` list.

For a reassessment, the overall score must exactly equal its versioned ledger formula. A v2.1 score uses locked section percentages plus only the documented −5 to +5 burden-completion adjustment.

## AI Extension

Place `AI Extension` immediately after Overall Commentary inside a default-collapsed native `details` accordion. State the assessment model and make clear that this is AI-generated work—not transcript content, a quotation, or wording attributable to either speaker.

For each side provide:

- A strengthened thesis, four to six explicit premises, and a proportionate conclusion.
- Two to four genuinely new reinforcing arguments of 45–130 words each.
- Direct answers to the strongest objections exposed by the assessment.

Strengthen both positions against the clearest live objections while keeping each conclusion proportionate to its premises.

## Manual Checklist

Before committing a new debate:

- Representative quotes are actual or transcript-grounded.
- Critiques average near 120 words and are not repetitive.
- Scores match the written criticism.
- Each section compares like with like.
- Fallacy/bias tags are warranted and linked to the correct site.
- The scoring note makes clear that scores are AI-generated.
- The scoring-note band identifies the correct assessment model: `GPT 5.5 Extra High` through Debate `130`, then `5.6 Terra Extra High` beginning with Debate `131`.
- A reassessed debate explicitly identifies its actual model and rubric and has a matching ledger in `docs/assessment-ledgers/`.
- The ledger calculator reproduces every move, section, and overall score in the published debate object.
- A v2.1 ledger records source and packet hashes, burdens, response links, both scoring passes, required adjudications, tag review, and AI Extension novelty review.
- Calibration-only results remain outside the production debate object and rankings.
- The AI Extension follows Overall Commentary, is visibly AI-generated, and works closed, open, and from the keyboard.
- Every new debate from `131` onward explicitly sets `assessmentModel` to `5.6 Terra Extra High`.
- `sourceNote` identifies how the transcript was obtained or cleaned.
- The page follows the locked design in `youtube-debate-assessment-template.md`.
- The debate number is at least two digits, zero-padded below 100, unique, and sequential in debate-list order.
- The debate label is distinct from every other listed debate.
- The debate's `topicCategory` places the compact `/topics/` card in the intended primary category; update `topicCategoryDefinitions` if the debate belongs to a real recurring theme not yet represented. Every new debate from `190` onward must set a valid `topicCategory`.
- The `/topics/` compact card uses a general topic title and does not visibly print interlocutor names until hover or keyboard focus reveals the summary and compact speaker names inside the standard-height card.
- `npm run seo` has regenerated clean URL pages, sitemap, robots, and fallback HTML.
- `npm run check` passes.
