import { PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFRadioGroup, PDFRawStream, PDFRef, PDFStream, PDFString, PDFTextField } from 'pdf-lib';
import type { Lead } from '@/types/lead';

export const LEAD_FIELD_MAPPINGS = [
    { value: 'name', label: 'Full Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'custom_fields.gender', label: 'Gender' },
    { value: 'occupation', label: 'Occupation' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'service.name', label: 'Program/Service' },
    { value: 'custom_fields.family_size', label: 'Family Size' },
    { value: 'custom_fields.current_citizenships', label: 'Current Citizenships' },
    { value: 'budget.amount', label: 'Budget Amount' },
    { value: 'budget.currency', label: 'Budget Currency' },
] as const;

/**
 * Strip trailing numeric suffix added by PDF authoring tools for repeated fields.
 * Handles common patterns:
 *   "Full Name_3"  → "Full Name"     (underscore + digits)
 *   "Title.11"     → "Title"         (dot + digits)
 *   "Name #2"      → "Name"          (space hash digits)
 *   "Field[0]"     → "Field"         (bracket notation)
 *   "Name (1)"     → "Name"          (parenthesized digits)
 *   "Email"        → "Email"         (no suffix, unchanged)
 */
export function stripNumericSuffix(name: string): string {
    return name
        .replace(/_\d+$/, '')          // Name_1 → Name
        .replace(/\.\d+$/, '')         // Name.1 → Name
        .replace(/\s*#\d+$/, '')       // Name #1 → Name
        .replace(/\[\d+\]$/, '')       // Name[0] → Name
        .replace(/\s*\(\d+\)$/, '')    // Name (1) → Name
        .trim();
}

/**
 * Levenshtein edit distance between two strings (case-insensitive).
 */
function editDistance(a: string, b: string): number {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const m = al.length;
    const n = bl.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = al[i - 1] === bl[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Merge similar column base names within a repeat group column map.
 * Handles PDF authoring typos like "Fulla Name" vs "Full Name" by merging
 * columns whose base names are within edit distance 2 (and at least 4 chars long).
 * The more frequent base name wins as the canonical name.
 */
export function mergeSimilarRepeatGroupColumns(
    colMap: Map<string, string[]>,
): Map<string, string[]> {
    const entries = Array.from(colMap.entries()).sort((a, b) => b[1].length - a[1].length);
    const merged = new Map<string, string[]>();
    const consumed = new Set<string>();

    for (const [name, fields] of entries) {
        if (consumed.has(name)) continue;
        const allFields = [...fields];

        for (const [otherName, otherFields] of entries) {
            if (otherName === name || consumed.has(otherName)) continue;
            if (name.length >= 4 && otherName.length >= 4 && editDistance(name, otherName) <= 2) {
                allFields.push(...otherFields);
                consumed.add(otherName);
            }
        }

        merged.set(name, allFields);
        consumed.add(name);
    }

    return merged;
}

/**
 * Fill a single PDF form field by name.
 */
function fillSingleField(
    form: ReturnType<PDFDocument['getForm']>,
    fieldName: string,
    value: string,
): void {
    try {
        const field = form.getField(fieldName);
        if (field instanceof PDFTextField) {
            field.setText(value);
            // Patch the /DA string on each widget to use a smaller font size
            // that fits the field height, instead of the default auto-size
            const widgets = field.acroField.getWidgets();
            for (const widget of widgets) {
                const rect = widget.getRectangle();
                const fontSize = Math.round(Math.max(6, Math.min(rect.height * 0.5, 11)));
                const daObj = widget.dict.get(PDFName.of('DA')) ?? field.acroField.dict.get(PDFName.of('DA'));
                if (daObj) {
                    const daStr = daObj instanceof PDFHexString ? daObj.decodeText() : daObj instanceof PDFString ? daObj.decodeText() : String(daObj);
                    // Replace font size and force black color
                    const patchedSize = daStr.replace(/\/(\w+)\s+[\d.]+\s+Tf/, `/$1 ${fontSize} Tf`);
                    // Replace any color operator (e.g. "0 0 0.6 rg" or "0 g") with black
                    const patched = patchedSize.replace(/[\d.]+(\s+[\d.]+\s+[\d.]+)?\s+rg/, '0 g').replace(/[\d.]+\s+g/, '0 g');
                    widget.dict.set(PDFName.of('DA'), PDFString.of(patched));
                }
            }
        } else if (field instanceof PDFCheckBox) {
            if (value === 'true' || value === '1' || value === 'yes') {
                field.check();
            } else {
                field.uncheck();
            }
        } else if (field instanceof PDFDropdown) {
            field.select(value);
        } else if (field instanceof PDFRadioGroup) {
            const options = field.getOptions();
            // Try exact match first, then case-insensitive prefix match
            // (handles "M" → "Male", "F" → "Female", etc.)
            const match =
                options.find((o) => o === value) ??
                options.find((o) => o.toLowerCase() === value.toLowerCase()) ??
                options.find((o) => o.toLowerCase().startsWith(value.toLowerCase()));
            if (match) {
                field.select(match);
            }
        }
    } catch {
        // Field not found in PDF, skip silently
    }
}

/**
 * Fix radio/checkbox appearance streams so pdf-lib's flatten() renders them correctly.
 * Addresses two issues with PDFs generated by make_fillable.py:
 *   1. Missing /Resources dict (ZapfDingbats font not resolvable)
 *   2. Absolute BBox coordinates with 0,0 text origin (glyph drawn outside visible area)
 * Rewrites each "on" appearance stream with a local BBox and centered glyph.
 */
function ensureButtonAppearanceResources(
    pdfDoc: PDFDocument,
    form: ReturnType<PDFDocument['getForm']>,
): void {
    const resourcesKey = PDFName.of('Resources');
    const fontKey = PDFName.of('Font');
    const apKey = PDFName.of('AP');
    const nKey = PDFName.of('N');
    const bboxKey = PDFName.of('BBox');
    const offKey = PDFName.of('Off');

    for (const field of form.getFields()) {
        if (!(field instanceof PDFRadioGroup) && !(field instanceof PDFCheckBox)) {
            continue;
        }

        // ZapfDingbats: '4' = checkmark for both radio and checkbox
        const glyphChar = '4';

        const widgets = field.acroField.getWidgets();
        for (const widget of widgets) {
            const rect = widget.getRectangle();
            const boxW = rect.width;
            const boxH = rect.height;

            const apDict = widget.dict.get(apKey);
            if (!(apDict instanceof PDFDict)) continue;

            const nVal = apDict.get(nKey);
            if (!nVal) continue;

            const entries: [PDFName, PDFStream][] = [];
            if (nVal instanceof PDFDict) {
                for (const [k, v] of nVal.entries()) {
                    const resolved = v instanceof PDFRef ? pdfDoc.context.lookup(v) : v;
                    if (resolved instanceof PDFStream) {
                        entries.push([k as PDFName, resolved]);
                    }
                }
            }

            for (const [key, stream] of entries) {
                const isOff = key === offKey || key.toString() === '/Off';

                // Fix BBox to local coordinates
                const localBBox = pdfDoc.context.obj([0, 0, boxW, boxH]);
                stream.dict.set(bboxKey, localBBox);

                // Ensure /Resources with ZapfDingbats
                if (!stream.dict.get(resourcesKey)) {
                    const zadbDict = pdfDoc.context.obj({
                        Type: 'Font',
                        Subtype: 'Type1',
                        BaseFont: 'ZapfDingbats',
                    });
                    const fontDict = pdfDoc.context.obj({});
                    fontDict.set(PDFName.of('ZaDb'), zadbDict);
                    const resDict = pdfDoc.context.obj({});
                    resDict.set(fontKey, fontDict);
                    stream.dict.set(resourcesKey, resDict);
                }

                // Build replacement content bytes
                let contentBytes: Uint8Array;
                if (isOff) {
                    contentBytes = new Uint8Array(0);
                } else {
                    const fontSize = Math.min(Math.min(boxW, boxH) * 0.45, 12);
                    const glyphW = fontSize * 0.8;
                    const tx = (boxW - glyphW) / 2;
                    const ty = (boxH - fontSize) / 2;
                    const content = `q\nBT\n/ZaDb ${fontSize.toFixed(1)} Tf\n${tx.toFixed(1)} ${ty.toFixed(1)} Td\n(${glyphChar}) Tj\nET\nQ\n`;
                    contentBytes = new TextEncoder().encode(content);
                }

                // Replace stream by registering a new one with the same dict
                const newStream = pdfDoc.context.stream(contentBytes);
                // Copy dict entries from old stream to new
                for (const [dk, dv] of stream.dict.entries()) {
                    newStream.dict.set(dk as PDFName, dv);
                }
                const newRef = pdfDoc.context.register(newStream);
                (nVal as PDFDict).set(key, newRef);
            }
        }
    }
}

export interface RepeatGroupMeta {
    columns: { baseName: string; suffixedNames: string[] }[];
    slotsPerPage: number;
    sourcePageIndex: number; // 0-based page index of the repeat group page
    staticFieldValues: Record<string, string>; // main applicant fields to repeat on overflow pages
}

/**
 * Fill AcroForm fields and return filled PDF bytes.
 * Handles deduplicated fields by scanning for all variants with numeric suffixes
 * (e.g. filling "Title" also fills "Title_11", "Title_5", etc.)
 *
 * When `repeatGroups` is provided, overflow entries (keys prefixed with `__overflow__`)
 * generate additional copied pages in the PDF.
 */
export async function fillPdfFields(
    templateBytes: ArrayBuffer,
    fieldValues: Record<string, string>,
    repeatGroups?: Map<string, RepeatGroupMeta>,
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Build a map of base name → all raw PDF field names
    const allFields = form.getFields();
    const suffixMap = new Map<string, string[]>();
    for (const field of allFields) {
        const rawName = field.getName();
        const baseName = stripNumericSuffix(rawName);
        const group = suffixMap.get(baseName) ?? [];
        group.push(rawName);
        suffixMap.set(baseName, group);
    }

    // Separate overflow values from regular values
    const regularValues: Record<string, string> = {};
    const overflowValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
        if (key.startsWith('__overflow__')) {
            overflowValues[key] = value;
        } else {
            regularValues[key] = value;
        }
    }

    // Fill regular fields
    for (const [fieldName, value] of Object.entries(regularValues)) {
        if (!value) continue;
        const relatedNames = suffixMap.get(fieldName) ?? [fieldName];
        for (const rawName of relatedNames) {
            fillSingleField(form, rawName, value);
        }
    }

    // Ensure radio/checkbox appearance streams have font Resources so flatten renders them
    ensureButtonAppearanceResources(pdfDoc, form);

    try {
        form.flatten();
    } catch {
        // Some PDFs have complex AcroForm structures (indirect page refs) that
        // pdf-lib cannot flatten. Save with interactive fields instead.
    }

    // Handle overflow pages
    if (repeatGroups && Object.keys(overflowValues).length > 0) {
        for (const [groupName, meta] of repeatGroups.entries()) {
            // Collect overflow rows for this group
            const prefix = `__overflow__${groupName}_`;
            const rowMap = new Map<number, Record<string, string>>();

            for (const [key, value] of Object.entries(overflowValues)) {
                if (!key.startsWith(prefix)) continue;
                // Key format: __overflow__{groupName}_{colBaseName}_{rowIndex}
                const rest = key.slice(prefix.length);
                const lastUnderscore = rest.lastIndexOf('_');
                const colBaseName = rest.slice(0, lastUnderscore);
                const rowIndex = parseInt(rest.slice(lastUnderscore + 1));
                if (!rowMap.has(rowIndex)) rowMap.set(rowIndex, {});
                rowMap.get(rowIndex)![colBaseName] = value;
            }

            const sortedRows = Array.from(rowMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([, row]) => row);

            // Process overflow in batches of slotsPerPage
            let insertionOffset = 0;
            for (let batch = 0; batch < sortedRows.length; batch += meta.slotsPerPage) {
                const batchRows = sortedRows.slice(batch, batch + meta.slotsPerPage);

                // Load a fresh copy of the template for each overflow page
                const overflowDoc = await PDFDocument.load(templateBytes);
                const overflowForm = overflowDoc.getForm();

                // Fill static fields (e.g., main applicant name) on the source page
                for (const [fieldName, value] of Object.entries(meta.staticFieldValues)) {
                    if (!value) continue;
                    fillSingleField(overflowForm, fieldName, value);
                }

                // Fill batch rows into the first N slot field names
                for (let rowIdx = 0; rowIdx < batchRows.length; rowIdx++) {
                    const row = batchRows[rowIdx];
                    for (const col of meta.columns) {
                        const value = row[col.baseName];
                        if (!value || !col.suffixedNames[rowIdx]) continue;
                        fillSingleField(overflowForm, col.suffixedNames[rowIdx], value);
                    }
                }

                try {
                    overflowForm.flatten();
                } catch {
                    // Same fallback for overflow pages
                }

                // Copy the source page from the overflow doc into the main doc
                const [copiedPage] = await pdfDoc.copyPages(overflowDoc, [meta.sourcePageIndex]);
                const insertIndex = meta.sourcePageIndex + 1 + insertionOffset;
                pdfDoc.insertPage(insertIndex, copiedPage);
                insertionOffset++;
            }
        }
    }

    return pdfDoc.save();
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const value = path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);

    if (value === undefined || value === null) {
        return '';
    }

    if (Array.isArray(value)) {
        return value.join(', ');
    }

    return String(value);
}

/**
 * Auto-map lead data to PDF field values based on field mappings.
 */
export function autoMapLeadFields(
    fieldMappings: { field_name: string; lead_field_mapping: string | null }[],
    lead: Lead,
): Record<string, string> {
    const values: Record<string, string> = {};
    const leadData = lead as unknown as Record<string, unknown>;

    // Flatten nested relations for mapping
    const flatLead: Record<string, unknown> = {
        ...leadData,
        'service.name': (lead.service as { data?: { name?: string } })?.data?.name ?? '',
        'budget.amount': lead.budget?.amount ?? '',
        'budget.currency': lead.budget?.currency ?? '',
    };

    // Spread custom_fields into the flat map
    if (lead.custom_fields) {
        for (const [key, val] of Object.entries(lead.custom_fields)) {
            flatLead[`custom_fields.${key}`] = val;
        }
    }

    for (const field of fieldMappings) {
        if (field.lead_field_mapping) {
            const mappedValue = getNestedValue(flatLead, field.lead_field_mapping);
            if (mappedValue) {
                values[field.field_name] = mappedValue;
            }
        }
    }

    return values;
}
