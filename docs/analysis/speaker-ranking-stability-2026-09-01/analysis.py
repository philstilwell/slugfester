#!/usr/bin/env python3
"""Analyze whether Slugfester's speaker rankings measure stable performance."""

from __future__ import annotations

import csv
import importlib.util
import json
import math
import random
import statistics
import subprocess
from collections import Counter, defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
SCALE_ANALYSIS_PATH = (
    REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/analysis.py"
)
SEED = 20260901
BOOTSTRAP_DRAWS = 20_000


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def percentile(sorted_values: list[float], probability: float) -> float:
    position = (len(sorted_values) - 1) * probability
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def median(values: list[float]) -> float:
    return statistics.median(values)


def sample_sd(values: list[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def average_ranks(values: list[float], descending: bool = True) -> list[float]:
    """Return one-based average ranks, preserving ties."""
    order = sorted(range(len(values)), key=lambda index: values[index], reverse=descending)
    ranks = [0.0] * len(values)
    cursor = 0
    while cursor < len(order):
        end = cursor + 1
        while end < len(order) and values[order[end]] == values[order[cursor]]:
            end += 1
        average_rank = ((cursor + 1) + end) / 2
        for position in range(cursor, end):
            ranks[order[position]] = average_rank
        cursor = end
    return ranks


def pearson(a: list[float], b: list[float]) -> float:
    a_mean = mean(a)
    b_mean = mean(b)
    numerator = sum((x - a_mean) * (y - b_mean) for x, y in zip(a, b))
    denominator = math.sqrt(
        sum((x - a_mean) ** 2 for x in a) * sum((y - b_mean) ** 2 for y in b)
    )
    return numerator / denominator if denominator else 0.0


def spearman(a: list[float], b: list[float]) -> float:
    return pearson(average_ranks(a), average_ranks(b))


def load_scale_module():
    spec = importlib.util.spec_from_file_location("slugfester_scale_analysis", SCALE_ANALYSIS_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCALE_ANALYSIS_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def cohort_by_debate_number() -> dict[int, str]:
    module = load_scale_module()
    paths = sorted((REPO_ROOT / "docs/assessment-ledgers").glob("*.json"))
    adapters = [module.normalize_adapter(path) for path in paths]
    assert Counter(adapter["cohort"] for adapter in adapters) == Counter(
        {"closed": 179, "standalone": 33}
    )
    return {adapter["number"]: adapter["cohort"] for adapter in adapters}


def load_appearances() -> list[dict]:
    code = r"""
import { debates } from './src/data/debates.js';
import { avatarsForSpeakerText } from './src/data/interlocutors.js';

const rows = [];
for (const debate of debates) {
  const pro = avatarsForSpeakerText(debate.sides.pro.speaker);
  const con = avatarsForSpeakerText(debate.sides.con.speaker);
  if (debate.interlocutorRankingEligible === false || pro.length !== 1 || con.length !== 1) continue;
  rows.push({
    debate_number: Number(debate.number),
    debate_id: debate.id,
    title: debate.title,
    label: debate.label,
    motion: debate.motion,
    side: 'pro',
    speaker: pro[0].name,
    opponent: con[0].name,
    score: Number(debate.score.pro),
    opponent_score: Number(debate.score.con)
  });
  rows.push({
    debate_number: Number(debate.number),
    debate_id: debate.id,
    title: debate.title,
    label: debate.label,
    motion: debate.motion,
    side: 'con',
    speaker: con[0].name,
    opponent: pro[0].name,
    score: Number(debate.score.con),
    opponent_score: Number(debate.score.pro)
  });
}
process.stdout.write(JSON.stringify(rows));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    rows = json.loads(completed.stdout)
    cohorts = cohort_by_debate_number()
    for row in rows:
        row["cohort"] = cohorts[row["debate_number"]]
        row["margin"] = row["score"] - row["opponent_score"]
    assert len(rows) == 424
    assert len({row["debate_id"] for row in rows}) == 212
    assert Counter(row["cohort"] for row in rows) == Counter(
        {"closed": 358, "standalone": 66}
    )
    return rows


def rank_speakers(rows: list[dict], minimum: int, value_key: str = "score") -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["speaker"]].append(row)
    ranked = []
    for speaker, appearances in grouped.items():
        if len(appearances) < minimum:
            continue
        scores = [row["score"] for row in appearances]
        margins = [row["margin"] for row in appearances]
        values = [row[value_key] for row in appearances]
        ranked.append(
            {
                "speaker": speaker,
                "appearances": len(appearances),
                "mean_score": mean(scores),
                "median_score": median(scores),
                "score_sd": sample_sd(scores),
                "score_min": min(scores),
                "score_max": max(scores),
                "score_range": max(scores) - min(scores),
                "mean_opponent_score": mean([row["opponent_score"] for row in appearances]),
                "mean_margin": mean(margins),
                "closed_appearances": sum(row["cohort"] == "closed" for row in appearances),
                "standalone_appearances": sum(
                    row["cohort"] == "standalone" for row in appearances
                ),
                "ranking_value": mean(values),
            }
        )
    ranked.sort(
        key=lambda row: (-row["ranking_value"], -row["appearances"], row["speaker"])
    )
    for index, row in enumerate(ranked, start=1):
        row["rank"] = index
    return ranked


def one_way_reliability(eligible_rows: list[dict]) -> dict:
    grouped: dict[str, list[float]] = defaultdict(list)
    for row in eligible_rows:
        grouped[row["speaker"]].append(row["score"])
    groups = list(grouped.values())
    group_count = len(groups)
    observation_count = sum(len(group) for group in groups)
    grand_mean = mean([value for group in groups for value in group])
    ss_between = sum(len(group) * (mean(group) - grand_mean) ** 2 for group in groups)
    ss_within = sum(sum((value - mean(group)) ** 2 for value in group) for group in groups)
    ms_between = ss_between / (group_count - 1)
    ms_within = ss_within / (observation_count - group_count)
    k0 = (
        observation_count
        - sum(len(group) ** 2 for group in groups) / observation_count
    ) / (group_count - 1)
    between_variance = max(0.0, (ms_between - ms_within) / k0)
    within_variance = ms_within
    single_score_icc = between_variance / (between_variance + within_variance)

    def mean_reliability(sample_size: int) -> float:
        return between_variance / (between_variance + within_variance / sample_size)

    return {
        "speakers": group_count,
        "appearances": observation_count,
        "grand_mean": grand_mean,
        "effective_group_size": k0,
        "between_speaker_variance": between_variance,
        "within_speaker_variance": within_variance,
        "between_speaker_sd": math.sqrt(between_variance),
        "pooled_within_speaker_sd": math.sqrt(within_variance),
        "single_score_icc": single_score_icc,
        "mean_reliability": {
            str(sample_size): mean_reliability(sample_size)
            for sample_size in (3, 5, 10)
        },
    }


def bootstrap_rank_uncertainty(
    grouped: dict[str, list[dict]], speakers: list[str]
) -> tuple[dict[str, dict], dict]:
    rng = random.Random(SEED)
    rank_draws = {speaker: [] for speaker in speakers}
    mean_draws = {speaker: [] for speaker in speakers}
    top_ten_sets = Counter()
    for _ in range(BOOTSTRAP_DRAWS):
        draw_means = {}
        for speaker in speakers:
            scores = [row["score"] for row in grouped[speaker]]
            draw_means[speaker] = mean([scores[rng.randrange(len(scores))] for _ in scores])
            mean_draws[speaker].append(draw_means[speaker])
        ordered = sorted(speakers, key=lambda speaker: (-draw_means[speaker], speaker))
        top_ten_sets[tuple(sorted(ordered[:10]))] += 1
        for rank, speaker in enumerate(ordered, start=1):
            rank_draws[speaker].append(rank)

    summary = {}
    for speaker in speakers:
        ranks = sorted(rank_draws[speaker])
        means = sorted(mean_draws[speaker])
        summary[speaker] = {
            "bootstrap_mean_ci_95": [percentile(means, 0.025), percentile(means, 0.975)],
            "bootstrap_rank_ci_95": [percentile(ranks, 0.025), percentile(ranks, 0.975)],
            "bootstrap_rank_median": median(ranks),
            "bootstrap_top_10_probability": sum(rank <= 10 for rank in ranks) / len(ranks),
        }

    modal_top_ten, modal_count = top_ten_sets.most_common(1)[0]
    widths = [
        summary[speaker]["bootstrap_rank_ci_95"][1]
        - summary[speaker]["bootstrap_rank_ci_95"][0]
        for speaker in speakers
    ]
    return summary, {
        "draws": BOOTSTRAP_DRAWS,
        "distinct_top_ten_sets": len(top_ten_sets),
        "modal_top_ten_set_probability": modal_count / BOOTSTRAP_DRAWS,
        "median_rank_interval_width": median(widths),
        "speakers_with_rank_interval_width_at_least_10": sum(width >= 10 for width in widths),
        "modal_top_ten_set": list(modal_top_ten),
    }


def hierarchical_rank_uncertainty(
    ranking: list[dict], reliability: dict
) -> tuple[dict[str, dict], dict]:
    """Draw latent speaker means from a one-way normal random-effects model."""
    rng = random.Random(SEED + 2)
    grand_mean = reliability["grand_mean"]
    between_variance = reliability["between_speaker_variance"]
    within_variance = reliability["within_speaker_variance"]
    speakers = [row["speaker"] for row in ranking]
    posterior = {}
    for row in ranking:
        sample_size = row["appearances"]
        observation_variance = within_variance / sample_size
        weight = between_variance / (between_variance + observation_variance)
        posterior_variance = 1 / (1 / between_variance + 1 / observation_variance)
        posterior[row["speaker"]] = {
            "mean": grand_mean + weight * (row["mean_score"] - grand_mean),
            "sd": math.sqrt(posterior_variance),
        }

    rank_draws = {speaker: [] for speaker in speakers}
    top_ten_sets = Counter()
    for _ in range(BOOTSTRAP_DRAWS):
        latent = {
            speaker: rng.gauss(posterior[speaker]["mean"], posterior[speaker]["sd"])
            for speaker in speakers
        }
        ordered = sorted(speakers, key=lambda speaker: (-latent[speaker], speaker))
        top_ten_sets[tuple(sorted(ordered[:10]))] += 1
        for rank, speaker in enumerate(ordered, start=1):
            rank_draws[speaker].append(rank)

    summary = {}
    widths = []
    for speaker in speakers:
        ranks = sorted(rank_draws[speaker])
        interval = [percentile(ranks, 0.025), percentile(ranks, 0.975)]
        widths.append(interval[1] - interval[0])
        summary[speaker] = {
            "hierarchical_mean": posterior[speaker]["mean"],
            "hierarchical_mean_sd": posterior[speaker]["sd"],
            "hierarchical_rank_ci_95": interval,
            "hierarchical_rank_median": median(ranks),
            "hierarchical_top_10_probability": sum(rank <= 10 for rank in ranks) / len(ranks),
        }
    modal_top_ten, modal_count = top_ten_sets.most_common(1)[0]
    return summary, {
        "draws": BOOTSTRAP_DRAWS,
        "distinct_top_ten_sets": len(top_ten_sets),
        "modal_top_ten_set_probability": modal_count / BOOTSTRAP_DRAWS,
        "median_rank_interval_width": median(widths),
        "speakers_with_rank_interval_width_at_least_10": sum(width >= 10 for width in widths),
        "modal_top_ten_set": list(modal_top_ten),
    }


def split_half_reproducibility(grouped: dict[str, list[dict]], minimum: int = 6) -> dict:
    speakers = sorted(speaker for speaker, rows in grouped.items() if len(rows) >= minimum)
    rng = random.Random(SEED + 1)
    correlations = []
    top_five_overlaps = []
    for _ in range(BOOTSTRAP_DRAWS):
        first_means = []
        second_means = []
        for speaker in speakers:
            scores = [row["score"] for row in grouped[speaker]]
            shuffled = scores[:]
            rng.shuffle(shuffled)
            cut = len(shuffled) // 2
            first_means.append(mean(shuffled[:cut]))
            second_means.append(mean(shuffled[cut:]))
        correlations.append(spearman(first_means, second_means))
        first_order = sorted(range(len(speakers)), key=lambda index: -first_means[index])[:5]
        second_order = sorted(range(len(speakers)), key=lambda index: -second_means[index])[:5]
        top_five_overlaps.append(len(set(first_order) & set(second_order)))
    correlations.sort()
    return {
        "minimum_appearances": minimum,
        "speakers": len(speakers),
        "draws": BOOTSTRAP_DRAWS,
        "median_spearman": median(correlations),
        "mean_spearman": mean(correlations),
        "spearman_ci_95": [
            percentile(correlations, 0.025),
            percentile(correlations, 0.975),
        ],
        "mean_top_five_overlap": mean(top_five_overlaps),
        "full_top_five_match_probability": sum(value == 5 for value in top_five_overlaps)
        / BOOTSTRAP_DRAWS,
    }


def leave_one_out_sensitivity(
    grouped: dict[str, list[dict]], ranking: list[dict]
) -> dict[str, dict]:
    base_means = {row["speaker"]: row["mean_score"] for row in ranking}
    speakers = [row["speaker"] for row in ranking]
    base_ranks = {row["speaker"]: row["rank"] for row in ranking}
    output = {}
    for speaker in speakers:
        scores = [row["score"] for row in grouped[speaker]]
        ranks = []
        for omitted_index in range(len(scores)):
            changed = dict(base_means)
            remaining = scores[:omitted_index] + scores[omitted_index + 1 :]
            changed[speaker] = mean(remaining)
            ordered = sorted(speakers, key=lambda name: (-changed[name], name))
            ranks.append(ordered.index(speaker) + 1)
        output[speaker] = {
            "base_rank": base_ranks[speaker],
            "leave_one_out_min_rank": min(ranks),
            "leave_one_out_max_rank": max(ranks),
            "leave_one_out_span": max(ranks) - min(ranks),
            "leave_one_out_max_absolute_shift": max(
                abs(rank - base_ranks[speaker]) for rank in ranks
            ),
        }
    return output


def main() -> None:
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    appearances = load_appearances()
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in appearances:
        grouped[row["speaker"]].append(row)

    count_distribution = Counter(len(rows) for rows in grouped.values())
    threshold_counts = {
        str(minimum): sum(len(rows) >= minimum for rows in grouped.values())
        for minimum in (1, 3, 5, 10)
    }
    ranking = rank_speakers(appearances, minimum=3)
    eligible_names = [row["speaker"] for row in ranking]
    eligible_set = set(eligible_names)
    eligible_appearances = [row for row in appearances if row["speaker"] in eligible_set]

    cohort_means = {
        cohort: mean([row["score"] for row in appearances if row["cohort"] == cohort])
        for cohort in ("closed", "standalone")
    }
    overall_mean = mean([row["score"] for row in appearances])
    for row in appearances:
        row["generation_adjusted_score"] = (
            row["score"] - cohort_means[row["cohort"]] + overall_mean
        )

    margin_ranking = rank_speakers(appearances, minimum=3, value_key="margin")
    adjusted_ranking = rank_speakers(
        appearances, minimum=3, value_key="generation_adjusted_score"
    )
    margin_by_speaker = {row["speaker"]: row for row in margin_ranking}
    adjusted_by_speaker = {row["speaker"]: row for row in adjusted_ranking}

    reliability = one_way_reliability(eligible_appearances)
    shrinkage_rows = []
    for row in ranking:
        sample_size = row["appearances"]
        weight = reliability["between_speaker_variance"] / (
            reliability["between_speaker_variance"]
            + reliability["within_speaker_variance"] / sample_size
        )
        shrinkage_rows.append(
            {
                "speaker": row["speaker"],
                "shrinkage_weight": weight,
                "shrunken_mean": reliability["grand_mean"]
                + weight * (row["mean_score"] - reliability["grand_mean"]),
            }
        )
    shrinkage_rows.sort(key=lambda row: (-row["shrunken_mean"], row["speaker"]))
    for index, row in enumerate(shrinkage_rows, start=1):
        row["shrunken_rank"] = index
    shrinkage_by_speaker = {row["speaker"]: row for row in shrinkage_rows}

    bootstrap_summary, bootstrap_global = bootstrap_rank_uncertainty(
        grouped, eligible_names
    )
    hierarchical_summary, hierarchical_global = hierarchical_rank_uncertainty(
        ranking, reliability
    )
    leave_one_out = leave_one_out_sensitivity(grouped, ranking)

    ranking_rows = []
    for row in ranking:
        speaker = row["speaker"]
        combined = {
            **row,
            "margin_rank": margin_by_speaker[speaker]["rank"],
            "generation_adjusted_mean": adjusted_by_speaker[speaker]["ranking_value"],
            "generation_adjusted_rank": adjusted_by_speaker[speaker]["rank"],
            **shrinkage_by_speaker[speaker],
            **bootstrap_summary[speaker],
            **hierarchical_summary[speaker],
            **leave_one_out[speaker],
        }
        ranking_rows.append(combined)

    raw_means = [row["mean_score"] for row in ranking_rows]
    margins = [row["mean_margin"] for row in ranking_rows]
    adjusted_means = [row["generation_adjusted_mean"] for row in ranking_rows]
    shrunken_means = [row["shrunken_mean"] for row in ranking_rows]
    top_ten_raw = {row["speaker"] for row in ranking_rows[:10]}
    top_ten_margin = {row["speaker"] for row in margin_ranking[:10]}
    top_ten_adjusted = {row["speaker"] for row in adjusted_ranking[:10]}
    top_ten_shrunken = {row["speaker"] for row in shrinkage_rows[:10]}

    adjacent_gaps = [
        ranking_rows[index]["mean_score"] - ranking_rows[index + 1]["mean_score"]
        for index in range(len(ranking_rows) - 1)
    ]
    score_sds = [row["score_sd"] for row in ranking_rows]
    score_ranges = [row["score_range"] for row in ranking_rows]
    loo_spans = [row["leave_one_out_span"] for row in ranking_rows]
    hierarchical_widths = [
        row["hierarchical_rank_ci_95"][1] - row["hierarchical_rank_ci_95"][0]
        for row in ranking_rows
    ]
    sample_sizes = [row["appearances"] for row in ranking_rows]
    interval_width_by_sample_band = {}
    for label, predicate in (
        ("3-4", lambda value: 3 <= value <= 4),
        ("5-9", lambda value: 5 <= value <= 9),
        ("10+", lambda value: value >= 10),
    ):
        values = [
            width
            for width, sample_size in zip(hierarchical_widths, sample_sizes)
            if predicate(sample_size)
        ]
        interval_width_by_sample_band[label] = {
            "speakers": len(values),
            "median_width": median(values),
            "mean_width": mean(values),
        }

    results = {
        "snapshot": {
            "report_date": "2026-09-01",
            "ranking_eligible_debates": 212,
            "appearances": 424,
            "unique_speakers": len(grouped),
            "current_minimum": 3,
            "ranked_speakers": len(ranking_rows),
            "threshold_counts": threshold_counts,
            "appearance_count_distribution": dict(sorted(count_distribution.items())),
            "closed_appearances": 358,
            "standalone_appearances": 66,
        },
        "descriptive_stability": {
            "eligible_appearances": len(eligible_appearances),
            "median_within_speaker_sd": median(score_sds),
            "mean_within_speaker_sd": mean(score_sds),
            "pooled_within_speaker_sd": reliability["pooled_within_speaker_sd"],
            "median_observed_range": median(score_ranges),
            "speakers_with_range_at_least_10": sum(value >= 10 for value in score_ranges),
            "speakers_with_range_at_least_15": sum(value >= 15 for value in score_ranges),
            "rank_1_to_10_mean_gap": ranking_rows[0]["mean_score"]
            - ranking_rows[9]["mean_score"],
            "median_adjacent_mean_gap": median(adjacent_gaps),
            "adjacent_gaps_below_one_point": sum(value < 1 for value in adjacent_gaps),
        },
        "reliability": reliability,
        "split_half": split_half_reproducibility(grouped, minimum=6),
        "rank_uncertainty": {
            "empirical_bootstrap": bootstrap_global,
            "hierarchical_model": hierarchical_global,
            "median_leave_one_out_span": median(loo_spans),
            "speakers_with_leave_one_out_span_at_least_5": sum(
                value >= 5 for value in loo_spans
            ),
            "three_appearance_speakers": sum(row["appearances"] == 3 for row in ranking_rows),
            "three_appearance_speakers_in_top_ten": sum(
                row["appearances"] == 3 for row in ranking_rows[:10]
            ),
            "appearance_count_vs_hierarchical_width_spearman": spearman(
                sample_sizes, hierarchical_widths
            ),
            "hierarchical_width_by_sample_band": interval_width_by_sample_band,
            "current_top_ten_with_at_least_90_percent_membership_probability": sum(
                row["hierarchical_top_10_probability"] >= 0.9 for row in ranking_rows[:10]
            ),
        },
        "context_sensitivity": {
            "cohort_means": cohort_means,
            "overall_mean": overall_mean,
            "raw_vs_margin_spearman": spearman(raw_means, margins),
            "raw_vs_generation_adjusted_spearman": spearman(raw_means, adjusted_means),
            "raw_vs_shrunken_spearman": spearman(raw_means, shrunken_means),
            "raw_margin_top_ten_overlap": len(top_ten_raw & top_ten_margin),
            "raw_generation_adjusted_top_ten_overlap": len(top_ten_raw & top_ten_adjusted),
            "raw_shrunken_top_ten_overlap": len(top_ten_raw & top_ten_shrunken),
        },
        "interpretation": {
            "headline": "The rankings contain a repeatable speaker signal, but exact ordinal positions are much less stable than the displayed one-decimal averages suggest.",
            "stable_component": "Between-speaker differences persist across randomly split appearance sets, especially for speakers with broader samples.",
            "fragile_component": "At the current three-debate threshold, sampling uncertainty, dense score clustering, opponent context, and assessment-generation drift can move many speakers several places.",
            "recommended_reading": "Treat ranking bands and sample-qualified tiers as defensible; treat a one-place difference, especially among three- to five-debate speakers, as provisional.",
        },
    }

    with (ANALYSIS_DIR / "appearances.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(appearances[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(appearances)

    with (ANALYSIS_DIR / "speaker-rankings.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(ranking_rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(ranking_rows)

    threshold_rows = []
    for minimum in (3, 5, 10):
        rows = rank_speakers(appearances, minimum=minimum)
        for row in rows:
            threshold_rows.append(
                {
                    "minimum": minimum,
                    "rank": row["rank"],
                    "speaker": row["speaker"],
                    "appearances": row["appearances"],
                    "mean_score": row["mean_score"],
                }
            )
    with (ANALYSIS_DIR / "threshold-rankings.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(threshold_rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(threshold_rows)

    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
