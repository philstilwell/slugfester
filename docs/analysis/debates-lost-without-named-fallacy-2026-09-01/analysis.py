#!/usr/bin/env python3
"""Analyze whether lower-scoring debate sides usually carry a named fallacy tag."""

from __future__ import annotations

import csv
import importlib.util
import json
import math
import random
import statistics
import subprocess
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
SCALE_ANALYSIS_PATH = (
    REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/analysis.py"
)
SEED = 20260901
BOOTSTRAP_DRAWS = 20_000

DIMENSIONS = {
    "logicalCoherence": {"label": "Logical coherence", "weight": 0.25},
    "evidenceWarrant": {"label": "Evidence and warrant", "weight": 0.20},
    "responsiveness": {"label": "Responsiveness", "weight": 0.20},
    "relevanceBurden": {"label": "Relevance and burden", "weight": 0.15},
    "precisionClarity": {"label": "Precision and clarity", "weight": 0.10},
    "calibrationCharity": {"label": "Calibration and charity", "weight": 0.10},
}

COHORT_LABELS = {
    "closed": "Earlier closed-findings",
    "standalone": "Later standalone",
    "no_ledger": "Published without locked ledger",
}


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def percentile(sorted_values: list[float], probability: float) -> float:
    position = (len(sorted_values) - 1) * probability
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def wilson_interval(successes: int, total: int, z: float = 1.959963984540054) -> list[float]:
    proportion = successes / total
    denominator = 1 + z * z / total
    center = (proportion + z * z / (2 * total)) / denominator
    half = (
        z
        * math.sqrt(proportion * (1 - proportion) / total + z * z / (4 * total * total))
        / denominator
    )
    return [center - half, center + half]


def bootstrap_mean_difference(a: list[float], b: list[float], seed_offset: int = 0) -> dict:
    rng = random.Random(SEED + seed_offset)
    na, nb = len(a), len(b)
    draws = []
    for _ in range(BOOTSTRAP_DRAWS):
        a_mean = mean([a[rng.randrange(na)] for _ in range(na)])
        b_mean = mean([b[rng.randrange(nb)] for _ in range(nb)])
        draws.append(a_mean - b_mean)
    draws.sort()
    return {
        "estimate": mean(a) - mean(b),
        "ci_95": [percentile(draws, 0.025), percentile(draws, 0.975)],
        "draws": BOOTSTRAP_DRAWS,
    }


def bootstrap_mean_ci(values: list[float], seed_offset: int = 0) -> list[float]:
    rng = random.Random(SEED + 1000 + seed_offset)
    n = len(values)
    draws = sorted(
        mean([values[rng.randrange(n)] for _ in range(n)])
        for _ in range(BOOTSTRAP_DRAWS)
    )
    return [percentile(draws, 0.025), percentile(draws, 0.975)]


def pearson_correlation(a: list[float], b: list[float]) -> float:
    a_mean = mean(a)
    b_mean = mean(b)
    numerator = sum((x - a_mean) * (y - b_mean) for x, y in zip(a, b))
    denominator = math.sqrt(
        sum((x - a_mean) ** 2 for x in a) * sum((y - b_mean) ** 2 for y in b)
    )
    return numerator / denominator


def load_scale_module():
    spec = importlib.util.spec_from_file_location("slugfester_scale_analysis", SCALE_ANALYSIS_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCALE_ANALYSIS_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_adapters() -> list[dict]:
    module = load_scale_module()
    paths = sorted((REPO_ROOT / "docs/assessment-ledgers").glob("*.json"))
    adapters = [module.normalize_adapter(path) for path in paths]
    assert Counter(adapter["cohort"] for adapter in adapters) == Counter(
        {"closed": 179, "standalone": 33}
    )
    return adapters


def load_public_debates() -> list[dict]:
    code = r"""
import { debates } from './src/data/debates.js';

const rows = debates.map((debate) => {
  const moves = [];
  for (const section of debate.sections ?? []) {
    for (const exchange of section.exchanges ?? []) {
      for (const side of ['pro', 'con']) {
        const raw = exchange?.[side];
        const cards = Array.isArray(raw) ? raw : [raw];
        for (const card of cards) {
          if (!card || typeof card !== 'object') continue;
          const tags = Array.isArray(card.tags) ? card.tags : [];
          moves.push({
            move_id: card.ledgerMoveId ?? null,
            side,
            score: Number(card.score),
            role: card.role ?? '',
            words: card.words ?? '',
            critique: card.critique ?? '',
            fallacies: tags.filter((tag) => tag.type === 'fallacy').map((tag) => tag.label),
            biases: tags.filter((tag) => tag.type === 'bias').map((tag) => tag.label),
          });
        }
      }
    }
  }
  return {
    number: Number(debate.number),
    debate_id: debate.id,
    title: debate.title,
    label: debate.label,
    motion: debate.motion,
    pro_speaker: debate.sides?.pro?.speaker ?? '',
    con_speaker: debate.sides?.con?.speaker ?? '',
    pro_score: Number(debate.score.pro),
    con_score: Number(debate.score.con),
    moves,
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
    rows = json.loads(completed.stdout)
    assert len(rows) == 228
    assert sum(len(row["moves"]) for row in rows) == 4659
    return rows


def annotate_debate_rows(public_rows: list[dict], adapters: list[dict]) -> list[dict]:
    cohort_by_number = {adapter["number"]: adapter["cohort"] for adapter in adapters}
    rows = []
    for debate in public_rows:
        pro_score = debate["pro_score"]
        con_score = debate["con_score"]
        if pro_score > con_score:
            higher_side, lower_side = "pro", "con"
        elif con_score > pro_score:
            higher_side, lower_side = "con", "pro"
        else:
            higher_side = lower_side = "tie"

        side_counts = {}
        for side in ("pro", "con"):
            moves = [move for move in debate["moves"] if move["side"] == side]
            side_counts[side] = {
                "moves": len(moves),
                "fallacy_tagged_moves": sum(bool(move["fallacies"]) for move in moves),
                "fallacy_instances": sum(len(move["fallacies"]) for move in moves),
                "bias_tagged_moves": sum(bool(move["biases"]) for move in moves),
                "bias_instances": sum(len(move["biases"]) for move in moves),
            }

        row = {
            "number": debate["number"],
            "debate_id": debate["debate_id"],
            "title": debate["title"],
            "label": debate["label"],
            "motion": debate["motion"],
            "cohort": cohort_by_number.get(debate["number"], "no_ledger"),
            "pro_speaker": debate["pro_speaker"],
            "con_speaker": debate["con_speaker"],
            "pro_score": pro_score,
            "con_score": con_score,
            "higher_side": higher_side,
            "lower_side": lower_side,
            "margin": abs(pro_score - con_score),
            "tie": higher_side == "tie",
            "pro_moves": side_counts["pro"]["moves"],
            "con_moves": side_counts["con"]["moves"],
            "pro_fallacy_tagged_moves": side_counts["pro"]["fallacy_tagged_moves"],
            "con_fallacy_tagged_moves": side_counts["con"]["fallacy_tagged_moves"],
            "pro_fallacy_instances": side_counts["pro"]["fallacy_instances"],
            "con_fallacy_instances": side_counts["con"]["fallacy_instances"],
            "pro_bias_instances": side_counts["pro"]["bias_instances"],
            "con_bias_instances": side_counts["con"]["bias_instances"],
        }
        if not row["tie"]:
            row.update(
                {
                    "lower_fallacy_tagged_moves": side_counts[lower_side]["fallacy_tagged_moves"],
                    "higher_fallacy_tagged_moves": side_counts[higher_side]["fallacy_tagged_moves"],
                    "lower_fallacy_instances": side_counts[lower_side]["fallacy_instances"],
                    "higher_fallacy_instances": side_counts[higher_side]["fallacy_instances"],
                    "lower_bias_instances": side_counts[lower_side]["bias_instances"],
                    "higher_bias_instances": side_counts[higher_side]["bias_instances"],
                }
            )
        rows.append(row)
    return rows


def cohort_summary(cohort: str, debates: list[dict], public_rows: list[dict]) -> dict:
    selected = [row for row in debates if row["cohort"] == cohort]
    decisive = [row for row in selected if not row["tie"]]
    public_selected = [row for row in public_rows if row["number"] in {item["number"] for item in selected}]
    moves = [move for row in public_selected for move in row["moves"]]
    fallacy_tagged = [move for move in moves if move["fallacies"]]
    untagged = [move for move in moves if not move["fallacies"]]
    lower_zero = [row for row in decisive if row["lower_fallacy_instances"] == 0]
    lower_positive = [row for row in decisive if row["lower_fallacy_instances"] > 0]
    lower_zero_count = len(lower_zero)
    side_scores = []
    side_fallacy_rates = []
    for row in selected:
        for side in ("pro", "con"):
            side_scores.append(float(row[f"{side}_score"]))
            tagged = float(row[f"{side}_fallacy_tagged_moves"])
            moves_count = float(row[f"{side}_moves"])
            side_fallacy_rates.append(tagged / moves_count)
    return {
        "cohort": cohort,
        "label": COHORT_LABELS[cohort],
        "debates": len(selected),
        "decisive_debates": len(decisive),
        "ties": len(selected) - len(decisive),
        "moves": len(moves),
        "fallacy_tagged_moves": len(fallacy_tagged),
        "fallacy_instances": sum(len(move["fallacies"]) for move in moves),
        "fallacy_tagged_move_rate": len(fallacy_tagged) / len(moves),
        "fallacy_tagged_move_mean_score": mean([move["score"] for move in fallacy_tagged]),
        "untagged_move_mean_score": mean([move["score"] for move in untagged]),
        "tagged_minus_untagged_score": mean([move["score"] for move in fallacy_tagged])
        - mean([move["score"] for move in untagged]),
        "side_score_fallacy_rate_correlation": pearson_correlation(
            side_scores, side_fallacy_rates
        ),
        "lower_side_without_fallacy": lower_zero_count,
        "lower_side_without_fallacy_share": lower_zero_count / len(decisive),
        "lower_side_without_fallacy_ci_95": wilson_interval(lower_zero_count, len(decisive)),
        "neither_side_with_fallacy": sum(
            row["lower_fallacy_instances"] == 0 and row["higher_fallacy_instances"] == 0
            for row in decisive
        ),
        "lower_more_fallacies": sum(
            row["lower_fallacy_tagged_moves"] > row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "equal_fallacies": sum(
            row["lower_fallacy_tagged_moves"] == row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "lower_fewer_fallacies": sum(
            row["lower_fallacy_tagged_moves"] < row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "fallacy_free_loss_mean_margin": mean([row["margin"] for row in lower_zero]),
        "fallacy_free_loss_mean_margin_ci_95": bootstrap_mean_ci(
            [row["margin"] for row in lower_zero], len(selected) + 11
        ),
        "fallacy_free_loss_median_margin": statistics.median([row["margin"] for row in lower_zero]),
        "tagged_loss_mean_margin": mean([row["margin"] for row in lower_positive]),
        "tagged_loss_mean_margin_ci_95": bootstrap_mean_ci(
            [row["margin"] for row in lower_positive], len(selected) + 37
        ),
        "tagged_loss_median_margin": statistics.median([row["margin"] for row in lower_positive]),
    }


def overall_move_summary(public_rows: list[dict]) -> dict:
    moves = [move for debate in public_rows for move in debate["moves"]]
    tagged = [move for move in moves if move["fallacies"]]
    untagged = [move for move in moves if not move["fallacies"]]
    return {
        "moves": len(moves),
        "fallacy_tagged_moves": len(tagged),
        "fallacy_instances": sum(len(move["fallacies"]) for move in moves),
        "fallacy_tagged_move_rate": len(tagged) / len(moves),
        "fallacy_tagged_move_mean_score": mean([move["score"] for move in tagged]),
        "untagged_move_mean_score": mean([move["score"] for move in untagged]),
        "tagged_minus_untagged_score": mean([move["score"] for move in tagged])
        - mean([move["score"] for move in untagged]),
    }


def fallacy_label_summary(public_rows: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for debate in public_rows:
        for move in debate["moves"]:
            for label in move["fallacies"]:
                grouped.setdefault(label, []).append({"debate": debate, "move": move})
    rows = []
    for label, instances in grouped.items():
        rows.append(
            {
                "label": label,
                "instances": len(instances),
                "debates": len({item["debate"]["number"] for item in instances}),
                "mean_move_score": mean([item["move"]["score"] for item in instances]),
                "closed_instances": sum(
                    item["debate"]["cohort"] == "closed" for item in instances
                ),
                "standalone_instances": sum(
                    item["debate"]["cohort"] == "standalone" for item in instances
                ),
                "no_ledger_instances": sum(
                    item["debate"]["cohort"] == "no_ledger" for item in instances
                ),
            }
        )
    return sorted(rows, key=lambda row: (-row["instances"], row["label"]))


def margin_band_summary(decisive: list[dict]) -> list[dict]:
    bands = [(1, 2, "1-2"), (3, 5, "3-5"), (6, 9, "6-9"), (10, 14, "10-14"), (15, 99, "15+")]
    rows = []
    for low, high, label in bands:
        selected = [row for row in decisive if low <= row["margin"] <= high]
        count = sum(row["lower_fallacy_instances"] == 0 for row in selected)
        rows.append(
            {
                "band": label,
                "margin_low": low,
                "margin_high": high,
                "decisive_debates": len(selected),
                "lower_side_without_fallacy": count,
                "lower_side_without_fallacy_share": count / len(selected),
                "mean_lower_fallacy_instances": mean(
                    [row["lower_fallacy_instances"] for row in selected]
                ),
            }
        )
    return rows


def dimension_decomposition(
    debates: list[dict], adapters: list[dict]
) -> tuple[list[dict], dict]:
    debate_by_number = {row["number"]: row for row in debates}
    rows = []
    for adapter in adapters:
        debate = debate_by_number[adapter["number"]]
        if debate["tie"]:
            continue
        with (REPO_ROOT / adapter["path"]).open(encoding="utf-8") as handle:
            raw = json.load(handle)
        move_by_id = {move["move_id"]: move for move in adapter["moves"]}
        side_means = {
            side: {key: 0.0 for key in DIMENSIONS} for side in ("pro", "con")
        }
        for section in raw["calculated"]["sections"]:
            section_weight = section["weightPercent"] / 100
            for side in ("pro", "con"):
                calculated_moves = section["sides"][side]["moves"]
                denominator = sum(item["importance"] for item in calculated_moves)
                for key in DIMENSIONS:
                    section_mean = sum(
                        move_by_id[item["moveId"]]["dimensions"][key] * item["importance"]
                        for item in calculated_moves
                    ) / denominator
                    side_means[side][key] += section_weight * section_mean

        higher = debate["higher_side"]
        lower = debate["lower_side"]
        contributions = {
            key: (side_means[higher][key] - side_means[lower][key]) * definition["weight"]
            for key, definition in DIMENSIONS.items()
        }
        adjustment = (
            raw["calculated"]["overall"][higher]["burdenCompletionAdjustment"]
            - raw["calculated"]["overall"][lower]["burdenCompletionAdjustment"]
        )
        residual = debate["margin"] - sum(contributions.values()) - adjustment
        rows.append(
            {
                "number": debate["number"],
                "debate_id": debate["debate_id"],
                "title": debate["title"],
                "cohort": debate["cohort"],
                "margin": debate["margin"],
                "lower_fallacy_instances": debate["lower_fallacy_instances"],
                **{f"{key}_contribution": value for key, value in contributions.items()},
                "positive_dimension_count": sum(value > 0 for value in contributions.values()),
                "adjustment_gap": adjustment,
                "rounding_residual": residual,
            }
        )

    summaries = []
    for group, selected in (
        ("Lower side has no named fallacy", [row for row in rows if row["lower_fallacy_instances"] == 0]),
        ("Lower side has at least one named fallacy", [row for row in rows if row["lower_fallacy_instances"] > 0]),
    ):
        item = {"group": group, "debates": len(selected), "mean_margin": mean([row["margin"] for row in selected])}
        for key, definition in DIMENSIONS.items():
            contribution_key = f"{key}_contribution"
            item[contribution_key] = mean([row[contribution_key] for row in selected])
            item[f"{key}_positive"] = sum(row[contribution_key] > 0 for row in selected)
            item[f"{key}_label"] = definition["label"]
        item["adjustment_gap"] = mean([row["adjustment_gap"] for row in selected])
        item["rounding_residual"] = mean([row["rounding_residual"] for row in selected])
        summaries.append(item)

    fallacy_free = [row for row in rows if row["lower_fallacy_instances"] == 0]
    cumulative = Counter(row["positive_dimension_count"] for row in fallacy_free)
    diagnostics = {
        "locked_decisive_debates": len(rows),
        "fallacy_free_lower_side_debates": len(fallacy_free),
        "positive_dimension_count_distribution": dict(sorted(cumulative.items())),
        "five_or_six_positive": sum(count for key, count in cumulative.items() if key >= 5),
        "five_or_six_positive_share": sum(count for key, count in cumulative.items() if key >= 5)
        / len(fallacy_free),
        "all_six_positive": cumulative[6],
        "all_six_positive_share": cumulative[6] / len(fallacy_free),
    }
    return rows, {"groups": summaries, "cumulative": diagnostics}


def write_csv(path: Path, rows: list[dict], fields: list[str] | None = None) -> None:
    if not rows:
        raise ValueError(f"No rows for {path}")
    fieldnames = fields or list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    adapters = load_adapters()
    public_rows = load_public_debates()
    cohort_by_number = {adapter["number"]: adapter["cohort"] for adapter in adapters}
    for row in public_rows:
        row["cohort"] = cohort_by_number.get(row["number"], "no_ledger")
    debates = annotate_debate_rows(public_rows, adapters)
    decisive = [row for row in debates if not row["tie"]]

    lower_without_fallacy = [row for row in decisive if row["lower_fallacy_instances"] == 0]
    lower_with_fallacy = [row for row in decisive if row["lower_fallacy_instances"] > 0]
    neither = [
        row
        for row in decisive
        if row["lower_fallacy_instances"] == 0 and row["higher_fallacy_instances"] == 0
    ]
    only_lower = [
        row
        for row in decisive
        if row["lower_fallacy_instances"] > 0 and row["higher_fallacy_instances"] == 0
    ]
    only_higher = [
        row
        for row in decisive
        if row["lower_fallacy_instances"] == 0 and row["higher_fallacy_instances"] > 0
    ]
    both = [
        row
        for row in decisive
        if row["lower_fallacy_instances"] > 0 and row["higher_fallacy_instances"] > 0
    ]

    cohorts = [
        cohort_summary(cohort, debates, public_rows)
        for cohort in ("closed", "standalone", "no_ledger")
    ]
    locked_equal_weight_share = mean(
        [
            next(row for row in cohorts if row["cohort"] == cohort)[
                "lower_side_without_fallacy_share"
            ]
            for cohort in ("closed", "standalone")
        ]
    )

    dimensions, dimension_summary = dimension_decomposition(debates, adapters)
    labels = fallacy_label_summary(public_rows)
    move_summary = overall_move_summary(public_rows)
    margin_bands = margin_band_summary(decisive)

    primary = {
        "decisive_debates": len(decisive),
        "ties": len(debates) - len(decisive),
        "lower_side_without_fallacy": len(lower_without_fallacy),
        "lower_side_without_fallacy_share": len(lower_without_fallacy) / len(decisive),
        "lower_side_without_fallacy_ci_95": wilson_interval(
            len(lower_without_fallacy), len(decisive)
        ),
        "neither_side_with_fallacy": len(neither),
        "neither_side_with_fallacy_share": len(neither) / len(decisive),
        "only_lower_side_with_fallacy": len(only_lower),
        "only_higher_side_with_fallacy": len(only_higher),
        "both_sides_with_fallacy": len(both),
        "lower_side_without_fallacy_or_bias": sum(
            row["lower_fallacy_instances"] == 0 and row["lower_bias_instances"] == 0
            for row in decisive
        ),
        "lower_side_without_fallacy_or_bias_share": sum(
            row["lower_fallacy_instances"] == 0 and row["lower_bias_instances"] == 0
            for row in decisive
        )
        / len(decisive),
        "lower_more_fallacy_tagged_moves": sum(
            row["lower_fallacy_tagged_moves"] > row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "equal_fallacy_tagged_moves": sum(
            row["lower_fallacy_tagged_moves"] == row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "lower_fewer_fallacy_tagged_moves": sum(
            row["lower_fallacy_tagged_moves"] < row["higher_fallacy_tagged_moves"]
            for row in decisive
        ),
        "fallacy_free_loss_mean_margin": mean([row["margin"] for row in lower_without_fallacy]),
        "fallacy_free_loss_mean_margin_ci_95": bootstrap_mean_ci(
            [row["margin"] for row in lower_without_fallacy], 151
        ),
        "fallacy_free_loss_median_margin": statistics.median(
            [row["margin"] for row in lower_without_fallacy]
        ),
        "tagged_loss_mean_margin": mean([row["margin"] for row in lower_with_fallacy]),
        "tagged_loss_mean_margin_ci_95": bootstrap_mean_ci(
            [row["margin"] for row in lower_with_fallacy], 173
        ),
        "tagged_loss_median_margin": statistics.median(
            [row["margin"] for row in lower_with_fallacy]
        ),
        "tagged_minus_fallacy_free_margin": bootstrap_mean_difference(
            [row["margin"] for row in lower_with_fallacy],
            [row["margin"] for row in lower_without_fallacy],
            91,
        ),
        "equal_weight_locked_generation_share": locked_equal_weight_share,
    }

    largest_fallacy_free = sorted(
        lower_without_fallacy,
        key=lambda row: (-row["margin"], row["number"]),
    )[:20]
    case_rows = [
        {
            "number": row["number"],
            "debate_id": row["debate_id"],
            "title": row["title"],
            "cohort": row["cohort"],
            "higher_side": row["higher_side"],
            "lower_side": row["lower_side"],
            "higher_score": row[f"{row['higher_side']}_score"],
            "lower_score": row[f"{row['lower_side']}_score"],
            "margin": row["margin"],
            "higher_fallacy_instances": row["higher_fallacy_instances"],
            "lower_fallacy_instances": row["lower_fallacy_instances"],
        }
        for row in largest_fallacy_free
    ]

    results = {
        "snapshot": {
            "report_date": "2026-09-01",
            "published_assessments": len(debates),
            "decisive_assessments": len(decisive),
            "ties": len(debates) - len(decisive),
            "public_moves": move_summary["moves"],
            "locked_assessments": len(adapters),
            "locked_decisive_assessments": dimension_summary["cumulative"][
                "locked_decisive_debates"
            ],
        },
        "operational_definition": {
            "named_fallacy": "At least one public move card on the side carries one of the six fallacy labels accepted by the site's separate annotation workflow.",
            "not_claimed": "Absence of a tag is not proof of deductive validity, strong induction, or freedom from every formal or informal reasoning error.",
            "score_independence": "Fallacy and bias labels are reviewed separately from the numerical scoring totals; they are explanations of specific weaknesses, not a direct point-deduction schedule.",
        },
        "primary": primary,
        "move_summary": move_summary,
        "cohort_summary": cohorts,
        "fallacy_labels": labels,
        "margin_bands": margin_bands,
        "dimension_summary": dimension_summary,
        "largest_fallacy_free_losses": case_rows,
        "interpretation": {
            "headline": "In the observed 228-assessment snapshot, 146 of 220 lower-scoring sides (66.4%) carry no named fallacy tag.",
            "robust_result": "Among 143 locked fallacy-free losses, the lower side trails on at least five of six rubric dimensions in 75.5% of debates, showing that cumulative ordinary weakness is sufficient to produce a loss without a named fallacy.",
            "annotation_limit": "The 66.4% headline is not stable across annotation cohorts: the fallacy-free-loss share is 80.8% in the earlier closed cohort but 12.5% in the later standalone cohort, where fallacy tagging is much denser.",
            "balanced_result": "Equal-weighting the two locked assessment generations yields a 46.7% fallacy-free-loss share, so the word 'usually' describes the current corpus mix rather than an annotation-invariant law.",
            "qualified_conclusion": "Named fallacies are neither necessary nor sufficient for a lower score. When present they identify weaker moves and larger average margins, but most scoring work is done by graded differences in coherence, warrant, responsiveness, precision, burden fit, and calibration.",
        },
    }

    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    debate_fields = [
        "number", "debate_id", "title", "cohort", "pro_speaker", "con_speaker",
        "pro_score", "con_score", "higher_side", "lower_side", "margin", "tie",
        "pro_moves", "con_moves", "pro_fallacy_tagged_moves", "con_fallacy_tagged_moves",
        "pro_fallacy_instances", "con_fallacy_instances", "pro_bias_instances",
        "con_bias_instances", "lower_fallacy_tagged_moves", "higher_fallacy_tagged_moves",
        "lower_fallacy_instances", "higher_fallacy_instances", "lower_bias_instances",
        "higher_bias_instances",
    ]
    write_csv(ANALYSIS_DIR / "debate-outcomes.csv", debates, debate_fields)
    write_csv(ANALYSIS_DIR / "cohort-summary.csv", cohorts)
    write_csv(ANALYSIS_DIR / "fallacy-labels.csv", labels)
    write_csv(ANALYSIS_DIR / "margin-bands.csv", margin_bands)
    write_csv(ANALYSIS_DIR / "dimension-debate-decomposition.csv", dimensions)
    write_csv(ANALYSIS_DIR / "dimension-summary.csv", dimension_summary["groups"])
    write_csv(ANALYSIS_DIR / "largest-fallacy-free-losses.csv", case_rows)

    print(
        json.dumps(
            {
                "snapshot": results["snapshot"],
                "primary": primary,
                "move_summary": move_summary,
                "cohort_summary": cohorts,
                "dimension_cumulative": dimension_summary["cumulative"],
                "fallacy_labels": labels,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
