#!/usr/bin/env python3
"""Build the publication PDF for the Slugfester speaker-ranking stability study."""

from __future__ import annotations

import ast
import csv
import importlib.util
import json
from pathlib import Path

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
RANKINGS_PATH = ANALYSIS_DIR / "speaker-rankings.csv"
OUTPUT_PATH = REPO_ROOT / "output/pdf/do-slugfester-rankings-measure-stable-performance.pdf"
BASE_PATH = REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/build_pdf.py"

spec = importlib.util.spec_from_file_location("slugfester_report_base", BASE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load report base: {BASE_PATH}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PAGE_W, PAGE_H = letter
LEFT, RIGHT, TOP, BOTTOM = base.LEFT, base.RIGHT, base.TOP, base.BOTTOM
CONTENT_W = base.CONTENT_W

NAVY = base.NAVY
BLUE = base.BLUE
BLUE_DARK = base.BLUE_DARK
BLUE_LIGHT = base.BLUE_LIGHT
TEAL = base.TEAL
TEAL_LIGHT = base.TEAL_LIGHT
GOLD = base.GOLD
GOLD_LIGHT = base.GOLD_LIGHT
RUST = base.RUST
RUST_LIGHT = base.RUST_LIGHT
INK = base.INK
MUTED = base.MUTED
RULE = base.RULE
PAPER = base.PAPER
WHITE = base.WHITE

SectionRule = base.SectionRule
callout = base.callout
metric_strip = base.metric_strip
data_table = base.data_table
bullet = base.bullet


def chart_header(drawing: Drawing, title: str, subtitle: str, width: float) -> None:
    drawing.add(String(0, drawing.height - 14, title, fontName="SLUGSans-Bold", fontSize=10.5, fillColor=NAVY))
    drawing.add(String(0, drawing.height - 28, subtitle, fontName="SLUGSans", fontSize=7.35, fillColor=MUTED))
    drawing.add(Line(0, drawing.height - 34, width, drawing.height - 34, strokeColor=RULE, strokeWidth=0.7))


def eligibility_chart(snapshot: dict) -> Drawing:
    width, height = CONTENT_W, 285
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Speakers retained at each minimum-appearance threshold",
        "157 unique speakers across 212 ranking-eligible one-on-one assessments",
        width,
    )
    rows = [
        ("At least 1 debate", snapshot["threshold_counts"]["1"], BLUE),
        ("At least 3 debates", snapshot["threshold_counts"]["3"], RUST),
        ("At least 5 debates", snapshot["threshold_counts"]["5"], TEAL),
        ("At least 10 debates", snapshot["threshold_counts"]["10"], GOLD),
    ]
    left, right, bottom, top = 125, 24, 44, height - 58
    chart_w = width - left - right
    x_max = 160
    for tick in (0, 40, 80, 120, 160):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.6, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, (label, value, fill) in enumerate(rows):
        y = top - step * (index + 0.5)
        end = left + chart_w * value / x_max
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.6, fillColor=INK))
        drawing.add(Rect(left, y - 8, end - left, 16, fillColor=fill, strokeColor=NAVY, strokeWidth=0.35))
        drawing.add(String(end + 7, y - 3, str(value), fontName="SLUGSans-Bold", fontSize=7.5, fillColor=INK))
    drawing.add(String(width / 2, 14, "The public default of three debates ranks 42 speakers and excludes 115", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.5, fillColor=RUST))
    return drawing


def selected_score_range_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 430
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Observed score ranges for selected repeated speakers",
        "Mean marker and minimum-maximum line; selection spans sample sizes, ranks, and observed variability",
        width,
    )
    selected = [
        "Matt Dillahunty",
        "Alex O'Connor",
        "William Lane Craig",
        "Bart Ehrman",
        "Christopher Hitchens",
        "Michael Jones",
        "Alex Malpass",
        "Michael Huemer",
        "John Lennox",
        "Joseph Schmid",
        "Sean Carroll",
        "Ross Douthat",
    ]
    by_name = {row["speaker"]: row for row in rows}
    plot_rows = [by_name[name] for name in selected]
    left, right, bottom, top = 128, 32, 50, height - 58
    x_min, x_max = 68, 91
    chart_w = width - left - right
    for tick in (70, 75, 80, 85, 90):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.6, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        x1 = left + chart_w * (row["score_min"] - x_min) / (x_max - x_min)
        x2 = left + chart_w * (row["score_max"] - x_min) / (x_max - x_min)
        xm = left + chart_w * (row["mean_score"] - x_min) / (x_max - x_min)
        drawing.add(String(left - 9, y - 3, row["speaker"], textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=BLUE_DARK, strokeWidth=1.8))
        drawing.add(Circle(x1, y, 2.2, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=1))
        drawing.add(Circle(x2, y, 2.2, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=1))
        drawing.add(Circle(xm, y, 4, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(String(x2 + 6, y - 3, f"n={row['appearances']}", fontName="SLUGSans-Bold", fontSize=6.4, fillColor=MUTED))
    drawing.add(String(width / 2, 16, "Score scale shown from 68 to 91; exact endpoints and means are in speaker-rankings.csv", textAnchor="middle", fontName="SLUGSans", fontSize=6.7, fillColor=MUTED))
    return drawing


def reliability_chart(reliability: dict) -> Drawing:
    width, height = CONTENT_W, 300
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Random-effects reliability by number of appearances",
        "Share of score-mean variance attributed to persistent between-speaker differences under the one-way model",
        width,
    )
    rows = [
        ("One debate", reliability["single_score_icc"]),
        ("Mean of 3", reliability["mean_reliability"]["3"]),
        ("Mean of 5", reliability["mean_reliability"]["5"]),
        ("Mean of 10", reliability["mean_reliability"]["10"]),
    ]
    left, right, bottom, top = 110, 32, 48, height - 62
    chart_w = width - left - right
    for tick in (0, 0.25, 0.5, 0.75, 1):
        x = left + chart_w * tick
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, f"{tick:.0%}", textAnchor="middle", fontName="SLUGSans", fontSize=6.6, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, (label, value) in enumerate(rows):
        y = top - step * (index + 0.5)
        end = left + chart_w * value
        fill = RUST if index == 0 else BLUE
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.4, fillColor=INK))
        drawing.add(Rect(left, y - 8, end - left, 16, fillColor=fill, strokeColor=NAVY, strokeWidth=0.35))
        drawing.add(String(end + 7, y - 3, f"{value:.1%}", fontName="SLUGSans-Bold", fontSize=7.4, fillColor=INK))
    drawing.add(String(width / 2, 16, f"Estimated between-speaker SD {reliability['between_speaker_sd']:.2f}; pooled within-speaker SD {reliability['pooled_within_speaker_sd']:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.1, fillColor=NAVY))
    return drawing


def split_half_chart(split: dict) -> Drawing:
    width, height = CONTENT_W, 255
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Random split-half reproducibility among speakers with at least six debates",
        "20,000 within-speaker random partitions; 19 speakers; Spearman rank correlation and top-five overlap",
        width,
    )
    left, right = 76, 32
    chart_w = width - left - right
    x_min, x_max = 0.5, 1.0
    y = 145
    for tick in (0.5, 0.6, 0.7, 0.8, 0.9, 1.0):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, y - 34, x, y + 34, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, y - 49, f"{tick:.1f}", textAnchor="middle", fontName="SLUGSans", fontSize=6.6, fillColor=MUTED))
    low, high = split["spearman_ci_95"]
    x1 = left + chart_w * (low - x_min) / (x_max - x_min)
    x2 = left + chart_w * (high - x_min) / (x_max - x_min)
    xm = left + chart_w * (split["median_spearman"] - x_min) / (x_max - x_min)
    drawing.add(String(left - 10, y - 3, "Rank correlation", textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.3, fillColor=INK))
    drawing.add(Line(x1, y, x2, y, strokeColor=BLUE_DARK, strokeWidth=3))
    drawing.add(Circle(xm, y, 5, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.7))
    drawing.add(String(xm, y + 13, f"median {split['median_spearman']:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=INK))
    drawing.add(String(width / 2, 73, f"Mean top-five overlap: {split['mean_top_five_overlap']:.2f} of 5 speakers", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=9.2, fillColor=NAVY))
    drawing.add(String(width / 2, 51, f"All five match in {split['full_top_five_match_probability']:.1%} of partitions", textAnchor="middle", fontName="SLUGSans", fontSize=7.5, fillColor=MUTED))
    return drawing


def top_ten_score_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 360
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Published mean scores for the current top ten",
        "Current three-debate minimum; focused 84-89 scale with exact means and sample sizes",
        width,
    )
    plot_rows = rows[:10]
    left, right, bottom, top = 120, 44, 52, height - 58
    x_min, x_max = 84, 89
    chart_w = width - left - right
    for tick in (84, 85, 86, 87, 88, 89):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.6, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        x = left + chart_w * (row["mean_score"] - x_min) / (x_max - x_min)
        drawing.add(String(left - 10, y - 3, f"{row['rank']}. {row['speaker']}", textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=INK))
        drawing.add(Line(left, y, x, y, strokeColor=BLUE_LIGHT, strokeWidth=1.6))
        drawing.add(Circle(x, y, 4, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(String(x + 7, y - 3, f"{row['mean_score']:.2f}  n={row['appearances']}", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=INK))
    drawing.add(String(width / 2, 16, "The first-to-tenth difference is 3.53 points; four of the ten have exactly three appearances", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=RUST))
    return drawing


def rank_interval_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 455
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Model-based rank intervals for the current top fifteen",
        "One-way random-effects posterior; line is 95% rank interval, dot is current raw rank",
        width,
    )
    plot_rows = rows[:15]
    left, right, bottom, top = 130, 28, 52, height - 58
    x_min, x_max = 1, 30
    chart_w = width - left - right
    for tick in (1, 5, 10, 15, 20, 25, 30):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        low, high = row["hierarchical_rank_ci_95"]
        x1 = left + chart_w * (max(x_min, low) - x_min) / (x_max - x_min)
        x2 = left + chart_w * (min(x_max, high) - x_min) / (x_max - x_min)
        xc = left + chart_w * (row["rank"] - x_min) / (x_max - x_min)
        drawing.add(String(left - 9, y - 3, f"{row['speaker']}  n={row['appearances']}", textAnchor="end", fontName="SLUGSans", fontSize=6.7, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=BLUE_DARK, strokeWidth=1.8))
        drawing.add(Circle(x1, y, 2.1, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=0.8))
        drawing.add(Circle(x2, y, 2.1, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=0.8))
        drawing.add(Circle(xc, y, 3.6, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.6))
    drawing.add(String(width / 2, 16, "Intervals quantify latent-rank uncertainty inside the selected corpus, not uncertainty about all possible debates", textAnchor="middle", fontName="SLUGSans", fontSize=6.8, fillColor=MUTED))
    return drawing


def sample_uncertainty_scatter(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 340
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Appearance count and model-based rank-interval width",
        "42 ranked speakers; interval width is upper minus lower endpoint of the 95% latent-rank interval",
        width,
    )
    left, right, bottom, top = 56, 28, 52, height - 58
    x_max, y_max = 30, 32
    chart_w, chart_h = width - left - right, top - bottom
    for tick in (0, 5, 10, 15, 20, 25, 30):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.4))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.4, fillColor=MUTED))
    for tick in (0, 8, 16, 24, 32):
        y = bottom + chart_h * tick / y_max
        drawing.add(Line(left, y, width - right, y, strokeColor=RULE, strokeWidth=0.4))
        drawing.add(String(left - 8, y - 3, str(tick), textAnchor="end", fontName="SLUGSans", fontSize=6.4, fillColor=MUTED))
    label_names = {"Matt Dillahunty", "Alex O'Connor"}
    for row in rows:
        interval_width = row["hierarchical_rank_ci_95"][1] - row["hierarchical_rank_ci_95"][0]
        x = left + chart_w * row["appearances"] / x_max
        y = bottom + chart_h * interval_width / y_max
        is_top = row["rank"] <= 10
        drawing.add(Circle(x, y, 3.3, fillColor=RUST if is_top else BLUE_LIGHT, strokeColor=NAVY, strokeWidth=0.6))
        if row["speaker"] in label_names:
            drawing.add(String(x + 5, y + 4, row["speaker"], fontName="SLUGSans", fontSize=5.9, fillColor=INK))
    drawing.add(String(width / 2, 17, "appearances", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def top_ten_probability_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 425
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Probability of top-ten membership for the current top fifteen",
        "20,000 latent-mean draws from the one-way random-effects model",
        width,
    )
    plot_rows = rows[:15]
    left, right, bottom, top = 132, 32, 50, height - 58
    chart_w = width - left - right
    for tick in (0, 0.25, 0.5, 0.75, 1):
        x = left + chart_w * tick
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, f"{tick:.0%}", textAnchor="middle", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        value = row["hierarchical_top_10_probability"]
        end = left + chart_w * value
        drawing.add(String(left - 9, y - 3, f"{row['rank']}. {row['speaker']}", textAnchor="end", fontName="SLUGSans", fontSize=6.7, fillColor=INK))
        drawing.add(Rect(left, y - 6, max(1, end - left), 12, fillColor=BLUE if value >= 0.5 else RUST_LIGHT, strokeColor=NAVY, strokeWidth=0.35))
        drawing.add(String(end + 6, y - 3, f"{value:.1%}", fontName="SLUGSans-Bold", fontSize=6.6, fillColor=INK))
    return drawing


def leave_one_out_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 380
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Largest leave-one-debate-out rank spans",
        "Current 42-speaker field retained; line shows best to worst rank after omitting one observed appearance",
        width,
    )
    plot_rows = sorted(rows, key=lambda row: (-row["leave_one_out_span"], row["speaker"]))[:12]
    left, right, bottom, top = 130, 28, 52, height - 58
    x_min, x_max = 1, 42
    chart_w = width - left - right
    for tick in (1, 10, 20, 30, 40):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        x1 = left + chart_w * (row["leave_one_out_min_rank"] - x_min) / (x_max - x_min)
        x2 = left + chart_w * (row["leave_one_out_max_rank"] - x_min) / (x_max - x_min)
        xb = left + chart_w * (row["rank"] - x_min) / (x_max - x_min)
        drawing.add(String(left - 9, y - 3, f"{row['speaker']}  n={row['appearances']}", textAnchor="end", fontName="SLUGSans", fontSize=6.8, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=BLUE_DARK, strokeWidth=2))
        drawing.add(Circle(xb, y, 3.7, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(String(x2 + 6, y - 3, f"span {row['leave_one_out_span']}", fontName="SLUGSans-Bold", fontSize=6.3, fillColor=MUTED))
    return drawing


def context_rank_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 405
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Raw-score rank and within-debate-margin rank for the largest shifts",
        "Same 42 speakers; blue is published mean-score rank, rust is mean score-minus-opponent rank",
        width,
    )
    plot_rows = sorted(rows, key=lambda row: (-abs(row["margin_rank"] - row["rank"]), row["speaker"]))[:12]
    left, right, bottom, top = 130, 28, 52, height - 58
    x_min, x_max = 1, 42
    chart_w = width - left - right
    for tick in (1, 10, 20, 30, 40):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        xr = left + chart_w * (row["rank"] - x_min) / (x_max - x_min)
        xm = left + chart_w * (row["margin_rank"] - x_min) / (x_max - x_min)
        drawing.add(String(left - 9, y - 3, row["speaker"], textAnchor="end", fontName="SLUGSans", fontSize=6.8, fillColor=INK))
        drawing.add(Line(min(xr, xm), y, max(xr, xm), y, strokeColor=RULE, strokeWidth=1.8))
        drawing.add(Circle(xr, y, 3.6, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(Circle(xm, y, 3.6, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(String(xr, y + 9, str(row["rank"]), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=5.8, fillColor=BLUE_DARK))
        drawing.add(String(xm, y - 13, str(row["margin_rank"]), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=5.8, fillColor=RUST))
    return drawing


def alternative_metric_chart(context: dict) -> Drawing:
    width, height = CONTENT_W, 270
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Rank agreement under three reasonable adjustments",
        "Spearman correlation with raw mean-score order; labels report current top-ten overlap",
        width,
    )
    rows = [
        ("Random-effects shrinkage", context["raw_vs_shrunken_spearman"], context["raw_shrunken_top_ten_overlap"]),
        ("Generation-centered score", context["raw_vs_generation_adjusted_spearman"], context["raw_generation_adjusted_top_ten_overlap"]),
        ("Within-debate mean margin", context["raw_vs_margin_spearman"], context["raw_margin_top_ten_overlap"]),
    ]
    left, right, bottom, top = 150, 36, 50, height - 60
    x_min, x_max = 0.8, 1.0
    chart_w = width - left - right
    for tick in (0.8, 0.85, 0.9, 0.95, 1.0):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, f"{tick:.2f}", textAnchor="middle", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, (label, value, overlap) in enumerate(rows):
        y = top - step * (index + 0.5)
        x = left + chart_w * (value - x_min) / (x_max - x_min)
        drawing.add(String(left - 9, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.2, fillColor=INK))
        drawing.add(Line(left, y, x, y, strokeColor=BLUE_LIGHT, strokeWidth=2))
        drawing.add(Circle(x, y, 4.5, fillColor=BLUE if overlap == 10 else RUST, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(String(x + 8, y - 3, f"rho={value:.3f}; top ten {overlap}/10", fontName="SLUGSans-Bold", fontSize=6.7, fillColor=INK))
    drawing.add(String(width / 2, 16, "Focused correlation scale from 0.80 to 1.00", textAnchor="middle", fontName="SLUGSans", fontSize=6.8, fillColor=MUTED))
    return drawing


def first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, PAGE_W, 0.12 * inch, fill=1, stroke=0)
    canvas.restoreState()


def later_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, PAGE_H - 0.43 * inch, PAGE_W - RIGHT, PAGE_H - 0.43 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("SLUGSans-Bold", 6.8)
    canvas.drawString(LEFT, PAGE_H - 0.33 * inch, "SLUGFESTER CORPUS-LEVEL ANALYSIS")
    canvas.setFont("SLUGSans", 6.8)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 0.33 * inch, "SPEAKER-RANKING STABILITY")
    canvas.line(LEFT, 0.40 * inch, PAGE_W - RIGHT, 0.40 * inch)
    canvas.drawString(LEFT, 0.25 * inch, "September 1, 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, str(doc.page))
    canvas.restoreState()


def load_ranking_rows() -> list[dict]:
    numeric_int = {
        "rank", "appearances", "closed_appearances", "standalone_appearances",
        "margin_rank", "generation_adjusted_rank", "shrunken_rank",
        "leave_one_out_min_rank", "leave_one_out_max_rank", "leave_one_out_span",
        "leave_one_out_max_absolute_shift", "base_rank",
    }
    numeric_float = {
        "mean_score", "median_score", "score_sd", "score_min", "score_max", "score_range",
        "mean_opponent_score", "mean_margin", "ranking_value", "generation_adjusted_mean",
        "shrinkage_weight", "shrunken_mean", "bootstrap_rank_median",
        "bootstrap_top_10_probability", "hierarchical_mean", "hierarchical_mean_sd",
        "hierarchical_rank_median", "hierarchical_top_10_probability",
    }
    interval_fields = {"bootstrap_mean_ci_95", "bootstrap_rank_ci_95", "hierarchical_rank_ci_95"}
    with RANKINGS_PATH.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        for field in numeric_int:
            row[field] = int(float(row[field]))
        for field in numeric_float:
            row[field] = float(row[field])
        for field in interval_fields:
            row[field] = [float(value) for value in ast.literal_eval(row[field])]
    return rows


def build_story(results: dict, rows: list[dict], styles: dict) -> list:
    snapshot = results["snapshot"]
    descriptive = results["descriptive_stability"]
    reliability = results["reliability"]
    split = results["split_half"]
    uncertainty = results["rank_uncertainty"]
    context = results["context_sensitivity"]
    story = []

    # 1. Cover
    story.extend([
        Spacer(1, 0.34 * inch),
        Paragraph("CORPUS-LEVEL MEASUREMENT PAPER", styles["cover_kicker"]),
        Paragraph("Do Slugfester Rankings Measure Stable Performance?", styles["cover_title"]),
        Paragraph(
            "Why broad score bands are defensible while exact numbered positions remain provisional",
            styles["cover_subtitle"],
        ),
        Paragraph(
            "REPORT DATE  ·  SEPTEMBER 1, 2026 &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "RANKING CORPUS  ·  212 DEBATES / 424 APPEARANCES &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "CURRENT FIELD  ·  42 SPEAKERS WITH 3+ DEBATES",
            styles["cover_meta"],
        ),
        SectionRule(color=GOLD),
        Spacer(1, 8),
        Paragraph(
            "<b>Answer.</b> Yes, the published rankings contain a substantial repeatable speaker-performance signal. Among the 42 speakers who meet the current three-debate minimum, a one-way random-effects model assigns 60.0% of single-appearance score variance to persistent between-speaker differences. The estimated reliability rises to 81.8% for a three-debate mean, 88.2% for five, and 93.7% for ten.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "The ordinal positions are much less stable. The first and tenth raw averages differ by only 3.53 points, 38 of 41 adjacent gaps are under one point, and the median model-based 95% rank interval spans 17.5 places. Removing one observed debate moves a speaker across a median four-place range; 19 of 42 span at least five places.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "The correct interpretation is therefore layered. The scorecards support broad claims about consistently stronger and weaker recorded performance, especially for speakers with larger samples. They do not support treating rank 6 as demonstrably better than rank 7, or a three-debate leader as a settled estimate of context-independent debating ability.",
            styles["cover_abstract"],
        ),
        Spacer(1, 7),
        callout(
            "Strongest defensible conclusion",
            "Slugfester's rankings are <b>useful descriptive summaries with a real stable component, but exact rank numbers overstate precision</b>. The defensible unit is a sample-qualified performance band, not an ability ladder whose neighboring positions have been statistically separated.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Spacer(1, 7),
        Paragraph(
            "<i>The analysis concerns scores in the selected Slugfester corpus. It does not measure truth, expertise, general intelligence, persuasion, or performance in debates that were not assessed.</i>",
            styles["caption"],
        ),
        PageBreak(),
    ])

    # 2. Technical summary
    story.extend([
        Paragraph("Technical summary", styles["h1"]),
        Paragraph(
            "The public Rankings page orders speakers by the arithmetic mean of their published overall side scores in ranking-eligible one-on-one debates. This paper separates three questions: whether scores contain persistent speaker signal, whether a speaker's estimated mean is reliable, and whether the resulting exact rank position is stable.",
            styles["body"],
        ),
        metric_strip([
            ("0.60", "single-appearance intraclass correlation under the one-way model"),
            ("0.83", "median split-half rank correlation among 19 speakers with at least six debates"),
            ("17.5", "median width in places of the model-based 95% rank interval"),
        ], styles),
        Spacer(1, 8),
        Paragraph("What is stable", styles["h2"]),
        bullet("Between-speaker variation is larger than within-speaker variation: estimated SDs are 3.83 and 3.13 score points, respectively.", styles),
        bullet("Across 20,000 random split halves for 19 speakers with six or more appearances, median rank correlation is 0.83, with a central 95% range from 0.74 to 0.91.", styles),
        bullet("The two halves share an average 4.51 of the top five speakers; all five match in 54.4% of partitions.", styles),
        Paragraph("What is provisional", styles["h2"]),
        bullet("Only 42 of 157 observed speakers meet the public three-debate threshold, and 14 of those 42 sit exactly at three appearances.", styles),
        bullet("The top ten are compressed into 3.53 points. Four are based on exactly three debates, and only six have at least a 90% modeled probability of remaining in the top ten.", styles),
        bullet("Changing from raw average to within-debate mean margin preserves a strong overall association but replaces three members of the top ten.", styles),
        callout(
            "Decision-useful reading",
            "Use the rankings to identify broad, repeatedly observed performance bands and to open the underlying scorecards. Do not interpret a one-place difference as evidence of a real ability difference unless the samples and uncertainty support it.",
            styles,
        ),
        PageBreak(),
    ])

    # 3. Definition
    story.extend([
        Paragraph("A ranking can carry signal without fixing an exact order", styles["h1"]),
        Paragraph(
            "Three distinct properties are often compressed into the word <i>stable</i>. <b>Score signal</b> asks whether the same speaker tends to receive similar scores across appearances. <b>Mean reliability</b> asks how much a speaker's observed average would move under another comparable sample. <b>Rank stability</b> asks whether the ordering against every other eligible speaker would remain the same. The third requirement is much harder because small mean changes can reorder a dense field.",
            styles["body"],
        ),
        data_table(
            ["Property", "Question", "Paper's diagnostic"],
            [
                ["Persistent signal", "Do speakers differ beyond appearance-to-appearance variation?", "Variance components and single-score ICC"],
                ["Mean reliability", "Does averaging more appearances reduce noise?", "Reliability at 3, 5, and 10 debates"],
                ["Ordering reproducibility", "Would another half-sample preserve the ranking?", "20,000 split-half partitions"],
                ["Position uncertainty", "How wide is each plausible rank band?", "Empirical bootstrap and hierarchical rank draws"],
                ["Context sensitivity", "Does another reasonable performance summary reorder speakers?", "Margin, generation, and shrinkage comparisons"],
            ],
            [112, 190, 146],
            styles,
            first_bold=True,
        ),
        Spacer(1, 9),
        callout(
            "The central distinction",
            "A three-debate mean can be a fairly reliable estimate on a 50-100 score scale while still producing a wide rank interval. Reliability concerns the value; rank precision also depends on how tightly every speaker's value is packed around it.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        Paragraph("What the public number means", styles["h2"]),
        Paragraph(
            "The displayed average is the arithmetic mean of a speaker's published side scores. Team and panel scorecards are excluded. Opponent quality, topic, affirmative burden, debate year, and assessment generation remain visible context but are not coefficients in the public average. The site already labels samples of one to three as limited, four to six as developing, and larger samples as established; this paper tests how much those cautions matter.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 4. Scope
    story.extend([
        Paragraph("The current ranked field is selective and sample-thin", styles["h1"]),
        Paragraph(
            "The September 1 snapshot contains 212 ranking-eligible one-on-one assessments and 424 speaker appearances from 157 unique speakers. Eighty-three speakers appear once and 32 appear twice. The default minimum therefore excludes 115 speakers - 73.2% of everyone observed - and retains 42.",
            styles["body"],
        ),
        eligibility_chart(snapshot),
        Paragraph(
            "<i>Figure 1. Thresholds change both field size and interpretive confidence. Raising the minimum from three to five nearly halves the field, from 42 to 22; only seven speakers have ten or more appearances.</i>",
            styles["caption"],
        ),
        Paragraph(
            "The ranking is therefore not a census of public debaters. It is a summary of speakers who happen to recur in a selected debate catalogue. A high minimum improves stability but magnifies selection toward prolific figures and heavily represented topic communities.",
            styles["body"],
        ),
        callout(
            "Coverage tradeoff",
            "Lower thresholds broaden participation but produce more provisional estimates. Higher thresholds improve precision but answer a narrower question about the small group of speakers repeatedly represented in the corpus.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 5. Within speaker variation
    story.extend([
        Paragraph("Individual speakers vary meaningfully from debate to debate", styles["h1"]),
        Paragraph(
            f"Across the 42 ranked speakers, the median within-speaker SD is {descriptive['median_within_speaker_sd']:.2f} points and the pooled SD is {descriptive['pooled_within_speaker_sd']:.2f}. The median observed score range is {descriptive['median_observed_range']:.0f} points. Twelve speakers span at least 10 points and one spans at least 15.",
            styles["body"],
        ),
        selected_score_range_chart(rows),
        Paragraph(
            "<i>Figure 2. The selected speakers illustrate why one lifetime average cannot erase debate context. Larger samples can reveal wider ranges simply because they expose more topics and opponents; a narrow three-case range is not proof of universal consistency.</i>",
            styles["caption"],
        ),
        Paragraph(
            "The variation is substantively plausible. A speaker can face a different burden, opponent, format, or topic, and can perform better or worse on the day. The score is designed to assess the argument in a transcript, not to recover a context-free personal trait.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 6. Reliability
    story.extend([
        Paragraph("Averaging several appearances recovers a strong speaker signal", styles["h1"]),
        Paragraph(
            "The one-way random-effects decomposition estimates between-speaker variance of 14.67 score points squared and within-speaker variance of 9.79. That corresponds to SDs of 3.83 and 3.13. The single-appearance intraclass correlation is 0.60: a majority of variance in this selected repeated-speaker sample aligns with persistent speaker differences rather than within-speaker fluctuation.",
            styles["body"],
        ),
        reliability_chart(reliability),
        Paragraph(
            "<i>Figure 3. Under the model, averaging reduces the within-speaker component by the number of appearances. The estimated reliability of the mean reaches 81.8% at three debates, 88.2% at five, and 93.7% at ten.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This is evidence against the claim that rankings are arbitrary. It is not a warrant for exact positions. The model assumes appearances are exchangeable observations around a speaker-specific mean, while the actual catalogue selects topics, opponents, and generations non-randomly.",
            styles["body"],
        ),
        callout(
            "Signal is not separation",
            "A reliable average may still be statistically indistinguishable from several nearby averages. Reliability tells us that the number carries information; separation tells us whether its precise ordinal location is defensible.",
            styles,
        ),
        PageBreak(),
    ])

    # 7. Split half
    story.extend([
        Paragraph("Independent-looking halves largely reproduce the broad order", styles["h1"]),
        Paragraph(
            "For the 19 speakers with at least six debates, the analysis randomly divides each speaker's observed scores into two halves and ranks the resulting half-means. Across 20,000 partitions, the median Spearman correlation is 0.83 and the central 95% range is 0.74 to 0.91.",
            styles["body"],
        ),
        split_half_chart(split),
        Paragraph(
            "<i>Figure 4. The split halves agree strongly on the overall order and share an average 4.51 of the top five speakers. The exact top five match only 54.4% of the time, illustrating the difference between broad reproducibility and exact membership.</i>",
            styles["caption"],
        ),
        Paragraph(
            "The test deliberately focuses on speakers with enough appearances to form two minimally useful halves. It cannot validate the 23 ranked speakers with only three to five debates, and it is not a temporal forecast because the partitions are random rather than earlier-versus-later career periods.",
            styles["body"],
        ),
        callout(
            "What this establishes",
            "The strongest repeatedly observed speakers tend to remain strong when their existing records are divided. The test supports performance tiers more clearly than it supports the exact composition or order of a short leaderboard.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 8. Dense ranking
    story.extend([
        Paragraph("The top of the published list is densely packed", styles["h1"]),
        Paragraph(
            "The current leader averages 88.33 and the tenth-ranked speaker 84.80, a difference of 3.53 points. Across the full 42-speaker list, 38 of 41 adjacent gaps are under one point; the median adjacent gap is only 0.33. Tiny changes in an average can therefore cross several neighbors.",
            styles["body"],
        ),
        top_ten_score_chart(rows),
        Paragraph(
            "<i>Figure 5. The focused scale makes the actual separation visible. Four of the current top ten - Joseph Schmid, Scott Clifton, Sean Carroll, and Lance Bush - have exactly three appearances, while Matt Dillahunty and Alex O'Connor have 27 and 26.</i>",
            styles["caption"],
        ),
        Paragraph(
            "A one-decimal display is arithmetically accurate but can be read as more epistemically precise than the sample permits. The rank number magnifies that problem because it converts a 0.1-point change into a visible ordinal event.",
            styles["body"],
        ),
        callout(
            "Precision mismatch",
            "The calculation can distinguish 86.1 from 86.0 without the evidence establishing that the underlying speakers differ. Numerical resolution is not the same as inferential resolution.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 9. Rank intervals
    story.extend([
        Paragraph("Model-based rank bands are wide even near the top", styles["h1"]),
        Paragraph(
            "A hierarchical one-way model shrinks small samples toward the ranked-field mean and draws each speaker's latent mean from its posterior uncertainty. It is more conservative than simply resampling the three observed scores of a three-debate speaker, because it uses the pooled within-speaker variance rather than treating a narrow three-case range as complete knowledge.",
            styles["body"],
        ),
        rank_interval_chart(rows),
        Paragraph(
            "<i>Figure 6. The intervals do not say every rank is equally plausible. They show that several current top-ten speakers plausibly trade places with nearby speakers. Even the strongest records support bands more naturally than exact ordinal claims.</i>",
            styles["caption"],
        ),
        Paragraph(
            f"Across all 42 speakers, the median interval spans {uncertainty['hierarchical_model']['median_rank_interval_width']:.1f} places and 35 intervals span at least 10. The model produces 1,340 distinct top-ten sets in 20,000 draws; the most common complete set appears only 21.7% of the time.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 10. Sample size
    story.extend([
        Paragraph("Larger samples narrow rank uncertainty, but do not eliminate it", styles["h1"]),
        Paragraph(
            "Appearance count and hierarchical interval width have a Spearman association of -0.59. The median width is 21.5 places among speakers with three or four appearances, 18 among those with five to nine, and 10 among the seven speakers with at least ten.",
            styles["body"],
        ),
        sample_uncertainty_scatter(rows),
        Paragraph(
            "<i>Figure 7. Each point is one ranked speaker. Rust marks the current top ten. The downward pattern reflects the direct precision benefit of repeated observations, while vertical spread at the same sample size reflects different locations and crowding in the field.</i>",
            styles["caption"],
        ),
        Paragraph(
            "More appearances are not automatically more representative. The same prolific speaker may recur against a narrow opponent community or on a narrow topic. Sample size reduces arithmetic noise; it does not by itself solve selection bias.",
            styles["body"],
        ),
        callout(
            "Why the minimum matters",
            "The current three-debate threshold is defensible as an entry point if paired with a strong limited-sample warning. It is too low to make exact ordering the primary visual message.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 11. Membership probability
    story.extend([
        Paragraph("Most current leaders remain plausible, but the boundary is porous", styles["h1"]),
        Paragraph(
            "The model gives six of the current top ten at least a 90% probability of remaining in the top ten: Joseph Schmid, Scott Clifton, Alex Malpass, Matt Dillahunty, Bart Ehrman, and Alex O'Connor. The remaining four are credible leaders but sit closer to the boundary under uncertainty.",
            styles["body"],
        ),
        top_ten_probability_chart(rows),
        Paragraph(
            "<i>Figure 8. Probability falls gradually rather than at the published tenth-place line. Graham Oppy, Lance Bush, and Sean Carroll retain substantial modeled top-ten probability, while Stephen Law and Daniel Dennett remain credible entrants from just below it.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This is exactly the situation in which tiers communicate better than a hard cutoff. A leading band can acknowledge strong evidence without pretending that the tenth and eleventh observations occupy categorically different performance classes.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 12. Leave one out
    story.extend([
        Paragraph("One observed debate can move many speakers several places", styles["h1"]),
        Paragraph(
            "The leave-one-debate-out check recomputes one speaker's mean after omitting each appearance in turn while leaving the other 41 means fixed. The median best-to-worst span is four places, and 19 speakers span at least five. A three-debate speaker would also fall below the public eligibility threshold if any appearance disappeared.",
            styles["body"],
        ),
        leave_one_out_chart(rows),
        Paragraph(
            "<i>Figure 9. Ross Douthat has the largest observed range and correspondingly large rank sensitivity. Several other speakers move far enough to cross common top-ten or top-half boundaries when one debate is omitted.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This check is deterministic and easy to audit. It does not imagine new debate contexts; it only asks how much influence each already-published assessment has. For small samples it is therefore a minimum warning, not a complete uncertainty estimate.",
            styles["body"],
        ),
        callout(
            "Practical display rule",
            "When a speaker's rank moves materially under leave-one-out analysis, the site should foreground the score range and underlying debates rather than the exact place number.",
            styles,
        ),
        PageBreak(),
    ])

    # 13. Context
    story.extend([
        Paragraph("A different reasonable performance question changes the order", styles["h1"]),
        Paragraph(
            "Raw average score asks how highly the speaker's sides were scored. Mean margin asks how far those sides finished above or below their opponents in the same debates. The two rankings are strongly related, with Spearman rho 0.879, but only seven current top-ten speakers remain in the margin top ten.",
            styles["body"],
        ),
        context_rank_chart(rows),
        Paragraph(
            "<i>Figure 10. Sean Carroll's raw rank is 7 but his mean-margin rank is 21 because his three debates were high-scoring on both sides. Michael Shermer moves from 19 to 6, and Richard Dawkins from 18 to 8, because their mean margins are stronger than their raw averages alone suggest.</i>",
            styles["caption"],
        ),
        Paragraph(
            "Neither metric is the uniquely correct measure of ability. Raw score rewards absolute rubric performance; margin embeds opponent and debate context. Their disagreement demonstrates that a leaderboard is partly a choice about what question deserves ordering.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 14. Generation and shrinkage
    story.extend([
        Paragraph("Generation centering and shrinkage preserve the broad raw ranking", styles["h1"]),
        Paragraph(
            "The earlier assessment generation averages 81.32 per appearance and the later generation 78.17. Centering each appearance on its generation mean produces rho 0.985 with the raw order and preserves all ten current top-ten members. A one-way empirical-Bayes shrinkage adjustment produces rho 0.998 and also preserves all ten.",
            styles["body"],
        ),
        alternative_metric_chart(context),
        Paragraph(
            "<i>Figure 11. The raw ranking is robust to two measurement-focused adjustments. It is less invariant to the substantive choice between absolute score and within-debate relative performance.</i>",
            styles["caption"],
        ),
        data_table(
            ["Adjustment", "Rank rho", "Top-ten overlap", "Largest observed rank movement"],
            [
                ["Generation-centered score", "0.985", "10 of 10", "Richard Dawkins: 18 to 12"],
                ["Random-effects shrinkage", "0.998", "10 of 10", "Two places"],
                ["Mean within-debate margin", "0.879", "7 of 10", "Sean Carroll: 7 to 21"],
            ],
            [150, 70, 84, 144],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        callout(
            "Robust broad signal",
            "The ranking is not an artifact of the known assessment-generation shift or of unshrunk three-case extremes. Its main vulnerability is not disappearance of the speaker signal; it is overinterpretation of exact positions and under-description of debate context.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 15. Methods and limits
    story.extend([
        Paragraph("Methods, uncertainty, limitations, and recommended practice", styles["h1"]),
        Paragraph("Analysis steps", styles["h2"]),
        bullet("Reproduce the public ranking eligibility rule: one avatar-recognized speaker per side, no scorecard explicitly marked ineligible, and at least three appearances for the default field.", styles),
        bullet("Extract 424 side-level appearances from 212 one-on-one assessments, including raw score, opponent score, score margin, and locked assessment generation.", styles),
        bullet("Estimate a one-way random-effects variance decomposition across the 277 appearances belonging to the 42 currently ranked speakers.", styles),
        bullet("Run 20,000 random split-half partitions for 19 speakers with at least six appearances; compute Spearman order agreement and top-five overlap.", styles),
        bullet("Run 20,000 empirical resamples and 20,000 hierarchical latent-mean draws; report model-based rank intervals rather than treating empirical three-case variation as exhaustive.", styles),
        bullet("Recompute ranks under leave-one-out omission, generation centering, random-effects shrinkage, and within-debate mean margin.", styles),
        Paragraph("Principal limitations", styles["h2"]),
        data_table(
            ["Limitation", "Consequence"],
            [
                ["Selected debate catalogue", "Results do not generalize automatically to all speakers or future debates"],
                ["Non-random topics and opponents", "Within-speaker variation is not pure measurement error"],
                ["One-way normal model", "Rank intervals depend on exchangeability and distribution assumptions"],
                ["Random, not temporal, split halves", "Reproducibility is not a career-stability or forecasting test"],
                ["Known assessment-generation shift", "Raw absolute averages should retain generation context"],
                ["AI-assisted published scores", "All estimates inherit model judgment error and later reassessment risk"],
            ],
            [156, 292],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        callout(
            "Recommended practice and next test",
            "Keep the public averages, but pair them with model-based rank bands, leave-one-out sensitivity, and a stronger visual distinction between limited, developing, and established samples. Repeat the paper after the planned full-corpus reassessment, then prospectively test whether present bands predict scores in newly added debates.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 16. Conclusion
    story.extend([
        Paragraph("Conclusion: the rankings measure performance, but not to the precision their exact order implies", styles["h1"]),
        Paragraph(
            "<b>The current Slugfester rankings are neither arbitrary nor final. They detect a real, repeatable speaker-level pattern in the published scorecards. Persistent between-speaker variation exceeds within-speaker variation, modeled mean reliability rises quickly with repeated appearances, and broad rank order reproduces strongly across random halves of the better-sampled records.</b>",
            styles["conclusion"],
        ),
        Paragraph(
            "That positive result makes the qualification more important, not less. Rank is a relative statistic: it depends not only on one speaker's uncertainty but on every nearby speaker's uncertainty. The top ten occupy only 3.53 score points, almost every adjacent gap is below one point, and the median modeled rank interval spans 17.5 places. A calculation can be exact to one decimal while the ordering it produces remains provisional.",
            styles["body"],
        ),
        Paragraph(
            "The evidence therefore supports a hierarchy of claims. It strongly supports saying that some repeatedly observed speakers occupy a leading performance band and others a lower band in this corpus. It moderately supports top-ten membership for most current leaders. It weakly supports claims about neighboring positions, especially when one or both speakers have only three to five debates. It does not support a context-free ranking of debating ability, philosophical truth, expertise, or personal worth.",
            styles["body"],
        ),
        Paragraph(
            "Alternative specifications reinforce this reading. Correcting the known generation shift or shrinking small samples preserves the broad raw order and the complete top ten. Switching to within-debate margin changes three top-ten members, showing that context and metric choice matter more than the measurement correction itself. The stable object is the broad score pattern, not one uniquely privileged ordinal list.",
            styles["body"],
        ),
        callout(
            "Strongest defensible conclusion",
            "Slugfester's rankings measure a meaningful and repeatable component of recorded argumentative performance. They should be presented as <b>uncertain, sample-qualified performance bands</b>. Exact place numbers are useful navigation and description, but they are not demonstrated separations between neighboring speakers.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Paragraph("Recommended public interpretation", styles["h2"]),
        bullet("Preserve raw averages and access to every underlying scorecard.", styles),
        bullet("Display rank intervals or tiers beside exact positions, especially below ten appearances.", styles),
        bullet("Make limited, developing, and established sample status visually primary rather than auxiliary.", styles),
        bullet("Offer within-debate margin and assessment-generation context as alternate views, not silent replacements.", styles),
        bullet("Rerun the analysis after the planned roughly twice-yearly corpus reassessment and test new debates prospectively.", styles),
        Spacer(1, 7),
        SectionRule(color=TEAL),
        Spacer(1, 7),
        Paragraph(
            "<b>Recommended citation:</b> SLUGFESTER. <i>Do Slugfester Rankings Measure Stable Performance? Why Broad Score Bands Are Defensible While Exact Numbered Positions Remain Provisional.</i> Corpus-level analysis report, September 1, 2026.",
            styles["caption"],
        ),
    ])
    return story


def build_pdf() -> Path:
    base.register_fonts()
    styles = base.make_styles()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)
    rows = load_ranking_rows()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(
        LEFT,
        BOTTOM,
        CONTENT_W,
        PAGE_H - TOP - BOTTOM,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="body",
    )
    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Do Slugfester Rankings Measure Stable Performance?",
        author="SLUGFESTER",
        subject="Corpus-level analysis of speaker-score reliability, rank uncertainty, and ranking sensitivity",
        creator="SLUGFESTER corpus-level analysis pipeline",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=first_page, autoNextPageTemplate="body"),
        PageTemplate(id="body", frames=[frame], onPage=later_page),
    ])
    doc.build(build_story(results, rows, styles))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
