#!/usr/bin/env python3
"""Map where the theist/non-theist score difference is largest in SLUGFESTER."""

from __future__ import annotations

import csv
import json
import random
import statistics
from collections import Counter, defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
TAXONOMY_PATH = REPO_ROOT / "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv"
DECOMPOSITION_PATH = REPO_ROOT / "docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv"
WEAKNESS_RESULTS_PATH = REPO_ROOT / "docs/analysis/theist-argument-weaknesses-2026-09-01/results.json"

SEED = 20260901
BOOTSTRAP_DRAWS = 20_000
PERMUTATION_DRAWS = 20_000

TOPICS = {
    "Religion, culture & meaning": {
        3, 6, 9, 15, 16, 21, 46, 62, 89, 101, 106, 124, 145, 171, 172, 207, 214, 216, 217, 218
    },
    "Scripture, revelation & doctrine": {
        7, 25, 39, 42, 50, 53, 63, 66, 90, 93, 102, 120, 142, 157, 176, 177, 178, 215, 220
    },
    "Mind, reason & logic": {
        5, 12, 49, 67, 68, 70, 72, 76, 80, 91, 99, 100, 104, 108, 114, 143, 147, 197
    },
    "Evil, suffering & hiddenness": {
        1, 11, 27, 48, 74, 98, 103, 113, 116, 118, 119, 122, 123, 128, 209, 210, 211
    },
    "Morality & ethics": {
        10, 13, 20, 24, 47, 54, 57, 58, 61, 97, 127, 148, 151, 155, 156, 160, 162, 164, 198, 204
    },
    "Cosmology, science & design": {
        17, 22, 33, 43, 51, 55, 59, 65, 75, 83, 85, 92, 107, 117, 121, 126, 139, 144, 168, 169, 191, 206, 223
    },
    "General theism / naturalism": {
        2, 8, 14, 26, 28, 29, 30, 36, 64, 77, 79, 81, 86, 88, 94, 109, 112, 140, 141, 152,
        161, 163, 165, 166, 167, 170, 175, 194, 195, 196, 200, 202, 203, 205, 219, 222
    },
    "Resurrection": {
        31, 37, 52, 60, 69, 78, 87, 130, 136, 137, 138, 150, 158, 179, 181, 212
    },
}

TOPIC_RATIONALES = {
    "Religion, culture & meaning": "Religion's social value, existential role, identity, practical effects, or comparative cultural standing is the central burden.",
    "Scripture, revelation & doctrine": "A scriptural claim, revelation, Christian doctrine, or the epistemic standing of faith is the central burden.",
    "Mind, reason & logic": "Consciousness, rationality, free will, logic, intelligibility, or reason's grounding is the central burden.",
    "Evil, suffering & hiddenness": "Suffering, divine hiddenness, divine goodness, or the evidential problem of evil is the central burden.",
    "Morality & ethics": "Objective moral truth, moral grounding, ethical authority, or the moral implications of a worldview is the central burden.",
    "Cosmology, science & design": "Cosmology, origins, fine-tuning, science, biological complexity, or an inference to design is the central burden.",
    "General theism / naturalism": "The motion broadly compares theism, atheism, or naturalism without one narrower topic dominating the stated burden.",
    "Resurrection": "The historicity or explanatory adequacy of Jesus' resurrection is the central burden.",
}

TOP_FOUR_NON_THEISTS = {
    "Matt Dillahunty",
    "Alex O'Connor",
    "Christopher Hitchens",
    "Graham Oppy",
}

DIMENSIONS = [
    ("logicalCoherence_contribution", "Logical coherence"),
    ("evidenceWarrant_contribution", "Evidence and warrant"),
    ("responsiveness_contribution", "Responsiveness"),
    ("relevanceBurden_contribution", "Relevance and burden"),
    ("precisionClarity_contribution", "Precision and clarity"),
    ("calibrationCharity_contribution", "Calibration and charity"),
]


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def percentile(sorted_values: list[float], probability: float) -> float:
    position = (len(sorted_values) - 1) * probability
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def bootstrap_mean_ci(values: list[float], seed_offset: int = 0) -> list[float]:
    rng = random.Random(SEED + seed_offset)
    n = len(values)
    draws = sorted(mean([values[rng.randrange(n)] for _ in range(n)]) for _ in range(BOOTSTRAP_DRAWS))
    return [percentile(draws, 0.025), percentile(draws, 0.975)]


def bootstrap_difference_ci(a: list[float], b: list[float], seed_offset: int = 0) -> list[float]:
    rng = random.Random(SEED + 1000 + seed_offset)
    na, nb = len(a), len(b)
    draws = []
    for _ in range(BOOTSTRAP_DRAWS):
        a_draw = [a[rng.randrange(na)] for _ in range(na)]
        b_draw = [b[rng.randrange(nb)] for _ in range(nb)]
        draws.append(mean(a_draw) - mean(b_draw))
    draws.sort()
    return [percentile(draws, 0.025), percentile(draws, 0.975)]


def load_rows() -> list[dict]:
    with TAXONOMY_PATH.open(encoding="utf-8", newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if row["included"] == "True"]
    assert len(rows) == 169
    lookup = {}
    for topic, numbers in TOPICS.items():
        for number in numbers:
            assert number not in lookup
            lookup[number] = topic
    assert len(lookup) == 169
    for row in rows:
        number = int(row["number"])
        row["number_int"] = number
        row["topic"] = lookup[number]
        row["margin"] = float(row["margin_non_theist_minus_theist"])
        row["theist_pro"] = row["theist_side"] == "pro"
        row["generation"] = "earlier" if number <= 195 else "later"
    assert {row["number_int"] for row in rows} == set(lookup)
    return rows


def summarize_values(values: list[float]) -> dict:
    return {
        "n": len(values),
        "mean": mean(values),
        "median": statistics.median(values),
        "sd": statistics.stdev(values) if len(values) > 1 else 0.0,
        "ci_95": bootstrap_mean_ci(values, len(values) * 17),
        "non_theist_higher": sum(value > 0 for value in values),
        "ties": sum(value == 0 for value in values),
        "theist_higher": sum(value < 0 for value in values),
    }


def summarize_topic(topic: str, rows: list[dict]) -> dict:
    selected = [row for row in rows if row["topic"] == topic]
    summary = {"topic": topic, **summarize_values([row["margin"] for row in selected])}
    variants = {
        "theist_pro_only": [row for row in selected if row["theist_pro"]],
        "exclude_top_four_non_theists": [
            row for row in selected if row["non_theist_speaker"] not in TOP_FOUR_NON_THEISTS
        ],
        "earlier_generation_only": [row for row in selected if row["generation"] == "earlier"],
        "later_generation_only": [row for row in selected if row["generation"] == "later"],
    }
    for name, subset in variants.items():
        summary[name] = {
            "n": len(subset),
            "mean": mean([row["margin"] for row in subset]) if subset else None,
        }
    summary["largest_non_theist_margin"] = max(selected, key=lambda row: row["margin"])
    summary["largest_theist_margin"] = min(selected, key=lambda row: row["margin"])
    return summary


def dimension_by_topic(rows: list[dict]) -> list[dict]:
    topic_by_number = {str(row["number_int"]): row["topic"] for row in rows}
    with DECOMPOSITION_PATH.open(encoding="utf-8", newline="") as handle:
        decomposed = list(csv.DictReader(handle))
    assert len(decomposed) == 169
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in decomposed:
        grouped[topic_by_number[str(int(row["number"]))]].append(row)
    output = []
    for topic in TOPICS:
        item = {"topic": topic, "n": len(grouped[topic])}
        for key, label in DIMENSIONS:
            item[key] = mean([float(row[key]) for row in grouped[topic]])
            item[f"{key}_label"] = label
        item["adjustment_gap"] = mean([float(row["adjustment_gap"]) for row in grouped[topic]])
        item["rounding_residual"] = mean([float(row["rounding_residual"]) for row in grouped[topic]])
        output.append(item)
    return output


def speaker_summary(rows: list[dict], side: str) -> list[dict]:
    field = f"{side}_speaker"
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row[field]].append(row)
    output = []
    for speaker, selected in grouped.items():
        output.append({
            "speaker": speaker,
            "side": side,
            "n": len(selected),
            "mean_margin": mean([row["margin"] for row in selected]),
            "topics": len({row["topic"] for row in selected}),
        })
    return sorted(output, key=lambda row: (-row["n"], -row["mean_margin"], row["speaker"]))


def permutation_topic_range(rows: list[dict], observed_range: float) -> dict:
    rng = random.Random(SEED + 5000)
    margins = [row["margin"] for row in rows]
    sizes = [len(TOPICS[topic]) for topic in TOPICS]
    exceed = 0
    ranges = []
    for _ in range(PERMUTATION_DRAWS):
        shuffled = margins[:]
        rng.shuffle(shuffled)
        start = 0
        means = []
        for size in sizes:
            means.append(mean(shuffled[start : start + size]))
            start += size
        test_range = max(means) - min(means)
        ranges.append(test_range)
        exceed += test_range >= observed_range
    ranges.sort()
    return {
        "draws": PERMUTATION_DRAWS,
        "observed_range": observed_range,
        "permutation_p": (exceed + 1) / (PERMUTATION_DRAWS + 1),
        "null_range_ci_95": [percentile(ranges, 0.025), percentile(ranges, 0.975)],
        "note": "Exploratory random-label test; the topic taxonomy was not preregistered.",
    }


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    topic_summary = [summarize_topic(topic, rows) for topic in TOPICS]
    topic_summary.sort(key=lambda row: row["mean"], reverse=True)

    overall = summarize_values([row["margin"] for row in rows])
    theist_pro_rows = [row for row in rows if row["theist_pro"]]
    theist_con_rows = [row for row in rows if not row["theist_pro"]]
    orientation = {
        "theist_pro": summarize_values([row["margin"] for row in theist_pro_rows]),
        "theist_con": summarize_values([row["margin"] for row in theist_con_rows]),
    }
    orientation["pro_minus_con"] = {
        "estimate": orientation["theist_pro"]["mean"] - orientation["theist_con"]["mean"],
        "ci_95": bootstrap_difference_ci(
            [row["margin"] for row in theist_pro_rows],
            [row["margin"] for row in theist_con_rows],
            31,
        ),
    }

    highest = topic_summary[0]
    lowest = topic_summary[-1]
    highest_values = [row["margin"] for row in rows if row["topic"] == highest["topic"]]
    lowest_values = [row["margin"] for row in rows if row["topic"] == lowest["topic"]]
    other_values = [row["margin"] for row in rows if row["topic"] != highest["topic"]]
    contrasts = {
        "highest_vs_lowest": {
            "topics": [highest["topic"], lowest["topic"]],
            "estimate": mean(highest_values) - mean(lowest_values),
            "ci_95": bootstrap_difference_ci(highest_values, lowest_values, 61),
        },
        "highest_vs_all_others": {
            "topic": highest["topic"],
            "estimate": mean(highest_values) - mean(other_values),
            "ci_95": bootstrap_difference_ci(highest_values, other_values, 79),
        },
    }
    observed_range = highest["mean"] - lowest["mean"]

    with WEAKNESS_RESULTS_PATH.open(encoding="utf-8") as handle:
        weakness_results = json.load(handle)
    move_subsets = [
        row for row in weakness_results["subset_checks"]
        if row["subset"] in {
            "All scored moves",
            "Constructive moves only",
            "Replies only",
            "Load-bearing moves only",
        }
    ]

    topic_dimensions = dimension_by_topic(rows)
    non_theist_speakers = speaker_summary(rows, "non_theist")
    theist_speakers = speaker_summary(rows, "theist")

    results = {
        "snapshot": {
            "report_date": "2026-09-01",
            "public_assessments": 228,
            "relevant_debates": 169,
            "scored_moves": 3502,
            "taxonomy": "Eight mutually exclusive primary-topic categories assigned from the published title, side labels, and motion.",
        },
        "overall": overall,
        "topic_summary": topic_summary,
        "orientation": orientation,
        "contrasts": contrasts,
        "topic_range_permutation": permutation_topic_range(rows, observed_range),
        "dimension_by_topic": topic_dimensions,
        "move_subsets": move_subsets,
        "frequent_non_theist_speakers": [row for row in non_theist_speakers if row["n"] >= 4],
        "frequent_theist_speakers": [row for row in theist_speakers if row["n"] >= 3],
        "top_four_non_theists": sorted(TOP_FOUR_NON_THEISTS),
        "interpretation": {
            "strongest_descriptive_claim": "The largest observed mean gap occurs in religion/culture/meaning debates; a wider high-gap tier also includes scripture/revelation/doctrine, mind/reason/logic, and evil/suffering/hiddenness.",
            "mechanism_supported": "The gap is largest where the theist bears an affirmative public burden and where load-bearing moves receive weaker evidence/warrant, coherence, calibration/charity, and reply scores.",
            "causal_limit": "Topic, speaker, burden orientation, debate selection, and assessment generation are observationally entangled. The analysis maps concentration; it does not identify a topic as a cause.",
        },
    }

    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    taxonomy_rows = [
        {
            "number": row["number_int"],
            "debate_id": row["id"],
            "title": row["title"],
            "topic": row["topic"],
            "classification_rationale": TOPIC_RATIONALES[row["topic"]],
            "theist_side": row["theist_side"],
            "theist_speaker": row["theist_speaker"],
            "non_theist_speaker": row["non_theist_speaker"],
            "theist_score": row["theist_score"],
            "non_theist_score": row["non_theist_score"],
            "margin": row["margin"],
            "generation": row["generation"],
        }
        for row in sorted(rows, key=lambda item: item["number_int"])
    ]
    write_csv(
        ANALYSIS_DIR / "topic-taxonomy.csv",
        taxonomy_rows,
        [
            "number", "debate_id", "title", "topic", "classification_rationale",
            "theist_side", "theist_speaker", "non_theist_speaker", "theist_score",
            "non_theist_score", "margin", "generation",
        ],
    )
    write_csv(
        ANALYSIS_DIR / "topic-summary.csv",
        [
            {
                **row,
                "ci_95_low": row["ci_95"][0],
                "ci_95_high": row["ci_95"][1],
                "theist_pro_n": row["theist_pro_only"]["n"],
                "theist_pro_mean": row["theist_pro_only"]["mean"],
                "exclude_top_four_n": row["exclude_top_four_non_theists"]["n"],
                "exclude_top_four_mean": row["exclude_top_four_non_theists"]["mean"],
                "earlier_n": row["earlier_generation_only"]["n"],
                "earlier_mean": row["earlier_generation_only"]["mean"],
                "later_n": row["later_generation_only"]["n"],
                "later_mean": row["later_generation_only"]["mean"],
            }
            for row in topic_summary
        ],
        [
            "topic", "n", "mean", "median", "sd", "ci_95_low", "ci_95_high",
            "non_theist_higher", "ties", "theist_higher", "theist_pro_n", "theist_pro_mean",
            "exclude_top_four_n", "exclude_top_four_mean", "earlier_n", "earlier_mean",
            "later_n", "later_mean",
        ],
    )
    write_csv(
        ANALYSIS_DIR / "topic-dimension-contributions.csv",
        topic_dimensions,
        ["topic", "n"] + [key for key, _ in DIMENSIONS] + ["adjustment_gap", "rounding_residual"],
    )
    write_csv(
        ANALYSIS_DIR / "move-subset-gaps.csv",
        move_subsets,
        list(move_subsets[0].keys()),
    )

    print(json.dumps({
        "overall": overall,
        "top_topics": [(row["topic"], row["n"], round(row["mean"], 3), row["ci_95"]) for row in topic_summary],
        "orientation": orientation,
        "contrasts": contrasts,
        "permutation": results["topic_range_permutation"],
    }, indent=2))


if __name__ == "__main__":
    main()
