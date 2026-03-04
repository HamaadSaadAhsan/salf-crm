#!/usr/bin/env python3
"""
Scan PDF form fields using PyMuPDF and output structured JSON.

Usage:
    python3 scripts/scan_pdf_fields.py /path/to/form.pdf

Output: JSON to stdout with fields, repeat_groups, sections, total_fields, pages.
"""

import json
import re
import sys

import fitz  # PyMuPDF


# Widget subtype constants
WIDGET_TEXT = 7
WIDGET_CHECKBOX = 2
WIDGET_RADIO = 5
WIDGET_COMBOBOX = 3
WIDGET_LISTBOX = 6
WIDGET_PUSHBUTTON = 4
WIDGET_SIGNATURE = 0

WIDGET_TYPE_MAP = {
    WIDGET_TEXT: "text",
    WIDGET_CHECKBOX: "checkbox",
    WIDGET_RADIO: "radio",
    WIDGET_COMBOBOX: "dropdown",
    WIDGET_LISTBOX: "dropdown",
}

# Patterns for stripping numeric suffixes
SUFFIX_PATTERNS = [
    re.compile(r"_\d+$"),       # Name_1
    re.compile(r"\.\d+$"),      # Name.1
    re.compile(r"\s*#\d+$"),    # Name #1
    re.compile(r"\[\d+\]$"),    # Name[0]
    re.compile(r"\s*\(\d+\)$"), # Name (1)
]

# Section header detection patterns
SECTION_PATTERNS = [
    re.compile(r"^(?:PART|SECTION|CHAPTER)\s+[IVXLCDM\d]+", re.IGNORECASE),
    re.compile(r"^[A-Z]\d+[\s.\-]+[A-Z]", re.IGNORECASE),  # D4 DETAILS OF...
    re.compile(r"^[A-Z]\.\s+[A-Z]", re.IGNORECASE),        # A. PERSONAL DETAILS
    re.compile(r"^\d+\.\s+[A-Z]"),                          # 1. PERSONAL DETAILS
]


def strip_numeric_suffix(name: str) -> str:
    """Strip trailing numeric suffix from a field name."""
    for pattern in SUFFIX_PATTERNS:
        name = pattern.sub("", name)
    return name.strip()


def levenshtein(a: str, b: str) -> int:
    """Case-insensitive Levenshtein edit distance."""
    al, bl = a.lower(), b.lower()
    m, n = len(al), len(bl)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if al[i - 1] == bl[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]


def extract_section_headers(page: fitz.Page) -> list[dict]:
    """
    Extract section headers from a page's text blocks.
    Returns list of {text, y} sorted by Y coordinate.
    """
    headers = []
    blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]

    for block in blocks:
        if block.get("type") != 0:  # text block
            continue

        for line in block.get("lines", []):
            line_text = ""
            max_size = 0
            is_bold = False

            for span in line.get("spans", []):
                line_text += span.get("text", "")
                size = span.get("size", 0)
                if size > max_size:
                    max_size = size
                flags = span.get("flags", 0)
                if flags & 2 ** 4:  # bold flag
                    is_bold = True

            line_text = line_text.strip()
            if not line_text or len(line_text) < 3:
                continue

            # Detect section headers by: bold + large text, or matching patterns
            is_section = False

            # Large bold text (>= 11pt) with pattern match
            if is_bold and max_size >= 11 and len(line_text) > 3:
                if any(p.match(line_text) for p in SECTION_PATTERNS):
                    is_section = True

            # Pattern-matched headers regardless of styling
            if not is_section:
                for pattern in SECTION_PATTERNS:
                    if pattern.match(line_text):
                        is_section = True
                        break

            if is_section and len(line_text) <= 80:
                y = line.get("bbox", [0, 0, 0, 0])[1]
                headers.append({"text": line_text, "y": y})

    return sorted(headers, key=lambda h: h["y"])


def assign_section(field_y: float, page_headers: list[dict], page_num: int) -> str:
    """Assign a field to the nearest preceding section header on its page."""
    best = None
    for header in page_headers:
        if header["y"] <= field_y + 5:  # Allow small tolerance
            best = header["text"]

    if best:
        return best

    return f"Page {page_num}"


def merge_similar_columns(col_map: dict[str, list[str]]) -> dict[str, list[str]]:
    """Merge columns with similar names (Levenshtein <= 2, min 4 chars)."""
    entries = sorted(col_map.items(), key=lambda x: -len(x[1]))
    merged = {}
    consumed = set()

    for name, fields in entries:
        if name in consumed:
            continue
        all_fields = list(fields)

        for other_name, other_fields in entries:
            if other_name == name or other_name in consumed:
                continue
            if len(name) >= 4 and len(other_name) >= 4 and levenshtein(name, other_name) <= 2:
                all_fields.extend(other_fields)
                consumed.add(other_name)

        merged[name] = all_fields
        consumed.add(name)

    return merged


def detect_repeat_groups(
    fields: list[dict],
    page_headers_map: dict[int, list[dict]],
) -> tuple[dict[str, str], dict[str, dict]]:
    """
    Detect repeat groups using coordinate analysis.
    Returns (raw_name_to_group, group_meta).
    """
    # Group raw fields by page + base_name
    page_base_groups: dict[str, dict] = {}

    for f in fields:
        page = f["page_number"]
        base = f["base_name"]
        key = f"{page}::{base}"
        if key not in page_base_groups:
            page_base_groups[key] = {"page": page, "base_name": base, "raw_names": [], "rects": []}
        page_base_groups[key]["raw_names"].append(f["raw_name"])
        page_base_groups[key]["rects"].append(f["rect"])

    # Group by page → column map
    page_groups: dict[int, dict[str, list[str]]] = {}
    for info in page_base_groups.values():
        page = info["page"]
        if page not in page_groups:
            page_groups[page] = {}
        col_map = page_groups[page]
        base = info["base_name"]
        if base not in col_map:
            col_map[base] = []
        col_map[base].extend(info["raw_names"])

    raw_name_to_group: dict[str, str] = {}
    group_meta: dict[str, dict] = {}

    for page, col_map in page_groups.items():
        merged = merge_similar_columns(col_map)

        # Find columns with 3+ fields
        repeat_cols = {name: names for name, names in merged.items() if len(names) >= 3}
        if not repeat_cols:
            continue

        # Determine group name from section headers
        headers = page_headers_map.get(page, [])
        # Use the first field's Y to find the relevant section
        first_field = next(
            (f for f in fields if f["page_number"] == page and f["base_name"] in repeat_cols),
            None,
        )
        if first_field and headers:
            section_name = assign_section(first_field["rect"][1], headers, page)
        else:
            section_name = f"Page {page}"

        # Slugify group name
        group_slug = re.sub(r"[^a-z0-9]+", "_", section_name.lower()).strip("_")

        columns = list(repeat_cols.keys())
        slot_count = max(len(names) for names in repeat_cols.values())

        group_meta[group_slug] = {
            "page": page,
            "section": section_name,
            "columns": columns,
            "slot_count": slot_count,
        }

        for col_names in repeat_cols.values():
            for raw_name in col_names:
                raw_name_to_group[raw_name] = group_slug

    return raw_name_to_group, group_meta


def scan_pdf(pdf_path: str) -> dict:
    """Scan a PDF file and return structured field data."""
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    # Phase 1: Extract section headers from all pages
    page_headers_map: dict[int, list[dict]] = {}
    for page_num in range(total_pages):
        page = doc[page_num]
        headers = extract_section_headers(page)
        if headers:
            page_headers_map[page_num + 1] = headers

    # Phase 2: Extract all form widgets
    raw_fields: list[dict] = []
    for page_num in range(total_pages):
        page = doc[page_num]
        for widget in page.widgets():
            field_type_int = widget.field_type
            field_name = widget.field_name

            if not field_name:
                continue

            # Skip pushbuttons and signatures
            if field_type_int == WIDGET_PUSHBUTTON:
                continue
            if field_type_int == WIDGET_SIGNATURE:
                continue

            field_type = WIDGET_TYPE_MAP.get(field_type_int, "text")
            base_name = strip_numeric_suffix(field_name)
            rect = list(widget.rect)  # [x0, y0, x1, y1]
            value = widget.field_value or ""

            raw_fields.append({
                "raw_name": field_name,
                "base_name": base_name,
                "type": field_type,
                "page_number": page_num + 1,
                "rect": rect,
                "value": value,
            })

    # Phase 3: Assign sections to fields
    for f in raw_fields:
        page = f["page_number"]
        headers = page_headers_map.get(page, [])
        f["section"] = assign_section(f["rect"][1], headers, page)

    # Phase 4: Detect repeat groups
    raw_name_to_group, repeat_groups = detect_repeat_groups(raw_fields, page_headers_map)

    # Assign repeat groups to fields
    for f in raw_fields:
        f["repeat_group"] = raw_name_to_group.get(f["raw_name"])

    # Phase 5: Build sections summary
    section_counts: dict[str, dict] = {}
    for f in raw_fields:
        section = f["section"]
        if section not in section_counts:
            section_counts[section] = {"name": section, "page": f["page_number"], "field_count": 0}
        section_counts[section]["field_count"] += 1

    sections = sorted(section_counts.values(), key=lambda s: (s["page"], s["name"]))

    # Build output fields (without rect, which is internal)
    output_fields = []
    for f in raw_fields:
        output_fields.append({
            "raw_name": f["raw_name"],
            "base_name": f["base_name"],
            "type": f["type"],
            "page_number": f["page_number"],
            "section": f["section"],
            "repeat_group": f["repeat_group"],
            "value": f["value"],
        })

    doc.close()

    return {
        "fields": output_fields,
        "repeat_groups": repeat_groups,
        "sections": sections,
        "total_fields": len(output_fields),
        "pages": total_pages,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: scan_pdf_fields.py <pdf_path>"}), file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        result = scan_pdf(pdf_path)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
