#!/usr/bin/env python3
"""Test whether Slugfester's raw CON-side score advantage is an inherent role effect."""

from __future__ import annotations

import csv
import importlib.util
import json
import math
import statistics
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
SCALE_ANALYSIS_PATH = (
    REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/analysis.py"
)
THEIST_DECOMPOSITION_PATH = (
    REPO_ROOT / "docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv"
)
SEED = 20260901
BOOTSTRAP_DRAWS = 20_000


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def median(values: list[float]) -> float:
    return statistics.median(values)


def percentile(values: np.ndarray, probability: float) -> float:
    return float(np.quantile(values, probability))


def load_scale_module():
    spec = importlib.util.spec_from_file_location("slugfester_scale_analysis", SCALE_ANALYSIS_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCALE_ANALYSIS_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_public_metadata() -> dict[str, dict]:
    code = r"""
import { debates } from './src/data/debates.js';
import { avatarsForSpeakerText } from './src/data/interlocutors.js';
const rows = debates.map((debate) => {
  const pro = avatarsForSpeakerText(debate.sides.pro.speaker);
  const con = avatarsForSpeakerText(debate.sides.con.speaker);
  return {
    number: Number(debate.number),
    id: debate.id,
    title: debate.title,
    label: debate.label,
    motion: debate.motion,
    proSpeakerText: debate.sides.pro.speaker,
    conSpeakerText: debate.sides.con.speaker,
    proSpeaker: pro.length === 1 ? pro[0].name : '',
    conSpeaker: con.length === 1 ? con[0].name : ''
  };
});
process.stdout.write(JSON.stringify(rows));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {row["id"]: row for row in json.loads(completed.stdout)}


def load_theist_classification() -> dict[str, dict]:
    with THEIST_DECOMPOSITION_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 169
    return {row["debate_id"]: row for row in rows}


def exact_two_sided_sign_p(positive: int, negative: int) -> float:
    trials = positive + negative
    if trials == 0:
        return 1.0
    observed = min(positive, negative)
    one_tail = sum(math.comb(trials, k) for k in range(observed + 1)) / (2**trials)
    return min(1.0, 2 * one_tail)


def bootstrap_mean_ci(values: list[float], seed_offset: int = 0) -> tuple[float, float]:
    array = np.asarray(values, dtype=float)
    rng = np.random.default_rng(SEED + seed_offset)
    draws = rng.choice(array, size=(BOOTSTRAP_DRAWS, len(array)), replace=True).mean(axis=1)
    return percentile(draws, 0.025), percentile(draws, 0.975)


def debate_estimate(label: str, rows: list[dict], seed_offset: int) -> dict:
    gaps = [row["con_minus_pro"] for row in rows]
    lower, upper = bootstrap_mean_ci(gaps, seed_offset)
    positive = sum(value > 0 for value in gaps)
    negative = sum(value < 0 for value in gaps)
    ties = sum(value == 0 for value in gaps)
    sd = statistics.stdev(gaps)
    return {
        "label": label,
        "unit": "debate",
        "debates": len(rows),
        "mean_con_minus_pro": mean(gaps),
        "median_con_minus_pro": median(gaps),
        "ci_95": [lower, upper],
        "standardized_paired_difference": mean(gaps) / sd,
        "con_higher": positive,
        "pro_higher": negative,
        "ties": ties,
        "con_higher_share_non_ties": positive / (positive + negative),
        "two_sided_sign_p": exact_two_sided_sign_p(positive, negative),
    }


def speaker_bridge_estimate(
    label: str, rows: list[dict], value_key: str, seed_offset: int
) -> dict:
    differences = [row[f"con_{value_key}"] - row[f"pro_{value_key}"] for row in rows]
    lower, upper = bootstrap_mean_ci(differences, seed_offset)
    positive = sum(value > 0 for value in differences)
    negative = sum(value < 0 for value in differences)
    ties = sum(value == 0 for value in differences)
    return {
        "label": label,
        "unit": "crossover speaker",
        "speakers": len(rows),
        "appearances": sum(row["appearances"] for row in rows),
        "mean_con_minus_pro": mean(differences),
        "median_con_minus_pro": median(differences),
        "ci_95": [lower, upper],
        "con_higher": positive,
        "pro_higher": negative,
        "ties": ties,
        "two_sided_sign_p": exact_two_sided_sign_p(positive, negative),
    }


def weighted_within_speaker_effect(rows: list[dict], value_key: str) -> float:
    numerator = 0.0
    denominator = 0.0
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["speaker"]].append(row)
    for appearances in grouped.values():
        if len({row["side"] for row in appearances}) < 2:
            continue
        speaker_score_mean = mean([row[value_key] for row in appearances])
        speaker_con_share = mean([1.0 if row["side"] == "con" else 0.0 for row in appearances])
        for row in appearances:
            centered_side = (1.0 if row["side"] == "con" else 0.0) - speaker_con_share
            centered_score = row[value_key] - speaker_score_mean
            numerator += centered_side * centered_score
            denominator += centered_side**2
    return numerator / denominator


def bootstrap_weighted_within_speaker(
    appearances: list[dict], value_key: str, seed_offset: int
) -> tuple[float, float]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in appearances:
        grouped[row["speaker"]].append(row)
    crossover = {
        speaker: rows
        for speaker, rows in grouped.items()
        if len({row["side"] for row in rows}) == 2
    }
    speakers = sorted(crossover)
    rng = np.random.default_rng(SEED + seed_offset)
    draws = []
    for _ in range(BOOTSTRAP_DRAWS):
        sampled = rng.choice(speakers, size=len(speakers), replace=True)
        pseudo_rows = []
        for index, speaker in enumerate(sampled):
            for row in crossover[str(speaker)]:
                copied = dict(row)
                copied["speaker"] = f"{speaker}::{index}"
                pseudo_rows.append(copied)
        draws.append(weighted_within_speaker_effect(pseudo_rows, value_key))
    array = np.asarray(draws, dtype=float)
    return percentile(array, 0.025), percentile(array, 0.975)


def reweighted_classified_estimate(
    theist_pro_rows: list[dict], theist_con_rows: list[dict]
) -> dict:
    pro_gaps = np.asarray([row["con_minus_pro"] for row in theist_pro_rows], dtype=float)
    con_gaps = np.asarray([row["con_minus_pro"] for row in theist_con_rows], dtype=float)
    rng = np.random.default_rng(SEED + 50)
    pro_draws = rng.choice(
        pro_gaps, size=(BOOTSTRAP_DRAWS, len(pro_gaps)), replace=True
    ).mean(axis=1)
    con_draws = rng.choice(
        con_gaps, size=(BOOTSTRAP_DRAWS, len(con_gaps)), replace=True
    ).mean(axis=1)
    equal_weight_draws = (pro_draws + con_draws) / 2
    return {
        "label": "Classified set, theist orientation reweighted 50/50",
        "unit": "reweighted debate strata",
        "debates": len(theist_pro_rows) + len(theist_con_rows),
        "mean_con_minus_pro": (mean(pro_gaps.tolist()) + mean(con_gaps.tolist())) / 2,
        "ci_95": [percentile(equal_weight_draws, 0.025), percentile(equal_weight_draws, 0.975)],
        "note": "Descriptive standardization, not a causal counterfactual.",
    }


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        raise ValueError(f"Cannot write empty CSV: {path}")
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=list(rows[0].keys()), lineterminator="\n"
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    scale = load_scale_module()
    metadata = load_public_metadata()
    classification = load_theist_classification()
    paths = sorted((REPO_ROOT / "docs/assessment-ledgers").glob("*.json"))
    adapters = [scale.normalize_adapter(path) for path in paths]
    assert len(adapters) == 213
    assert all(
        len(adapter["side_speakers"]["pro"]) == 1
        and len(adapter["side_speakers"]["con"]) == 1
        for adapter in adapters
    )
    assert Counter(adapter["cohort"] for adapter in adapters) == Counter(
        {"closed": 179, "standalone": 34}
    )

    debate_rows = []
    appearance_rows = []
    for adapter in adapters:
        public = metadata[adapter["debate_id"]]
        classified = adapter["debate_id"] in classification
        class_row = classification.get(adapter["debate_id"], {})
        debate_row = {
            "number": adapter["number"],
            "debate_id": adapter["debate_id"],
            "title": public["title"],
            "label": public["label"],
            "motion": public["motion"],
            "cohort": adapter["cohort"],
            "pro_speaker": public["proSpeaker"],
            "con_speaker": public["conSpeaker"],
            "pro_score": adapter["side_scores"]["pro"],
            "con_score": adapter["side_scores"]["con"],
            "con_minus_pro": adapter["side_scores"]["con"] - adapter["side_scores"]["pro"],
            "higher_side": (
                "con"
                if adapter["side_scores"]["con"] > adapter["side_scores"]["pro"]
                else "pro"
                if adapter["side_scores"]["pro"] > adapter["side_scores"]["con"]
                else "tie"
            ),
            "in_169_theist_non_theist_set": classified,
            "theist_side": class_row.get("theist_side", ""),
        }
        debate_rows.append(debate_row)
        for side in ("pro", "con"):
            appearance_rows.append(
                {
                    "debate_id": adapter["debate_id"],
                    "number": adapter["number"],
                    "cohort": adapter["cohort"],
                    "side": side,
                    "speaker": public[f"{side}Speaker"],
                    "score": adapter["side_scores"][side],
                }
            )

    cohort_means = {
        cohort: mean([row["score"] for row in appearance_rows if row["cohort"] == cohort])
        for cohort in ("closed", "standalone")
    }
    overall_appearance_mean = mean([row["score"] for row in appearance_rows])
    for row in appearance_rows:
        row["generation_adjusted_score"] = (
            row["score"] - cohort_means[row["cohort"]] + overall_appearance_mean
        )

    classified_rows = [
        row for row in debate_rows if row["in_169_theist_non_theist_set"]
    ]
    outside_rows = [
        row for row in debate_rows if not row["in_169_theist_non_theist_set"]
    ]
    theist_pro_rows = [row for row in classified_rows if row["theist_side"] == "pro"]
    theist_con_rows = [row for row in classified_rows if row["theist_side"] == "con"]
    assert len(classified_rows) == 169
    assert len(outside_rows) == 44
    assert len(theist_pro_rows) == 149
    assert len(theist_con_rows) == 20

    estimates = [
        debate_estimate("All comparable debates", debate_rows, 1),
        debate_estimate(
            "Earlier closed-findings generation",
            [row for row in debate_rows if row["cohort"] == "closed"],
            2,
        ),
        debate_estimate(
            "Later standalone generation",
            [row for row in debate_rows if row["cohort"] == "standalone"],
            3,
        ),
        debate_estimate("Previously classified theist/non-theist set", classified_rows, 4),
        debate_estimate("Theist position is PRO", theist_pro_rows, 5),
        debate_estimate("Theist position is CON", theist_con_rows, 6),
        debate_estimate("Outside the 169 classified debates", outside_rows, 7),
    ]
    reweighted = reweighted_classified_estimate(theist_pro_rows, theist_con_rows)

    grouped_appearances: dict[str, list[dict]] = defaultdict(list)
    for row in appearance_rows:
        grouped_appearances[row["speaker"]].append(row)
    speaker_bridge_rows = []
    for speaker, rows in grouped_appearances.items():
        pro = [row for row in rows if row["side"] == "pro"]
        con = [row for row in rows if row["side"] == "con"]
        if not pro or not con:
            continue
        speaker_bridge_rows.append(
            {
                "speaker": speaker,
                "appearances": len(rows),
                "pro_appearances": len(pro),
                "con_appearances": len(con),
                "pro_score": mean([row["score"] for row in pro]),
                "con_score": mean([row["score"] for row in con]),
                "con_minus_pro": mean([row["score"] for row in con])
                - mean([row["score"] for row in pro]),
                "pro_generation_adjusted_score": mean(
                    [row["generation_adjusted_score"] for row in pro]
                ),
                "con_generation_adjusted_score": mean(
                    [row["generation_adjusted_score"] for row in con]
                ),
                "generation_adjusted_con_minus_pro": mean(
                    [row["generation_adjusted_score"] for row in con]
                )
                - mean([row["generation_adjusted_score"] for row in pro]),
            }
        )
    speaker_bridge_rows.sort(key=lambda row: (-row["con_minus_pro"], row["speaker"]))
    assert len(speaker_bridge_rows) >= 20
    crossover_raw = speaker_bridge_estimate(
        "Crossover speakers, equal speaker weight", speaker_bridge_rows, "score", 10
    )
    crossover_adjusted = speaker_bridge_estimate(
        "Crossover speakers, generation-adjusted", speaker_bridge_rows, "generation_adjusted_score", 11
    )
    within_raw = weighted_within_speaker_effect(appearance_rows, "score")
    within_raw_ci = bootstrap_weighted_within_speaker(appearance_rows, "score", 12)
    within_adjusted = weighted_within_speaker_effect(
        appearance_rows, "generation_adjusted_score"
    )
    within_adjusted_ci = bootstrap_weighted_within_speaker(
        appearance_rows, "generation_adjusted_score", 13
    )
    within_speaker = {
        "raw_weighted_fixed_effect": {
            "mean_con_minus_pro": within_raw,
            "ci_95": list(within_raw_ci),
        },
        "generation_adjusted_weighted_fixed_effect": {
            "mean_con_minus_pro": within_adjusted,
            "ci_95": list(within_adjusted_ci),
        },
    }

    dimension_rows = []
    for dimension, label in scale.DIMENSIONS:
        pro_values = [
            move["dimensions"][dimension]
            for adapter in adapters
            for move in adapter["moves"]
            if move["side"] == "pro"
        ]
        con_values = [
            move["dimensions"][dimension]
            for adapter in adapters
            for move in adapter["moves"]
            if move["side"] == "con"
        ]
        paired_debate_gaps = []
        outside_paired_gaps = []
        for adapter in adapters:
            pro = [
                move["dimensions"][dimension]
                for move in adapter["moves"]
                if move["side"] == "pro"
            ]
            con = [
                move["dimensions"][dimension]
                for move in adapter["moves"]
                if move["side"] == "con"
            ]
            gap = mean(con) - mean(pro)
            paired_debate_gaps.append(gap)
            if adapter["debate_id"] not in classification:
                outside_paired_gaps.append(gap)
        lower, upper = bootstrap_mean_ci(paired_debate_gaps, 20 + len(dimension_rows))
        outside_lower, outside_upper = bootstrap_mean_ci(
            outside_paired_gaps, 30 + len(dimension_rows)
        )
        dimension_rows.append(
            {
                "dimension": dimension,
                "label": label,
                "pro_move_mean": mean(pro_values),
                "con_move_mean": mean(con_values),
                "pooled_move_con_minus_pro": mean(con_values) - mean(pro_values),
                "mean_paired_debate_con_minus_pro": mean(paired_debate_gaps),
                "paired_debate_ci_lower": lower,
                "paired_debate_ci_upper": upper,
                "outside_set_mean_paired_gap": mean(outside_paired_gaps),
                "outside_set_ci_lower": outside_lower,
                "outside_set_ci_upper": outside_upper,
            }
        )

    role_counts = {
        "unique_speakers": len(grouped_appearances),
        "pro_only": sum(
            {row["side"] for row in rows} == {"pro"}
            for rows in grouped_appearances.values()
        ),
        "con_only": sum(
            {row["side"] for row in rows} == {"con"}
            for rows in grouped_appearances.values()
        ),
        "crossover": len(speaker_bridge_rows),
        "crossover_appearances": sum(row["appearances"] for row in speaker_bridge_rows),
    }

    counterexamples = []
    for direction, selected in (
        (
            "largest PRO advantages outside the classified set",
            sorted(outside_rows, key=lambda row: row["con_minus_pro"])[:8],
        ),
        (
            "largest CON advantages outside the classified set",
            sorted(outside_rows, key=lambda row: row["con_minus_pro"], reverse=True)[:8],
        ),
    ):
        for row in selected:
            counterexamples.append(
                {
                    "direction": direction,
                    "number": row["number"],
                    "debate_id": row["debate_id"],
                    "title": row["title"],
                    "pro_speaker": row["pro_speaker"],
                    "con_speaker": row["con_speaker"],
                    "pro_score": row["pro_score"],
                    "con_score": row["con_score"],
                    "con_minus_pro": row["con_minus_pro"],
                }
            )

    raw = estimates[0]
    outside = estimates[6]
    reversal = estimates[5]
    results = {
        "snapshot": {
            "report_date": "2026-09-01",
            "comparable_debates": len(debate_rows),
            "speaker_appearances": len(appearance_rows),
            "unique_speakers": len(grouped_appearances),
            "locked_moves": sum(len(adapter["moves"]) for adapter in adapters),
            "cohort_counts": dict(Counter(row["cohort"] for row in debate_rows)),
            "classified_theist_non_theist_debates": len(classified_rows),
            "outside_classified_set": len(outside_rows),
        },
        "raw_pattern": raw,
        "estimates": estimates,
        "theist_orientation": {
            "theist_is_pro": len(theist_pro_rows),
            "theist_is_con": len(theist_con_rows),
            "theist_pro_share": len(theist_pro_rows) / len(classified_rows),
            "reweighted_50_50": reweighted,
        },
        "speaker_role_bridge": {
            "role_counts": role_counts,
            "equal_speaker_weight_raw": crossover_raw,
            "equal_speaker_weight_generation_adjusted": crossover_adjusted,
            "weighted_fixed_effects": within_speaker,
        },
        "dimension_gaps": dimension_rows,
        "interpretation": {
            "headline": "CON has a large raw score advantage, but the advantage follows proposition and speaker composition more closely than formal debate role.",
            "raw_result": f"CON averages {raw['mean_con_minus_pro']:.2f} points above PRO and is higher in {raw['con_higher']} of {len(debate_rows)} debates.",
            "position_reversal": f"When the previously classified theist position is itself CON, CON averages {abs(reversal['mean_con_minus_pro']):.2f} points below PRO.",
            "outside_result": f"Outside the 169 classified theist/non-theist debates, the CON edge is {outside['mean_con_minus_pro']:.2f} points and its 95% interval includes zero.",
            "speaker_result": f"For {len(speaker_bridge_rows)} speakers observed on both sides, the equal-speaker CON-minus-PRO difference is {crossover_raw['mean_con_minus_pro']:.2f} points and its 95% interval includes zero.",
            "conclusion": "The data support a corpus-composition effect and do not establish an inherent CON-role advantage or a scoring rule that favors opposition.",
        },
        "limitations": [
            "Sides were not randomized, and motions were not rewritten and rescored with their polarity reversed.",
            f"The 169-debate theist/non-theist classification is a previously defined substantive subset, not a complete taxonomy of every proposition type in the remaining {len(outside_rows)} debates.",
            f"Only {len(speaker_bridge_rows)} speakers appear on both PRO and CON, and many have highly unbalanced role counts.",
            "Dimension values come from two assessment generations whose absolute scales differ; paired debate comparisons remain safer than pooled move means.",
            "The analysis concerns Slugfester's assessment scores, not audience votes, truth, persuasion, or formal debate tournaments generally.",
        ],
    }

    write_csv(ANALYSIS_DIR / "debate-role-results.csv", debate_rows)
    write_csv(ANALYSIS_DIR / "speaker-role-bridge.csv", speaker_bridge_rows)
    write_csv(ANALYSIS_DIR / "dimension-role-gaps.csv", dimension_rows)
    write_csv(ANALYSIS_DIR / "counterexamples.csv", counterexamples)
    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2)
        handle.write("\n")

    notes = f"""# Source and methods notes

## Reporting job

- Question: Does the raw CON-side score advantage in Slugfester represent an inherent advantage of opposing a motion?
- Audience: Technical readers and methodologically interested site readers.
- Decision supported: Whether PRO/CON labels should be interpreted as a scoring bias or formal-role effect, and what follow-up design could identify such an effect.
- Snapshot: September 1, 2026.
- Primary cohort: {len(debate_rows)} one-on-one assessments with locked ledgers, {len(appearance_rows)} speaker appearances, and {results['snapshot']['locked_moves']:,} scored moves.
- Comparison basis: Within-debate CON minus PRO score, where positive values favor CON.

## Sources

1. `src/data/debates.js` for public titles, motions, labels, sides, and scores.
2. `docs/assessment-ledgers/*.json` for the {len(debate_rows)} locked one-on-one assessment ledgers.
3. `docs/analysis/assessment-generation-comparability-2026-09-01/analysis.py` for the locked-ledger normalization adapter and six-dimension definitions.
4. `docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv` for the previously established 169-debate theist/non-theist subset and theist-side orientation. This classification predates the present role test.

## Metric definitions

- Raw CON advantage: mean of `(CON overall score - PRO overall score)` across debates.
- Direction count: number of debates with CON higher, PRO higher, or tied.
- Crossover speaker estimate: for each speaker observed on both sides, mean CON score minus mean PRO score; the primary bridge weights each speaker equally.
- Weighted speaker fixed effect: within-speaker regression coefficient for CON after removing each speaker's average score. Only crossover speakers identify the coefficient.
- Generation-adjusted score: an appearance score centered to remove the mean difference between the earlier closed-findings and later standalone generations. This is a sensitivity check, not a full calibration model.
- Dimension gap: mean within-debate difference between CON and PRO move-level dimension averages.
- Confidence intervals: 20,000 nonparametric bootstrap draws at the stated unit. Debate estimates resample debates; equal-speaker bridge estimates resample crossover speakers.
- Sign test: exact two-sided binomial test among non-tied units. It is descriptive evidence against a 50/50 direction split, not evidence of a causal role effect.

## Report structure mapping

1. Title and answer-first subtitle.
2. Technical summary.
3. Key findings with visual evidence: raw gap, outcome directions, assessment generations, proposition alignment, speaker bridge, dimension profile, sensitivity estimates, and counterexamples.
4. Scope, data, and metric definitions.
5. Methodology and identification logic.
6. Limitations, uncertainty, and robustness checks.
7. Recommended next steps.
8. Further questions and strong conclusion.

## Chart map

| Report segment | Analytical question | Family / form | Fields | Supported claim | Palette policy |
|---|---|---|---|---|---|
| Raw result | How large is the published side gap? | Comparison / paired bars | PRO mean, CON mean | CON is {raw['mean_con_minus_pro']:.2f} points higher in the raw corpus | Hard two-root cap |
| Direction count | How often does each side score higher? | Composition / 100% stacked bar | CON higher, PRO higher, ties | CON is higher in {raw['con_higher']} of {len(debate_rows)} debates | Hard two-root cap |
| Generation check | Does the gap exist in both assessment generations? | Uncertainty / dot and interval | Cohort estimates and 95% intervals | The raw gap persists in both generations | Single-root preferred |
| Position alignment | Does the effect follow formal role or substantive position? | Uncertainty / diverging dot and interval | Theist-PRO, theist-CON, outside-set estimates | The nominal CON effect reverses when theist claims move to CON | Hard two-root cap |
| Corpus composition | How asymmetrically is the theist position assigned? | Composition / stacked bar | 149 PRO, 20 CON | 88.2% of classified theist sides occupy PRO | Hard two-root cap |
| Crossover speakers | What happens within stable speaker identity? | Uncertainty / ordered dot plot | {len(speaker_bridge_rows)} speaker role differences | The equal-speaker gap shrinks to {crossover_raw['mean_con_minus_pro']:.2f} | Single-root preferred |
| Dimension profile | Where does the raw side gap appear in the rubric? | Comparison / horizontal interval bars | Six paired dimension gaps | Raw CON differences are broad, not a single rubric switch | Single-root preferred |
| Identification ladder | How estimates change under controls | Uncertainty / forest plot | Raw, subset, reweighting, speaker estimates | Stronger controls sharply reduce the role estimate | Hard two-root cap |
| Counterexamples | Are substantial PRO wins present outside the main confound? | Comparison / diverging bars | Largest outside-set margins | Formal role is not destiny | Hard two-root cap |

## Visual QA contract

- Static ReportLab PDF is the single delivery surface requested for this paper series.
- Every figure has a neutral descriptive title, sample or unit context, a source note, and adjacent explanatory prose.
- Absolute-score bars start at zero; diverging gaps use a visible zero line.
- Blue denotes CON-favoring estimates, rust denotes PRO-favoring estimates, and gold is reserved for composition or uncertainty emphasis. Labels and signs carry meaning without relying on color alone.
- Figures are full-width when labels or intervals require space. All figures are inspected after final PDF rendering.

## Main interpretation

The raw CON-side advantage is an accurate description of this corpus. It is not, by itself, an estimate of what formal role would do if the same speaker and proposition were randomly assigned to PRO or CON. The role-only explanation loses force because the sign reverses when the theist position occupies CON, the estimate becomes small and uncertain outside the prior 169-debate classification, and the within-speaker bridge is also small and uncertain. The best-supported current interpretation is compositional: motions and speakers are not symmetrically assigned to nominal sides.

## Decisive follow-up

Pre-register a blinded polarity-reversal experiment. Select balanced motions from several topics, create logically equivalent affirmative and negative phrasings, randomize speaker or transcript versions to PRO and CON labels, score both versions under one locked model/rubric generation, and test whether a residual side coefficient remains after proposition and speaker identity are held constant. A persistent CON coefficient in that design would support an inherent role or scoring-label effect; a near-zero coefficient would support the present compositional account.
"""
    (ANALYSIS_DIR / "source-notes.md").write_text(notes, encoding="utf-8")

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
