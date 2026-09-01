#!/usr/bin/env python3
"""Test whether the published SLUGFESTER assessments behave as one score scale."""

from __future__ import annotations

import csv
import glob
import json
import math
import statistics
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
LEDGER_GLOB = str(REPO_ROOT / "docs/assessment-ledgers/*.json")
PUBLIC_DATA_PATH = REPO_ROOT / "src/data/debates.js"

DIMENSIONS = (
    ("logicalCoherence", "Logical coherence"),
    ("evidenceWarrant", "Evidence and warrant"),
    ("responsiveness", "Responsiveness"),
    ("relevanceBurden", "Relevance and burden"),
    ("precisionClarity", "Precision and clarity"),
    ("calibrationCharity", "Calibration and charity"),
)

COHORT_LABELS = {
    "closed": "Earlier closed-findings generation",
    "standalone": "Later standalone generation",
    "no_ledger": "Published without locked ledger",
}

SPEAKER_ALIASES = {
    "Joshua Rasmussen": "Josh Rasmussen",
}


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def sample_sd(values: list[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def normalize_speaker(name: str) -> str:
    cleaned = name.strip()
    return SPEAKER_ALIASES.get(cleaned, cleaned)


def derive_precision(findings: dict) -> int:
    if findings["propositionRecoverability"] == "failed":
        return 35
    if (
        findings["termStability"] == "materially-unstable"
        or findings["scopeStability"] == "materially-unstable"
        or findings["qualificationExplicitness"] == "materially-misleading"
    ):
        return 60
    if (
        findings["propositionRecoverability"] == "partial"
        or findings["termStability"] == "partly-unstable"
        or findings["scopeStability"] == "partly-unstable"
        or findings["qualificationExplicitness"] == "missing"
    ):
        return 75
    if findings["qualificationExplicitness"] == "implicit":
        return 85
    return 95


def derive_calibration(findings: dict) -> int:
    warrant_fit = findings["warrantFit"]
    if warrant_fit == "radically-overstated":
        return 35
    if warrant_fit == "materially-overstated":
        return 60
    if warrant_fit == "slightly-overstated":
        return 75
    if (
        findings["qualificationStatus"] in {"explicit", "not-needed"}
        and findings["uncertaintyAcknowledged"] in {"yes", "not-needed"}
    ):
        return 95
    return 85


def normalize_adapter(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        adapter = json.load(handle)

    number = int(adapter["debateNumber"])
    model = adapter.get("model") or adapter.get("scoringJudgment", {}).get("assessmentModel")
    rubric = adapter.get("rubric")
    calculated = adapter["calculated"]

    if "scoringJudgment" in adapter:
        cohort = "closed"
        source_moves = adapter["scoringJudgment"]["moves"]
        moves = []
        for source in source_moves:
            dimensions = {
                key: source["ratings"][key]["value"]
                for key in (
                    "logicalCoherence",
                    "evidenceWarrant",
                    "responsiveness",
                    "relevanceBurden",
                )
            }
            dimensions["precisionClarity"] = derive_precision(source["precisionFindings"])
            epistemic = derive_calibration(source["calibrationFindings"])
            charity = source["ratings"]["representationalCharity"]["value"]
            dimensions["calibrationCharity"] = math.floor((epistemic + charity) / 2 + 0.5)
            moves.append(
                {
                    "move_id": source["moveId"],
                    "side": source["side"],
                    "speaker": normalize_speaker(source["speaker"]),
                    "move_kind": source.get("moveKind", "unknown"),
                    "importance": int(source["importance"]),
                    "dimensions": dimensions,
                }
            )
    else:
        cohort = "standalone"
        final_path = REPO_ROOT / adapter["evidenceLocks"]["finalLedger"]["path"]
        with final_path.open(encoding="utf-8") as handle:
            final_ledger = json.load(handle)
        moves = []
        for source in final_ledger["moves"]:
            moves.append(
                {
                    "move_id": source["moveId"],
                    "side": source["side"],
                    "speaker": normalize_speaker(source["speaker"]),
                    "move_kind": source.get("moveKind", "unknown"),
                    "importance": int(source["importance"]),
                    "dimensions": {
                        key: source["finalDimensions"][key]["value"]
                        for key, _ in DIMENSIONS
                    },
                }
            )

    side_scores = {
        side: float(calculated["overall"][side]["score"])
        for side in ("pro", "con")
    }
    side_speakers = {
        side: sorted({move["speaker"] for move in moves if move["side"] == side})
        for side in ("pro", "con")
    }
    return {
        "path": str(path.relative_to(REPO_ROOT)),
        "number": number,
        "debate_id": adapter["debateId"],
        "cohort": cohort,
        "model": model,
        "rubric": rubric,
        "side_scores": side_scores,
        "side_speakers": side_speakers,
        "moves": moves,
    }


def load_public_debates() -> list[dict]:
    code = r"""
import { publishedDebates } from './src/data/debates.js';
const rows = publishedDebates.map((debate) => {
  let moves = 0;
  let taggedMoves = 0;
  let tagInstances = 0;
  for (const section of debate.sections ?? []) {
    for (const exchange of section.exchanges ?? []) {
      for (const side of ['pro', 'con']) {
        const move = exchange?.[side];
        if (!move) continue;
        const cards = Array.isArray(move) ? move : [move];
        for (const card of cards) {
          if (!card || typeof card !== 'object') continue;
          moves += 1;
          const tags = Array.isArray(card.tags) ? card.tags : [];
          if (tags.length > 0) taggedMoves += 1;
          tagInstances += tags.length;
        }
      }
    }
  }
  return {
    number: Number(debate.number),
    assessmentModel: debate.assessmentModel,
    assessmentRubric: debate.assessmentRubric,
    moves,
    taggedMoves,
    tagInstances,
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
    return json.loads(completed.stdout)


def pca_variance(rows: list[dict]) -> list[float]:
    matrix = np.array(
        [[row["dimensions"][key] for key, _ in DIMENSIONS] for row in rows],
        dtype=float,
    )
    standardized = (matrix - matrix.mean(axis=0)) / matrix.std(axis=0, ddof=1)
    covariance = np.cov(standardized, rowvar=False)
    eigenvalues = np.linalg.eigvalsh(covariance)[::-1]
    shares = eigenvalues / eigenvalues.sum()
    return [float(value) for value in shares]


def correlation_rows(moves: list[dict], cohort: str, population: str) -> list[dict]:
    keys = [key for key, _ in DIMENSIONS]
    labels = dict(DIMENSIONS)
    matrix = np.array(
        [[move["dimensions"][key] for key in keys] for move in moves],
        dtype=float,
    )
    correlations = np.corrcoef(matrix, rowvar=False)
    rows = []
    for index, key in enumerate(keys):
        rows.append(
            {
                "cohort": cohort,
                "population": population,
                "dimension": key,
                "label": labels[key],
                "relevance_correlation": float(correlations[keys.index("relevanceBurden"), index]),
            }
        )
    return rows


def bootstrap_difference(closed: list[float], standalone: list[float]) -> dict:
    rng = np.random.default_rng(20260901)
    closed_array = np.array(closed, dtype=float)
    standalone_array = np.array(standalone, dtype=float)
    iterations = 20000
    closed_draws = rng.choice(closed_array, size=(iterations, len(closed_array)), replace=True).mean(axis=1)
    standalone_draws = rng.choice(
        standalone_array, size=(iterations, len(standalone_array)), replace=True
    ).mean(axis=1)
    differences = standalone_draws - closed_draws
    lower, upper = np.quantile(differences, [0.025, 0.975])
    return {
        "iterations": iterations,
        "estimate": mean(standalone) - mean(closed),
        "ci_95": [float(lower), float(upper)],
    }


def exact_two_sided_sign_probability(negative: int, positive: int) -> float:
    n = negative + positive
    tail = min(negative, positive)
    probability = 2 * sum(math.comb(n, k) for k in range(tail + 1)) / (2**n)
    return min(1.0, probability)


def run_analysis() -> dict:
    adapters = [normalize_adapter(Path(path)) for path in glob.glob(LEDGER_GLOB)]
    adapters.sort(key=lambda row: row["number"])
    public = load_public_debates()
    public_by_number = {row["number"]: row for row in public}

    assert len(public) == 228
    assert len(adapters) == 212
    assert len({row["number"] for row in adapters}) == len(adapters)
    assert all(row["number"] in public_by_number for row in adapters)
    assert Counter(row["cohort"] for row in adapters) == Counter({"closed": 179, "standalone": 33})

    models = sorted({row["model"] for row in adapters})
    rubrics = sorted({row["rubric"] for row in adapters})
    assert models == ["5.6 Sol"]
    assert rubrics == ["Slugfester Reassessment Rubric v2"]

    all_moves = []
    side_rows = []
    speaker_scores: dict[tuple[str, str], list[float]] = defaultdict(list)
    for adapter in adapters:
        for move in adapter["moves"]:
            enriched = {
                **move,
                "number": adapter["number"],
                "cohort": adapter["cohort"],
            }
            all_moves.append(enriched)
        for side in ("pro", "con"):
            score = adapter["side_scores"][side]
            side_rows.append(
                {
                    "number": adapter["number"],
                    "cohort": adapter["cohort"],
                    "side": side,
                    "score": score,
                    "speakers": "; ".join(adapter["side_speakers"][side]),
                }
            )
            for speaker in adapter["side_speakers"][side]:
                speaker_scores[(adapter["cohort"], speaker)].append(score)

    assert len(all_moves) == 4449
    assert len(side_rows) == 424

    cohort_summary = []
    debate_means_by_cohort: dict[str, list[float]] = {}
    for cohort in ("closed", "standalone"):
        selected_sides = [row["score"] for row in side_rows if row["cohort"] == cohort]
        selected_adapters = [row for row in adapters if row["cohort"] == cohort]
        debate_means = [mean(list(row["side_scores"].values())) for row in selected_adapters]
        debate_means_by_cohort[cohort] = debate_means
        selected_moves = [row for row in all_moves if row["cohort"] == cohort]
        cohort_summary.append(
            {
                "cohort": cohort,
                "label": COHORT_LABELS[cohort],
                "debates": len(selected_adapters),
                "side_scores": len(selected_sides),
                "moves": len(selected_moves),
                "number_min": min(row["number"] for row in selected_adapters),
                "number_max": max(row["number"] for row in selected_adapters),
                "mean_side_score": mean(selected_sides),
                "side_score_sd": sample_sd(selected_sides),
                "min_side_score": min(selected_sides),
                "max_side_score": max(selected_sides),
                "constructive_share": sum(row["move_kind"] == "constructive" for row in selected_moves)
                / len(selected_moves),
                "importance_3_share": sum(row["importance"] == 3 for row in selected_moves)
                / len(selected_moves),
            }
        )

    score_difference = bootstrap_difference(
        debate_means_by_cohort["closed"], debate_means_by_cohort["standalone"]
    )

    dimension_rows = []
    for key, label in DIMENSIONS:
        for cohort in ("closed", "standalone"):
            values = [
                move["dimensions"][key]
                for move in all_moves
                if move["cohort"] == cohort
            ]
            dimension_rows.append(
                {
                    "dimension": key,
                    "label": label,
                    "cohort": cohort,
                    "mean": mean(values),
                    "sd": sample_sd(values),
                    "n_moves": len(values),
                }
            )

    speaker_names = sorted({speaker for _, speaker in speaker_scores})
    common_speakers = [
        speaker
        for speaker in speaker_names
        if ("closed", speaker) in speaker_scores and ("standalone", speaker) in speaker_scores
    ]
    repeated_speaker_rows = []
    for speaker in common_speakers:
        closed_scores = speaker_scores[("closed", speaker)]
        standalone_scores = speaker_scores[("standalone", speaker)]
        repeated_speaker_rows.append(
            {
                "speaker": speaker,
                "closed_mean": mean(closed_scores),
                "standalone_mean": mean(standalone_scores),
                "difference": mean(standalone_scores) - mean(closed_scores),
                "closed_debates": len(closed_scores),
                "standalone_debates": len(standalone_scores),
            }
        )
    repeated_speaker_rows.sort(key=lambda row: row["difference"])
    differences = [row["difference"] for row in repeated_speaker_rows]
    negative = sum(value < 0 for value in differences)
    positive = sum(value > 0 for value in differences)
    zero = sum(value == 0 for value in differences)
    assert len(repeated_speaker_rows) == 31

    common_speaker_set = set(common_speakers)
    common_speaker_moves = [move for move in all_moves if move["speaker"] in common_speaker_set]
    correlations = []
    for cohort in ("closed", "standalone"):
        correlations.extend(
            correlation_rows(
                [move for move in all_moves if move["cohort"] == cohort],
                cohort,
                "all moves",
            )
        )
        correlations.extend(
            correlation_rows(
                [move for move in common_speaker_moves if move["cohort"] == cohort],
                cohort,
                "repeated-speaker moves",
            )
        )

    pca = {}
    for cohort in ("closed", "standalone"):
        shares = pca_variance([move for move in all_moves if move["cohort"] == cohort])
        pca[cohort] = {
            "variance_shares": shares,
            "first_component_share": shares[0],
        }

    adapter_numbers = {row["number"] for row in adapters}
    tag_summary = []
    for cohort in ("closed", "standalone", "no_ledger"):
        if cohort == "no_ledger":
            selected = [row for row in public if row["number"] not in adapter_numbers]
        else:
            numbers = {row["number"] for row in adapters if row["cohort"] == cohort}
            selected = [row for row in public if row["number"] in numbers]
        total_moves = sum(row["moves"] for row in selected)
        tagged_moves = sum(row["taggedMoves"] for row in selected)
        tag_instances = sum(row["tagInstances"] for row in selected)
        tag_summary.append(
            {
                "cohort": cohort,
                "label": COHORT_LABELS[cohort],
                "debates": len(selected),
                "public_moves": total_moves,
                "tagged_moves": tagged_moves,
                "tag_instances": tag_instances,
                "tagged_move_rate": tagged_moves / total_moves,
            }
        )

    bins = [
        (1, 25),
        (26, 50),
        (51, 75),
        (76, 100),
        (101, 125),
        (126, 150),
        (151, 175),
        (176, 195),
        (196, 205),
        (206, 215),
        (216, 225),
        (226, 228),
    ]
    score_bins = []
    for lower, upper in bins:
        selected = [row["score"] for row in side_rows if lower <= row["number"] <= upper]
        if not selected:
            continue
        score_bins.append(
            {
                "label": f"{lower}-{upper}",
                "lower": lower,
                "upper": upper,
                "mean_side_score": mean(selected),
                "side_scores": len(selected),
                "debates": len(selected) // 2,
                "generation": "closed" if upper <= 195 else "standalone",
            }
        )

    latest_28 = [row for row in public if 201 <= row["number"] <= 228]
    latest_28_moves = sum(row["moves"] for row in latest_28)
    latest_28_tagged = sum(row["taggedMoves"] for row in latest_28)

    results = {
        "report_date": "2026-09-01",
        "snapshot_commit": subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, check=True, capture_output=True, text=True
        ).stdout.strip(),
        "corpus": {
            "published_assessments": len(public),
            "locked_ledgers": len(adapters),
            "public_without_locked_ledger": len(public) - len(adapters),
            "locked_moves": len(all_moves),
            "public_moves": sum(row["moves"] for row in public),
            "models": models,
            "rubrics": rubrics,
        },
        "cohort_summary": cohort_summary,
        "score_difference": score_difference,
        "dimension_summary": dimension_rows,
        "repeated_speakers": {
            "count": len(repeated_speaker_rows),
            "rows": repeated_speaker_rows,
            "mean_difference": mean(differences),
            "median_difference": statistics.median(differences),
            "negative": negative,
            "positive": positive,
            "zero": zero,
            "exact_two_sided_sign_probability": exact_two_sided_sign_probability(negative, positive),
        },
        "correlations": correlations,
        "pca": pca,
        "tag_summary": tag_summary,
        "tag_rate_ratio_standalone_to_closed": next(
            row["tagged_move_rate"] for row in tag_summary if row["cohort"] == "standalone"
        )
        / next(row["tagged_move_rate"] for row in tag_summary if row["cohort"] == "closed"),
        "latest_28_tagged_move_rate": latest_28_tagged / latest_28_moves,
        "score_bins": score_bins,
        "checks": {
            "cohort_number_separation": {
                "closed_max": max(row["number"] for row in adapters if row["cohort"] == "closed"),
                "standalone_min": min(
                    row["number"] for row in adapters if row["cohort"] == "standalone"
                ),
            },
            "missing_dimension_values": sum(
                move["dimensions"].get(key) is None
                for move in all_moves
                for key, _ in DIMENSIONS
            ),
            "duplicate_move_ids_within_debate": sum(
                len(row["moves"]) - len({move["move_id"] for move in row["moves"]})
                for row in adapters
            ),
        },
    }
    return results


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    results = run_analysis()
    (ANALYSIS_DIR / "results.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    write_csv(ANALYSIS_DIR / "cohort-summary.csv", results["cohort_summary"])
    write_csv(ANALYSIS_DIR / "dimension-summary.csv", results["dimension_summary"])
    write_csv(ANALYSIS_DIR / "repeated-speaker-bridge.csv", results["repeated_speakers"]["rows"])
    write_csv(ANALYSIS_DIR / "correlation-diagnostics.csv", results["correlations"])
    write_csv(ANALYSIS_DIR / "tag-coverage.csv", results["tag_summary"])
    write_csv(ANALYSIS_DIR / "score-bins.csv", results["score_bins"])
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
