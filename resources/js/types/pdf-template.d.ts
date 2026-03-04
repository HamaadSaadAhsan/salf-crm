export interface PdfTemplate {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    service: { id: number; name: string } | null;
    creator: { id: number; name: string } | null;
    fields_count: number;
    fields?: PdfTemplateField[];
    file_url: string;
    created_at: string;
}

export interface PdfTemplateField {
    id: number;
    field_name: string;
    field_label: string;
    field_type: 'text' | 'checkbox' | 'date' | 'dropdown' | 'radio';
    field_options: string[] | null;
    lead_field_mapping: string | null;
    default_value: string | null;
    sort_order: number;
    page_number: number | null;
    section: string | null;
    repeat_group: string | null;
    is_required: boolean;
}

export interface LeadPdfSubmission {
    id: number;
    template: { id: number; name: string; file_url?: string; fields?: PdfTemplateField[] };
    field_values: Record<string, string>;
    status: 'draft' | 'completed';
    submitted_by: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface ScannedPdfField {
    name: string;
    type: string;
    value?: string;
    /** All raw PDF field names that map to this logical field (e.g. ["Title", "Title_11"]) */
    relatedNames: string[];
    /** 1-based page number where the primary field appears */
    pageNumber?: number;
    /** Per-field page numbers: rawFieldName → 1-based page number */
    fieldPageNumbers: Record<string, number>;
}

/** Response from the Python PDF scanner API endpoint */
export interface ScannedPdfFieldResponse {
    fields: {
        raw_name: string;
        base_name: string;
        type: string;
        page_number: number;
        section: string;
        repeat_group: string | null;
        value: string;
    }[];
    repeat_groups: Record<
        string,
        {
            page: number;
            section: string;
            columns: string[];
            slot_count: number;
        }
    >;
    sections: {
        name: string;
        page: number;
        field_count: number;
    }[];
    total_fields: number;
    pages: number;
}
