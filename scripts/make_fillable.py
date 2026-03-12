#!/usr/bin/env python3
"""
make_fillable.py — Convert a plain PDF into a fillable PDF with form fields.

Detects form fields by analysing the PDF structure:
  • Rectangles → text input boxes
  • Small squares → checkboxes
  • Horizontal lines near labels → underline-style text fields
  • Paired small boxes with M/F or Yes/No labels → radio buttons
  • Tables (grid of rectangles + vertical lines) → per-cell text fields
  • Underscore runs (________) → inline text fields

Usage:
    python make_fillable.py <input.pdf> [output.pdf]

If output is omitted, writes to <input>_fillable.pdf.

Dependencies:
    pip install pdfplumber pypdf
"""

import os
import re
import sys
from collections import defaultdict

import pdfplumber
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


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — Structure Extraction
# ═══════════════════════════════════════════════════════════════════════════


def extract_page_structure(page, page_num):
    """Extract rectangles, lines, and text words from a single pdfplumber page."""
    pw = float(page.width)
    ph = float(page.height)

    rects = []
    for r in page.rects or []:
        x0, top, x1, bot = r["x0"], r["top"], r["x1"], r["bottom"]
        w = x1 - x0
        h = bot - top
        if w < 3 or h < 3:
            continue
        rects.append({
            "x0": x0, "top": top, "x1": x1, "bottom": bot,
            "w": w, "h": h, "page": page_num,
        })

    lines_h = []
    lines_v = []
    for ln in page.lines or []:
        lx0, ltop, lx1, lbot = ln["x0"], ln["top"], ln["x1"], ln["bottom"]
        length_h = abs(lx1 - lx0)
        length_v = abs(lbot - ltop)
        if length_h > 30 and length_v < 3:
            lines_h.append({
                "x0": min(lx0, lx1), "x1": max(lx0, lx1),
                "y": (ltop + lbot) / 2, "page": page_num,
            })
        elif length_v > 15 and length_h < 3:
            lines_v.append({
                "x": (lx0 + lx1) / 2,
                "top": min(ltop, lbot), "bottom": max(ltop, lbot),
                "page": page_num,
            })

    words = []
    for w in page.extract_words(keep_blank_chars=True) or []:
        words.append({
            "text": w["text"],
            "x0": w["x0"], "top": w["top"], "x1": w["x1"], "bottom": w["bottom"],
            "page": page_num,
        })

    chars = []
    for c in page.chars or []:
        chars.append({
            "text": c["text"],
            "x0": c["x0"], "top": c["top"], "x1": c["x1"], "bottom": c["bottom"],
            "page": page_num,
        })

    return {
        "page_num": page_num,
        "width": pw,
        "height": ph,
        "rects": rects,
        "lines_h": lines_h,
        "lines_v": lines_v,
        "words": words,
        "chars": chars,
    }


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 — Field Detection
# ═══════════════════════════════════════════════════════════════════════════


def classify_rects(rects, page_width, page_height, lines_v=None):
    """
    Split rectangles into checkboxes, table_cells, field_boxes.
    Filters out decorative rects (title bars, page borders).
    """
    checkboxes = []
    candidates = []

    seen = set()
    unique_rects = []
    for r in rects:
        key = (round(r["x0"], 1), round(r["top"], 1),
               round(r["x1"], 1), round(r["bottom"], 1))
        if key not in seen:
            seen.add(key)
            unique_rects.append(r)

    for r in unique_rects:
        w, h = r["w"], r["h"]

        if w > page_width * 0.85 and h > page_height * 0.3:
            continue

        if w < 55 and h < 40 and 0.3 < (w / max(h, 0.1)) < 3.0:
            checkboxes.append(r)
        else:
            candidates.append(r)

    table_cells, field_boxes = _detect_table_grid(candidates, lines_v)

    return checkboxes, table_cells, field_boxes


def _detect_table_grid(rects, lines_v=None):
    """Detect if a group of rects forms a table grid."""
    if len(rects) < 3:
        return [], rects

    span_groups = defaultdict(list)
    for r in rects:
        key = (round(r["x0"] / 5) * 5, round(r["x1"] / 5) * 5)
        span_groups[key].append(r)

    table_cells = []
    non_table = []

    for key, group in span_groups.items():
        if len(group) >= 3:
            heights = [r["h"] for r in group]
            avg_h = sum(heights) / len(heights)
            consistent = all(abs(h - avg_h) < avg_h * 0.5 for h in heights)
            if consistent and avg_h < 60:
                sorted_by_top = sorted(group, key=lambda r: r["top"])
                stacked = all(
                    sorted_by_top[i + 1]["top"] - sorted_by_top[i]["bottom"] < avg_h * 0.5
                    for i in range(len(sorted_by_top) - 1)
                )
                if stacked:
                    grp_x0 = min(r["x0"] for r in group)
                    grp_x1 = max(r["x1"] for r in group)
                    grp_top = min(r["top"] for r in group)
                    grp_bot = max(r["bottom"] for r in group)

                    has_vlines = False
                    if lines_v:
                        has_vlines = any(
                            grp_x0 + 10 < lv["x"] < grp_x1 - 10
                            and lv["top"] < grp_bot and lv["bottom"] > grp_top
                            for lv in lines_v
                        )

                    if len(group) >= 4 or has_vlines:
                        table_cells.extend(group)
                    else:
                        non_table.extend(group)
                else:
                    non_table.extend(group)
            else:
                non_table.extend(group)
        else:
            non_table.extend(group)

    return table_cells, non_table


def find_label_for_box(box, words, page_width):
    """Find the text label most likely associated with a field box."""
    bx0, btop, bx1, bbot = box["x0"], box["top"], box["x1"], box["bottom"]
    bmid_y = (btop + bbot) / 2

    # 1. Words to the LEFT
    left_words = []
    for w in words:
        wmid_y = (w["top"] + w["bottom"]) / 2
        if (w["x1"] <= bx0 + 5
                and wmid_y >= btop and wmid_y <= bbot
                and bx0 - w["x0"] < 300):
            left_words.append(w)

    if left_words:
        left_words.sort(key=lambda w: (w["top"], w["x0"]))
        return min(left_words, key=lambda w: abs((w["top"] + w["bottom"]) / 2 - bmid_y))

    # 2. Words INSIDE the box
    inside_words = []
    for w in words:
        if (w["x0"] >= bx0 - 2 and w["x1"] <= bx1 + 2
                and w["top"] >= btop - 2 and w["bottom"] <= bbot + 2):
            inside_words.append(w)

    if inside_words:
        inside_words.sort(key=lambda w: (w["top"], w["x0"]))
        return inside_words[0]

    # 3. Words ABOVE the box
    best = None
    best_dist = float("inf")
    for w in words:
        wmid_x = (w["x0"] + w["x1"]) / 2
        if (w["bottom"] <= btop + 5
                and abs(wmid_x - (bx0 + bx1) / 2) < (bx1 - bx0) * 0.6):
            dist = btop - w["bottom"]
            if 0 <= dist < best_dist and dist < 30:
                best = w
                best_dist = dist

    return best


def gather_label_text(anchor_word, words, box=None, max_gap=8):
    """Gather all related label words from a single anchor word."""
    if anchor_word is None:
        return ""

    if box is not None:
        bx0, btop, bx1, bbot = box["x0"], box["top"], box["x1"], box["bottom"]

        # Check if anchor is INSIDE the box
        if (anchor_word["x0"] >= bx0 - 2 and anchor_word["x1"] <= bx1 + 2
                and anchor_word["top"] >= btop - 2 and anchor_word["bottom"] <= bbot + 2):
            inside_words = [
                w for w in words
                if w["x0"] >= bx0 - 2 and w["x1"] <= bx1 + 2
                and w["top"] >= btop - 2 and w["bottom"] <= bbot + 2
                and abs(w["top"] - anchor_word["top"]) < 15
            ]
            inside_words.sort(key=lambda w: (w["top"], w["x0"]))
            return " ".join(w["text"].strip() for w in inside_words if w["text"].strip())

        # Multi-line label gathering for LEFT labels
        label_words = [
            w for w in words
            if w["x1"] <= bx0 + 5
            and (w["top"] + w["bottom"]) / 2 >= btop
            and (w["top"] + w["bottom"]) / 2 <= bbot
            and bx0 - w["x0"] < 300
        ]
        if label_words:
            label_words.sort(key=lambda w: (w["top"], w["x0"]))
            return " ".join(w["text"].strip() for w in label_words if w["text"].strip())

    # Single-line fallback
    line_words = [
        w for w in words
        if abs(w["top"] - anchor_word["top"]) < 5
        and w["x1"] <= anchor_word["x1"] + 2
    ]
    line_words.sort(key=lambda w: w["x0"])

    cluster = []
    for w in line_words:
        if cluster:
            gap = w["x0"] - cluster[-1]["x1"]
            if gap > max_gap:
                cluster = [w]
            else:
                cluster.append(w)
        else:
            cluster.append(w)

        if w is anchor_word or (abs(w["x0"] - anchor_word["x0"]) < 1
                                 and abs(w["top"] - anchor_word["top"]) < 1):
            break

    if not cluster:
        return anchor_word["text"]

    return " ".join(w["text"] for w in cluster)


def detect_underline_fields(lines_h, words, rects, page_width):
    """Find horizontal lines that serve as underline-style entry fields."""
    rect_regions = [(r["x0"], r["top"], r["x1"], r["bottom"]) for r in rects]

    fields = []
    for ln in lines_h:
        lx0, lx1, ly = ln["x0"], ln["x1"], ln["y"]
        length = lx1 - lx0

        if length < 40 or length > page_width * 0.85:
            continue

        overlaps_rect = False
        for rx0, rtop, rx1, rbot in rect_regions:
            if (lx0 < rx1 and lx1 > rx0 and ly > rtop - 5 and ly < rbot + 5):
                overlaps_rect = True
                break
        if overlaps_rect:
            continue

        field_box = {
            "x0": lx0, "top": ly - 15, "x1": lx1, "bottom": ly - 2,
            "w": length, "h": 15, "page": ln["page"],
            "style": "underline",
        }
        fields.append(field_box)

    return fields


def detect_underscore_blanks(chars, words, rects, page_num):
    """Find runs of consecutive underscore characters that form fill-in blanks."""
    if not chars:
        return []

    underscores = [c for c in chars if c["text"] == "_"]
    if not underscores:
        return []

    y_groups = defaultdict(list)
    for c in underscores:
        y_key = round(c["top"] / 3) * 3
        y_groups[y_key].append(c)

    rect_regions = [(r["x0"], r["top"], r["x1"], r["bottom"]) for r in rects]

    fields = []
    for y_key, group in y_groups.items():
        group.sort(key=lambda c: c["x0"])

        runs = []
        current_run = [group[0]]
        for i in range(1, len(group)):
            gap = group[i]["x0"] - current_run[-1]["x1"]
            if gap < 3:
                current_run.append(group[i])
            else:
                runs.append(current_run)
                current_run = [group[i]]
        runs.append(current_run)

        for run in runs:
            if len(run) < 5:
                continue

            span_x0 = run[0]["x0"]
            span_x1 = run[-1]["x1"]
            span_top = run[0]["top"]
            span_bot = run[0]["bottom"]
            span_len = span_x1 - span_x0

            if span_len < 30:
                continue

            overlaps = False
            for rx0, rtop, rx1, rbot in rect_regions:
                if (span_x0 < rx1 and span_x1 > rx0
                        and span_top < rbot + 3 and span_bot > rtop - 3):
                    overlaps = True
                    break
            if overlaps:
                continue

            field_box = {
                "x0": span_x0,
                "top": span_top - 10,
                "x1": span_x1,
                "bottom": span_top + 1,
                "w": span_len,
                "h": 11,
                "page": page_num,
                "style": "underscore_blank",
            }

            line_chars = [
                c for c in chars
                if c["text"] != "_"
                and abs(c["top"] - span_top) < 3
                and c["x1"] <= span_x0 + 2
            ]
            if line_chars:
                line_chars.sort(key=lambda c: c["x0"])
                pre_text = "".join(c["text"] for c in line_chars).strip()
                pre_text = re.sub(r'[,;:\s]+$', '', pre_text)
                pre_words = pre_text.split()
                if pre_words:
                    context = " ".join(pre_words[-3:])
                    context = re.sub(r'^[,;:\s]+', '', context)
                    field_box["context_label"] = context

            fields.append(field_box)

    return fields


RADIO_LABEL_PATTERNS = [
    (re.compile(r"(?i)^[MF]$"), "Gender"),
    (re.compile(r"(?i)^(yes|no)$"), None),
    (re.compile(r"(?i)^(true|false)$"), None),
    (re.compile(r"(?i)^(male|female)$"), "Gender"),
    (re.compile(r"(?i)^(si|no)$"), None),
    (re.compile(r"(?i)^(oui|non)$"), None),
]


def detect_radio_groups(checkboxes, words):
    """Pair up checkboxes that sit next to known binary labels."""
    used = set()
    radio_groups = []

    cb_labels = []
    for i, cb in enumerate(checkboxes):
        mid_x = (cb["x0"] + cb["x1"]) / 2
        mid_y = (cb["top"] + cb["bottom"]) / 2
        best_w = None
        best_d = float("inf")
        for w in words:
            wmid_x = (w["x0"] + w["x1"]) / 2
            wmid_y = (w["top"] + w["bottom"]) / 2
            d = ((mid_x - wmid_x) ** 2 + (mid_y - wmid_y) ** 2) ** 0.5
            if d < 60 and d < best_d:
                best_w = w
                best_d = d
        cb_labels.append((i, cb, best_w))

    for i, cb_i, lbl_i in cb_labels:
        if i in used or lbl_i is None:
            continue
        for j, cb_j, lbl_j in cb_labels:
            if j <= i or j in used or lbl_j is None:
                continue
            if abs(cb_i["top"] - cb_j["top"]) > 15:
                continue
            for pattern, group_name in RADIO_LABEL_PATTERNS:
                if pattern.match(lbl_i["text"].strip()) and pattern.match(lbl_j["text"].strip()):
                    gname = group_name or f"Radio_{lbl_i['text']}_{lbl_j['text']}"
                    leftmost = min(cb_i["x0"], cb_j["x0"])
                    context_label = None
                    for w in words:
                        if (w["x1"] < leftmost - 5
                                and abs(w["top"] - cb_i["top"]) < 15
                                and w["text"].strip() not in ("", "|")):
                            if context_label is None or w["x1"] > context_label["x1"]:
                                context_label = w
                    if context_label and len(context_label["text"].strip()) > 1:
                        gname = _sanitize(context_label["text"])

                    radio_groups.append({
                        "group_name": gname,
                        "page": cb_i["page"],
                        "options": [
                            {"name": lbl_i["text"].strip(), "rect": cb_i},
                            {"name": lbl_j["text"].strip(), "rect": cb_j},
                        ],
                    })
                    used.add(i)
                    used.add(j)
                    break

    remaining = [cb for idx, cb in enumerate(checkboxes) if idx not in used]
    return radio_groups, remaining


def detect_table_fields(table_cells, lines_v, words):
    """Create per-cell fields from table grid rects."""
    if not table_cells:
        return []

    rows_sorted = sorted(table_cells, key=lambda r: r["top"])

    table_x0 = min(r["x0"] for r in rows_sorted)
    table_x1 = max(r["x1"] for r in rows_sorted)
    table_top = min(r["top"] for r in rows_sorted)
    table_bot = max(r["bottom"] for r in rows_sorted)

    col_splits = sorted(set(
        round(lv["x"], 1) for lv in lines_v
        if table_x0 + 5 < lv["x"] < table_x1 - 5
        and lv["top"] < table_bot and lv["bottom"] > table_top
    ))

    col_bounds = [table_x0] + col_splits + [table_x1]

    header_row = rows_sorted[0] if rows_sorted else None
    header_labels = []
    if header_row:
        for ci in range(len(col_bounds) - 1):
            cx0, cx1 = col_bounds[ci], col_bounds[ci + 1]
            col_words = [
                w for w in words
                if w["x0"] >= cx0 - 2 and w["x1"] <= cx1 + 2
                and w["top"] >= header_row["top"] - 2
                and w["bottom"] <= header_row["bottom"] + 2
            ]
            label = " ".join(w["text"] for w in sorted(col_words, key=lambda w: w["x0"]))
            header_labels.append(label.strip() or f"Column{ci + 1}")

    data_rows = rows_sorted[1:] if header_row else rows_sorted

    fields = []
    for ri, row in enumerate(data_rows, start=1):
        for ci in range(len(col_bounds) - 1):
            cx0, cx1 = col_bounds[ci], col_bounds[ci + 1]
            col_label = header_labels[ci] if ci < len(header_labels) else f"Col{ci + 1}"
            safe_label = _sanitize(col_label)
            fields.append({
                "field_name": f"{safe_label}_Row{ri}",
                "field_type": "text",
                "page": row["page"],
                "rect_top": row["top"],
                "rect_bottom": row["bottom"],
                "rect_x0": cx0,
                "rect_x1": cx1,
                "label": f"{col_label} Row {ri}",
            })

    return fields


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — Name Generation & De-duplication
# ═══════════════════════════════════════════════════════════════════════════


def _sanitize(text):
    """Turn arbitrary text into a valid field name."""
    s = re.sub(r"[^A-Za-z0-9]+", "_", text.strip())
    s = s.strip("_")
    return s[:40] if s else "Field"


class NameCounter:
    """Track unique field names across a single conversion run."""

    def __init__(self):
        self._counts = defaultdict(int)

    def unique(self, base):
        self._counts[base] += 1
        if self._counts[base] == 1:
            return base
        return f"{base}_{self._counts[base]}"


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 — Build the Fillable PDF
# ═══════════════════════════════════════════════════════════════════════════


def to_pdf_rect(x0, top, x1, bottom, page_height):
    """pdfplumber top-down → PDF bottom-up rect."""
    return [x0, page_height - bottom, x1, page_height - top]


def _zadb_font_resources():
    """Build a /Resources dict containing the ZapfDingbats font (/ZaDb)."""
    zadb = DictionaryObject()
    zadb[NameObject("/Type")] = NameObject("/Font")
    zadb[NameObject("/Subtype")] = NameObject("/Type1")
    zadb[NameObject("/BaseFont")] = NameObject("/ZapfDingbats")
    font_dict = DictionaryObject()
    font_dict[NameObject("/ZaDb")] = zadb
    res = DictionaryObject()
    res[NameObject("/Font")] = font_dict
    return res


def make_text_widget(writer, field_name, rect, page_ref, multiline=False):
    field = DictionaryObject()
    field[NameObject("/Type")] = NameObject("/Annot")
    field[NameObject("/Subtype")] = NameObject("/Widget")
    field[NameObject("/FT")] = NameObject("/Tx")
    field[NameObject("/T")] = TextStringObject(field_name)
    field[NameObject("/V")] = TextStringObject("")
    field[NameObject("/Rect")] = RectangleObject(rect)
    field[NameObject("/P")] = page_ref
    ff = (1 << 12) if multiline else 0
    field[NameObject("/Ff")] = NumberObject(ff)
    field[NameObject("/DA")] = TextStringObject("/Helv 8 Tf 0 0 0.6 rg")
    bs = DictionaryObject()
    bs[NameObject("/W")] = NumberObject(0)
    bs[NameObject("/S")] = NameObject("/S")
    field[NameObject("/BS")] = bs
    mk = DictionaryObject()
    mk[NameObject("/BC")] = ArrayObject([])
    field[NameObject("/MK")] = mk
    return writer._add_object(field)


def make_checkbox_widget(writer, field_name, rect, page_ref):
    field = DictionaryObject()
    field[NameObject("/Type")] = NameObject("/Annot")
    field[NameObject("/Subtype")] = NameObject("/Widget")
    field[NameObject("/FT")] = NameObject("/Btn")
    field[NameObject("/T")] = TextStringObject(field_name)
    field[NameObject("/V")] = NameObject("/Off")
    field[NameObject("/AS")] = NameObject("/Off")
    field[NameObject("/Rect")] = RectangleObject(rect)
    field[NameObject("/P")] = page_ref
    field[NameObject("/Ff")] = NumberObject(0)
    field[NameObject("/DA")] = TextStringObject("/ZaDb 0 Tf 0 g")

    zadb_res = _zadb_font_resources()

    # Local BBox and centered checkmark glyph (ZapfDingbats '4' = checkmark)
    box_w = rect[2] - rect[0]
    box_h = rect[3] - rect[1]
    local_bbox = RectangleObject([0, 0, box_w, box_h])
    font_size = min(min(box_w, box_h) * 0.45, 12)
    glyph_w = font_size * 0.8
    tx = (box_w - glyph_w) / 2
    ty = (box_h - font_size) / 2
    on_content = f"q\nBT\n/ZaDb {font_size:.1f} Tf\n{tx:.1f} {ty:.1f} Td\n(4) Tj\nET\nQ\n"

    on_s = DecodedStreamObject()
    on_s.set_data(on_content.encode())
    on_s[NameObject("/Type")] = NameObject("/XObject")
    on_s[NameObject("/Subtype")] = NameObject("/Form")
    on_s[NameObject("/BBox")] = local_bbox
    on_s[NameObject("/Resources")] = zadb_res
    on_ref = writer._add_object(on_s)

    off_s = DecodedStreamObject()
    off_s.set_data(b"")
    off_s[NameObject("/Type")] = NameObject("/XObject")
    off_s[NameObject("/Subtype")] = NameObject("/Form")
    off_s[NameObject("/BBox")] = local_bbox
    off_ref = writer._add_object(off_s)

    n = DictionaryObject()
    n[NameObject("/Yes")] = on_ref
    n[NameObject("/Off")] = off_ref
    ap = DictionaryObject()
    ap[NameObject("/N")] = n
    field[NameObject("/AP")] = ap
    mk = DictionaryObject()
    mk[NameObject("/BC")] = ArrayObject([NumberObject(0)] * 3)
    mk[NameObject("/CA")] = TextStringObject("4")
    field[NameObject("/MK")] = mk
    return writer._add_object(field)


def make_radio_group(writer, group_name, options, page_ref, page_height):
    group = DictionaryObject()
    group[NameObject("/FT")] = NameObject("/Btn")
    group[NameObject("/Ff")] = NumberObject((1 << 14) | (1 << 15))
    group[NameObject("/T")] = TextStringObject(group_name)
    group[NameObject("/V")] = NameObject("/Off")

    zadb_res = _zadb_font_resources()

    kids = ArrayObject()
    widget_refs = []
    for opt in options:
        r = opt["rect"]
        pdf_r = to_pdf_rect(r["x0"], r["top"], r["x1"], r["bottom"], page_height)
        # Local BBox (origin at 0,0) for appearance streams
        box_w = pdf_r[2] - pdf_r[0]
        box_h = pdf_r[3] - pdf_r[1]
        local_bbox = RectangleObject([0, 0, box_w, box_h])

        widget = DictionaryObject()
        widget[NameObject("/Type")] = NameObject("/Annot")
        widget[NameObject("/Subtype")] = NameObject("/Widget")
        widget[NameObject("/Rect")] = RectangleObject(pdf_r)
        widget[NameObject("/AS")] = NameObject("/Off")
        widget[NameObject("/DA")] = TextStringObject("/ZaDb 10 Tf 0 g")
        widget[NameObject("/P")] = page_ref
        opt_name = NameObject(f"/{opt['name']}")

        # Center the bullet glyph (ZapfDingbats 'l' = filled circle) in the box
        font_size = min(min(box_w, box_h) * 0.45, 12)
        glyph_w = font_size * 0.8
        tx = (box_w - glyph_w) / 2
        ty = (box_h - font_size) / 2
        on_content = f"q\nBT\n/ZaDb {font_size:.1f} Tf\n{tx:.1f} {ty:.1f} Td\n(l) Tj\nET\nQ\n"

        on_s = DecodedStreamObject()
        on_s.set_data(on_content.encode())
        on_s[NameObject("/Type")] = NameObject("/XObject")
        on_s[NameObject("/Subtype")] = NameObject("/Form")
        on_s[NameObject("/BBox")] = local_bbox
        on_s[NameObject("/Resources")] = zadb_res
        on_ref = writer._add_object(on_s)

        off_s = DecodedStreamObject()
        off_s.set_data(b"")
        off_s[NameObject("/Type")] = NameObject("/XObject")
        off_s[NameObject("/Subtype")] = NameObject("/Form")
        off_s[NameObject("/BBox")] = local_bbox
        off_ref = writer._add_object(off_s)

        nd = DictionaryObject()
        nd[opt_name] = on_ref
        nd[NameObject("/Off")] = off_ref
        ap = DictionaryObject()
        ap[NameObject("/N")] = nd
        widget[NameObject("/AP")] = ap
        mk = DictionaryObject()
        mk[NameObject("/BC")] = ArrayObject([])
        mk[NameObject("/CA")] = TextStringObject("l")
        widget[NameObject("/MK")] = mk

        w_ref = writer._add_object(widget)
        kids.append(w_ref)
        widget_refs.append(w_ref)

    group[NameObject("/Kids")] = kids
    group_ref = writer._add_object(group)
    for w_ref in widget_refs:
        w_ref.get_object()[NameObject("/Parent")] = group_ref
    return group_ref, widget_refs


# ═══════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════════════


def analyse_and_build(input_pdf, output_pdf):
    """
    Analyse a plain PDF and write a fillable copy with AcroForm fields.

    Returns the output path on success.
    """
    namer = NameCounter()

    # Step 1: Extract structure from every page
    pdf = pdfplumber.open(input_pdf)
    pages_data = []
    for i, page in enumerate(pdf.pages):
        pages_data.append(extract_page_structure(page, i))
    pdf.close()

    # Step 2: Detect fields on each page
    all_fields = []

    for pdata in pages_data:
        pg = pdata["page_num"]
        pw = pdata["width"]
        ph = pdata["height"]
        words = pdata["words"]
        chars = pdata.get("chars", [])
        rects = pdata["rects"]
        lines_h = pdata["lines_h"]
        lines_v = pdata["lines_v"]

        checkboxes, table_cells, field_boxes = classify_rects(rects, pw, ph, lines_v)

        # Radio groups from checkbox pairs
        radio_groups, remaining_cbs = detect_radio_groups(checkboxes, words)
        for rg in radio_groups:
            all_fields.append({
                "type": "radio",
                "page": pg,
                "page_height": ph,
                "group_name": namer.unique(rg["group_name"]),
                "options": rg["options"],
            })

        # Remaining checkboxes
        for cb in remaining_cbs:
            if cb["top"] < ph * 0.15 or cb["top"] > ph * 0.95:
                continue
            lbl_word = find_label_for_box(cb, words, pw)
            label_text = gather_label_text(lbl_word, words) if lbl_word else ""
            if not label_text or re.match(r'^[A-Z]?\d+\.?$', label_text.strip()):
                continue
            fname = _sanitize(label_text) if label_text else "Checkbox"
            pdf_r = to_pdf_rect(cb["x0"], cb["top"], cb["x1"], cb["bottom"], ph)
            all_fields.append({
                "type": "checkbox",
                "page": pg,
                "field_name": namer.unique(fname),
                "rect": pdf_r,
                "label": label_text,
            })

        # Table cells
        table_flds = detect_table_fields(table_cells, lines_v, words)
        for tf in table_flds:
            pdf_r = to_pdf_rect(tf["rect_x0"], tf["rect_top"],
                                tf["rect_x1"], tf["rect_bottom"], ph)
            all_fields.append({
                "type": "text",
                "page": tf["page"],
                "field_name": namer.unique(tf["field_name"]),
                "rect": pdf_r,
                "label": tf["label"],
                "multiline": False,
            })

        # Standalone field boxes
        for fb in field_boxes:
            box_words = [
                w for w in words
                if w["x0"] >= fb["x0"] - 2 and w["x1"] <= fb["x1"] + 2
                and w["top"] >= fb["top"] - 2 and w["bottom"] <= fb["bottom"] + 2
            ]
            if box_words:
                text_x0 = min(w["x0"] for w in box_words)
                text_x1 = max(w["x1"] for w in box_words)
                text_span = text_x1 - text_x0
                box_center = (fb["x0"] + fb["x1"]) / 2
                text_center = (text_x0 + text_x1) / 2

                if (fb["w"] > pw * 0.5
                        and abs(text_center - box_center) < fb["w"] * 0.15
                        and text_span < fb["w"] * 0.6):
                    continue

                if text_span > fb["w"] * 0.5 and fb["w"] > pw * 0.6:
                    continue

            lbl_word = find_label_for_box(fb, words, pw)
            label_text = gather_label_text(lbl_word, words, box=fb) if lbl_word else ""

            if len(label_text) > 80:
                label_text = ""

            fname = _sanitize(label_text) if label_text else "Field"
            multiline = fb["h"] > 30

            # Offset the input field rect to avoid overlapping the label inside the box
            field_x0 = fb["x0"]
            field_top = fb["top"]

            # Use chars for precise detection — includes symbols ($, /, etc.)
            # that pdfplumber may not group as words.
            # Use a wider tolerance to catch chars that overlap the box edge.
            box_chars = [
                c for c in chars
                if c["x0"] >= fb["x0"] - 5 and c["x1"] <= fb["x1"] + 2
                and c["top"] >= fb["top"] - 5 and c["bottom"] <= fb["bottom"] + 5
                and c["text"].strip()
            ]
            inside_content = box_chars or box_words
            if inside_content:
                content_bottom = max(item["bottom"] for item in inside_content)
                content_x1 = max(item["x1"] for item in inside_content)
                if multiline:
                    # Multi-row: place input on a new line beneath the label
                    field_top = content_bottom + 2
                else:
                    # Single-row: place input to the right of the label with a gap
                    field_x0 = content_x1 + 8
                    # Safety: ensure there's still room for the input
                    if field_x0 >= fb["x1"] - 10:
                        field_x0 = fb["x0"]

            pdf_r = to_pdf_rect(field_x0, field_top, fb["x1"], fb["bottom"], ph)
            all_fields.append({
                "type": "text",
                "page": pg,
                "field_name": namer.unique(fname),
                "rect": pdf_r,
                "label": label_text,
                "multiline": multiline,
            })

        # Underline-style fields
        underline_fields = detect_underline_fields(lines_h, words, rects, pw)
        for uf in underline_fields:
            lbl_word = find_label_for_box(uf, words, pw)
            label_text = gather_label_text(lbl_word, words, box=uf) if lbl_word else ""
            fname = _sanitize(label_text) if label_text else "Underline_Field"
            pdf_r = to_pdf_rect(uf["x0"], uf["top"], uf["x1"], uf["bottom"], ph)
            all_fields.append({
                "type": "text",
                "page": pg,
                "field_name": namer.unique(fname),
                "rect": pdf_r,
                "label": label_text,
                "multiline": False,
            })

        # Underscore-based blank fields
        uscore_fields = detect_underscore_blanks(chars, words, rects, pg)
        for uf in uscore_fields:
            label_text = uf.get("context_label", "")
            if not label_text:
                lbl_word = find_label_for_box(uf, words, pw)
                label_text = gather_label_text(lbl_word, words, box=uf) if lbl_word else ""
                label_text = re.sub(r'_+', '', label_text).strip(' ,')
            fname = _sanitize(label_text) if label_text else "Blank_Field"
            pdf_r = to_pdf_rect(uf["x0"], uf["top"], uf["x1"], uf["bottom"], ph)
            all_fields.append({
                "type": "text",
                "page": pg,
                "field_name": namer.unique(fname),
                "rect": pdf_r,
                "label": label_text,
                "multiline": False,
            })

    # Step 3: Write the fillable PDF
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    # Fonts
    helv = DictionaryObject()
    helv[NameObject("/Type")] = NameObject("/Font")
    helv[NameObject("/Subtype")] = NameObject("/Type1")
    helv[NameObject("/BaseFont")] = NameObject("/Helvetica")
    helv[NameObject("/Encoding")] = NameObject("/WinAnsiEncoding")
    helv_ref = writer._add_object(helv)

    zadb = DictionaryObject()
    zadb[NameObject("/Type")] = NameObject("/Font")
    zadb[NameObject("/Subtype")] = NameObject("/Type1")
    zadb[NameObject("/BaseFont")] = NameObject("/ZapfDingbats")
    zadb_ref = writer._add_object(zadb)

    dr = DictionaryObject()
    fd = DictionaryObject()
    fd[NameObject("/Helv")] = helv_ref
    fd[NameObject("/ZaDb")] = zadb_ref
    dr[NameObject("/Font")] = fd

    acro = DictionaryObject()
    acro[NameObject("/DR")] = dr
    acro[NameObject("/DA")] = TextStringObject("/Helv 10 Tf 0 g")
    acro[NameObject("/NeedAppearances")] = BooleanObject(True)
    acro_fields = ArrayObject()

    for fld in all_fields:
        pg_idx = fld["page"]
        page_ref = writer.pages[pg_idx].indirect_reference
        page_obj = writer.pages[pg_idx]
        if "/Annots" not in page_obj:
            page_obj[NameObject("/Annots")] = ArrayObject()

        if fld["type"] == "text":
            ref = make_text_widget(
                writer, fld["field_name"], fld["rect"],
                page_ref, fld.get("multiline", False),
            )
            acro_fields.append(ref)
            page_obj[NameObject("/Annots")].append(ref)

        elif fld["type"] == "checkbox":
            ref = make_checkbox_widget(
                writer, fld["field_name"], fld["rect"], page_ref,
            )
            acro_fields.append(ref)
            page_obj[NameObject("/Annots")].append(ref)

        elif fld["type"] == "radio":
            grp_ref, w_refs = make_radio_group(
                writer, fld["group_name"], fld["options"],
                page_ref, fld["page_height"],
            )
            acro_fields.append(grp_ref)
            for wr in w_refs:
                page_obj[NameObject("/Annots")].append(wr)

    acro[NameObject("/Fields")] = acro_fields
    writer._root_object[NameObject("/AcroForm")] = writer._add_object(acro)

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf, len(all_fields)


def has_form_fields(pdf_path):
    """Check if a PDF already has AcroForm fields."""
    try:
        reader = PdfReader(pdf_path)
        acro_form = reader.trailer.get("/Root", {}).get("/AcroForm")
        if acro_form:
            fields = acro_form.get("/Fields", [])
            return len(fields) > 0
    except Exception:
        pass
    return False


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input.pdf> [output.pdf]")
        sys.exit(1)

    inp = sys.argv[1]
    if len(sys.argv) >= 3:
        out = sys.argv[2]
    else:
        base, ext = os.path.splitext(inp)
        out = f"{base}_fillable{ext}"

    output_path, field_count = analyse_and_build(inp, out)
    print(f"Created fillable PDF: {output_path} ({field_count} fields)")
