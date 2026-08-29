# Debate 198 production report

Status: **published and frozen**.

## Result

John Ferrer and Matt Dillahunty debate whether morality needs God as its foundation. Ferrer defends divine grounding; Dillahunty defends a secular account. The one permitted repository calculation scored Ferrer **67** and Dillahunty **83**, so Dillahunty prevailed by 16 points.

The result was stable across the two isolated judgments: their mean absolute distance was 0.5 points, the largest difference was one point, neither final score moved outside the primary judgments' range, and both judgments agreed on the winner.

## Evidence and review

The complete public YouTube auto-caption track supplied 3,008 chronological events and 23,896 words. The frozen inventory contains 27 scored moves across four semantic sections: 13 for Ferrer and 14 for Dillahunty. Every selected move had high speaker-attribution confidence, so no paid audio verification was needed.

Two fresh, isolated 5.6 Sol judgments assessed every move; a separate identity-blinded review resolved all 31 disagreements. Repository code then calculated the move, section, and overall scores exactly once. No model wrote a total, no score was manually overridden, and no second score pass occurred.

Publication maps all 27 locked moves to visible evidence cards, preserves exact source quotations, supplies four or five concrete strengths and three material weaknesses per side, and keeps the separately labeled AI Extension outside the participant scores.

## AI Contribution punctuation repair

A corpus-wide review found Debate 198 was the only published debate whose AI Contribution showed the signature of stripped punctuation. It had just four commas in 699 words; the next-lowest unaffected debate had 17 commas in 700 words. The repair restored 47 missing commas across 13 leaf fields, bringing Debate 198 to 51 commas while preserving the same 699 word tokens, object structure, arguments, judgments, scores, and winner. All 198 published debates now pass the corpus-relative punctuation check.

The pre-repair publication remains recoverable from Git, and the correction record names every writable field and authenticates the before/after files. A fresh desktop and mobile rendering review confirmed that all 13 corrected fields display properly with no clipping, horizontal overflow, browser errors, warnings, or blocked controls.

## Comparison with recent debates

The production record was compared with the independent Debates 171–195 window and the richer Debate 17 example. The first draft's 27 argument descriptions averaged only 19.7 words and frequently compressed away the speaker's supporting reason, comparison, or intended consequence. The eight critiques also needed fuller accounts of each move's inference, evidence, limitation, and unresolved burden; the Overall Commentary was materially thinner than the established style.

Those score-neutral fields were repaired in isolated, tightly limited shards without changing the motion, inventory, judgments, critiques' conclusions, scores, or winner. The final argument descriptions average 25.1 words and range from 24 to 28 words, with no card below 20 words. The critiques average 120.6 words and 923.4 characters, range from 105 to 130 words and 890 to 1,014 characters, and each uses the required four-sentence analytical structure. Overall strengths now average 23.4 words and material blunders average 24.0 words. Summary, card, critique, Overall Commentary, and AI Extension depth all pass the current hard contracts and corpus-relative parity checks.

The 27 moves require 14 display rows. The moral-foundations section retains four rows on each side because the locked source contains four distinct, independently scored, non-mergeable moves per side. The motivation-and-application section retains a fourth Dillahunty card because its additional locked move has no honest Ferrer counterpart. Both structures were validated through complete one-to-one ledger mapping rather than empty placeholders or a debate-specific exception.

## Fallacy and cognitive-bias review

The post-scoring rhetorical review covered every locked move through two fresh blind passes, with the existing tags and the other review hidden. A fresh adjudicator considered the anonymous union of all 27 candidates. A final conservative source check rejected 20 candidates, including six overbroad provisional acceptances, because they described underargument, contested assumptions, analogy limits, or evidential gaps without satisfying a named catalog definition.

Seven transcript-supported labels were accepted on five moves: **Begging the question** on treating conditional-goal accounts as non-moral by definition and on defining intrinsic good through self-desirability; **Special pleading** on exempting the soul from the epistemic limits applied to natural capacities; **Confirmation bias** on selecting Christianity's favorable historical and practical fruits; and **Red herring**, **Equivocation**, and **Argument from ignorance** on the claim that scriptural guidance explains why non-abolitionist societies nevertheless recognized moral duties. Each accepted label identifies a material weakness already represented in the associated critique. No label altered a score, move, critique, or winner.

## Rendering, validation, and workflow update

The generated debate page passed Chromium checks at 1440×1100 and 390×844. Six preserved screenshots cover collapsed, full-page, AI Extension, and open-critique states. All 27 argument cards and seven rhetorical-tag controls rendered; both speaker profiles opened; pointer, Enter, and Space interactions passed; and there were no empty cards, horizontal overflow, console errors, warnings, or failed resources.

The production validator, 198-transcript corpus replay, 386-file generated-page replay, historical campaign and calibration audits, all-record standalone audit, content-parity audit, rhetorical-tag audit, and full repository suite passed. The full Debate 198 replay also authenticated the local transcript bytes, while the repository-only replay authenticated the committed hash chain without depending on ignored source files.

The shared validator now detects corpus-relative punctuation loss in substantial AI Contributions. The rewritten `add-slugfester-youtube-debate` Skill is shorter and routes detail into its runbook; it now treats the latest accepted standalone controls as authoritative, preserves punctuation across publication transport, requires direct prose review in addition to the automated drift detector, and retains the existing depth, one-to-one mapping, and two-pass rhetorical-review safeguards.

Direct incremental cost: **$0**.

Primary production files:

- `src/data/debates.js`
- `docs/assessment-ledgers/ferrer-dillahunty-god-morality-2018.json`
- `docs/assessment-production/standalone-debates-v1/debate-198/`
- `docs/calibration/v2.1/corpus-transcript-audit.json`
