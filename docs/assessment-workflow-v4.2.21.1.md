# Slugfester Charity-Conditional Closure v4.2.21.1

The v4.2.21 Pass B gate accepted Debates 27 and 188 and rejected Debate 195 because the output schema permitted a charity combination that the unchanged semantic validator prohibits. Five moves set `charity.tested` to `false` while retaining descriptive text. Every affected move correctly used the fixed untested-charity rating of 75. Clearing only the forbidden strings in memory made the complete validator pass, but that counterfactual was never accepted or written as a corrected output.

v4.2.21.1 is a distinct recovery contract. It does not revise the failed gate, accept the failed output, authorize correction, or rerun accepted contexts.

The output schema now has two explicit charity shapes:

- when `tested` is `false`, `alternative` and `decisiveQualification` must both be exactly empty strings; and
- when `tested` is `true`, both descriptions must contain at least ten characters.

The deterministic validator separately requires the representational-charity rating to equal exactly 75 whenever charity is untested. The model manual states both dependencies explicitly. Every other v4.2.21 allocation remains unchanged, including source-span immutability, full-transcript access, repository-owned evidence rendering, derived response class, within-class responsiveness, future-target rejection, score blindness, and no automatic correction.

Passing code fixtures authorizes preparation of one fresh isolated Debate 195 Pass B recovery context. Debates 27 and 188 remain locked to their accepted v4.2.21 outputs. Model execution requires a new frozen manifest and cost estimate. No disagreement extraction, audio execution, adjudication, score derivation, publication, production mutation, or 195-debate run is authorized by this design alone.
