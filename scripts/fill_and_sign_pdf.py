#!/usr/bin/env python3
"""
fill_and_sign_pdf.py — Professional PDF Fill & Sign Engine

A Sejda-quality pipeline for:
  1. Auto-detecting all form field types (text, checkbox, radio, dropdown, date, signature)
  2. Filling fields programmatically from a data dict or JSON file
  3. Adding a drawn/typed/image signature to a signature zone
  4. Flattening the filled PDF so annotations become permanent content
  5. Optionally adding a visible timestamp annotation

Improvements over the base make_fillable.py:
  - Smart field-type inference (date fields, email fields, phone fields)
  - Appearance streams that match original PDF styling (font size, color)
  - Signature support: typed name, drawn path points, or PNG image
  - Flatten-to-content: burns fields into the page stream (no editable fields in final)
  - Date picker field detection via label heuristics
  - Dropdown / list-box support
  - Proper handling of existing AcroForm (update rather than replace)
  - JSON data file support for batch filling
  - Detailed field map output for UI integration

Dependencies:
    pip install pdfplumber pypdf Pillow reportlab

Usage:
    # Fill from JSON file:
    python fill_and_sign_pdf.py fill input.pdf data.json output.pdf

    # Fill from CLI key=value pairs:
    python fill_and_sign_pdf.py fill input.pdf output.pdf "Name=John" "DOB=01/01/1990"

    # Add a typed signature:
    python fill_and_sign_pdf.py sign input.pdf output.pdf --name "John Doe" --page 1

    # Flatten filled PDF:
    python fill_and_sign_pdf.py flatten filled.pdf flat_output.pdf

    # Full pipeline: fill → sign → flatten:
    python fill_and_sign_pdf.py pipeline input.pdf data.json sig.png output.pdf

    # Scan fields and dump JSON map:
    python fill_and_sign_pdf.py scan input.pdf
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import tempfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

# ── Third-party ──────────────────────────────────────────────────────────────
try:
    import pdfplumber
except ImportError:
    sys.exit("Missing: pip install pdfplumber")

try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import (
        ArrayObject,
        BooleanObject,
        DecodedStreamObject,
        DictionaryObject,
        NameObject,
        NumberObject,
        RectangleObject,
        TextStringObject,
    )
except ImportError:
    sys.exit("Missing: pip install pypdf")

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as rl_canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════
# CONSTANTS & HELPERS
# ═══════════════════════════════════════════════════════════════════════════

DATE_LABEL_RE = re.compile(
    r"\b(date|dob|birth|expir|issued?|valid|from|to|month|year|day|mm[/\-]dd|dd[/\-]mm)\b",
    re.IGNORECASE,
)
EMAIL_LABEL_RE = re.compile(r"\b(e[\s\-]?mail|email)\b", re.IGNORECASE)
PHONE_LABEL_RE = re.compile(r"\b(phone|tel|mobile|cell|fax|contact\s*no)\b", re.IGNORECASE)
SIG_LABEL_RE = re.compile(
    r"\b(signature|sign\s*here|authorized?\s*by|signed?\s*by|witness)\b", re.IGNORECASE
)
NAME_LABEL_RE = re.compile(r"\b(full\s*name|name|applicant|surname|first\s*name|last\s*name)\b", re.IGNORECASE)

FIELD_TYPE_HINTS = {
    "date": DATE_LABEL_RE,
    "email": EMAIL_LABEL_RE,
    "phone": PHONE_LABEL_RE,
    "signature": SIG_LABEL_RE,
    "name": NAME_LABEL_RE,
}

ZADB_FONT = "/ZapfDingbats"
HELV_FONT = "/Helvetica"


def _sanitize(text: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_]+", "_", text.strip()).strip("_")
    return s[:50] if s else "Field"


def _to_pdf_rect(x0: float, top: float, x1: float, bottom: float, page_height: float) -> list:
    """Convert pdfplumber top-down coordinates to PDF bottom-up."""
    return [x0, page_height - bottom, x1, page_height - top]


def _infer_subtype(label: str) -> str:
    """Infer a more specific field subtype from its label text."""
    for subtype, pattern in FIELD_TYPE_HINTS.items():
        if pattern.search(label):
            return subtype
    return "text"


class _NameCounter:
    def __init__(self):
        self._counts: dict[str, int] = defaultdict(int)

    def unique(self, base: str) -> str:
        self._counts[base] += 1
        return base if self._counts[base] == 1 else f"{base}_{self._counts[base]}"


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — STRUCTURE EXTRACTION (improved from make_fillable.py)
# ═══════════════════════════════════════════════════════════════════════════

def _reconstruct_rects_from_edges(page, pw: float, ph: float) -> list[dict]:
    """Reconstruct field rectangles from thin border rects and edges.

    Many PDF forms draw field boxes using thin (< 3px) rectangles or edges
    for borders instead of filled rects. This function detects those border
    elements, extracts horizontal/vertical lines from them, and rebuilds
    the enclosed rectangles they form.
    """
    TOL = 3  # coordinate tolerance for snapping

    # Collect all horizontal and vertical line segments from multiple sources
    h_segs: list[tuple[float, float, float]] = []  # (y, x0, x1)
    v_segs: list[tuple[float, float, float]] = []  # (x, top, bottom)

    # Source 1: thin border rects (w<3 or h<3)
    for r in page.rects or []:
        x0, top, x1, bot = r["x0"], r["top"], r["x1"], r["bottom"]
        w, h = x1 - x0, bot - top
        if w >= TOL and h < TOL and w >= 10:
            h_segs.append(((top + bot) / 2, min(x0, x1), max(x0, x1)))
        elif h >= 5 and w < TOL:
            v_segs.append(((x0 + x1) / 2, min(top, bot), max(top, bot)))

    # Source 2: page edges (often present when page.lines is empty)
    for e in page.edges or []:
        ex0, etop, ex1, ebot = e["x0"], e["top"], e["x1"], e["bottom"]
        dx, dy = abs(ex1 - ex0), abs(ebot - etop)
        if dx > 10 and dy < TOL:
            h_segs.append(((etop + ebot) / 2, min(ex0, ex1), max(ex0, ex1)))
        elif dy > 5 and dx < TOL:
            v_segs.append(((ex0 + ex1) / 2, min(etop, ebot), max(etop, ebot)))

    # Source 3: explicit page.lines
    for ln in page.lines or []:
        lx0, ltop, lx1, lbot = ln["x0"], ln["top"], ln["x1"], ln["bottom"]
        dx, dy = abs(lx1 - lx0), abs(lbot - ltop)
        if dx > 10 and dy < TOL:
            h_segs.append(((ltop + lbot) / 2, min(lx0, lx1), max(lx0, lx1)))
        elif dy > 5 and dx < TOL:
            v_segs.append(((lx0 + lx1) / 2, min(ltop, lbot), max(ltop, lbot)))

    if not h_segs or not v_segs:
        return []

    # Cluster nearby coordinates to collapse border pairs (e.g. y=56,58 → y=57)
    def _cluster(values: list[float], gap: float = 4.0) -> list[float]:
        """Group values within `gap` of each other, return cluster means."""
        if not values:
            return []
        vs = sorted(set(round(v, 1) for v in values))
        clusters: list[list[float]] = [[vs[0]]]
        for v in vs[1:]:
            if v - clusters[-1][-1] <= gap:
                clusters[-1].append(v)
            else:
                clusters.append([v])
        return [sum(c) / len(c) for c in clusters]

    h_y_vals = [y for y, _, _ in h_segs]
    v_x_vals = [x for x, _, _ in v_segs]
    y_anchors = _cluster(h_y_vals, gap=4.0)
    x_anchors = _cluster(v_x_vals, gap=4.0)

    # Map raw coordinates to their nearest anchor
    def _nearest(val: float, anchors: list[float]) -> float:
        best = anchors[0]
        for a in anchors[1:]:
            if abs(a - val) < abs(best - val):
                best = a
        return best

    # Deduplicate horizontal segments grouped by anchor y
    h_by_y: dict[float, list[tuple[float, float]]] = defaultdict(list)
    for y, x0, x1 in h_segs:
        h_by_y[_nearest(y, y_anchors)].append((x0, x1))

    # Merge overlapping h-segments at each y level
    merged_h: dict[float, list[tuple[float, float]]] = {}
    for y, segs in h_by_y.items():
        segs.sort()
        merged = [segs[0]]
        for s in segs[1:]:
            if s[0] <= merged[-1][1] + TOL:
                merged[-1] = (merged[-1][0], max(merged[-1][1], s[1]))
            else:
                merged.append(s)
        merged_h[y] = merged

    # Deduplicate vertical segments grouped by anchor x
    v_by_x: dict[float, list[tuple[float, float]]] = defaultdict(list)
    for x, top, bot in v_segs:
        v_by_x[_nearest(x, x_anchors)].append((top, bot))

    # Merge overlapping v-segments at each x level
    merged_v: dict[float, list[tuple[float, float]]] = {}
    for x, segs in v_by_x.items():
        segs.sort()
        merged = [segs[0]]
        for s in segs[1:]:
            if s[0] <= merged[-1][1] + TOL:
                merged[-1] = (merged[-1][0], max(merged[-1][1], s[1]))
            else:
                merged.append(s)
        merged_v[x] = merged

    y_keys = sorted(merged_h.keys())
    x_keys = sorted(merged_v.keys())

    # Build lookup: does a vertical edge exist at x spanning from y_top to y_bot?
    def _v_spans(x: float, y_top: float, y_bot: float) -> bool:
        for seg_top, seg_bot in merged_v.get(x, []):
            if seg_top <= y_top + TOL and seg_bot >= y_bot - TOL:
                return True
        return False

    # Build lookup: does a horizontal edge exist at y spanning from x_left to x_right?
    def _h_spans(y: float, x_left: float, x_right: float) -> bool:
        for seg_x0, seg_x1 in merged_h.get(y, []):
            if seg_x0 <= x_left + TOL and seg_x1 >= x_right - TOL:
                return True
        return False

    # Find enclosed rectangles: for each pair of y-levels and x-levels,
    # check if all four sides exist
    rects: list[dict] = []
    seen: set[tuple[float, float, float, float]] = set()

    # Pre-compute: for each pair of y-levels, which x positions have spanning verticals?
    # Only keep adjacent y-pairs (no intermediate horizontal edge between them)
    for yi in range(len(y_keys)):
        for yj in range(yi + 1, len(y_keys)):
            y_top, y_bot = y_keys[yi], y_keys[yj]
            h = y_bot - y_top
            if h < 8 or h > 300:
                continue

            # Find all x positions with vertical edges spanning this y range
            spanning_xs = [x for x in x_keys if _v_spans(x, y_top, y_bot)]
            if len(spanning_xs) < 2:
                continue

            for xi in range(len(spanning_xs)):
                for xj in range(xi + 1, len(spanning_xs)):
                    x_left, x_right = spanning_xs[xi], spanning_xs[xj]
                    w = x_right - x_left
                    if w < 15:
                        continue

                    # Check that no intermediate vertical edge splits this cell
                    has_inner_v = any(
                        x_left + TOL < spanning_xs[k] < x_right - TOL
                        for k in range(xi + 1, xj)
                    )
                    if has_inner_v:
                        continue

                    # Check that no intermediate horizontal edge splits this cell
                    has_inner_h = any(
                        y_top + TOL < y_keys[k] < y_bot - TOL
                        and _h_spans(y_keys[k], x_left, x_right)
                        for k in range(yi + 1, yj)
                    )
                    if has_inner_h:
                        continue

                    if not _h_spans(y_top, x_left, x_right):
                        continue
                    if not _h_spans(y_bot, x_left, x_right):
                        continue

                    key = (round(x_left), round(y_top), round(x_right), round(y_bot))
                    if key in seen:
                        continue
                    seen.add(key)

                    # Skip page-wide borders
                    if w > pw * 0.88 and h < 6:
                        continue

                    rects.append({
                        "x0": x_left, "top": y_top,
                        "x1": x_right, "bottom": y_bot,
                        "w": w, "h": h,
                    })

    # Post-process: remove rects that fully contain other rects (keep leaf cells only)
    if rects:
        to_remove: set[int] = set()
        for i, a in enumerate(rects):
            if i in to_remove:
                continue
            for j, b in enumerate(rects):
                if i == j or j in to_remove:
                    continue
                # Check if a fully contains b
                if (a["x0"] <= b["x0"] + TOL and a["top"] <= b["top"] + TOL
                        and a["x1"] >= b["x1"] - TOL and a["bottom"] >= b["bottom"] - TOL
                        and (a["w"] * a["h"]) > (b["w"] * b["h"]) * 1.1):
                    to_remove.add(i)
                    break
        rects = [r for i, r in enumerate(rects) if i not in to_remove]

    return rects


def _extract_page_structure(page, page_num: int) -> dict:
    pw, ph = float(page.width), float(page.height)

    rects = []
    seen_rects: set = set()
    for r in page.rects or []:
        x0, top, x1, bot = r["x0"], r["top"], r["x1"], r["bottom"]
        w, h = x1 - x0, bot - top
        if w < 3 or h < 3:
            continue
        key = (round(x0, 1), round(top, 1), round(x1, 1), round(bot, 1))
        if key in seen_rects:
            continue
        seen_rects.add(key)
        rects.append({"x0": x0, "top": top, "x1": x1, "bottom": bot, "w": w, "h": h})

    # Reconstruct rectangles from thin border rects / edges
    reconstructed = _reconstruct_rects_from_edges(page, pw, ph)
    for r in reconstructed:
        key = (round(r["x0"], 1), round(r["top"], 1), round(r["x1"], 1), round(r["bottom"], 1))
        if key not in seen_rects:
            seen_rects.add(key)
            rects.append(r)

    lines_h, lines_v = [], []
    # Collect from page.lines
    for ln in page.lines or []:
        lx0, ltop, lx1, lbot = ln["x0"], ln["top"], ln["x1"], ln["bottom"]
        lh = abs(lx1 - lx0)
        lv_len = abs(lbot - ltop)
        if lh > 25 and lv_len < 3:
            lines_h.append({"x0": min(lx0, lx1), "x1": max(lx0, lx1),
                             "y": (ltop + lbot) / 2})
        elif lv_len > 12 and lh < 3:
            lines_v.append({"x": (lx0 + lx1) / 2,
                             "top": min(ltop, lbot), "bottom": max(ltop, lbot)})

    # Also collect lines from thin border rects and edges (fallback when page.lines is empty)
    if not lines_h and not lines_v:
        raw_h, raw_v = [], []
        for r in page.rects or []:
            x0, top, x1, bot = r["x0"], r["top"], r["x1"], r["bottom"]
            w, h = x1 - x0, bot - top
            if w > 25 and h < 3:
                raw_h.append({"x0": min(x0, x1), "x1": max(x0, x1), "y": (top + bot) / 2})
            elif h > 12 and w < 3:
                raw_v.append({"x": (x0 + x1) / 2, "top": min(top, bot), "bottom": max(top, bot)})
        for e in page.edges or []:
            ex0, etop, ex1, ebot = e["x0"], e["top"], e["x1"], e["bottom"]
            dx, dy = abs(ex1 - ex0), abs(ebot - etop)
            if dx > 25 and dy < 3:
                raw_h.append({"x0": min(ex0, ex1), "x1": max(ex0, ex1), "y": (etop + ebot) / 2})
            elif dy > 12 and dx < 3:
                raw_v.append({"x": (ex0 + ex1) / 2, "top": min(etop, ebot), "bottom": max(etop, ebot)})

        # Deduplicate: merge lines at nearly the same position
        seen_h: set[tuple[float, float, float]] = set()
        for ln in raw_h:
            key = (round(ln["y"] / 4) * 4, round(ln["x0"] / 4) * 4, round(ln["x1"] / 4) * 4)
            if key not in seen_h:
                seen_h.add(key)
                lines_h.append(ln)

        seen_v: set[tuple[float, float, float]] = set()
        for ln in raw_v:
            key = (round(ln["x"] / 4) * 4, round(ln["top"] / 4) * 4, round(ln["bottom"] / 4) * 4)
            if key not in seen_v:
                seen_v.add(key)
                lines_v.append(ln)

    words = []
    for w in page.extract_words(keep_blank_chars=True) or []:
        words.append({"text": w["text"], "x0": w["x0"], "top": w["top"],
                       "x1": w["x1"], "bottom": w["bottom"]})

    chars = []
    for c in page.chars or []:
        chars.append({"text": c["text"], "x0": c["x0"], "top": c["top"],
                       "x1": c["x1"], "bottom": c["bottom"],
                       "size": c.get("size", 10)})

    return {"page_num": page_num, "width": pw, "height": ph,
            "rects": rects, "lines_h": lines_h, "lines_v": lines_v,
            "words": words, "chars": chars,
            "has_reconstructed_rects": len(reconstructed) > 0}


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 — FIELD DETECTION
# ═══════════════════════════════════════════════════════════════════════════

def _label_for_box(box: dict, words: list, page_width: float) -> str:
    bx0, btop, bx1, bbot = box["x0"], box["top"], box["x1"], box["bottom"]
    bmid_y = (btop + bbot) / 2

    # 1. Left-side words
    left = [w for w in words
            if w["x1"] <= bx0 + 8 and bx0 - w["x0"] < 320
            and btop - 5 <= (w["top"] + w["bottom"]) / 2 <= bbot + 5]
    if left:
        left.sort(key=lambda w: w["x0"])
        return " ".join(w["text"] for w in left).strip()

    # 2. Words inside box
    inside = [w for w in words
              if w["x0"] >= bx0 - 2 and w["x1"] <= bx1 + 2
              and w["top"] >= btop - 2 and w["bottom"] <= bbot + 2]
    if inside:
        inside.sort(key=lambda w: (w["top"], w["x0"]))
        return " ".join(w["text"] for w in inside).strip()

    # 3. Words directly above
    above = [w for w in words
             if w["bottom"] <= btop + 5
             and bx0 - 15 <= (w["x0"] + w["x1"]) / 2 <= bx1 + 15]
    if above:
        above.sort(key=lambda w: -w["bottom"])
        row_y = above[0]["top"]
        row_words = [w for w in above if abs(w["top"] - row_y) < 5]
        row_words.sort(key=lambda w: w["x0"])
        return " ".join(w["text"] for w in row_words).strip()

    return ""


def _classify_rects(rects: list, pw: float, ph: float, lines_v: list):
    """Split rects into: checkboxes, table_cells, field_boxes."""
    checkboxes, candidates = [], []
    for r in rects:
        w, h = r["w"], r["h"]
        if w > pw * 0.88 and h > ph * 0.28:
            continue  # page border / title bar
        if w < 58 and h < 42 and 0.25 < w / max(h, 0.1) < 4.0:
            checkboxes.append(r)
        else:
            candidates.append(r)

    table_cells, field_boxes = _detect_table_grid(candidates, lines_v)
    return checkboxes, table_cells, field_boxes


def _detect_table_grid(rects: list, lines_v: list):
    if len(rects) < 3:
        return [], rects

    span_groups: dict = defaultdict(list)
    for r in rects:
        key = (round(r["x0"] / 5) * 5, round(r["x1"] / 5) * 5)
        span_groups[key].append(r)

    table_cells, non_table = [], []
    for key, grp in span_groups.items():
        if len(grp) >= 3:
            heights = [r["h"] for r in grp]
            avg_h = sum(heights) / len(heights)
            if (all(abs(h - avg_h) < avg_h * 0.55 for h in heights) and avg_h < 65):
                grp_sorted = sorted(grp, key=lambda r: r["top"])
                stacked = all(
                    grp_sorted[i + 1]["top"] - grp_sorted[i]["bottom"] < avg_h * 0.5
                    for i in range(len(grp_sorted) - 1)
                )
                if stacked and (len(grp) >= 4 or lines_v):
                    table_cells.extend(grp)
                    continue
        non_table.extend(grp)

    return table_cells, non_table


def _detect_underline_fields(lines_h: list, words: list, rects: list, pw: float) -> list:
    rect_regions = [(r["x0"], r["top"], r["x1"], r["bottom"]) for r in rects]
    fields = []
    for ln in lines_h:
        lx0, lx1, ly = ln["x0"], ln["x1"], ln["y"]
        length = lx1 - lx0
        if length < 35 or length > pw * 0.87:
            continue
        if any(lx0 < rx1 and lx1 > rx0 and ly > rtop - 5 and ly < rbot + 5
               for rx0, rtop, rx1, rbot in rect_regions):
            continue
        fields.append({"x0": lx0, "top": ly - 14, "x1": lx1, "bottom": ly - 2,
                        "w": length, "h": 12, "style": "underline"})
    return fields


def _detect_underscore_blanks(chars: list, words: list, rects: list) -> list:
    underscores = [c for c in chars if c["text"] == "_"]
    if not underscores:
        return []

    y_groups: dict = defaultdict(list)
    for c in underscores:
        y_groups[round(c["top"] / 3) * 3].append(c)

    rect_regions = [(r["x0"], r["top"], r["x1"], r["bottom"]) for r in rects]
    fields = []

    for _, grp in y_groups.items():
        grp.sort(key=lambda c: c["x0"])
        runs, cur = [], [grp[0]]
        for i in range(1, len(grp)):
            if grp[i]["x0"] - cur[-1]["x1"] < 3:
                cur.append(grp[i])
            else:
                runs.append(cur)
                cur = [grp[i]]
        runs.append(cur)

        for run in runs:
            if len(run) < 5:
                continue
            sx0, sx1 = run[0]["x0"], run[-1]["x1"]
            stop, sbot = run[0]["top"], run[0]["bottom"]
            if sx1 - sx0 < 28:
                continue
            if any(sx0 < rx1 and sx1 > rx0 and stop < rbot + 3 and sbot > rtop - 3
                   for rx0, rtop, rx1, rbot in rect_regions):
                continue

            box = {"x0": sx0 + 2, "top": sbot - 13, "x1": sx1,
                   "bottom": sbot - 1, "w": sx1 - sx0, "h": 12,
                   "style": "underscore"}

            # Grab preceding text as label
            pre = [c for c in chars if c["text"] != "_"
                   and abs(c["top"] - stop) < 3 and c["x1"] <= sx0 + 2]
            if pre:
                pre.sort(key=lambda c: c["x0"])
                box["context_label"] = re.sub(r'[,;:\s]+$', '',
                    "".join(c["text"] for c in pre).strip())
            fields.append(box)
    return fields


RADIO_PATTERNS = [
    (re.compile(r"(?i)^[MF]$"), "Gender"),
    (re.compile(r"(?i)^(yes|no)$"), None),
    (re.compile(r"(?i)^(true|false)$"), None),
    (re.compile(r"(?i)^(male|female)$"), "Gender"),
]


def _detect_radio_groups(checkboxes: list, words: list):
    used: set = set()
    radio_groups = []
    cb_labels = []

    for i, cb in enumerate(checkboxes):
        mx, my = (cb["x0"] + cb["x1"]) / 2, (cb["top"] + cb["bottom"]) / 2
        best_w, best_d = None, float("inf")
        for w in words:
            d = ((mx - (w["x0"]+w["x1"])/2)**2 + (my - (w["top"]+w["bottom"])/2)**2) ** 0.5
            if d < 65 and d < best_d:
                best_w, best_d = w, d
        cb_labels.append((i, cb, best_w))

    for i, cb_i, li in cb_labels:
        if i in used or li is None:
            continue
        for j, cb_j, lj in cb_labels:
            if j <= i or j in used or lj is None:
                continue
            if abs(cb_i["top"] - cb_j["top"]) > 18:
                continue
            for pat, gname in RADIO_PATTERNS:
                if pat.match(li["text"].strip()) and pat.match(lj["text"].strip()):
                    if gname is None:
                        gname = f"Radio_{li['text']}_{lj['text']}"
                    radio_groups.append({
                        "group_name": gname,
                        "options": [
                            {"name": li["text"].strip(), "rect": cb_i},
                            {"name": lj["text"].strip(), "rect": cb_j},
                        ],
                    })
                    used.update([i, j])
                    break

    remaining = [cb for idx, cb in enumerate(checkboxes) if idx not in used]
    return radio_groups, remaining


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — WIDGET BUILDERS  (appearance streams included)
# ═══════════════════════════════════════════════════════════════════════════

def _zadb_res() -> DictionaryObject:
    zadb = DictionaryObject()
    zadb[NameObject("/Type")] = NameObject("/Font")
    zadb[NameObject("/Subtype")] = NameObject("/Type1")
    zadb[NameObject("/BaseFont")] = NameObject(ZADB_FONT)
    fd = DictionaryObject()
    fd[NameObject("/ZaDb")] = zadb
    res = DictionaryObject()
    res[NameObject("/Font")] = fd
    return res


def _helv_res() -> DictionaryObject:
    helv = DictionaryObject()
    helv[NameObject("/Type")] = NameObject("/Font")
    helv[NameObject("/Subtype")] = NameObject("/Type1")
    helv[NameObject("/BaseFont")] = NameObject(HELV_FONT)
    helv[NameObject("/Encoding")] = NameObject("/WinAnsiEncoding")
    fd = DictionaryObject()
    fd[NameObject("/Helv")] = helv
    res = DictionaryObject()
    res[NameObject("/Font")] = fd
    return res


def _make_text_widget(writer: PdfWriter, name: str, rect: list,
                      page_ref, multiline: bool = False,
                      font_size: int = 8, value: str = "") -> Any:
    bw = abs(rect[2] - rect[0])
    bh = abs(rect[3] - rect[1])
    fs = min(font_size, max(5, int(bh * 0.6)))

    normal_ap = DecodedStreamObject()
    # Add clipping rect to prevent text overflow
    ap_content = (
        f"q\n0 0 {bw:.2f} {bh:.2f} re W n\n"
        f"/Tx BMC\nBT\n/Helv {fs} Tf\n0 g\n"
        f"2 {(bh - fs) / 2:.2f} Td\n"
        f"({_escape_pdf_str(value)}) Tj\nET\nEMC\nQ\n"
    )
    normal_ap.set_data(ap_content.encode())
    normal_ap[NameObject("/Type")] = NameObject("/XObject")
    normal_ap[NameObject("/Subtype")] = NameObject("/Form")
    normal_ap[NameObject("/BBox")] = RectangleObject([0, 0, bw, bh])
    normal_ap[NameObject("/Resources")] = _helv_res()
    ap_ref = writer._add_object(normal_ap)

    ap_dict = DictionaryObject()
    ap_dict[NameObject("/N")] = ap_ref

    field = DictionaryObject()
    field[NameObject("/Type")] = NameObject("/Annot")
    field[NameObject("/Subtype")] = NameObject("/Widget")
    field[NameObject("/FT")] = NameObject("/Tx")
    field[NameObject("/T")] = TextStringObject(name)
    field[NameObject("/V")] = TextStringObject(value)
    field[NameObject("/Rect")] = RectangleObject(rect)
    field[NameObject("/P")] = page_ref
    field[NameObject("/Ff")] = NumberObject((1 << 12) if multiline else 0)
    field[NameObject("/DA")] = TextStringObject(f"/Helv {fs} Tf 0 g")
    field[NameObject("/AP")] = ap_dict
    bs = DictionaryObject()
    bs[NameObject("/W")] = NumberObject(0)
    bs[NameObject("/S")] = NameObject("/S")
    field[NameObject("/BS")] = bs
    return writer._add_object(field)


def _make_checkbox_widget(writer: PdfWriter, name: str, rect: list,
                          page_ref, checked: bool = False) -> Any:
    bw = rect[2] - rect[0]
    bh = rect[3] - rect[1]
    fs = min(min(bw, bh) * 0.55, 14)
    tx = (bw - fs * 0.8) / 2
    ty = (bh - fs) / 2

    res = _zadb_res()
    lbbox = RectangleObject([0, 0, bw, bh])

    on_s = DecodedStreamObject()
    on_s.set_data(f"q\nBT\n/ZaDb {fs:.1f} Tf\n{tx:.1f} {ty:.1f} Td\n(4) Tj\nET\nQ\n".encode())
    on_s[NameObject("/Type")] = NameObject("/XObject")
    on_s[NameObject("/Subtype")] = NameObject("/Form")
    on_s[NameObject("/BBox")] = lbbox
    on_s[NameObject("/Resources")] = res
    on_ref = writer._add_object(on_s)

    off_s = DecodedStreamObject()
    off_s.set_data(b"")
    off_s[NameObject("/Type")] = NameObject("/XObject")
    off_s[NameObject("/Subtype")] = NameObject("/Form")
    off_s[NameObject("/BBox")] = lbbox
    off_ref = writer._add_object(off_s)

    n_dict = DictionaryObject()
    n_dict[NameObject("/Yes")] = on_ref
    n_dict[NameObject("/Off")] = off_ref
    ap_dict = DictionaryObject()
    ap_dict[NameObject("/N")] = n_dict

    field = DictionaryObject()
    field[NameObject("/Type")] = NameObject("/Annot")
    field[NameObject("/Subtype")] = NameObject("/Widget")
    field[NameObject("/FT")] = NameObject("/Btn")
    field[NameObject("/T")] = TextStringObject(name)
    state = "/Yes" if checked else "/Off"
    field[NameObject("/V")] = NameObject(state)
    field[NameObject("/AS")] = NameObject(state)
    field[NameObject("/Rect")] = RectangleObject(rect)
    field[NameObject("/P")] = page_ref
    field[NameObject("/Ff")] = NumberObject(0)
    field[NameObject("/DA")] = TextStringObject("/ZaDb 0 Tf 0 g")
    field[NameObject("/AP")] = ap_dict
    return writer._add_object(field)


def _make_signature_widget(writer: PdfWriter, name: str, rect: list,
                           page_ref, sig_image_bytes: bytes | None = None,
                           typed_name: str = "") -> Any:
    """Create a signature field with an optional embedded appearance."""
    bw = rect[2] - rect[0]
    bh = rect[3] - rect[1]

    res = _helv_res()
    lbbox = RectangleObject([0, 0, bw, bh])

    # Build appearance stream content
    if sig_image_bytes and PIL_AVAILABLE:
        # Embed image as XObject
        ap_content = _build_image_appearance(writer, sig_image_bytes, bw, bh)
    elif typed_name:
        fs = min(int(bh * 0.55), 16)
        ap_content = (
            f"q\nBT\n/Helv {fs} Tf\n0.1 g\n"
            f"2 {(bh - fs) / 2:.1f} Td\n({_escape_pdf_str(typed_name)}) Tj\nET\n"
            f"0.4 0.4 0.9 RG 0.5 w 0 0 {bw:.1f} {bh:.1f} re S\nQ\n"
        )
    else:
        # Blank signature box with blue border
        ap_content = (
            f"q\n0.4 0.4 0.9 RG 0.5 w 0 0 {bw:.1f} {bh:.1f} re S\n"
            f"BT\n/Helv 7 Tf\n0.5 0.5 0.5 rg\n"
            f"2 {bh/2 - 4:.1f} Td\n(Sign here) Tj\nET\nQ\n"
        )

    normal_ap = DecodedStreamObject()
    normal_ap.set_data(ap_content.encode() if isinstance(ap_content, str) else ap_content)
    normal_ap[NameObject("/Type")] = NameObject("/XObject")
    normal_ap[NameObject("/Subtype")] = NameObject("/Form")
    normal_ap[NameObject("/BBox")] = lbbox
    normal_ap[NameObject("/Resources")] = res
    ap_ref = writer._add_object(normal_ap)
    ap_dict = DictionaryObject()
    ap_dict[NameObject("/N")] = ap_ref

    field = DictionaryObject()
    field[NameObject("/Type")] = NameObject("/Annot")
    field[NameObject("/Subtype")] = NameObject("/Widget")
    field[NameObject("/FT")] = NameObject("/Sig")
    field[NameObject("/T")] = TextStringObject(name)
    field[NameObject("/Rect")] = RectangleObject(rect)
    field[NameObject("/P")] = page_ref
    field[NameObject("/AP")] = ap_dict
    return writer._add_object(field)


def _build_image_appearance(writer: PdfWriter, img_bytes: bytes, bw: float, bh: float) -> bytes:
    """Embed a PIL image as a PDF image XObject and return appearance stream bytes."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    # Fit image within bounding box preserving aspect ratio
    img.thumbnail((int(bw * 2), int(bh * 2)), Image.LANCZOS)
    iw, ih = img.size

    # Convert to RGB for PDF embedding
    bg = Image.new("RGBA", img.size, (255, 255, 255, 0))
    combined = Image.alpha_composite(bg, img).convert("RGB")
    buf = io.BytesIO()
    combined.save(buf, format="JPEG", quality=90)
    img_data = buf.getvalue()

    img_obj = DecodedStreamObject()
    img_obj.set_data(img_data)
    img_obj[NameObject("/Type")] = NameObject("/XObject")
    img_obj[NameObject("/Subtype")] = NameObject("/Image")
    img_obj[NameObject("/Width")] = NumberObject(iw)
    img_obj[NameObject("/Height")] = NumberObject(ih)
    img_obj[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_obj[NameObject("/BitsPerComponent")] = NumberObject(8)
    img_obj[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_ref = writer._add_object(img_obj)

    # Center image in box
    scale = min(bw / iw, bh / ih)
    dw, dh = iw * scale, ih * scale
    tx = (bw - dw) / 2
    ty = (bh - dh) / 2
    content = f"q {dw:.2f} 0 0 {dh:.2f} {tx:.2f} {ty:.2f} cm /Im0 Do Q\n".encode()
    return content


def _escape_pdf_str(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 — MAIN PIPELINE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def scan_fields(pdf_path: str) -> dict:
    """
    Scan a PDF and return a structured field map.
    Works on both fillable and non-fillable PDFs.
    """
    reader = PdfReader(pdf_path)
    result = {"path": pdf_path, "pages": len(reader.pages),
              "has_acroform": False, "fields": []}

    # Check existing AcroForm
    acro = reader.trailer.get("/Root", {}).get("/AcroForm")
    if acro:
        existing_fields = acro.get("/Fields", [])
        if existing_fields:
            result["has_acroform"] = True
            for fref in existing_fields:
                try:
                    fobj = fref.get_object()
                    ft = str(fobj.get("/FT", "/Tx"))
                    fname = str(fobj.get("/T", ""))
                    page_idx = _find_field_page(fobj, reader)

                    if ft.strip("/") == "Btn":
                        ff = int(fobj.get("/Ff", 0))
                        is_radio = bool(ff & (1 << 15))

                        if is_radio:
                            # Extract option names from each child widget's AP/N dict
                            options = []
                            for kid_ref in fobj.get("/Kids", []):
                                try:
                                    kid = kid_ref.get_object()
                                    ap_n = kid.get("/AP", {}).get("/N", {})
                                    if hasattr(ap_n, "keys"):
                                        for k in ap_n.keys():
                                            state = str(k).strip("/")
                                            if state != "Off" and state not in options:
                                                options.append(state)
                                except Exception:
                                    pass

                            result["fields"].append({
                                "name": fname,
                                "type": "radio",
                                "page": page_idx + 1,
                                "value": str(fobj.get("/V", "")).strip("/"),
                                "options": options,
                                "label": fname,
                            })
                        else:
                            rect = list(fobj.get("/Rect", [0, 0, 0, 0]))
                            result["fields"].append({
                                "name": fname,
                                "type": "checkbox",
                                "page": page_idx + 1,
                                "rect": rect,
                                "value": str(fobj.get("/V", "")).strip("/"),
                                "label": fname,
                            })
                    else:
                        rect = list(fobj.get("/Rect", [0, 0, 0, 0]))
                        result["fields"].append({
                            "name": fname,
                            "type": {"Tx": "text", "Ch": "dropdown",
                                     "Sig": "signature"}.get(ft.strip("/"), "text"),
                            "page": page_idx + 1,
                            "rect": rect,
                            "value": str(fobj.get("/V", "")),
                            "label": fname,
                        })
                except Exception:
                    pass
            return result

    # Non-fillable: detect visually
    with pdfplumber.open(pdf_path) as pdf:
        namer = _NameCounter()
        for i, page in enumerate(pdf.pages):
            pdata = _extract_page_structure(page, i)
            fields = _collect_page_fields(pdata, namer)
            for f in fields:
                ftype = f["type"]
                subtype = _infer_subtype(f.get("label", ""))
                entry = {
                    "name": f["field_name"],
                    "type": ftype if ftype != "text" else subtype,
                    "page": i + 1,
                    "label": f.get("label", ""),
                }
                # For radio groups, include option names so the frontend can render them
                if ftype == "radio" and f.get("options"):
                    entry["options"] = [
                        opt["name"] if isinstance(opt, dict) else str(opt)
                        for opt in f["options"]
                    ]
                result["fields"].append(entry)

    return result


def _find_field_page(fobj, reader: PdfReader) -> int:
    page_ref = fobj.get("/P")
    if page_ref:
        for idx, page in enumerate(reader.pages):
            if page.indirect_reference == page_ref.indirect_reference:
                return idx
    return 0


def _collect_page_fields(pdata: dict, namer: _NameCounter) -> list:
    """Collect all detected fields for a single page."""
    pg = pdata["page_num"]
    pw, ph = pdata["width"], pdata["height"]
    words, chars = pdata["words"], pdata["chars"]
    rects, lines_h, lines_v = pdata["rects"], pdata["lines_h"], pdata["lines_v"]

    # When rects were reconstructed from edges, they are already individual cells.
    # Skip table detection to avoid re-splitting them with lines_v.
    if pdata.get("has_reconstructed_rects"):
        checkboxes, _, _ = _classify_rects(rects, pw, ph, [])
        cb_ids = {id(r) for r in checkboxes}
        table_cells = []
        field_boxes = [r for r in rects if id(r) not in cb_ids]
    else:
        checkboxes, table_cells, field_boxes = _classify_rects(rects, pw, ph, lines_v)
    radio_groups, remaining_cbs = _detect_radio_groups(checkboxes, words)

    fields = []

    for rg in radio_groups:
        fields.append({
            "type": "radio", "page": pg, "page_height": ph,
            "field_name": namer.unique(rg["group_name"]),
            "options": rg["options"], "label": rg["group_name"],
        })

    for cb in remaining_cbs:
        if cb["top"] < ph * 0.1 or cb["top"] > ph * 0.96:
            continue
        label = _label_for_box(cb, words, pw)
        if re.match(r'^[A-Z]?\d+\.?$', label.strip()):
            label = ""
        fname = _sanitize(label) if label else "Checkbox"
        pdf_r = _to_pdf_rect(cb["x0"], cb["top"], cb["x1"], cb["bottom"], ph)
        fields.append({"type": "checkbox", "page": pg,
                        "field_name": namer.unique(fname),
                        "rect": pdf_r, "label": label})

    # Table cells
    if table_cells:
        table_x0 = min(r["x0"] for r in table_cells)
        table_x1 = max(r["x1"] for r in table_cells)
        table_top = min(r["top"] for r in table_cells)
        table_bot = max(r["bottom"] for r in table_cells)
        col_splits = sorted(set(
            round(lv["x"], 1) for lv in lines_v
            if table_x0 + 5 < lv["x"] < table_x1 - 5
            and lv["top"] < table_bot and lv["bottom"] > table_top
        ))
        col_bounds = [table_x0] + col_splits + [table_x1]
        rows_sorted = sorted(table_cells, key=lambda r: r["top"])
        header = rows_sorted[0] if rows_sorted else None
        header_labels = []
        if header:
            for ci in range(len(col_bounds) - 1):
                cx0, cx1 = col_bounds[ci], col_bounds[ci + 1]
                col_words = [w for w in words
                             if w["x0"] >= cx0 - 2 and w["x1"] <= cx1 + 2
                             and w["top"] >= header["top"] - 2
                             and w["bottom"] <= header["bottom"] + 2]
                lbl = " ".join(w["text"] for w in sorted(col_words, key=lambda w: w["x0"]))
                header_labels.append(lbl.strip() or f"Col{ci+1}")
        for ri, row in enumerate(rows_sorted[1:], 1):
            for ci in range(len(col_bounds) - 1):
                cx0, cx1 = col_bounds[ci], col_bounds[ci + 1]
                col_lbl = header_labels[ci] if ci < len(header_labels) else f"Col{ci+1}"
                pdf_r = _to_pdf_rect(cx0, row["top"], cx1, row["bottom"], ph)
                fields.append({"type": "text", "page": pg,
                                "field_name": namer.unique(f"{_sanitize(col_lbl)}_R{ri}"),
                                "rect": pdf_r, "label": col_lbl, "multiline": False})

    for fb in field_boxes:
        # Skip section header rects: near-full-width and short with any text inside
        if fb["w"] > pw * 0.75 and fb["h"] < 22:
            inner_words = [w for w in words
                           if w["x0"] >= fb["x0"] - 2 and w["x1"] <= fb["x1"] + 2
                           and w["top"] >= fb["top"] - 2 and w["bottom"] <= fb["bottom"] + 2]
            if inner_words:
                continue  # Section header bar, not an input field

        label = _label_for_box(fb, words, pw)
        if len(label) > 85:
            label = ""
        # Check if this looks like a signature zone
        subtype = _infer_subtype(label)
        fname = _sanitize(label) if label else "Field"
        multiline = fb["h"] > 30

        # Avoid overlapping with label text inside the box
        box_chars = [c for c in chars
                     if c["x0"] >= fb["x0"] - 5 and c["x1"] <= fb["x1"] + 2
                     and c["top"] >= fb["top"] - 5 and c["bottom"] <= fb["bottom"] + 5
                     and c["text"].strip()]
        field_x0, field_top = fb["x0"], fb["top"]
        if box_chars:
            cx1 = max(c["x1"] for c in box_chars)
            cy_bot = max(c["bottom"] for c in box_chars)
            if multiline:
                field_top = cy_bot + 2
            else:
                field_x0 = cx1 + 8
                if field_x0 >= fb["x1"] - 10:
                    field_x0 = fb["x0"]

        pdf_r = _to_pdf_rect(field_x0, field_top, fb["x1"], fb["bottom"], ph)
        actual_type = subtype if subtype in ("signature", "date") else "text"
        fields.append({"type": actual_type, "page": pg,
                        "field_name": namer.unique(fname),
                        "rect": pdf_r, "label": label, "multiline": multiline})

    for uf in _detect_underline_fields(lines_h, words, rects, pw):
        label = _label_for_box(uf, words, pw)
        fname = _sanitize(label) if label else "Field"
        pdf_r = _to_pdf_rect(uf["x0"], uf["top"], uf["x1"], uf["bottom"], ph)
        fields.append({"type": _infer_subtype(label), "page": pg,
                        "field_name": namer.unique(fname),
                        "rect": pdf_r, "label": label, "multiline": False})

    for uf in _detect_underscore_blanks(chars, words, rects):
        label = uf.get("context_label", "")
        if not label:
            label = _label_for_box(uf, words, pw)
            label = re.sub(r'_+', '', label).strip(" ,")
        fname = _sanitize(label) if label else "Field"
        pdf_r = _to_pdf_rect(uf["x0"], uf["top"], uf["x1"], uf["bottom"], ph)
        fields.append({"type": _infer_subtype(label), "page": pg,
                        "field_name": namer.unique(fname),
                        "rect": pdf_r, "label": label, "multiline": False})

    return fields


def make_fillable(input_pdf: str, output_pdf: str) -> tuple[str, int]:
    """Convert a plain PDF into a fillable AcroForm PDF."""
    with pdfplumber.open(input_pdf) as pdf:
        namer = _NameCounter()
        pages_data = [_extract_page_structure(p, i) for i, p in enumerate(pdf.pages)]

    all_fields = []
    for pdata in pages_data:
        all_fields.extend(_collect_page_fields(pdata, namer))

    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    helv = DictionaryObject()
    helv[NameObject("/Type")] = NameObject("/Font")
    helv[NameObject("/Subtype")] = NameObject("/Type1")
    helv[NameObject("/BaseFont")] = NameObject(HELV_FONT)
    helv[NameObject("/Encoding")] = NameObject("/WinAnsiEncoding")
    helv_ref = writer._add_object(helv)

    zadb = DictionaryObject()
    zadb[NameObject("/Type")] = NameObject("/Font")
    zadb[NameObject("/Subtype")] = NameObject("/Type1")
    zadb[NameObject("/BaseFont")] = NameObject(ZADB_FONT)
    zadb_ref = writer._add_object(zadb)

    dr = DictionaryObject()
    fd = DictionaryObject()
    fd[NameObject("/Helv")] = helv_ref
    fd[NameObject("/ZaDb")] = zadb_ref
    dr[NameObject("/Font")] = fd

    acro = DictionaryObject()
    acro[NameObject("/DR")] = dr
    acro[NameObject("/DA")] = TextStringObject("/Helv 8 Tf 0 g")
    acro[NameObject("/NeedAppearances")] = BooleanObject(True)
    acro_fields_arr = ArrayObject()

    for fld in all_fields:
        pg_idx = fld["page"]
        page_obj = writer.pages[pg_idx]
        page_ref = page_obj.indirect_reference
        if "/Annots" not in page_obj:
            page_obj[NameObject("/Annots")] = ArrayObject()

        ftype = fld["type"]
        rect = fld.get("rect")  # Already in PDF coordinates from _collect_page_fields

        if ftype == "radio":
            grp_ref, w_refs = _make_radio_group(
                writer, fld["field_name"], fld["options"], page_ref, fld["page_height"])
            acro_fields_arr.append(grp_ref)
            for wr in w_refs:
                page_obj[NameObject("/Annots")].append(wr)
        elif ftype == "checkbox":
            ref = _make_checkbox_widget(writer, fld["field_name"], rect, page_ref)
            acro_fields_arr.append(ref)
            page_obj[NameObject("/Annots")].append(ref)
        elif ftype == "signature":
            ref = _make_signature_widget(writer, fld["field_name"], rect, page_ref)
            acro_fields_arr.append(ref)
            page_obj[NameObject("/Annots")].append(ref)
        else:
            ref = _make_text_widget(writer, fld["field_name"], rect, page_ref,
                                    multiline=fld.get("multiline", False))
            acro_fields_arr.append(ref)
            page_obj[NameObject("/Annots")].append(ref)

    acro[NameObject("/Fields")] = acro_fields_arr
    writer._root_object[NameObject("/AcroForm")] = writer._add_object(acro)

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf, len(all_fields)


def _make_radio_group(writer: PdfWriter, group_name: str, options: list,
                      page_ref, page_height: float):
    res = _zadb_res()
    group = DictionaryObject()
    group[NameObject("/FT")] = NameObject("/Btn")
    group[NameObject("/Ff")] = NumberObject((1 << 14) | (1 << 15))
    group[NameObject("/T")] = TextStringObject(group_name)
    group[NameObject("/V")] = NameObject("/Off")

    kids = ArrayObject()
    widget_refs = []

    for opt in options:
        r = opt["rect"]
        pdf_r = _to_pdf_rect(r["x0"], r["top"], r["x1"], r["bottom"], page_height)
        bw, bh = pdf_r[2] - pdf_r[0], pdf_r[3] - pdf_r[1]
        lbbox = RectangleObject([0, 0, bw, bh])
        fs = min(min(bw, bh) * 0.5, 12)
        tx, ty = (bw - fs * 0.8) / 2, (bh - fs) / 2
        on_content = f"q\nBT\n/ZaDb {fs:.1f} Tf\n{tx:.1f} {ty:.1f} Td\n(l) Tj\nET\nQ\n"

        on_s = DecodedStreamObject()
        on_s.set_data(on_content.encode())
        on_s[NameObject("/Type")] = NameObject("/XObject")
        on_s[NameObject("/Subtype")] = NameObject("/Form")
        on_s[NameObject("/BBox")] = lbbox
        on_s[NameObject("/Resources")] = res
        on_ref = writer._add_object(on_s)

        off_s = DecodedStreamObject()
        off_s.set_data(b"")
        off_s[NameObject("/Type")] = NameObject("/XObject")
        off_s[NameObject("/Subtype")] = NameObject("/Form")
        off_s[NameObject("/BBox")] = lbbox
        off_ref = writer._add_object(off_s)

        opt_name = NameObject(f"/{opt['name']}")
        nd = DictionaryObject()
        nd[opt_name] = on_ref
        nd[NameObject("/Off")] = off_ref
        ap_dict = DictionaryObject()
        ap_dict[NameObject("/N")] = nd

        widget = DictionaryObject()
        widget[NameObject("/Type")] = NameObject("/Annot")
        widget[NameObject("/Subtype")] = NameObject("/Widget")
        widget[NameObject("/Rect")] = RectangleObject(pdf_r)
        widget[NameObject("/AS")] = NameObject("/Off")
        widget[NameObject("/DA")] = TextStringObject("/ZaDb 10 Tf 0 g")
        widget[NameObject("/P")] = page_ref
        widget[NameObject("/AP")] = ap_dict
        w_ref = writer._add_object(widget)
        kids.append(w_ref)
        widget_refs.append(w_ref)

    group[NameObject("/Kids")] = kids
    group_ref = writer._add_object(group)
    for w_ref in widget_refs:
        w_ref.get_object()[NameObject("/Parent")] = group_ref

    return group_ref, widget_refs


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 5 — FILL EXISTING FORM FIELDS
# ═══════════════════════════════════════════════════════════════════════════

def fill_pdf(input_pdf: str, output_pdf: str, data: dict,
             sig_image_path: str | None = None,
             typed_signature: str | None = None) -> str:
    """
    Fill an existing AcroForm PDF with data.

    data: {field_name: value, ...}
          For checkboxes: True/False or "/Yes"/"/Off"
          For signature fields: use sig_image_path or typed_signature
    """
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    # Load signature image if provided
    sig_bytes = None
    if sig_image_path and os.path.isfile(sig_image_path):
        with open(sig_image_path, "rb") as f:
            sig_bytes = f.read()

    # Fill fields
    for page in writer.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        for annot_ref in annots:
            try:
                annot = annot_ref.get_object()
                ft = str(annot.get("/FT", ""))
                fname = str(annot.get("/T", ""))

                if fname not in data:
                    # Try fuzzy match
                    fname = _fuzzy_match(fname, data)
                    if not fname:
                        continue

                value = data[fname]

                if ft == "/Tx":
                    annot[NameObject("/V")] = TextStringObject(str(value))
                    annot[NameObject("/AP")] = _build_text_ap(writer, annot, str(value))

                elif ft == "/Btn":
                    ff = int(annot.get("/Ff", 0))
                    is_radio = bool(ff & (1 << 15))
                    if is_radio:
                        kids = annot.get("/Kids", [])
                        val_str = str(value)
                        for kid_ref in kids:
                            kid = kid_ref.get_object()
                            ap = kid.get("/AP", {}).get("/N", {})
                            on_states = [str(k).strip("/") for k in ap.keys() if str(k).strip("/") != "Off"]
                            for state in on_states:
                                # Exact match, or partial match (e.g. "Yes" matches "Yes_5")
                                if state == val_str or state.startswith(val_str):
                                    kid[NameObject("/AS")] = NameObject(f"/{state}")
                                    annot[NameObject("/V")] = NameObject(f"/{state}")
                                    break
                    else:
                        is_on = value in (True, "true", "yes", "Yes", "/Yes", "on", "On", 1)
                        if is_on:
                            # Detect the actual 'on' state name from AP/N dict
                            # (some PDFs use /Yes, others /On, etc.)
                            on_state = "Yes"
                            ap_n = annot.get("/AP", {}).get("/N", {})
                            if hasattr(ap_n, "keys"):
                                for k in ap_n.keys():
                                    state = str(k).strip("/")
                                    if state != "Off":
                                        on_state = state
                                        break
                            annot[NameObject("/V")] = NameObject(f"/{on_state}")
                            annot[NameObject("/AS")] = NameObject(f"/{on_state}")
                        else:
                            annot[NameObject("/V")] = NameObject("/Off")
                            annot[NameObject("/AS")] = NameObject("/Off")

                elif ft == "/Sig":
                    if sig_bytes or typed_signature:
                        rect = list(annot.get("/Rect", [0, 0, 100, 30]))
                        bw = rect[2] - rect[0]
                        bh = rect[3] - rect[1]
                        if sig_bytes and PIL_AVAILABLE:
                            ap_data = _build_image_appearance(writer, sig_bytes, bw, bh)
                        else:
                            sig_text = typed_signature or str(value)
                            fs = min(int(bh * 0.55), 16)
                            ap_data = (
                                f"q\nBT\n/Helv {fs} Tf\n0.1 g\n"
                                f"2 {(bh-fs)/2:.1f} Td\n({_escape_pdf_str(sig_text)}) Tj\n"
                                f"ET\nQ\n"
                            ).encode()
                        ap_stream = DecodedStreamObject()
                        ap_stream.set_data(ap_data)
                        ap_stream[NameObject("/Type")] = NameObject("/XObject")
                        ap_stream[NameObject("/Subtype")] = NameObject("/Form")
                        ap_stream[NameObject("/BBox")] = RectangleObject([0, 0, bw, bh])
                        ap_stream[NameObject("/Resources")] = _helv_res()
                        ap_ref = writer._add_object(ap_stream)
                        ap_dict = DictionaryObject()
                        ap_dict[NameObject("/N")] = ap_ref
                        annot[NameObject("/AP")] = ap_dict

            except Exception as e:
                print(f"  [warn] Could not fill field '{fname}': {e}", file=sys.stderr)

    # Ensure NeedAppearances is set
    root = writer._root_object
    acro = root.get("/AcroForm")
    if acro:
        try:
            acro_obj = acro.get_object()
            acro_obj[NameObject("/NeedAppearances")] = BooleanObject(True)
        except Exception:
            pass

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf


def _estimate_text_width(text: str, font_size: float) -> float:
    """Estimate Helvetica text width in points."""
    narrow = set("iltfj1!|:;.,'' ")
    wide = set("mwMW@")
    w = 0.0
    for ch in text:
        if ch in narrow:
            w += font_size * 0.3
        elif ch in wide:
            w += font_size * 0.72
        elif ch.isupper():
            w += font_size * 0.62
        else:
            w += font_size * 0.52
    return w


def _build_text_ap(writer: PdfWriter, annot, value: str) -> DictionaryObject:
    """Build a text appearance stream for a filled text field with auto-fit."""
    rect = list(annot.get("/Rect", [0, 0, 100, 20]))
    bw = abs(rect[2] - rect[0])
    bh = abs(rect[3] - rect[1])
    ff = int(annot.get("/Ff", 0))
    is_multiline = bool(ff & (1 << 12))
    usable_w = bw - 4  # 2px padding each side

    fs = min(int(bh * 0.6), 11)

    if not is_multiline:
        # Shrink font to fit text width
        while fs > 5 and _estimate_text_width(value, fs) > usable_w:
            fs -= 0.5
        fs = max(5, round(fs))
    else:
        # For multiline, shrink if text needs more lines than available
        chars_per_line = max(1, int(usable_w / (fs * 0.52)))
        lines_available = max(1, int(bh / (fs * 1.2)))
        lines_needed = max(1, -(-len(value) // chars_per_line))
        if lines_needed > lines_available:
            ratio = (lines_available / lines_needed) ** 0.5
            fs = max(5, round(fs * ratio))

    # Add clipping rect to prevent overflow
    content = (
        f"q\n0 0 {bw:.2f} {bh:.2f} re W n\n"
        f"/Tx BMC\nBT\n/Helv {fs} Tf\n0 g\n"
        f"2 {(bh - fs) / 2:.2f} Td\n({_escape_pdf_str(value)}) Tj\nET\nEMC\nQ\n"
    )
    stream = DecodedStreamObject()
    stream.set_data(content.encode())
    stream[NameObject("/Type")] = NameObject("/XObject")
    stream[NameObject("/Subtype")] = NameObject("/Form")
    stream[NameObject("/BBox")] = RectangleObject([0, 0, bw, bh])
    stream[NameObject("/Resources")] = _helv_res()
    ap_ref = writer._add_object(stream)
    ap_dict = DictionaryObject()
    ap_dict[NameObject("/N")] = ap_ref
    return ap_dict


def _fuzzy_match(name: str, data: dict) -> str | None:
    """Try to find a key in data that loosely matches the field name."""
    name_lower = name.lower().replace(" ", "_")
    for key in data:
        if key.lower().replace(" ", "_") == name_lower:
            return key
    return None


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 6 — ADD SIGNATURE STAMP (works on any PDF, fillable or not)
# ═══════════════════════════════════════════════════════════════════════════

def add_signature_stamp(input_pdf: str, output_pdf: str,
                        page_num: int = 1,
                        x: float | None = None,
                        y: float | None = None,
                        width: float = 180,
                        height: float = 60,
                        typed_name: str = "",
                        sig_image_path: str | None = None,
                        timestamp: bool = True) -> str:
    """
    Stamp a signature appearance directly onto a page (not as a form field).
    This works on any PDF, including ones that cannot be edited.

    page_num: 1-based page index
    x, y: position in PDF points from bottom-left. If None, placed at bottom-right margin.
    """
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("pip install reportlab  to use signature stamping")

    reader = PdfReader(input_pdf)
    total_pages = len(reader.pages)
    pg_idx = max(0, min(page_num - 1, total_pages - 1))

    page = reader.pages[pg_idx]
    pw = float(page.mediabox.width)
    ph = float(page.mediabox.height)

    # Default: bottom-right corner
    if x is None:
        x = pw - width - 40
    if y is None:
        y = 30

    # Build signature overlay PDF in memory
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(pw, ph))

    # For each page: draw blank overlay on non-target pages
    for i in range(total_pages):
        if i == pg_idx:
            _draw_signature_stamp(c, x, y, width, height, typed_name,
                                   sig_image_path, timestamp)
        c.showPage()

    c.save()
    buf.seek(0)

    # Merge overlay onto original
    stamp_reader = PdfReader(buf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    stamp_page = stamp_reader.pages[pg_idx]
    writer.pages[pg_idx].merge_page(stamp_page)

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf


def _draw_signature_stamp(c, x: float, y: float, w: float, h: float,
                           typed_name: str, sig_image_path: str | None,
                           timestamp: bool):
    """Draw signature content using ReportLab canvas."""
    # Box border
    c.setStrokeColorRGB(0.2, 0.2, 0.6)
    c.setLineWidth(0.8)
    c.rect(x, y, w, h)

    if sig_image_path and os.path.isfile(sig_image_path) and PIL_AVAILABLE:
        try:
            img = Image.open(sig_image_path).convert("RGBA")
            img.thumbnail((int(w - 10), int(h - (20 if timestamp else 10))), Image.LANCZOS)
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            img.save(tmp.name)
            tmp.close()
            iw, ih = img.size
            ix = x + (w - iw) / 2
            iy = y + (h - ih) / 2 + (8 if timestamp else 0)
            c.drawImage(tmp.name, ix, iy, iw, ih, mask="auto")
            os.unlink(tmp.name)
        except Exception:
            pass
    elif typed_name:
        c.setFillColorRGB(0.05, 0.1, 0.55)
        font_size = min(h * 0.4, 22)
        c.setFont("Helvetica-BoldOblique", font_size)
        c.drawString(x + 8, y + h / 2 - font_size / 2 + (8 if timestamp else 0), typed_name)
    else:
        c.setFillColorRGB(0.6, 0.6, 0.7)
        c.setFont("Helvetica", 9)
        c.drawString(x + 8, y + h / 2, "Sign here")

    if timestamp:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.setFont("Helvetica", 7)
        c.drawString(x + 4, y + 4, f"Signed: {ts}")


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 7 — FLATTEN (burn fields into page content)
# ═══════════════════════════════════════════════════════════════════════════

def flatten_pdf(input_pdf: str, output_pdf: str) -> str:
    """
    Flatten a filled PDF: convert all form field annotations into permanent
    page content so the fields can no longer be edited.

    Strategy: use pypdf to stamp each widget's appearance stream onto the page,
    then remove the AcroForm and all widget annotations.
    """
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    for page_idx, page in enumerate(writer.pages):
        annots = page.get("/Annots")
        if not annots:
            continue

        widgets_to_flatten = []
        remaining_annots = ArrayObject()

        for annot_ref in annots:
            try:
                annot = annot_ref.get_object()
                subtype = str(annot.get("/Subtype", ""))
                if subtype == "/Widget":
                    widgets_to_flatten.append(annot)
                else:
                    remaining_annots.append(annot_ref)
            except Exception:
                remaining_annots.append(annot_ref)

        # Stamp each widget's appearance onto the page
        for widget in widgets_to_flatten:
            try:
                _stamp_widget_appearance(writer, page, widget, page_idx)
            except Exception as e:
                print(f"  [warn] Could not flatten widget: {e}", file=sys.stderr)

        page[NameObject("/Annots")] = remaining_annots

    # Remove AcroForm from root
    root = writer._root_object
    if "/AcroForm" in root:
        del root[NameObject("/AcroForm")]

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf


def _stamp_widget_appearance(writer: PdfWriter, page, widget, page_idx: int):
    """Stamp a widget's /AP /N appearance stream onto the page content."""
    ap = widget.get("/AP")
    if not ap:
        return

    try:
        ap_obj = ap.get_object() if hasattr(ap, 'get_object') else ap
        n_entry = ap_obj.get("/N")
        if not n_entry:
            return

        # For checkboxes, pick the right state
        ft = str(widget.get("/FT", ""))
        if ft == "/Btn":
            as_val = str(widget.get("/AS", "/Off")).strip("/")
            if hasattr(n_entry, 'get_object'):
                n_obj = n_entry.get_object()
            else:
                n_obj = n_entry
            if isinstance(n_obj, DictionaryObject):
                state_key = f"/{as_val}"
                ap_stream = n_obj.get(state_key) or n_obj.get("/Off")
                if ap_stream is None:
                    return
                n_entry = ap_stream

        # Get the appearance stream object
        if hasattr(n_entry, 'get_object'):
            ap_stream = n_entry.get_object()
        else:
            ap_stream = n_entry

        rect = list(widget.get("/Rect", [0, 0, 0, 0]))
        x0, y0, x1, y1 = rect
        bw, bh = x1 - x0, y1 - y0

        if bw <= 0 or bh <= 0:
            return

        # Create an XObject reference for this appearance
        xobj = DecodedStreamObject()
        if hasattr(ap_stream, 'get_data'):
            xobj.set_data(ap_stream.get_data())
        else:
            xobj.set_data(b"")
        xobj[NameObject("/Type")] = NameObject("/XObject")
        xobj[NameObject("/Subtype")] = NameObject("/Form")
        xobj[NameObject("/BBox")] = RectangleObject([0, 0, bw, bh])

        # Copy resources if present
        if "/Resources" in ap_stream:
            xobj[NameObject("/Resources")] = ap_stream["/Resources"]

        xobj_ref = writer._add_object(xobj)
        xobj_name = f"Wgt{page_idx}_{id(widget)}"

        # Add XObject to page resources
        if "/Resources" not in page:
            page[NameObject("/Resources")] = DictionaryObject()
        res = page["/Resources"]
        if hasattr(res, 'get_object'):
            res = res.get_object()
        if "/XObject" not in res:
            res[NameObject("/XObject")] = DictionaryObject()
        xobj_dict = res["/XObject"]
        if hasattr(xobj_dict, 'get_object'):
            xobj_dict = xobj_dict.get_object()
        xobj_dict[NameObject(f"/{xobj_name}")] = xobj_ref

        # Append draw commands to page content
        draw_cmd = (
            f"q {bw:.2f} 0 0 {bh:.2f} {x0:.2f} {y0:.2f} cm "
            f"/{xobj_name} Do Q\n"
        ).encode()

        content = page.get("/Contents")
        if content is None:
            new_stream = DecodedStreamObject()
            new_stream.set_data(draw_cmd)
            page[NameObject("/Contents")] = writer._add_object(new_stream)
        else:
            # Append to existing content stream
            content_obj = content.get_object() if hasattr(content, 'get_object') else content
            if hasattr(content_obj, 'get_data'):
                existing = content_obj.get_data()
                content_obj.set_data(existing + b"\n" + draw_cmd)
            else:
                new_stream = DecodedStreamObject()
                new_stream.set_data(draw_cmd)
                page[NameObject("/Contents")] = writer._add_object(new_stream)

    except Exception as e:
        raise RuntimeError(f"Flatten error: {e}") from e


# ═══════════════════════════════════════════════════════════════════════════
# FULL PIPELINE: auto-detect → fill → sign → flatten
# ═══════════════════════════════════════════════════════════════════════════

def full_pipeline(input_pdf: str, data_json: str, sig_image: str | None,
                  output_pdf: str, typed_sig: str | None = None,
                  flatten: bool = True) -> str:
    """
    Full Sejda-style pipeline:
    1. If not fillable → make fillable
    2. Fill fields from data_json
    3. Add signature stamp if sig_image provided
    4. Flatten if requested
    """
    with tempfile.TemporaryDirectory() as tmp:
        step1 = os.path.join(tmp, "step1_fillable.pdf")
        step2 = os.path.join(tmp, "step2_filled.pdf")
        step3 = os.path.join(tmp, "step3_signed.pdf")

        # Step 1: ensure fillable
        reader = PdfReader(input_pdf)
        acro = reader.trailer.get("/Root", {}).get("/AcroForm")
        has_fields = acro and len(acro.get("/Fields", [])) > 0

        if not has_fields:
            print("→ Converting to fillable PDF…")
            path, n = make_fillable(input_pdf, step1)
            print(f"  Detected {n} fields")
        else:
            import shutil
            shutil.copy(input_pdf, step1)
            print("→ PDF already has form fields")

        # Step 2: fill
        with open(data_json) as f:
            data = json.load(f)
        print(f"→ Filling {len(data)} fields…")
        fill_pdf(step1, step2, data, typed_signature=typed_sig)

        # Step 3: sign
        if sig_image or typed_sig:
            print("→ Adding signature stamp…")
            add_signature_stamp(step2, step3,
                                typed_name=typed_sig or "",
                                sig_image_path=sig_image,
                                timestamp=True)
        else:
            import shutil
            shutil.copy(step2, step3)

        # Step 4: flatten
        if flatten:
            print("→ Flattening…")
            flatten_pdf(step3, output_pdf)
        else:
            import shutil
            shutil.copy(step3, output_pdf)

    print(f"✓ Done → {output_pdf}")
    return output_pdf


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="PDF Fill & Sign Engine — Sejda-quality local tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # scan
    p_scan = sub.add_parser("scan", help="Scan PDF fields and output JSON")
    p_scan.add_argument("input", help="Input PDF")
    p_scan.add_argument("--out", help="Write JSON to file instead of stdout")

    # make-fillable
    p_fill = sub.add_parser("make-fillable", help="Add AcroForm fields to a plain PDF")
    p_fill.add_argument("input", help="Input PDF")
    p_fill.add_argument("output", help="Output fillable PDF")

    # fill
    p_f = sub.add_parser("fill", help="Fill form fields from JSON or key=value args")
    p_f.add_argument("input", help="Input PDF (must have AcroForm)")
    p_f.add_argument("output", help="Output PDF")
    p_f.add_argument("data", nargs="?", help="JSON file OR key=value pairs", default=None)
    p_f.add_argument("pairs", nargs="*", help="Additional key=value pairs")
    p_f.add_argument("--sig", help="Signature image path (PNG/JPG)")
    p_f.add_argument("--typed-sig", help="Typed signature name")

    # sign
    p_s = sub.add_parser("sign", help="Add a signature stamp to a page")
    p_s.add_argument("input")
    p_s.add_argument("output")
    p_s.add_argument("--name", help="Typed name for signature")
    p_s.add_argument("--image", help="Signature image path")
    p_s.add_argument("--page", type=int, default=1)
    p_s.add_argument("--x", type=float, default=None)
    p_s.add_argument("--y", type=float, default=None)
    p_s.add_argument("--width", type=float, default=180)
    p_s.add_argument("--height", type=float, default=60)
    p_s.add_argument("--no-timestamp", action="store_true")

    # flatten
    p_fl = sub.add_parser("flatten", help="Flatten filled PDF (burn fields into content)")
    p_fl.add_argument("input")
    p_fl.add_argument("output")

    # pipeline
    p_pipe = sub.add_parser("pipeline", help="Full fill → sign → flatten pipeline")
    p_pipe.add_argument("input")
    p_pipe.add_argument("data_json", help="JSON data file")
    p_pipe.add_argument("output")
    p_pipe.add_argument("--sig", help="Signature image")
    p_pipe.add_argument("--typed-sig", help="Typed signature name")
    p_pipe.add_argument("--no-flatten", action="store_true")

    return parser


def main():
    parser = _build_parser()
    args = parser.parse_args()

    if args.command == "scan":
        result = scan_fields(args.input)
        out = json.dumps(result, indent=2)
        if args.out:
            with open(args.out, "w") as f:
                f.write(out)
            print(f"Field map written to {args.out}")
        else:
            print(out)

    elif args.command == "make-fillable":
        path, n = make_fillable(args.input, args.output)
        print(f"Created fillable PDF: {path}  ({n} fields detected)")

    elif args.command == "fill":
        data = {}
        if args.data:
            if os.path.isfile(args.data):
                with open(args.data) as f:
                    data = json.load(f)
            else:
                # treat as key=value
                for pair in [args.data] + (args.pairs or []):
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        data[k.strip()] = v.strip()
        for pair in args.pairs or []:
            if "=" in pair:
                k, v = pair.split("=", 1)
                data[k.strip()] = v.strip()

        fill_pdf(args.input, args.output, data,
                 sig_image_path=args.sig,
                 typed_signature=args.typed_sig)
        print(f"Filled PDF written to {args.output}")

    elif args.command == "sign":
        if not REPORTLAB_AVAILABLE:
            sys.exit("pip install reportlab  to use the sign command")
        add_signature_stamp(
            args.input, args.output,
            page_num=args.page,
            x=args.x, y=args.y,
            width=args.width, height=args.height,
            typed_name=args.name or "",
            sig_image_path=args.image,
            timestamp=not args.no_timestamp,
        )
        print(f"Signed PDF written to {args.output}")

    elif args.command == "flatten":
        flatten_pdf(args.input, args.output)
        print(f"Flattened PDF written to {args.output}")

    elif args.command == "pipeline":
        full_pipeline(
            args.input, args.data_json,
            sig_image=args.sig,
            output_pdf=args.output,
            typed_sig=args.typed_sig,
            flatten=not args.no_flatten,
        )


if __name__ == "__main__":
    main()
