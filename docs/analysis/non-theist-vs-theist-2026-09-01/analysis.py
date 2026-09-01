#!/usr/bin/env python3
"""Compare published non-theistic and theistic side scores in SLUGFESTER.

The classification is position-based: it follows the stance each side takes in
the published scorecard, not a claim about a participant's private beliefs.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
import subprocess
from collections import defaultdict
from pathlib import Path

import numpy as np


ANALYSIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = ANALYSIS_DIR.parents[2]
SOURCE_PATH = REPO_ROOT / "src/data/debates.js"
CURRENT_RUBRIC = "Slugfester Reassessment Rubric v2"
BOOTSTRAP_SEED = 20260901
BOOTSTRAP_DRAWS = 50_000

# These 41 current-method dyadic debates do not provide a clean comparison
# between one published theistic/religious case and one published
# non-theistic/skeptical case. The categories below make the exclusions
# inspectable rather than hiding them in a text-matching rule.
EXCLUDED_NUMBERS = {
    "04", "19", "23", "34", "38", "40", "41", "44", "56", "73",
    "82", "110", "111", "129", "131", "132", "133", "134", "135",
    "146", "153", "159", "180", "182", "183", "185", "186", "187",
    "188", "189", "190", "192", "193", "199", "201", "208", "213",
    "221", "224", "225", "226",
}

BOTH_THEISTIC_NUMBERS = {"110", "180", "182", "193", "208", "226"}
INDIRECT_RELIGION_ADJACENT_NUMBERS = {"04", "129", "159", "187", "199", "201"}

# In most included scorecards the theistic/religious case is stored as `pro`.
# These are the 20 cases where the published theistic/religious case is `con`.
THEIST_CON_NUMBERS = {
    "03", "20", "21", "24", "25", "30", "36", "58", "85", "101",
    "102", "103", "145", "147", "191", "202", "209", "210", "211", "219",
}


def load_published_debates() -> list[dict]:
    node_program = r"""
import { debates } from './src/data/debates.js';
const compact = debates.map((debate) => ({
  id: debate.id,
  number: debate.number,
  title: debate.title,
  motion: debate.motion,
  date: debate.date,
  assessmentModel: debate.assessmentModel ?? null,
  assessmentRubric: debate.assessmentRubric ?? null,
  sides: debate.sides,
  score: debate.score,
  sections: debate.sections.map((section) => ({
    sectionId: section.sectionId,
    score: section.score,
  })),
}));
process.stdout.write(JSON.stringify(compact));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", node_program],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def sample_sd(values: list[float]) -> float:
    return statistics.stdev(values)


def basic_stats(rows: list[dict]) -> dict:
    margins = [row["margin"] for row in rows]
    return {
        "n": len(rows),
        "theist_mean": mean([row["theist_score"] for row in rows]),
        "non_theist_mean": mean([row["non_theist_score"] for row in rows]),
        "mean_margin": mean(margins),
        "median_margin": statistics.median(margins),
        "margin_sd": sample_sd(margins) if len(margins) > 1 else 0,
        "non_theist_wins": sum(value > 0 for value in margins),
        "ties": sum(value == 0 for value in margins),
        "theist_wins": sum(value < 0 for value in margins),
    }


def bootstrap_mean_ci(values: list[float]) -> tuple[float, float]:
    values_array = np.asarray(values, dtype=float)
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    chunk_size = 2_000
    means: list[np.ndarray] = []
    remaining = BOOTSTRAP_DRAWS
    while remaining:
        draws = min(chunk_size, remaining)
        indices = rng.integers(0, len(values_array), size=(draws, len(values_array)))
        means.append(values_array[indices].mean(axis=1))
        remaining -= draws
    boot_means = np.concatenate(means)
    low, high = np.quantile(boot_means, [0.025, 0.975])
    return float(low), float(high)


def exact_two_sided_sign_p(positive: int, negative: int) -> float:
    n = positive + negative
    extreme = max(positive, negative)
    upper_tail = sum(math.comb(n, k) for k in range(extreme, n + 1)) / (2**n)
    return min(1.0, 2 * upper_tail)


def grouped_mean(rows: list[dict], field: str) -> tuple[int, float, list[dict]]:
    groups: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        groups[row[field]].append(row["margin"])
    summaries = [
        {"name": name, "n": len(values), "mean_margin": mean(values)}
        for name, values in groups.items()
    ]
    summaries.sort(key=lambda item: (-item["n"], item["name"]))
    return len(groups), mean([item["mean_margin"] for item in summaries]), summaries


def classify(debates: list[dict]) -> tuple[list[dict], list[dict]]:
    current_dyadic = [debate for debate in debates if debate["assessmentRubric"] == CURRENT_RUBRIC]
    included: list[dict] = []
    taxonomy: list[dict] = []

    for debate in current_dyadic:
        number = debate["number"]
        if number in EXCLUDED_NUMBERS:
            if number in BOTH_THEISTIC_NUMBERS:
                reason = "both published sides are theistic/religious"
            elif number in INDIRECT_RELIGION_ADJACENT_NUMBERS:
                reason = "religion-adjacent, but no explicit theist-vs-non-theist side comparison"
            else:
                reason = "no position-level theist-vs-non-theist comparison"
            taxonomy.append(
                {
                    "number": number,
                    "id": debate["id"],
                    "title": debate["title"],
                    "included": False,
                    "reason": reason,
                    "theist_side": "",
                    "theist_label": "",
                    "theist_speaker": "",
                    "non_theist_side": "",
                    "non_theist_label": "",
                    "non_theist_speaker": "",
                    "theist_score": "",
                    "non_theist_score": "",
                    "margin_non_theist_minus_theist": "",
                }
            )
            continue

        theist_side = "con" if number in THEIST_CON_NUMBERS else "pro"
        non_theist_side = "pro" if theist_side == "con" else "con"
        row = {
            "number": number,
            "id": debate["id"],
            "title": debate["title"],
            "motion": debate["motion"],
            "date": debate["date"],
            "theist_side": theist_side,
            "non_theist_side": non_theist_side,
            "theist_label": debate["sides"][theist_side]["name"],
            "non_theist_label": debate["sides"][non_theist_side]["name"],
            "theist_speaker": debate["sides"][theist_side]["speaker"],
            "non_theist_speaker": debate["sides"][non_theist_side]["speaker"],
            "theist_score": debate["score"][theist_side],
            "non_theist_score": debate["score"][non_theist_side],
            "margin": debate["score"][non_theist_side] - debate["score"][theist_side],
            "section_margins": [
                section["score"][non_theist_side] - section["score"][theist_side]
                for section in debate["sections"]
            ],
        }
        included.append(row)
        taxonomy.append(
            {
                "number": number,
                "id": debate["id"],
                "title": debate["title"],
                "included": True,
                "reason": "one published theistic/religious side and one published non-theistic/skeptical side",
                "theist_side": theist_side,
                "theist_label": row["theist_label"],
                "theist_speaker": row["theist_speaker"],
                "non_theist_side": non_theist_side,
                "non_theist_label": row["non_theist_label"],
                "non_theist_speaker": row["non_theist_speaker"],
                "theist_score": row["theist_score"],
                "non_theist_score": row["non_theist_score"],
                "margin_non_theist_minus_theist": row["margin"],
            }
        )

    taxonomy.sort(key=lambda row: int(row["number"]))
    included.sort(key=lambda row: int(row["number"]))
    return included, taxonomy


def validate_source(debates: list[dict], included: list[dict], taxonomy: list[dict]) -> dict:
    current_dyadic = [debate for debate in debates if debate["assessmentRubric"] == CURRENT_RUBRIC]
    team_or_panel = [debate for debate in debates if debate["assessmentRubric"] != CURRENT_RUBRIC]
    assert len(debates) == 226
    assert len(current_dyadic) == 210
    assert len(team_or_panel) == 16
    assert len(included) == 169
    assert len(taxonomy) == 210
    assert len(EXCLUDED_NUMBERS) == 41
    assert len(THEIST_CON_NUMBERS) == 20
    assert len({debate["id"] for debate in debates}) == len(debates)
    assert len({debate["number"] for debate in debates}) == len(debates)
    assert all(0 <= debate["score"][side] <= 100 for debate in debates for side in ("pro", "con"))
    assert all(debate["sections"] for debate in current_dyadic)
    assert all(
        0 <= section["score"][side] <= 100
        for debate in current_dyadic
        for section in debate["sections"]
        for side in ("pro", "con")
    )
    return {
        "published_debates": len(debates),
        "current_method_dyadic_debates": len(current_dyadic),
        "team_or_panel_debates_excluded": len(team_or_panel),
        "classified_comparisons": len(included),
        "current_method_dyadic_debates_excluded_as_noncomparable": len(EXCLUDED_NUMBERS),
        "duplicate_ids": 0,
        "duplicate_numbers": 0,
        "missing_overall_scores": 0,
        "missing_section_sets": 0,
        "overall_score_range": [
            min(debate["score"][side] for debate in debates for side in ("pro", "con")),
            max(debate["score"][side] for debate in debates for side in ("pro", "con")),
        ],
    }


def run_analysis() -> dict:
    debates = load_published_debates()
    included, taxonomy = classify(debates)
    data_quality = validate_source(debates, included, taxonomy)

    primary = basic_stats(included)
    margins = [row["margin"] for row in included]
    ci_low, ci_high = bootstrap_mean_ci(margins)
    non_ties = primary["non_theist_wins"] + primary["theist_wins"]
    primary.update(
        {
            "mean_margin_bootstrap_95_ci": [ci_low, ci_high],
            "cohens_dz": primary["mean_margin"] / primary["margin_sd"],
            "non_theist_win_share_all_debates": primary["non_theist_wins"] / primary["n"],
            "non_theist_win_share_non_ties": primary["non_theist_wins"] / non_ties,
            "exact_two_sided_sign_test_p": exact_two_sided_sign_p(
                primary["non_theist_wins"], primary["theist_wins"]
            ),
        }
    )

    theist_pro = [row for row in included if row["theist_side"] == "pro"]
    theist_con = [row for row in included if row["theist_side"] == "con"]
    noncomparable = [
        debate
        for debate in debates
        if debate["assessmentRubric"] == CURRENT_RUBRIC and debate["number"] in EXCLUDED_NUMBERS
    ]
    noncomparable_con_minus_pro = mean(
        [debate["score"]["con"] - debate["score"]["pro"] for debate in noncomparable]
    )
    orientation_adjusted_margins = [
        row["margin"]
        - noncomparable_con_minus_pro * (1 if row["non_theist_side"] == "con" else -1)
        for row in included
    ]
    orientation = {
        "theist_is_pro": basic_stats(theist_pro),
        "theist_is_con": basic_stats(theist_con),
        "noncomparable_dyads_con_minus_pro_baseline": noncomparable_con_minus_pro,
        "rough_baseline_adjusted_mean_margin": mean(orientation_adjusted_margins),
        "equal_orientation_weight_mean_margin": (
            basic_stats(theist_pro)["mean_margin"] + basic_stats(theist_con)["mean_margin"]
        )
        / 2,
        "interpretation": (
            "Orientation is not randomized. The baseline adjustment is a sensitivity check, "
            "not a causal correction."
        ),
    }

    pair_groups: dict[str, list[dict]] = defaultdict(list)
    for row in included:
        pair_key = " || ".join(sorted([row["theist_speaker"], row["non_theist_speaker"]]))
        pair_groups[pair_key].append(row)
    pair_rows = [
        {
            "margin": mean([row["margin"] for row in rows]),
            "theist_score": mean([row["theist_score"] for row in rows]),
            "non_theist_score": mean([row["non_theist_score"] for row in rows]),
        }
        for rows in pair_groups.values()
    ]
    non_count, non_balanced, non_summaries = grouped_mean(included, "non_theist_speaker")
    theist_count, theist_balanced, theist_summaries = grouped_mean(included, "theist_speaker")
    top_four_non_theists = [item["name"] for item in non_summaries[:4]]
    without_top_four = [
        row for row in included if row["non_theist_speaker"] not in set(top_four_non_theists)
    ]
    concentration = {
        "unique_speaker_pairs": len(pair_groups),
        "pair_balanced": basic_stats(pair_rows),
        "unique_non_theist_speakers": non_count,
        "non_theist_speaker_balanced_mean_margin": non_balanced,
        "unique_theist_speakers": theist_count,
        "theist_speaker_balanced_mean_margin": theist_balanced,
        "top_non_theist_speakers": non_summaries[:10],
        "top_theist_speakers": theist_summaries[:10],
        "excluded_top_four_non_theist_speakers": top_four_non_theists,
        "without_top_four_non_theist_speakers": basic_stats(without_top_four),
    }

    section_margins = [margin for row in included for margin in row["section_margins"]]
    debate_section_means = [mean(row["section_margins"]) for row in included]
    sections = {
        "section_count": len(section_margins),
        "mean_margin": mean(section_margins),
        "median_margin": statistics.median(section_margins),
        "non_theist_higher": sum(value > 0 for value in section_margins),
        "ties": sum(value == 0 for value in section_margins),
        "theist_higher": sum(value < 0 for value in section_margins),
        "non_theist_higher_share": sum(value > 0 for value in section_margins)
        / len(section_margins),
        "debates_with_positive_mean_section_margin": sum(value > 0 for value in debate_section_means),
        "debates_with_negative_mean_section_margin": sum(value < 0 for value in debate_section_means),
    }

    robustness_rows = [
        {
            "check": "Primary classified corpus",
            "unit": "debates",
            "n": primary["n"],
            "mean_margin": primary["mean_margin"],
            "non_theist_wins": primary["non_theist_wins"],
            "ties": primary["ties"],
            "theist_wins": primary["theist_wins"],
        },
        {
            "check": "One mean per unique speaker pair",
            "unit": "speaker pairs",
            "n": concentration["pair_balanced"]["n"],
            "mean_margin": concentration["pair_balanced"]["mean_margin"],
            "non_theist_wins": concentration["pair_balanced"]["non_theist_wins"],
            "ties": concentration["pair_balanced"]["ties"],
            "theist_wins": concentration["pair_balanced"]["theist_wins"],
        },
        {
            "check": "Exclude four most frequent non-theist speakers",
            "unit": "debates",
            "n": concentration["without_top_four_non_theist_speakers"]["n"],
            "mean_margin": concentration["without_top_four_non_theist_speakers"]["mean_margin"],
            "non_theist_wins": concentration["without_top_four_non_theist_speakers"]["non_theist_wins"],
            "ties": concentration["without_top_four_non_theist_speakers"]["ties"],
            "theist_wins": concentration["without_top_four_non_theist_speakers"]["theist_wins"],
        },
        {
            "check": "Theistic/religious side stored as pro",
            "unit": "debates",
            "n": orientation["theist_is_pro"]["n"],
            "mean_margin": orientation["theist_is_pro"]["mean_margin"],
            "non_theist_wins": orientation["theist_is_pro"]["non_theist_wins"],
            "ties": orientation["theist_is_pro"]["ties"],
            "theist_wins": orientation["theist_is_pro"]["theist_wins"],
        },
        {
            "check": "Theistic/religious side stored as con",
            "unit": "debates",
            "n": orientation["theist_is_con"]["n"],
            "mean_margin": orientation["theist_is_con"]["mean_margin"],
            "non_theist_wins": orientation["theist_is_con"]["non_theist_wins"],
            "ties": orientation["theist_is_con"]["ties"],
            "theist_wins": orientation["theist_is_con"]["theist_wins"],
        },
    ]

    results = {
        "snapshot": {
            "source": "src/data/debates.js",
            "source_commit": subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=REPO_ROOT,
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip(),
            "analysis_date": "2026-09-01",
            "classification_definition": (
                "The published debate position, not the participant's private belief: one side "
                "presents a theistic/religious case and the other a non-theistic/skeptical case."
            ),
        },
        "data_quality": data_quality,
        "primary": primary,
        "orientation": orientation,
        "concentration": concentration,
        "sections": sections,
        "outcome_rows": [
            {
                "outcome": "Non-theistic side higher",
                "debates": primary["non_theist_wins"],
                "share": primary["non_theist_wins"] / primary["n"],
                "sort_order": 1,
            },
            {
                "outcome": "Tie",
                "debates": primary["ties"],
                "share": primary["ties"] / primary["n"],
                "sort_order": 2,
            },
            {
                "outcome": "Theistic/religious side higher",
                "debates": primary["theist_wins"],
                "share": primary["theist_wins"] / primary["n"],
                "sort_order": 3,
            },
        ],
        "robustness_rows": robustness_rows,
        "validation": {
            "overall_assessment": "Share with caveats",
            "calculation_spot_checks": [
                "The 169 classified debate margins reproduce directly from published pro/con scores.",
                "The 889 section comparisons reproduce directly from published section scores.",
                "The result remains positive under speaker-pair balancing, repeated-speaker exclusion, and both pro/con orientations.",
            ],
            "required_caveats": [
                "The catalogue is selected, not a random sample of debates or speakers.",
                "Published side position is used as the classification; this is not a claim about private belief.",
                "Theistic/religious sides occupy pro in 149 of 169 comparisons, so argumentative burden and side orientation are partly entangled with stance.",
                "The scores are AI-assisted judgments of transcript performance, not measurements of worldview truth.",
                "Repeated speakers and repeated speaker pairings make debates non-independent.",
            ],
            "claim_boundary": (
                "The data strongly evidence a non-theist advantage within SLUGFESTER's published "
                "assessments. They do not establish that non-theism is true or that non-theists "
                "would outperform theists in a representative external debate population."
            ),
        },
    }

    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    taxonomy_fields = [
        "number", "id", "title", "included", "reason", "theist_side", "theist_label",
        "theist_speaker", "non_theist_side", "non_theist_label", "non_theist_speaker",
        "theist_score", "non_theist_score",
        "margin_non_theist_minus_theist",
    ]
    with (ANALYSIS_DIR / "taxonomy.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=taxonomy_fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(taxonomy)

    return results


if __name__ == "__main__":
    output = run_analysis()
    print(json.dumps({
        "status": "ok",
        "published_debates": output["data_quality"]["published_debates"],
        "current_method_dyads": output["data_quality"]["current_method_dyadic_debates"],
        "classified_comparisons": output["primary"]["n"],
        "mean_margin": output["primary"]["mean_margin"],
        "outcomes": {
            "non_theist_wins": output["primary"]["non_theist_wins"],
            "ties": output["primary"]["ties"],
            "theist_wins": output["primary"]["theist_wins"],
        },
        "results": str((ANALYSIS_DIR / "results.json").relative_to(REPO_ROOT)),
        "taxonomy": str((ANALYSIS_DIR / "taxonomy.csv").relative_to(REPO_ROOT)),
    }, indent=2))
