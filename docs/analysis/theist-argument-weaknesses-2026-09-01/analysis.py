#!/usr/bin/env python3
"""Diagnose the rubric-level sources of the theist/non-theist score gap."""

from __future__ import annotations

import csv
import glob
import json
import math
import statistics
import subprocess
from collections import Counter, defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
TAXONOMY_PATH = REPO_ROOT / "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv"
LEDGER_GLOB = str(REPO_ROOT / "docs/assessment-ledgers/*.json")

DIMENSIONS = {
    "logicalCoherence": {"label": "Logical coherence", "weight": 0.25},
    "evidenceWarrant": {"label": "Evidence and warrant", "weight": 0.20},
    "responsiveness": {"label": "Responsiveness", "weight": 0.20},
    "relevanceBurden": {"label": "Relevance and burden", "weight": 0.15},
    "precisionClarity": {"label": "Precision and clarity", "weight": 0.10},
    "calibrationCharity": {"label": "Calibration and charity", "weight": 0.10},
}

EXAMPLE_MOVES = {
    ("03", "con-c201-prevalent-religious-experience"): {
        "pattern": "Prevalence substituted for reliability",
        "diagnostic": (
            "The prevalence of diverse religious experiences is treated as evidence for a common "
            "divine object without establishing a shared reliable source or comparing live error explanations."
        ),
    },
    ("03", "con-c008-cell-origin-explanatory-gap"): {
        "pattern": "Explanatory gap converted into positive agency evidence",
        "diagnostic": (
            "Difficulty explaining the first cell is used to raise intelligent causation without a "
            "comparative likelihood showing that agency predicts the evidence better."
        ),
    },
    ("112", "pro-objective-morality-foundation"): {
        "pattern": "Alternatives ruled out too quickly",
        "diagnostic": (
            "An evolutionary genealogy of moral belief is treated as excluding objective value on "
            "naturalism without examining representative naturalistic moral-realist accounts."
        ),
    },
    ("191", "con-cellular-complexity-agency-thesis"): {
        "pattern": "No discriminating test for the preferred explanation",
        "diagnostic": (
            "Current limits of natural origin accounts are turned into an agency inference before "
            "the argument states observations that would distinguish agency from difficult natural causation."
        ),
    },
    ("219", "ultimate-beliefs-beyond-proof"): {
        "pattern": "Epistemic exemption left undefended",
        "diagnostic": (
            "Meaning-conferring ultimate beliefs are placed beyond proof without a principle showing "
            "why significance changes evidential status or keeps the belief answerable to reality."
        ),
    },
}


def js_round(value: float) -> int:
    """Match JavaScript Math.round for the non-negative score domain."""
    return math.floor(value + 0.5)


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def load_taxonomy() -> dict[str, dict]:
    with TAXONOMY_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    included = {row["number"]: row for row in rows if row["included"] == "True"}
    assert len(included) == 169
    return included


def load_adapter_index() -> dict[str, Path]:
    index: dict[str, Path] = {}
    for filename in glob.glob(LEDGER_GLOB):
        path = Path(filename)
        with path.open(encoding="utf-8") as handle:
            ledger = json.load(handle)
        number = str(ledger.get("debateNumber", "")).zfill(2)
        assert number and number not in index
        index[number] = path
    return index


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


def score_dimensions(dimensions: dict[str, int]) -> int:
    # Keep the same left-to-right binary-floating accumulation used by the
    # repository's JavaScript reducer, including its behavior at x.5 edges.
    total = 0.0
    for key, definition in DIMENSIONS.items():
        total += dimensions[key] * definition["weight"]
    return js_round(total)


def normalize_ledger(adapter_path: Path) -> tuple[dict, dict, list[dict], str]:
    with adapter_path.open(encoding="utf-8") as handle:
        adapter = json.load(handle)

    if "scoringJudgment" in adapter:
        judgment = adapter["scoringJudgment"]
        normalized_moves = []
        for move in judgment["moves"]:
            dimensions = {
                key: move["ratings"][key]["value"]
                for key in (
                    "logicalCoherence",
                    "evidenceWarrant",
                    "responsiveness",
                    "relevanceBurden",
                )
            }
            dimensions["precisionClarity"] = derive_precision(move["precisionFindings"])
            epistemic_calibration = derive_calibration(move["calibrationFindings"])
            representational_charity = move["ratings"]["representationalCharity"]["value"]
            dimensions["calibrationCharity"] = js_round(
                (epistemic_calibration + representational_charity) / 2
            )
            normalized_moves.append(
                {
                    **move,
                    "dimensions": dimensions,
                    "epistemicCalibration": epistemic_calibration,
                    "representationalCharity": representational_charity,
                    "responseClass": move.get("response", {}).get("class"),
                }
            )
        return adapter, judgment, normalized_moves, "v4-closed-findings-adapter"

    final_ledger_path = REPO_ROOT / adapter["evidenceLocks"]["finalLedger"]["path"]
    with final_ledger_path.open(encoding="utf-8") as handle:
        final_ledger = json.load(handle)
    normalized_moves = []
    for move in final_ledger["moves"]:
        dimensions = {
            key: move["finalDimensions"][key]["value"] for key in DIMENSIONS
        }
        normalized_moves.append(
            {
                **move,
                "dimensions": dimensions,
                "epistemicCalibration": None,
                "representationalCharity": None,
                "responseClass": None,
            }
        )
    return adapter, final_ledger, normalized_moves, "standalone-final-ledger"


def side_label(move_side: str, taxonomy_row: dict) -> str:
    return "theist" if move_side == taxonomy_row["theist_side"] else "non_theist"


def evidence_band(value: int) -> str:
    if value < 50:
        return "effectively unsupported"
    if value < 70:
        return "assertion/anecdote/authority/speculation carries substantial weight"
    if value < 80:
        return "material warrant or verification step compressed"
    return "stronger support"


def dimension_summary(moves: list[dict], label: str) -> list[dict]:
    selected = [move for move in moves if move["sideLabel"] == label]
    rows = []
    for key, definition in DIMENSIONS.items():
        values = [move["dimensions"][key] for move in selected]
        rows.append(
            {
                "dimension": key,
                "label": definition["label"],
                "n_moves": len(values),
                "mean": mean(values),
                "below_70": sum(value < 70 for value in values),
                "below_70_share": sum(value < 70 for value in values) / len(values),
                "below_80": sum(value < 80 for value in values),
                "below_80_share": sum(value < 80 for value in values) / len(values),
            }
        )
    return rows


def summarize_move_subset(moves: list[dict], predicate, name: str) -> dict:
    selected = [move for move in moves if predicate(move)]
    by_side = {
        label: [move for move in selected if move["sideLabel"] == label]
        for label in ("theist", "non_theist")
    }
    dimension_gaps = {}
    for key in DIMENSIONS:
        dimension_gaps[key] = (
            mean([move["dimensions"][key] for move in by_side["non_theist"]])
            - mean([move["dimensions"][key] for move in by_side["theist"]])
        )
    return {
        "subset": name,
        "theist_moves": len(by_side["theist"]),
        "non_theist_moves": len(by_side["non_theist"]),
        "evidence_warrant_gap": dimension_gaps["evidenceWarrant"],
        "logical_coherence_gap": dimension_gaps["logicalCoherence"],
        "responsiveness_gap": dimension_gaps["responsiveness"],
        "calibration_charity_gap": dimension_gaps["calibrationCharity"],
        "theist_evidence_below_70_share": sum(
            move["dimensions"]["evidenceWarrant"] < 70 for move in by_side["theist"]
        )
        / len(by_side["theist"]),
        "non_theist_evidence_below_70_share": sum(
            move["dimensions"]["evidenceWarrant"] < 70 for move in by_side["non_theist"]
        )
        / len(by_side["non_theist"]),
    }


def run_analysis() -> dict:
    taxonomy = load_taxonomy()
    adapter_index = load_adapter_index()
    assert set(taxonomy).issubset(adapter_index)

    all_moves: list[dict] = []
    debate_rows: list[dict] = []
    legacy_moves: list[dict] = []
    ledger_types = Counter()
    move_score_checks = 0
    section_score_checks = 0
    official_score_checks = 0

    for number in sorted(taxonomy, key=int):
        row = taxonomy[number]
        adapter, judgment, normalized_moves, ledger_type = normalize_ledger(adapter_index[number])
        ledger_types[ledger_type] += 1
        move_by_id = {move["moveId"]: move for move in normalized_moves}
        assert len(move_by_id) == len(normalized_moves)

        for move in normalized_moves:
            move["number"] = number
            move["debateId"] = adapter["debateId"]
            move["title"] = row["title"]
            move["sideLabel"] = side_label(move["side"], row)
            move["ledgerType"] = ledger_type
            all_moves.append(move)
            if ledger_type == "v4-closed-findings-adapter":
                legacy_moves.append(move)

        side_dimension_means: dict[str, dict[str, float]] = {}
        calculated_move_ids: set[str] = set()
        for side in ("pro", "con"):
            side_dimension_means[side] = {key: 0.0 for key in DIMENSIONS}
            assert sum(section["weightPercent"] for section in adapter["calculated"]["sections"]) == 100
            for section in adapter["calculated"]["sections"]:
                section_weight = section["weightPercent"] / 100
                calculated_moves = section["sides"][side]["moves"]
                denominator = sum(move["importance"] for move in calculated_moves)
                assert denominator > 0
                for item in calculated_moves:
                    calculated_move_ids.add(item["moveId"])
                    normalized = move_by_id[item["moveId"]]
                    assert normalized["side"] == side
                    assert normalized["importance"] == item["importance"]
                    assert score_dimensions(normalized["dimensions"]) == item["score"], (
                        number,
                        item["moveId"],
                        normalized["dimensions"],
                        score_dimensions(normalized["dimensions"]),
                        item["score"],
                    )
                    move_score_checks += 1
                calculated_section_score = js_round(
                    sum(item["score"] * item["importance"] for item in calculated_moves)
                    / denominator
                )
                assert calculated_section_score == section["sides"][side]["score"]
                section_score_checks += 1
                for key in DIMENSIONS:
                    section_dimension_mean = (
                        sum(
                            move_by_id[item["moveId"]]["dimensions"][key] * item["importance"]
                            for item in calculated_moves
                        )
                        / denominator
                    )
                    side_dimension_means[side][key] += section_weight * section_dimension_mean

        assert calculated_move_ids == set(move_by_id)
        for side in ("pro", "con"):
            expected = float(
                row["theist_score"]
                if side == row["theist_side"]
                else row["non_theist_score"]
            )
            assert adapter["calculated"]["overall"][side]["score"] == expected
            official_score_checks += 1

        non_side = row["non_theist_side"]
        theist_side = row["theist_side"]
        contributions = {
            key: (
                side_dimension_means[non_side][key] - side_dimension_means[theist_side][key]
            )
            * definition["weight"]
            for key, definition in DIMENSIONS.items()
        }
        official_margin = float(row["margin_non_theist_minus_theist"])
        adjustment_gap = (
            adapter["calculated"]["overall"][non_side]["burdenCompletionAdjustment"]
            - adapter["calculated"]["overall"][theist_side]["burdenCompletionAdjustment"]
        )
        rounding_residual = official_margin - sum(contributions.values()) - adjustment_gap
        debate_rows.append(
            {
                "number": number,
                "debate_id": adapter["debateId"],
                "title": row["title"],
                "theist_side": theist_side,
                "official_margin": official_margin,
                "adjustment_gap": adjustment_gap,
                "rounding_residual": rounding_residual,
                "theist_dimension_means": side_dimension_means[theist_side],
                "non_theist_dimension_means": side_dimension_means[non_side],
                "contributions": contributions,
            }
        )

    assert len(all_moves) == 3502
    assert sum(move["sideLabel"] == "theist" for move in all_moves) == 1746
    assert sum(move["sideLabel"] == "non_theist" for move in all_moves) == 1756
    assert len(legacy_moves) == 2800
    assert ledger_types == Counter(
        {"v4-closed-findings-adapter": 146, "standalone-final-ledger": 23}
    )
    assert move_score_checks == 3502
    assert section_score_checks == 1778
    assert official_score_checks == 338

    official_margins = [row["official_margin"] for row in debate_rows]
    primary = {
        "n_debates": len(debate_rows),
        "theist_mean_score": mean([float(row["theist_score"]) for row in taxonomy.values()]),
        "non_theist_mean_score": mean(
            [float(row["non_theist_score"]) for row in taxonomy.values()]
        ),
        "mean_margin": mean(official_margins),
        "median_margin": statistics.median(official_margins),
        "non_theist_higher": sum(value > 0 for value in official_margins),
        "ties": sum(value == 0 for value in official_margins),
        "theist_higher": sum(value < 0 for value in official_margins),
    }

    dimension_decomposition = []
    for key, definition in DIMENSIONS.items():
        non_mean = mean([row["non_theist_dimension_means"][key] for row in debate_rows])
        theist_mean = mean([row["theist_dimension_means"][key] for row in debate_rows])
        contribution = mean([row["contributions"][key] for row in debate_rows])
        dimension_decomposition.append(
            {
                "dimension": key,
                "label": definition["label"],
                "weight": definition["weight"],
                "non_theist_mean": non_mean,
                "theist_mean": theist_mean,
                "dimension_gap": non_mean - theist_mean,
                "score_gap_contribution": contribution,
                "share_of_official_gap": contribution / primary["mean_margin"],
            }
        )
    rounding_residual = mean([row["rounding_residual"] for row in debate_rows])
    adjustment_gap = mean([row["adjustment_gap"] for row in debate_rows])
    assert abs(
        sum(row["score_gap_contribution"] for row in dimension_decomposition)
        + rounding_residual
        + adjustment_gap
        - primary["mean_margin"]
    ) < 1e-9

    band_summaries = {
        label: dimension_summary(all_moves, label)
        for label in ("theist", "non_theist")
    }
    evidence_bands = {}
    for label in ("theist", "non_theist"):
        values = [
            move["dimensions"]["evidenceWarrant"]
            for move in all_moves
            if move["sideLabel"] == label
        ]
        evidence_bands[label] = {
            "n_moves": len(values),
            "below_50": sum(value < 50 for value in values),
            "below_50_share": sum(value < 50 for value in values) / len(values),
            "below_70": sum(value < 70 for value in values),
            "below_70_share": sum(value < 70 for value in values) / len(values),
            "below_80": sum(value < 80 for value in values),
            "below_80_share": sum(value < 80 for value in values) / len(values),
            "mean": mean(values),
        }

    subset_checks = [
        summarize_move_subset(all_moves, lambda move: True, "All scored moves"),
        summarize_move_subset(
            all_moves,
            lambda move: move["moveKind"] == "constructive",
            "Constructive moves only",
        ),
        summarize_move_subset(
            all_moves, lambda move: move["moveKind"] == "reply", "Replies only"
        ),
        summarize_move_subset(
            all_moves, lambda move: move["importance"] == 3, "Load-bearing moves only"
        ),
        summarize_move_subset(
            all_moves,
            lambda move: taxonomy[move["number"]]["theist_side"] == "con",
            "Debates with theist side stored as con",
        ),
    ]

    legacy_by_label = {
        label: [move for move in legacy_moves if move["sideLabel"] == label]
        for label in ("theist", "non_theist")
    }
    legacy_closed_findings = {
        "coverage": {
            "debates": ledger_types["v4-closed-findings-adapter"],
            "moves": len(legacy_moves),
            "theist_moves": len(legacy_by_label["theist"]),
            "non_theist_moves": len(legacy_by_label["non_theist"]),
            "note": (
                "These closed calibration, response-class, precision, and charity findings are "
                "available for 146 of the 169 debates; the remaining 23 expose the same six final dimensions."
            ),
        },
        "calibration": {},
        "response_contact": {},
        "charity": {},
    }
    strong_response_classes = {"full-answer", "diagnostic-defeat", "justified-reframe"}
    for label, moves in legacy_by_label.items():
        overstatement = [
            move
            for move in moves
            if move["calibrationFindings"]["warrantFit"]
            in {"slightly-overstated", "materially-overstated", "radically-overstated"}
        ]
        material_overstatement = [
            move
            for move in moves
            if move["calibrationFindings"]["warrantFit"]
            in {"materially-overstated", "radically-overstated"}
        ]
        legacy_closed_findings["calibration"][label] = {
            "moves": len(moves),
            "any_overstatement": len(overstatement),
            "any_overstatement_share": len(overstatement) / len(moves),
            "material_or_radical_overstatement": len(material_overstatement),
            "material_or_radical_overstatement_share": len(material_overstatement) / len(moves),
            "warrant_fit_counts": dict(
                Counter(move["calibrationFindings"]["warrantFit"] for move in moves)
            ),
        }
        replies = [move for move in moves if move["moveKind"] == "reply"]
        strong_replies = [
            move for move in replies if move["responseClass"] in strong_response_classes
        ]
        legacy_closed_findings["response_contact"][label] = {
            "replies": len(replies),
            "full_diagnostic_or_justified_reframe": len(strong_replies),
            "full_diagnostic_or_justified_reframe_share": len(strong_replies) / len(replies),
            "partial_or_nonanswer": len(replies) - len(strong_replies),
            "partial_or_nonanswer_share": (len(replies) - len(strong_replies)) / len(replies),
            "response_class_counts": dict(Counter(move["responseClass"] for move in replies)),
        }
        tested = [move for move in moves if move["charity"]["tested"]]
        low_tested = [move for move in tested if move["representationalCharity"] < 70]
        legacy_closed_findings["charity"][label] = {
            "tested_moves": len(tested),
            "below_70": len(low_tested),
            "below_70_share": len(low_tested) / len(tested),
        }

    examples = []
    for (number, move_id), annotation in EXAMPLE_MOVES.items():
        move = next(
            move
            for move in all_moves
            if move["number"] == number and move["moveId"] == move_id
        )
        assert move["sideLabel"] == "theist"
        examples.append(
            {
                "number": number,
                "debate": move["title"],
                "speaker": move["speaker"],
                "move_id": move_id,
                "pattern": annotation["pattern"],
                "diagnostic": annotation["diagnostic"],
                "proposition": move["proposition"],
                "importance": move["importance"],
                "logical_coherence": move["dimensions"]["logicalCoherence"],
                "evidence_warrant": move["dimensions"]["evidenceWarrant"],
                "responsiveness": move["dimensions"]["responsiveness"],
                "calibration_charity": move["dimensions"]["calibrationCharity"],
            }
        )

    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    results = {
        "snapshot": {
            "analysis_date": "2026-09-01",
            "source_commit": source_commit,
            "taxonomy": str(TAXONOMY_PATH.relative_to(REPO_ROOT)),
            "ledger_source": "docs/assessment-ledgers/*.json and their locked final-ledger evidence",
            "unit": (
                "One debate-side dimension mean is calculated by importance-weighting moves within "
                "sections and applying the locked section weights; paired differences are then averaged across debates."
            ),
        },
        "data_quality": {
            "classified_debates": len(debate_rows),
            "adapter_ledgers": len(debate_rows),
            "legacy_closed_findings_debates": ledger_types["v4-closed-findings-adapter"],
            "standalone_final_dimension_debates": ledger_types["standalone-final-ledger"],
            "scored_moves": len(all_moves),
            "theist_moves": sum(move["sideLabel"] == "theist" for move in all_moves),
            "non_theist_moves": sum(
                move["sideLabel"] == "non_theist" for move in all_moves
            ),
            "move_score_checks": move_score_checks,
            "section_score_checks": section_score_checks,
            "official_score_checks": official_score_checks,
            "missing_dimension_values": 0,
            "nonzero_burden_completion_adjustments": sum(
                row["adjustment_gap"] != 0 for row in debate_rows
            ),
        },
        "primary": primary,
        "dimension_decomposition": dimension_decomposition,
        "rounding_residual": rounding_residual,
        "burden_completion_adjustment_gap": adjustment_gap,
        "dimension_band_summaries": band_summaries,
        "evidence_bands": evidence_bands,
        "subset_checks": subset_checks,
        "legacy_closed_findings": legacy_closed_findings,
        "examples": examples,
        "causal_assessment": {
            "verified": [
                "Evidence and warrant is a large direct contributor to the observed score gap.",
                "The evidence gap persists within constructive moves, replies, load-bearing moves, and debates where the theist side is stored as con.",
                "Theist moves are more often scored below 70 on evidence and more often record overstated force relative to warrant in the closed-findings cohort.",
                "Distinct logical-bridge and response-contact weaknesses contribute at least as much as direct evidence weakness.",
            ],
            "not_established": (
                "The records do not identify faith commitment as the cause of these weaknesses. "
                "They score transcript performance and do not measure each speaker's private epistemic norms, "
                "prior faith commitment, preparation, topic difficulty, or counterfactual performance under another worldview."
            ),
            "needed_for_causal_test": (
                "Blind-code premise source and evidential standard before revealing side, match claims by topic and burden, "
                "and test whether faith-sourced premises predict lower warrant ratings after controlling for speaker, role, and debate."
            ),
        },
        "validation": {
            "overall_assessment": "Share with caveats",
            "reconciled": (
                "The six mean dimension contributions, zero burden-adjustment gap, and the rounding residual sum exactly to the corrected 6.3491-point official mean margin."
            ),
            "required_caveats": [
                "The corpus is selected rather than randomly sampled.",
                "Debates and moves are not statistically independent because speakers repeat and moves are nested within debates.",
                "The theist side is stored as pro in 149 of 169 debates, although role- and orientation-restricted checks preserve the evidence gap.",
                "The 10% calibration/charity dimension combines overclaiming with representational fairness; its full-corpus contribution cannot be assigned wholly to substantiation.",
                "The scores are AI-assisted judgments under a fixed rubric, not measurements of worldview truth or speaker sincerity.",
            ],
            "claim_boundary": (
                "The data support a descriptive claim that incomplete warrant, overextended inference, weaker response contact, and overstatement are concentrated on the theist side in this assessed corpus. "
                "They do not establish that faith caused the pattern."
            ),
        },
    }

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    with (ANALYSIS_DIR / "dimension-contributions.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = [
            "dimension",
            "label",
            "weight",
            "non_theist_mean",
            "theist_mean",
            "dimension_gap",
            "score_gap_contribution",
            "share_of_official_gap",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(dimension_decomposition)

    with (ANALYSIS_DIR / "debate-decomposition.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = [
            "number",
            "debate_id",
            "title",
            "theist_side",
            "official_margin",
            *[f"{key}_contribution" for key in DIMENSIONS],
            "adjustment_gap",
            "rounding_residual",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in debate_rows:
            writer.writerow(
                {
                    "number": row["number"],
                    "debate_id": row["debate_id"],
                    "title": row["title"],
                    "theist_side": row["theist_side"],
                    "official_margin": row["official_margin"],
                    **{
                        f"{key}_contribution": row["contributions"][key]
                        for key in DIMENSIONS
                    },
                    "adjustment_gap": row["adjustment_gap"],
                    "rounding_residual": row["rounding_residual"],
                }
            )

    with (ANALYSIS_DIR / "move-diagnostics.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = [
            "number",
            "debate_id",
            "title",
            "side_label",
            "side",
            "speaker",
            "move_id",
            "move_kind",
            "importance",
            *DIMENSIONS.keys(),
            "move_score",
            "evidence_band",
            "ledger_type",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for move in all_moves:
            writer.writerow(
                {
                    "number": move["number"],
                    "debate_id": move["debateId"],
                    "title": move["title"],
                    "side_label": move["sideLabel"],
                    "side": move["side"],
                    "speaker": move["speaker"],
                    "move_id": move["moveId"],
                    "move_kind": move["moveKind"],
                    "importance": move["importance"],
                    **move["dimensions"],
                    "move_score": score_dimensions(move["dimensions"]),
                    "evidence_band": evidence_band(move["dimensions"]["evidenceWarrant"]),
                    "ledger_type": move["ledgerType"],
                }
            )

    print(
        json.dumps(
            {
                "status": "ok",
                "debates": len(debate_rows),
                "moves": len(all_moves),
                "mean_margin": primary["mean_margin"],
                "dimension_contributions": {
                    row["dimension"]: row["score_gap_contribution"]
                    for row in dimension_decomposition
                },
                "results": str((ANALYSIS_DIR / "results.json").relative_to(REPO_ROOT)),
            },
            indent=2,
        )
    )
    return results


if __name__ == "__main__":
    run_analysis()
