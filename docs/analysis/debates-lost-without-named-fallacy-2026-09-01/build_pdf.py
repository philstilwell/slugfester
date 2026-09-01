#!/usr/bin/env python3
"""Build the publication PDF for the named-fallacy and debate-loss study."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
OUTPUT_PATH = REPO_ROOT / "output/pdf/debates-are-usually-lost-without-a-named-fallacy.pdf"
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


DIMENSIONS = [
    ("logicalCoherence_contribution", "Logical coherence"),
    ("evidenceWarrant_contribution", "Evidence and warrant"),
    ("responsiveness_contribution", "Responsiveness"),
    ("calibrationCharity_contribution", "Calibration and charity"),
    ("precisionClarity_contribution", "Precision and clarity"),
    ("relevanceBurden_contribution", "Relevance and burden"),
]


def chart_header(drawing: Drawing, title: str, subtitle: str, width: float) -> None:
    drawing.add(String(0, drawing.height - 14, title, fontName="SLUGSans-Bold", fontSize=10.5, fillColor=NAVY))
    drawing.add(String(0, drawing.height - 28, subtitle, fontName="SLUGSans", fontSize=7.35, fillColor=MUTED))
    drawing.add(Line(0, drawing.height - 34, width, drawing.height - 34, strokeColor=RULE, strokeWidth=0.7))


def primary_share_chart(primary: dict) -> Drawing:
    width, height = CONTENT_W, 210
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Named-fallacy status of the lower-scoring side",
        "220 decisive assessments; presence means at least one accepted fallacy tag on a public move card",
        width,
    )
    left, right, y, bar_h = 22, 22, 87, 46
    chart_w = width - left - right
    total = primary["decisive_debates"]
    no_count = primary["lower_side_without_fallacy"]
    yes_count = total - no_count
    no_w = chart_w * no_count / total
    drawing.add(Rect(left, y, no_w, bar_h, fillColor=BLUE, strokeColor=WHITE, strokeWidth=0.8))
    drawing.add(Rect(left + no_w, y, chart_w - no_w, bar_h, fillColor=RUST, strokeColor=WHITE, strokeWidth=0.8))
    drawing.add(String(left + no_w / 2, y + 27, f"{no_count} debates", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=12, fillColor=WHITE))
    drawing.add(String(left + no_w / 2, y + 12, f"{no_count / total:.1%} without a tag", textAnchor="middle", fontName="SLUGSans", fontSize=8, fillColor=WHITE))
    drawing.add(String(left + no_w + (chart_w - no_w) / 2, y + 27, f"{yes_count} debates", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=12, fillColor=WHITE))
    drawing.add(String(left + no_w + (chart_w - no_w) / 2, y + 12, f"{yes_count / total:.1%} with a tag", textAnchor="middle", fontName="SLUGSans", fontSize=8, fillColor=WHITE))
    low, high = primary["lower_side_without_fallacy_ci_95"]
    drawing.add(String(width / 2, 59, f"Wilson 95% interval for the fallacy-free share: {low:.1%} to {high:.1%}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.6, fillColor=INK))
    drawing.add(String(width / 2, 23, f"Eight tied assessments are excluded from winner-loser classification", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def cohort_contrast_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 350
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Fallacy-free losses and fallacy-tag density by assessment cohort",
        "Left panel: share of decisive debates; right panel: share of all public move cards",
        width,
    )
    panels = [
        (20, 0.0, 1.0, "Lower side has no fallacy tag", "lower_side_without_fallacy_share", lambda v: f"{v:.1%}", BLUE),
        (width / 2 + 34, 0.0, 0.25, "Moves carrying a fallacy tag", "fallacy_tagged_move_rate", lambda v: f"{v:.1%}", RUST),
    ]
    panel_w = width / 2 - 54
    labels = {
        "closed": "Earlier closed",
        "standalone": "Later standalone",
        "no_ledger": "No locked ledger",
    }
    for x0, x_min, x_max, title, key, formatter, fill in panels:
        drawing.add(String(x0 + panel_w / 2, height - 59, title, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.6, fillColor=INK))
        bottom, top = 50, height - 84
        for tick_ratio in (0, 0.25, 0.5, 0.75, 1):
            x = x0 + panel_w * tick_ratio
            value = x_min + (x_max - x_min) * tick_ratio
            drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.4))
            drawing.add(String(x, bottom - 13, formatter(value), textAnchor="middle", fontName="SLUGSans", fontSize=6.2, fillColor=MUTED))
        step = (top - bottom) / len(rows)
        for index, row in enumerate(rows):
            y = top - step * (index + 0.5)
            value = row[key]
            end = x0 + panel_w * (value - x_min) / (x_max - x_min)
            drawing.add(String(x0 - 7, y - 3, labels[row["cohort"]], textAnchor="end", fontName="SLUGSans", fontSize=6.7, fillColor=INK))
            drawing.add(Rect(x0, y - 7, max(1, end - x0), 14, fillColor=fill, strokeColor=fill))
            drawing.add(String(end + 5, y - 3, formatter(value), fontName="SLUGSans-Bold", fontSize=6.7, fillColor=INK))
    drawing.add(Line(width / 2, 35, width / 2, height - 48, strokeColor=RULE, strokeWidth=0.7))
    drawing.add(String(width / 2, 17, "Annotation density, not debate logic alone, changes the observed absence rate", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=RUST))
    return drawing


def presence_pattern_chart(primary: dict) -> Drawing:
    width, height = CONTENT_W, 250
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Which side carries at least one named fallacy?",
        "Mutually exclusive status across 220 decisive assessments",
        width,
    )
    parts = [
        ("Neither side", primary["neither_side_with_fallacy"], BLUE),
        ("Only lower side", primary["only_lower_side_with_fallacy"], RUST),
        ("Both sides", primary["both_sides_with_fallacy"], GOLD),
        ("Only higher side", primary["only_higher_side_with_fallacy"], TEAL),
    ]
    total = primary["decisive_debates"]
    left, right, y, bar_h = 20, 20, 105, 42
    chart_w = width - left - right
    x = left
    for label, count, fill in parts:
        part_w = chart_w * count / total
        drawing.add(Rect(x, y, part_w, bar_h, fillColor=fill, strokeColor=WHITE, strokeWidth=0.8))
        if part_w > 35:
            text_color = WHITE if fill not in (GOLD,) else INK
            drawing.add(String(x + part_w / 2, y + 23, str(count), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=10, fillColor=text_color))
            drawing.add(String(x + part_w / 2, y + 10, f"{count / total:.1%}", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=text_color))
        x += part_w
    legend_y = 66
    x = 34
    for label, count, fill in parts:
        drawing.add(Rect(x, legend_y, 10, 8, fillColor=fill, strokeColor=fill))
        drawing.add(String(x + 14, legend_y + 1, f"{label} ({count})", fontName="SLUGSans", fontSize=6.8, fillColor=INK))
        x += 120
    drawing.add(String(width / 2, 25, "A fallacy tag is neither necessary for losing nor exclusive to the lower-scoring side", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.5, fillColor=NAVY))
    return drawing


def move_score_chart(all_row: dict, cohorts: list[dict]) -> Drawing:
    width, height = CONTENT_W, 330
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean move score with and without a named fallacy tag",
        "Focused 68-85 scale; move-level descriptive means, not causal effects",
        width,
    )
    rows = [
        ("All public moves", all_row["fallacy_tagged_move_mean_score"], all_row["untagged_move_mean_score"], all_row["fallacy_tagged_moves"], all_row["moves"] - all_row["fallacy_tagged_moves"]),
        *[(row["label"], row["fallacy_tagged_move_mean_score"], row["untagged_move_mean_score"], row["fallacy_tagged_moves"], row["moves"] - row["fallacy_tagged_moves"]) for row in cohorts],
    ]
    left, right, bottom, top = 145, 34, 54, height - 55
    chart_w = width - left - right
    x_min, x_max = 68, 85
    for tick in range(68, 86, 2):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, (label, tagged, untagged, tagged_n, untagged_n) in enumerate(rows):
        y = top - step * (index + 0.5)
        x1 = left + chart_w * (tagged - x_min) / (x_max - x_min)
        x2 = left + chart_w * (untagged - x_min) / (x_max - x_min)
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.0, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=MUTED, strokeWidth=1.2))
        drawing.add(Circle(x1, y, 5, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(Circle(x2, y, 5, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(String(x1 - 6, y - 13, f"{tagged:.1f} n={tagged_n}", textAnchor="end", fontName="SLUGSans-Bold", fontSize=6.2, fillColor=RUST))
        drawing.add(String(x2 + 6, y + 7, f"{untagged:.1f} n={untagged_n}", fontName="SLUGSans-Bold", fontSize=6.2, fillColor=BLUE_DARK))
    drawing.add(Circle(width - 171, 21, 4, fillColor=RUST, strokeColor=NAVY))
    drawing.add(String(width - 161, 18, "fallacy-tagged", fontName="SLUGSans", fontSize=6.8, fillColor=INK))
    drawing.add(Circle(width - 83, 21, 4, fillColor=BLUE, strokeColor=NAVY))
    drawing.add(String(width - 73, 18, "untagged", fontName="SLUGSans", fontSize=6.8, fillColor=INK))
    return drawing


def loss_margin_chart(primary: dict) -> Drawing:
    width, height = CONTENT_W, 240
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean score margin by lower-side fallacy status",
        "Debate-level means and 20,000-draw bootstrap 95% intervals; 220 decisive assessments",
        width,
    )
    rows = [
        ("No named fallacy", primary["fallacy_free_loss_mean_margin"], primary["fallacy_free_loss_mean_margin_ci_95"], primary["lower_side_without_fallacy"], BLUE),
        ("At least one named fallacy", primary["tagged_loss_mean_margin"], primary["tagged_loss_mean_margin_ci_95"], primary["decisive_debates"] - primary["lower_side_without_fallacy"], RUST),
    ]
    left, right, bottom, top = 147, 36, 48, height - 53
    chart_w = width - left - right
    x_max = 11
    for tick in range(0, 12, 2):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, (label, value, ci, count, fill) in enumerate(rows):
        y = top - step * (index + 0.5)
        x1 = left + chart_w * ci[0] / x_max
        x2 = left + chart_w * ci[1] / x_max
        xm = left + chart_w * value / x_max
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.5, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=fill, strokeWidth=2.2))
        drawing.add(Circle(xm, y, 5.4, fillColor=fill, strokeColor=NAVY, strokeWidth=0.55))
        drawing.add(String(x2 + 7, y - 3, f"{value:.2f}  n={count}", fontName="SLUGSans-Bold", fontSize=7, fillColor=INK))
    diff = primary["tagged_minus_fallacy_free_margin"]
    drawing.add(String(width - 2, 11, f"Tagged minus untagged: +{diff['estimate']:.2f} points (95% CI {diff['ci_95'][0]:.2f} to {diff['ci_95'][1]:.2f})", textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.4, fillColor=RUST))
    return drawing


def margin_band_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 250
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Fallacy-free lower-side share by score-margin band",
        "Five mutually exclusive absolute-margin bands; bars begin at zero",
        width,
    )
    left, right, bottom, top = 58, 28, 48, height - 53
    chart_w = width - left - right
    chart_h = top - bottom
    for tick in (0, 0.25, 0.50, 0.75, 1.0):
        y = bottom + chart_h * tick
        drawing.add(Line(left, y, left + chart_w, y, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(left - 8, y - 3, f"{tick:.0%}", textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    gap = chart_w / len(rows)
    for index, row in enumerate(rows):
        x = left + gap * (index + 0.5)
        value = row["lower_side_without_fallacy_share"]
        bar_w = gap * 0.57
        drawing.add(Rect(x - bar_w / 2, bottom, bar_w, chart_h * value, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.45))
        drawing.add(String(x, bottom + chart_h * value + 7, f"{value:.1%}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.5, fillColor=INK))
        drawing.add(String(x, bottom - 14, row["band"], textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7, fillColor=INK))
        drawing.add(String(x, bottom - 25, f"n={row['decisive_debates']}", textAnchor="middle", fontName="SLUGSans", fontSize=6, fillColor=MUTED))
    return drawing


def fallacy_label_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 330
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Accepted named-fallacy instances by label",
        "249 public tag instances on 243 move cards; the operational inventory contains six labels",
        width,
    )
    left, right, bottom, top = 125, 50, 42, height - 51
    chart_w = width - left - right
    x_max = 70
    for tick in range(0, 71, 10):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        end = left + chart_w * row["instances"] / x_max
        fill = RUST if index < 2 else TEAL
        drawing.add(String(left - 10, y - 3, row["label"], textAnchor="end", fontName="SLUGSans", fontSize=7.4, fillColor=INK))
        drawing.add(Rect(left, y - 7, end - left, 14, fillColor=fill, strokeColor=fill))
        drawing.add(String(end + 6, y - 3, f"{row['instances']}  ({row['debates']} debates)", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=INK))
    return drawing


def count_direction_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 310
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Relative fallacy-tag count on the lower-scoring side",
        "Share of decisive assessments in each cohort; comparison uses tagged move counts",
        width,
    )
    left, right, bottom, top = 142, 35, 57, height - 55
    chart_w = width - left - right
    labels = {"closed": "Earlier closed", "standalone": "Later standalone", "no_ledger": "No locked ledger"}
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        total = row["decisive_debates"]
        parts = [
            (row["lower_more_fallacies"], RUST),
            (row["equal_fallacies"], BLUE),
            (row["lower_fewer_fallacies"], TEAL),
        ]
        x = left
        drawing.add(String(left - 10, y - 3, labels[row["cohort"]], textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.3, fillColor=INK))
        for count, fill in parts:
            part_w = chart_w * count / total
            if part_w:
                drawing.add(Rect(x, y - 9, part_w, 18, fillColor=fill, strokeColor=WHITE, strokeWidth=0.7))
                if part_w > 30:
                    drawing.add(String(x + part_w / 2, y - 2.8, str(count), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7, fillColor=WHITE))
            x += part_w
    legend = [(RUST, "lower side has more"), (BLUE, "equal"), (TEAL, "lower side has fewer")]
    x = left
    for fill, label in legend:
        drawing.add(Rect(x, 24, 10, 8, fillColor=fill, strokeColor=fill))
        drawing.add(String(x + 14, 25, label, fontName="SLUGSans", fontSize=6.6, fillColor=INK))
        x += 118
    return drawing


def dimension_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 355
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean rubric contribution to the winner-loser margin",
        "204 decisive locked assessments; weighted score-point contributions by lower-side fallacy status",
        width,
    )
    no_tag = next(row for row in rows if row["group"].startswith("Lower side has no"))
    tagged = next(row for row in rows if "at least one" in row["group"])
    left, right, bottom, top = 145, 40, 48, height - 55
    chart_w = width - left - right
    x_max = 3.0
    for tick in (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, f"{tick:.1f}", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(DIMENSIONS)
    for index, (key, label) in enumerate(DIMENSIONS):
        y = top - step * (index + 0.5)
        a, b = no_tag[key], tagged[key]
        xa = left + chart_w * a / x_max
        xb = left + chart_w * b / x_max
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.2, fillColor=INK))
        drawing.add(Line(xa, y, xb, y, strokeColor=MUTED, strokeWidth=1.2))
        drawing.add(Circle(xa, y, 4.7, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(Circle(xb, y, 4.7, fillColor=RUST, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(String(xa - 6, y + 7, f"{a:.2f}", textAnchor="end", fontName="SLUGSans-Bold", fontSize=6.2, fillColor=BLUE_DARK))
        drawing.add(String(xb + 6, y - 11, f"{b:.2f}", fontName="SLUGSans-Bold", fontSize=6.2, fillColor=RUST))
    drawing.add(Circle(width - 197, 18, 4, fillColor=BLUE, strokeColor=NAVY))
    drawing.add(String(width - 187, 15, "lower side untagged", fontName="SLUGSans", fontSize=6.7, fillColor=INK))
    drawing.add(Circle(width - 91, 18, 4, fillColor=RUST, strokeColor=NAVY))
    drawing.add(String(width - 81, 15, "lower side tagged", fontName="SLUGSans", fontSize=6.7, fillColor=INK))
    return drawing


def cumulative_dimension_chart(cumulative: dict) -> Drawing:
    width, height = CONTENT_W, 255
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Number of dimensions favoring the higher-scoring side",
        "143 locked debates in which the lower-scoring side has no named fallacy tag",
        width,
    )
    distribution = {int(key): value for key, value in cumulative["positive_dimension_count_distribution"].items()}
    keys = list(range(2, 7))
    left, right, bottom, top = 58, 28, 48, height - 55
    chart_w = width - left - right
    chart_h = top - bottom
    y_max = 70
    for tick in range(0, 71, 10):
        y = bottom + chart_h * tick / y_max
        drawing.add(Line(left, y, left + chart_w, y, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(left - 8, y - 3, str(tick), textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    gap = chart_w / len(keys)
    for index, key in enumerate(keys):
        count = distribution.get(key, 0)
        x = left + gap * (index + 0.5)
        bar_w = gap * 0.57
        fill = RUST if key >= 5 else TEAL
        drawing.add(Rect(x - bar_w / 2, bottom, bar_w, chart_h * count / y_max, fillColor=fill, strokeColor=NAVY, strokeWidth=0.45))
        drawing.add(String(x, bottom + chart_h * count / y_max + 7, str(count), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=8, fillColor=INK))
        drawing.add(String(x, bottom - 15, str(key), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.5, fillColor=INK))
    drawing.add(String(left + chart_w / 2, 9, "rubric dimensions in which the higher-scoring side leads", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def ranked_losses_chart(rows: list[dict]) -> Drawing:
    rows = rows[:10]
    width, height = CONTENT_W, 405
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Largest margins with no named fallacy on either side",
        "Top ten decisive assessments ranked by absolute score margin",
        width,
    )
    left, right, bottom, top = 232, 42, 43, height - 52
    chart_w = width - left - right
    x_max = 20
    for tick in range(0, 21, 5):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    short = {
        127: "Slick-Clifton: objective morality",
        141: "Fischer-Dillahunty: evidence for God",
        68: "Jones-Dillahunty: quantum idealism",
        72: "Dyer-Malpass: transcendental argument",
        157: "Howitt-Dillahunty: Christianity true",
        9: "Peterson-Dillahunty: God debate",
        46: "Shapiro-O'Connor: atheist delusion",
        67: "Jones-Fodor: digital physics",
        63: "Butt-Shermer: biblical God",
        85: "Atkins-Fox: God vs science",
    }
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        value = row["margin"]
        end = left + chart_w * value / x_max
        drawing.add(String(left - 10, y - 3, short.get(row["number"], row["title"][:38]), textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=INK))
        drawing.add(Rect(left, y - 6, end - left, 12, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.4))
        drawing.add(String(end + 6, y - 3, str(value), fontName="SLUGSans-Bold", fontSize=7, fillColor=INK))
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
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 0.33 * inch, "DEBATES LOST WITHOUT A NAMED FALLACY")
    canvas.line(LEFT, 0.40 * inch, PAGE_W - RIGHT, 0.40 * inch)
    canvas.drawString(LEFT, 0.25 * inch, "September 1, 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, str(doc.page))
    canvas.restoreState()


def build_story(results: dict, styles: dict) -> list:
    snapshot = results["snapshot"]
    primary = results["primary"]
    cohorts = results["cohort_summary"]
    move_summary = results["move_summary"]
    labels = results["fallacy_labels"]
    dimensions = results["dimension_summary"]
    cumulative = dimensions["cumulative"]
    story = []

    # 1. Cover
    story.extend([
        Spacer(1, 0.34 * inch),
        Paragraph("CORPUS-LEVEL DIAGNOSTIC PAPER", styles["cover_kicker"]),
        Paragraph("Debates Are Usually Lost Without a Named Fallacy", styles["cover_title"]),
        Paragraph(
            "Why cumulative underperformance matters more than a single logical blunder in the current 228-assessment snapshot",
            styles["cover_subtitle"],
        ),
        Paragraph(
            "REPORT DATE  ·  SEPTEMBER 1, 2026 &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "PUBLIC CORPUS  ·  228 ASSESSMENTS / 4,659 MOVES &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "DECISIVE RESULTS  ·  220 ASSESSMENTS",
            styles["cover_meta"],
        ),
        SectionRule(color=GOLD),
        Spacer(1, 8),
        Paragraph(
            "<b>Answer.</b> In the current corpus, 146 of 220 lower-scoring sides - 66.4% - carry no named fallacy tag. In 137 decisive debates, neither side carries one. Loss without a named fallacy is therefore not exceptional in the observed snapshot. A side can lose through a sequence of claims that are individually recognizable and non-fallacious yet collectively less coherent, less warranted, less responsive, less precise, or less carefully calibrated.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "The finding is not that fallacies do not matter. Tagged moves average 72.81 points, versus 80.66 for untagged moves, and debates in which the lower side has a named fallacy show a 2.17-point larger mean margin. The finding is that fallacies are neither necessary nor sufficient for losing, and the numerical rubric does not award or deduct points merely because a tag exists.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "The word <b>usually</b> requires an important qualification. The fallacy-free-loss share is 80.8% in the earlier closed-findings cohort but only 12.5% in the later standalone cohort, where named-fallacy tagging is about seven times denser. Equal-weighting those two locked generations yields 46.7%, below a majority. The aggregate headline describes the present corpus mix, not an annotation-invariant law.",
            styles["cover_abstract"],
        ),
        Spacer(1, 7),
        callout(
            "Strongest robust conclusion",
            "Among 143 decisive locked assessments in which the lower side has no named fallacy, that side trails on at least five of the six scoring dimensions in 75.5% of debates. The typical fallacy-free loss is not one hidden catastrophe. It is <b>distributed, cumulative underperformance across the ordinary requirements of a completed argument</b>.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Spacer(1, 8),
        Paragraph(
            "<i>Named-fallacy tags are separate, conservative annotations. Their absence is not proof of validity, strong induction, or freedom from every formal or informal reasoning error.</i>",
            styles["caption"],
        ),
        PageBreak(),
    ])

    # 2. Technical summary
    story.extend([
        Paragraph("Technical summary", styles["h1"]),
        Paragraph(
            "The paper tests a narrow proposition: whether the lower-scoring side in a decisive assessment has at least one accepted public fallacy tag. The answer is yes in 74 debates and no in 146. It then asks whether tag presence is informative, whether the answer changes across annotation cohorts, and what actually creates the score margin when no fallacy is named.",
            styles["body"],
        ),
        metric_strip([
            ("146 of 220", "lower-scoring sides with no named fallacy tag"),
            ("-7.85", "tagged-minus-untagged mean move-score difference"),
            ("75.5%", "fallacy-free losses trailing on at least five dimensions"),
        ], styles),
        Spacer(1, 10),
        Paragraph("What the evidence supports", styles["h2"]),
        bullet("Named fallacies are not required for a substantial loss: the fallacy-free group has a mean margin of 6.23 points and includes ten debates with margins of 15 points or more.", styles),
        bullet("Tags are informative when present: fallacy-tagged moves score lower in every cohort, and tagged lower-side debates have a larger mean margin.", styles),
        bullet("The score difference without a named fallacy is distributed. Mean contributions are 1.77 points from logical coherence, 1.59 from evidence and warrant, 1.38 from responsiveness, 0.84 from calibration and charity, 0.58 from precision, and 0.14 from relevance and burden.", styles),
        bullet("The lower side has more fallacy-tagged moves than the higher side in only 62 of 220 decisive debates. The counts are equal in 145 and point toward the higher side in 13.", styles),
        Paragraph("What the evidence does not support", styles["h2"]),
        bullet("It does not show that 66.4% of losing arguments are logically valid. The annotation inventory contains only six named patterns and does not exhaust defective reasoning.", styles),
        bullet("It does not establish a universal rate. Annotation density varies sharply across the three publication cohorts.", styles),
        bullet("It does not show that fallacy tags cause lower scores. The same argumentative weakness can inform both a dimension score and a separate explanatory tag.", styles),
        callout(
            "Decision-useful reading",
            "Do not audit debate quality by searching only for a dramatic fallacy label. The more reliable question is whether the side has completed its burdens across coherence, warrant, responsiveness, precision, relevance, and calibration.",
            styles,
        ),
        PageBreak(),
    ])

    # 3. Definition
    story.extend([
        Paragraph("“Named fallacy” is the technically accurate unit", styles["h1"]),
        Paragraph(
            "In ordinary conversation, people often call any identified reasoning error a “formal fallacy.” In logic, a formal fallacy is more specific: an invalid pattern in an argument's logical form. Slugfester's public inventory also includes informal patterns such as equivocation, red herring, argument from ignorance, begging the question, appeal to authority, and special pleading. This paper therefore uses <b>named fallacy</b> rather than the broader but technically misleading phrase.",
            styles["body"],
        ),
        data_table(
            ["Term", "Operational meaning in this paper", "What it does not mean"],
            [
                ["Named fallacy present", "At least one public move card on the side has an accepted fallacy tag", "That the entire case is invalid or the side must lose"],
                ["Named fallacy absent", "No public move card on the side has one of the six accepted labels", "That every inference is valid, cogent, or well supported"],
                ["Lower-scoring side", "The side with the lower published overall score in a non-tied assessment", "An independent truth verdict or audience vote"],
                ["Fallacy-free loss", "A lower score with zero named-fallacy instances on the lower side", "A loss caused by no reasoning weaknesses"],
            ],
            [105, 204, CONTENT_W - 309],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        Paragraph("Tags and scores are separate outputs", styles["h2"]),
        Paragraph(
            "The numerical assessment is produced from six scored dimensions with fixed weights, move importance, and section weights. Fallacy and bias labels are then reviewed separately in blind passes and conservatively accepted only when a named pattern explains a specific weakness. There is no rule such as “subtract five points for equivocation.” This matters because a debate can be lost without a tag, and a winner can carry a tag, without contradicting the scoring system.",
            styles["body"],
        ),
        Paragraph("The tag inventory is intentionally narrow", styles["h2"]),
        Paragraph(
            "Only six fallacy labels occur in this snapshot. The system is not attempting to exhaust every error discussed in logic textbooks. A move can be under-evidenced, overbroad, imprecise, unresponsive, or poorly calibrated without satisfying the stricter conditions for one of the named labels. Absence should therefore be read as <i>no accepted label under this workflow</i>, not as a certificate of soundness.",
            styles["body"],
        ),
        callout(
            "Core distinction",
            "A fallacy is one way an argument can be weak. It is not the definition of weakness. Most rubric dimensions are continuous: an inference can be somewhat under-supported, a reply partly responsive, or a claim materially overstated without crossing a categorical tag threshold.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 4. Scope
    story.extend([
        Paragraph("Scope: all 228 published assessments and 4,659 move cards", styles["h1"]),
        Paragraph(
            "The analysis begins with every published assessment in the September 1, 2026 snapshot. Eight are ties and cannot supply a unique lower-scoring side, leaving 220 decisive assessments for the primary test. Move-level analyses cover all 4,659 public argument and rebuttal cards. Rubric decomposition is available for the 212 locked ledgers, of which 204 have a decisive score.",
            styles["body"],
        ),
        data_table(
            ["Assessment cohort", "Debates", "Decisive", "Public moves", "Fallacy-tagged moves", "Tag rate"],
            [
                [row["label"], str(row["debates"]), str(row["decisive_debates"]), f"{row['moves']:,}", str(row["fallacy_tagged_moves"]), f"{row['fallacy_tagged_move_rate']:.1%}"]
                for row in cohorts
            ] + [["Total", "228", "220", "4,659", "243", "5.2%"]],
            [142, 45, 50, 70, 96, CONTENT_W - 403],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        Paragraph("Three annotation environments coexist", styles["h2"]),
        Paragraph(
            "The 179 earlier closed-findings ledgers have a low named-fallacy rate of 1.9% of moves. The 33 later standalone ledgers have a 13.3% rate. Sixteen older public assessments without a locked ledger have the highest rate, 20.0%. The cohorts do not represent random samples, and their tag pipelines are not exchangeable. Any aggregate absence rate is therefore partly a weighted average of annotation environments.",
            styles["body"],
        ),
        Paragraph("The denominator is debate sides, not individual claims", styles["h2"]),
        Paragraph(
            "The primary outcome asks whether the lower side has at least one named fallacy anywhere in the assessment. A side with ten moves and one tag counts as present; a side with twenty moves and none counts as absent. Separate charts retain move counts and tag rates so that debate-level presence is not confused with the density of marked claims.",
            styles["body"],
        ),
        callout(
            "Why ties are excluded",
            "A tied assessment has no unique lower-scoring side. The eight ties remain in the corpus and move-level counts but are excluded from all winner-loser presence rates, margin comparisons, and direction tests.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 5. Primary finding
    story.extend([
        Paragraph("Two thirds of lower-scoring sides carry no named fallacy", styles["h1"]),
        Paragraph(
            "The direct corpus-level answer is 146 of 220, or 66.4%. A Wilson interval places the observed proportion between 59.9% and 72.3%. The lower side also has neither a named fallacy nor a named cognitive bias in 140 debates, or 63.6%, so adding the site's bias inventory does not reverse the aggregate conclusion.",
            styles["body"],
        ),
        primary_share_chart(primary),
        Paragraph(
            "Figure 1. The bar classifies every decisive assessment by whether at least one lower-side move carries a named fallacy tag. It does not estimate the prevalence of every possible reasoning error.",
            styles["caption"],
        ),
        Paragraph(
            "The fallacy-free group is not limited to technical near-ties. Its mean margin is 6.23 points and its median is 6. Ten debates have margins of at least 15 points without a named fallacy on either side. A side can therefore lose decisively through many moderate deficits rather than one tag-worthy collapse.",
            styles["body"],
        ),
        callout(
            "What this result changes",
            "A debate review that asks only “Which side committed a fallacy?” will miss most lower-score outcomes in this snapshot. It should instead ask whether the side's important claims are adequately supported and whether its replies complete the burdens created by the opponent's strongest material.",
            styles,
        ),
        PageBreak(),
    ])

    # 6. Cohort sensitivity
    story.extend([
        Paragraph("The word “usually” is annotation-cohort dependent", styles["h1"]),
        Paragraph(
            "The aggregate result is dominated by the 179-assessment earlier closed cohort. There, 139 of 172 lower-scoring sides - 80.8% - have no named fallacy. In the later standalone cohort, only 4 of 32 - 12.5% - are untagged. In the no-ledger cohort, the rate is 3 of 16 - 18.8%.",
            styles["body"],
        ),
        cohort_contrast_chart(cohorts),
        Paragraph(
            "Figure 2. The left panel shows the debate-level absence outcome. The right panel shows the underlying move-level tagging rate. The mirror-image pattern is evidence that annotation coverage materially changes the headline.",
            styles["caption"],
        ),
        Paragraph(
            "Equal-weighting the two locked assessment generations gives a fallacy-free-loss share of 46.7%, below a majority. That is not a preferred replacement estimate - the generations differ in selection and size - but it is a decisive sensitivity result. “Usually” is true of the observed corpus as published, not of a hypothetical corpus assessed under one uniform tag regime.",
            styles["body"],
        ),
        callout(
            "Strong limitation, not a fatal one",
            "The annotation discontinuity weakens the exact 66.4% prevalence claim. It does not weaken the central logical point that a named fallacy is unnecessary for a loss. Four later-generation lower sides and 139 earlier-generation lower sides lose without one, and the dimension analysis explains how.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 7. Presence patterns
    story.extend([
        Paragraph("Named fallacies are neither necessary nor exclusive to the loser", styles["h1"]),
        Paragraph(
            "In 137 decisive assessments, neither side has a named fallacy. Forty-five have tags only on the lower side, 29 have tags on both sides, and nine have tags only on the higher side. The last two categories matter: a tag can coexist with the higher score, because the overall result depends on the complete weighted performance rather than a categorical disqualification.",
            styles["body"],
        ),
        presence_pattern_chart(primary),
        Paragraph(
            "Figure 3. Each decisive assessment appears exactly once. “Only higher side” means that the eventual winner carries a named fallacy while the lower side does not.",
            styles["caption"],
        ),
        Paragraph("A tag identifies a local defect", styles["h2"]),
        Paragraph(
            "An accepted label attaches to one move and one documented context. A debate side can contain a locally fallacious inference and still outperform its opponent on other load-bearing claims, direct replies, evidence, and calibration. Conversely, a side can avoid all six named labels yet repeatedly offer arguments that are plausible but incomplete, relevant but under-supported, or responsive but insufficiently decisive.",
            styles["body"],
        ),
        callout(
            "No knockout rule",
            "Slugfester does not treat a named fallacy as an automatic loss. The assessment behaves more like a points decision: important claims and replies accumulate weighted advantages and deficits across the whole debate.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 8. Move scores
    story.extend([
        Paragraph("When present, fallacy tags identify substantially weaker moves", styles["h1"]),
        Paragraph(
            "The absence finding should not be mistaken for evidence that tags are meaningless. Across 4,659 public move cards, the 243 fallacy-tagged moves average 72.81, while the 4,416 untagged moves average 80.66 - a 7.85-point difference. The direction is the same in every publication cohort.",
            styles["body"],
        ),
        move_score_chart(move_summary, cohorts),
        Paragraph(
            "Figure 4. The axis is deliberately focused to make within-cohort differences readable. Exact values and sample sizes are printed beside each point. Scores are public move scores; tag status is not an independent randomized treatment.",
            styles["caption"],
        ),
        Paragraph(
            "Earlier closed moves show an 8.63-point difference, later standalone moves a 5.73-point difference, and no-ledger moves a 9.76-point difference. Side-level correlations between score and fallacy-tag rate are negative in all three cohorts: -0.27, -0.44, and -0.65 respectively. The signal is consistent even though the tagging threshold changes.",
            styles["body"],
        ),
        callout(
            "Association, not independent causation",
            "The same weakness can lower logical-coherence or evidence scores and also justify a fallacy label. A lower tagged-move score therefore shows convergent diagnosis, not the isolated causal effect of attaching the label.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 9. Severity
    story.extend([
        Paragraph("Tagged losses are larger, but large untagged losses remain common", styles["h1"]),
        Paragraph(
            "When the lower side has at least one named fallacy, the mean margin is 8.39 points. Without one, it is 6.23. The 2.17-point difference has a debate-level bootstrap interval from 0.66 to 3.69 points. Tags therefore mark more severe losses on average, even though they are not required for losing.",
            styles["body"],
        ),
        loss_margin_chart(primary),
        Paragraph(
            "Figure 5. Intervals resample whole debate margins within each fallacy-status group. The comparison is descriptive and combines cohorts with different annotation density.",
            styles["caption"],
        ),
        margin_band_chart(results["margin_bands"]),
        Paragraph(
            "Figure 6. The fallacy-free share declines in the two largest margin bands, but it does not approach zero. Ten of 23 losses of 15 points or more still contain no lower-side named fallacy.",
            styles["caption"],
        ),
        PageBreak(),
    ])

    # 10. Inventory
    story.extend([
        Paragraph("Six labels make up the entire named-fallacy inventory", styles["h1"]),
        Paragraph(
            "The public snapshot contains 249 named-fallacy instances on 243 move cards. Equivocation is most frequent, followed by red herring and argument from ignorance. The small label inventory is a strength for consistency and a limitation for coverage: it sets a demanding categorical threshold but leaves many ordinary deficiencies to the continuous rubric.",
            styles["body"],
        ),
        fallacy_label_chart(labels),
        Paragraph(
            "Figure 7. Counts are tag instances, so the six labels sum to 249 while only 243 move cards carry at least one fallacy. Six cards carry two accepted labels.",
            styles["caption"],
        ),
        data_table(
            ["Label", "Instances", "Debates", "Mean tagged-move score"],
            [[row["label"], str(row["instances"]), str(row["debates"]), f"{row['mean_move_score']:.2f}"] for row in labels],
            [200, 75, 70, CONTENT_W - 345],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        Paragraph(
            "Special pleading has the lowest mean tagged-move score, 69.59, but label-level score comparisons are highly confounded by cohort, speaker, topic, role, and move importance. The table is an inventory, not a severity ranking.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 11. Relative counts
    story.extend([
        Paragraph("Fallacy counts point toward the loser only under denser annotation", styles["h1"]),
        Paragraph(
            "Across all decisive assessments, the lower side has more fallacy-tagged moves in 62 cases, an equal number in 145, and fewer in 13. The overall equality rate is high because 137 debates have zero on both sides. Cohort separation reveals a different pattern: lower-side excess is uncommon in the earlier closed cohort and common in the later standalone cohort.",
            styles["body"],
        ),
        count_direction_chart(cohorts),
        Paragraph(
            "Figure 8. “More,” “equal,” and “fewer” compare counts of fallacy-tagged move cards, not tag instances. The later standalone cohort has lower-side excess in 23 of 32 decisive assessments.",
            styles["caption"],
        ),
        Paragraph(
            "The change is partly expected. When tags are rare, most comparisons are zero versus zero and the count cannot discriminate. With denser review, more local defects cross the named threshold and the lower side is more often the side with the larger count. This does not mean later debates are inherently more fallacious; it means the annotation instrument has more resolution.",
            styles["body"],
        ),
        callout(
            "Measurement lesson",
            "Raw fallacy counts should not be compared across assessment generations without stratification. The relationship between tags and score is real within every cohort, but the number of detected tags depends strongly on the review regime.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 12. Dimensions
    story.extend([
        Paragraph("Fallacy-free losses are built from ordinary rubric deficits", styles["h1"]),
        Paragraph(
            "The 204 decisive locked assessments permit a complete decomposition of the winner-loser margin. In the 143 fallacy-free lower-side cases, logical coherence contributes 1.77 score points, evidence and warrant 1.59, responsiveness 1.38, calibration and charity 0.84, precision and clarity 0.58, and relevance and burden 0.14.",
            styles["body"],
        ),
        dimension_chart(dimensions["groups"]),
        Paragraph(
            "Figure 9. Each value is the mean weighted contribution of one dimension to the higher-side minus lower-side overall score. Tiny rounding residuals are omitted; burden-completion adjustments average zero in both groups.",
            styles["caption"],
        ),
        Paragraph(
            "Tagged lower-side debates show larger contributions from nearly every dimension, especially logic and evidence. That pattern explains both results at once. A named fallacy often accompanies severe deficiencies, but the same dimensions can produce a complete six-point loss through smaller recurring gaps even when no categorical label is accepted.",
            styles["body"],
        ),
        callout(
            "What replaces the smoking gun",
            "Most fallacy-free margins are not mysterious. They are the sum of multiple modest differences: a premise that is somewhat under-supported, a reply that only partly contacts the objection, a conclusion stated more strongly than the evidence permits, and terminology that remains less stable than the opponent's.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 13. Cumulative shape
    story.extend([
        Paragraph("Three quarters of fallacy-free losers trail on five or six dimensions", styles["h1"]),
        Paragraph(
            "A cumulative-loss account predicts breadth rather than one dominant defect. The prediction is borne out. In 108 of the 143 locked fallacy-free losses - 75.5% - the higher side leads on at least five of six dimensions. In 60 debates - 42.0% - it leads on all six.",
            styles["body"],
        ),
        cumulative_dimension_chart(cumulative),
        Paragraph(
            "Figure 10. A positive dimension means that its weighted contribution favors the eventual higher-scoring side. One debate has only two positive dimensions; no fallacy-free loss has fewer.",
            styles["caption"],
        ),
        Paragraph("Distributed weakness is structurally sufficient", styles["h2"]),
        Paragraph(
            "The result does not require every individual claim to be weak. A side may have several strong moves and still lose because its important constructive claims are slightly less warranted, its replies slightly less complete, and its calibration slightly less disciplined across several sections. Fixed importance and section weights then accumulate those ordinary differences into the final margin.",
            styles["body"],
        ),
        Paragraph("This is how real argument often fails", styles["h2"]),
        Paragraph(
            "Outside textbook exercises, debates rarely turn on a syllogism that cleanly instantiates one invalid form. They turn on abductive comparison, testimony, historical inference, probabilistic support, scope, definitions, and burden completion. Those judgments are graded. A categorical fallacy vocabulary is valuable, but too coarse to carry the full evaluation.",
            styles["body"],
        ),
        callout(
            "Main explanatory result",
            "The corpus's typical fallacy-free loss is a broad points defeat: the lower side is behind almost everywhere by a modest amount. That pattern is exactly what a six-dimension weighted rubric is designed to detect.",
            styles,
        ),
        PageBreak(),
    ])

    # 14. Concrete cases
    story.extend([
        Paragraph("Large fallacy-free losses appear across topics and viewpoints", styles["h1"]),
        Paragraph(
            "The largest cases show why absence of a tag should not be confused with argumentative parity. The top ten include disputes over morality, evidence for God, quantum idealism, transcendental arguments, Christianity, culture, biblical theism, and science. One case also has the non-theist side lower by 15 points, confirming that the mechanism is not intrinsically tied to one worldview.",
            styles["body"],
        ),
        ranked_losses_chart(results["largest_fallacy_free_losses"]),
        Paragraph(
            "Figure 11. Both sides have zero named-fallacy instances in every displayed assessment. Bars show the published overall-score margin, not audience voting or truth probability.",
            styles["caption"],
        ),
        data_table(
            ["Case", "Scores", "Why the lower side lost without a named fallacy"],
            [
                ["Slick-Clifton, objective morality", "70-89", "Prescriptions were stated rather than justified; secular alternatives and the is-ought bridge were not fully answered"],
                ["Fischer-Dillahunty, evidence for God", "68-86", "Conceivability was asked to establish necessity; testimony was admitted without completing reliability or attribution burdens"],
                ["Bush-McAllister, moral realism", "90-76", "Epistemic access was blurred with a standard's truth-maker; convergence and collapse claims remained under-documented"],
                ["Atkins-Fox, God and science", "70-85", "Scientific skepticism became categorical overreach; religion was treated too uniformly and evidential scope was overstated"],
            ],
            [150, 48, CONTENT_W - 198],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        PageBreak(),
    ])

    # 15. Methods and limitations
    story.extend([
        Paragraph("Methods, uncertainty, and limitations", styles["h1"]),
        Paragraph("Analysis steps", styles["h2"]),
        bullet("Extract all 228 published debates, side scores, 4,659 public move cards, move scores, and fallacy and bias labels from the site data.", styles),
        bullet("Classify a debate as decisive when the two published overall scores differ; define the lower-scoring side directly from those scores.", styles),
        bullet("Count named-fallacy presence separately for each side and preserve both tagged-move counts and total tag instances.", styles),
        bullet("Map the 212 locked ledgers to the earlier closed and later standalone cohorts; classify the remaining 16 as published without a locked ledger.", styles),
        bullet("Use Wilson intervals for proportions and 20,000 seeded debate-level bootstrap draws for mean-margin intervals and the tagged-minus-untagged margin contrast.", styles),
        bullet("Reconstruct side-level importance-weighted dimension means from every decisive locked ledger and decompose the official higher-minus-lower score margin.", styles),
        Paragraph("Principal limitations", styles["h2"]),
        data_table(
            ["Limitation", "Consequence"],
            [
                ["Annotation cohorts differ sharply", "The 66.4% headline is not a uniform-protocol prevalence estimate"],
                ["Only six fallacy labels occur", "Absence does not exhaust invalid or weak reasoning"],
                ["Scores and tags share argumentative evidence", "Tag-score associations are diagnostic, not independent causal effects"],
                ["AI-generated judgments", "Both dimensions and labels inherit model error and require repeated calibration"],
                ["Debates and speakers are selected", "Rates do not generalize automatically to all public argument"],
                ["Public card granularity", "One tag can summarize a local pattern spanning more than one sentence"],
            ],
            [148, CONTENT_W - 148],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        callout(
            "Reproducibility and next test",
            "The analysis script, 228-row debate table, cohort table, label inventory, margin bands, 204-row dimension decomposition, ranked cases, and results JSON accompany the PDF. The strongest next test is a full-corpus rerun under one locked tag inventory and one annotation protocol, with independent repeated judgments and an explicit no-tag audit.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 16. Conclusion
    story.extend([
        Paragraph("Conclusion: arguments usually lose by accumulation, not disqualification", styles["h1"]),
        Paragraph(
            "The current Slugfester snapshot supports a simple but often neglected point: an argument need not commit a named fallacy to be worse than its opponent's. Two thirds of lower-scoring sides have no accepted fallacy tag, and nearly two thirds have neither a fallacy nor a cognitive-bias tag. Their losses are real rather than trivial: the mean margin is 6.23 points, and several of the largest margins in the corpus occur with no named fallacy on either side.",
            styles["conclusion"],
        ),
        Paragraph(
            "The rubric decomposition shows exactly how this happens. In fallacy-free losses, the lower side gives up points across coherence, evidence, responsiveness, calibration, precision, and burden fit. Three quarters trail on at least five dimensions. A premise can remain intelligible yet under-supported; a reply can address the right topic yet fail to defeat the objection; a conclusion can be plausible yet stated too confidently; terminology can remain recoverable yet unstable. None of those failures requires a categorical label. Together they are enough to lose.",
            styles["body"],
        ),
        Paragraph(
            "Named fallacies still matter. Tagged moves score almost eight points lower on average, and tagged lower-side debates have larger margins. But a fallacy label is best understood as a high-specificity explanation of one local defect, not as the engine of the whole scoring system. It is neither a knockout blow nor a prerequisite for defeat. The higher side can carry one; both sides can carry one; or neither side can carry one while the final score remains far apart.",
            styles["body"],
        ),
        Paragraph(
            "The annotation-generation discontinuity prevents a universal prevalence claim. Under the denser later workflow, most lower sides do carry a named fallacy. Equal-weighting the two locked generations removes the aggregate majority. The paper's strongest conclusion must therefore be structural rather than numerical: <b>the scoring system can and routinely does distinguish argumentative quality through continuous multi-dimensional deficits without requiring a named fallacy</b>.",
            styles["body"],
        ),
        callout(
            "Strongest defensible conclusion",
            "In this 228-assessment snapshot, debates are usually lost without a named fallacy because most losses are cumulative points defeats rather than logical disqualifications. The exact 66.4% rate is cohort-dependent, but the underlying mechanism is robust: ordinary shortfalls in warrant, coherence, responsiveness, calibration, precision, and burden completion are sufficient to produce a decisive result.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Spacer(1, 8),
        Paragraph("Recommended practice", styles["h2"]),
        bullet("Treat fallacy labels as precise local diagnostics, not substitutes for evaluating the full case.", styles),
        bullet("Stratify every tag-rate comparison by assessment cohort until the corpus is rerun under one protocol.", styles),
        bullet("When explaining a result, report the dimension contributions and load-bearing burden failures alongside any named tags.", styles),
        bullet("Repeat the analysis after the planned full-corpus reassessment and publish how often tag presence and dimension deficits replicate.", styles),
        Spacer(1, 8),
        SectionRule(color=TEAL),
        Spacer(1, 8),
        Paragraph(
            "<b>Recommended citation:</b> SLUGFESTER. <i>Debates Are Usually Lost Without a Named Fallacy: Why Cumulative Underperformance Matters More Than a Single Logical Blunder in the Current 228-Assessment Snapshot.</i> Corpus-level analysis report, September 1, 2026.",
            styles["caption"],
        ),
    ])
    return story


def build_pdf() -> Path:
    base.register_fonts()
    styles = base.make_styles()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)

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
        title="Debates Are Usually Lost Without a Named Fallacy",
        author="SLUGFESTER",
        subject="Corpus-level analysis of named fallacy tags, score margins, and cumulative rubric deficits",
        creator="SLUGFESTER corpus-level analysis pipeline",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=first_page, autoNextPageTemplate="body"),
        PageTemplate(id="body", frames=[frame], onPage=later_page),
    ])
    doc.build(build_story(results, styles))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
