import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    useCreateLeadPdfSubmission,
    useDeleteLeadPdfSubmission,
    useLeadPdfSubmissions,
    useLeadPdfTemplates,
    useUpdateLeadPdfSubmission,
} from '@/hooks/usePdfTemplates';
import { autoMapLeadFields, fillPdfFields, mergeSimilarRepeatGroupColumns, stripNumericSuffix, type RepeatGroupMeta } from '@/lib/pdf-utils';
import type { Lead } from '@/types/lead';
import type { LeadPdfSubmission, PdfTemplate, PdfTemplateField } from '@/types/pdf-template';
import { ArrowLeft, Download, FileText, Loader2, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import axios from '@/lib/axios';

type Props = {
    lead: Lead;
};

interface RepeatGroupColumnDef {
    baseName: string;
    fieldLabel: string;
    fieldType: string;
    suffixedNames: string[];
    isRequired: boolean;
}

function buildRepeatGroupsMeta(
    allFields: PdfTemplateField[],
    fieldValues: Record<string, string>,
    repeatGroupDefs: Map<string, RepeatGroupColumnDef[]>,
): Map<string, RepeatGroupMeta> | undefined {
    if (repeatGroupDefs.size === 0) return undefined;

    // Check if there are any overflow values
    const hasOverflow = Object.keys(fieldValues).some((k) => k.startsWith('__overflow__'));
    if (!hasOverflow) return undefined;

    const meta = new Map<string, RepeatGroupMeta>();

    for (const [groupName, columns] of repeatGroupDefs.entries()) {
        // Find the source page index (0-based) from the first field in the group
        const firstField = allFields.find((f) => f.repeat_group === groupName);
        const sourcePageIndex = firstField?.page_number ? firstField.page_number - 1 : 0;

        // Collect static field values (non-repeat-group fields on the same section)
        const section = firstField?.section || (firstField?.page_number ? `Page ${firstField.page_number}` : 'General');
        const staticFieldValues: Record<string, string> = {};
        for (const field of allFields) {
            if (field.repeat_group) continue;
            const fieldSection = field.section || (field.page_number ? `Page ${field.page_number}` : 'General');
            if (fieldSection === section && fieldValues[field.field_name]) {
                staticFieldValues[field.field_name] = fieldValues[field.field_name];
            }
        }

        meta.set(groupName, {
            columns: columns.map((col) => ({
                baseName: col.baseName,
                suffixedNames: col.suffixedNames,
            })),
            slotsPerPage: columns[0]?.suffixedNames.length ?? 7,
            sourcePageIndex,
            staticFieldValues,
        });
    }

    return meta;
}

function extractSuffixIndex(fieldName: string): number {
    const match =
        fieldName.match(/[_.](\d+)$/) ||
        fieldName.match(/\s*#(\d+)$/) ||
        fieldName.match(/\[(\d+)\]$/) ||
        fieldName.match(/\s*\((\d+)\)$/);
    return match ? parseInt(match[1]) : 0;
}

type ViewState =
    | { mode: 'list' }
    | { mode: 'fill'; template: PdfTemplate; submissionId: number | null }
    | { mode: 'submissions' };

function TemplateCardSkeleton() {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
    );
}

function SubmissionRowSkeleton() {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
                <Skeleton className="size-4" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Skeleton className="h-7 w-12 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
            </div>
        </div>
    );
}

export function LeadRecordsDocuments({ lead }: Props) {
    const leadId = String(lead.id);
    const { data: templatesData, isLoading: loadingTemplates } = useLeadPdfTemplates(leadId);
    const { data: submissionsData, isLoading: loadingSubmissions } = useLeadPdfSubmissions(leadId);
    const createSubmission = useCreateLeadPdfSubmission(leadId);
    const updateSubmission = useUpdateLeadPdfSubmission(leadId);
    const deleteSubmission = useDeleteLeadPdfSubmission(leadId);

    const [view, setView] = useState<ViewState>({ mode: 'list' });
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [generating, setGenerating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<LeadPdfSubmission | null>(null);
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
    const [autoMappedFields, setAutoMappedFields] = useState<Set<string>>(new Set());

    const templates = useMemo(() => templatesData?.data ?? [], [templatesData]);
    const submissions = useMemo(() => submissionsData?.data ?? [], [submissionsData]);

    // Separate regular fields from repeat_group fields, then deduplicate regular fields
    const { deduplicatedFields, siblingMap, repeatGroupDefs } = useMemo(() => {
        if (view.mode !== 'fill' || !view.template.fields) {
            return {
                deduplicatedFields: [] as PdfTemplateField[],
                siblingMap: new Map<string, string[]>(),
                repeatGroupDefs: new Map<string, RepeatGroupColumnDef[]>(),
            };
        }

        const regularFields: PdfTemplateField[] = [];
        const rgFields: PdfTemplateField[] = [];
        for (const field of view.template.fields) {
            if (field.repeat_group) {
                rgFields.push(field);
            } else {
                regularFields.push(field);
            }
        }

        // Deduplicate regular fields — section-aware to avoid merging fields across pages
        // e.g. main applicant "Date of Birth" (Page 4) stays separate from dependent "Date of Birth_10" (Page 3)
        const seen = new Map<string, { primary: PdfTemplateField; siblings: string[] }>();
        for (const field of regularFields) {
            const baseName = stripNumericSuffix(field.field_name);
            const section = field.section || (field.page_number ? `Page ${field.page_number}` : '_unsorted');
            const dedupKey = `${section}::${baseName}`;
            const existing = seen.get(dedupKey);
            if (existing) {
                existing.siblings.push(field.field_name);
            } else {
                seen.set(dedupKey, { primary: field, siblings: [field.field_name] });
            }
        }

        const dedup: PdfTemplateField[] = [];
        const sMap = new Map<string, string[]>();
        for (const { primary, siblings } of seen.values()) {
            dedup.push(primary);
            sMap.set(primary.field_name, siblings);
        }

        // Build repeat group column definitions
        const rgDefs = new Map<string, RepeatGroupColumnDef[]>();
        const rgColumnMap = new Map<string, Map<string, string[]>>();
        for (const field of rgFields) {
            const group = field.repeat_group!;
            if (!rgColumnMap.has(group)) rgColumnMap.set(group, new Map());
            const colMap = rgColumnMap.get(group)!;
            const baseName = stripNumericSuffix(field.field_name);
            if (!colMap.has(baseName)) colMap.set(baseName, []);
            colMap.get(baseName)!.push(field.field_name);
        }

        for (const [group, colMap] of rgColumnMap.entries()) {
            // Merge similar column names (e.g. "Fulla Name" → "Full Name")
            const mergedColMap = mergeSimilarRepeatGroupColumns(colMap);
            const columns: RepeatGroupColumnDef[] = [];
            for (const [baseName, suffixedNames] of mergedColMap.entries()) {
                // Sort suffixed names by their suffix index
                const sorted = [...suffixedNames].sort((a, b) => extractSuffixIndex(a) - extractSuffixIndex(b));
                const primaryField = rgFields.find((f) => f.field_name === sorted[0])!;
                columns.push({
                    baseName,
                    fieldLabel: primaryField.field_label,
                    fieldType: primaryField.field_type,
                    suffixedNames: sorted,
                    isRequired: primaryField.is_required,
                });
            }
            rgDefs.set(group, columns);
        }

        return { deduplicatedFields: dedup, siblingMap: sMap, repeatGroupDefs: rgDefs };
    }, [view]);

    // When entering fill mode, auto-populate from lead data
    useEffect(() => {
        if (view.mode === 'fill' && view.template.fields) {
            const mappedValues = autoMapLeadFields(
                view.template.fields.map((f) => ({
                    field_name: f.field_name,
                    lead_field_mapping: f.lead_field_mapping,
                })),
                lead,
            );

            // Track which fields were auto-mapped
            const mapped = new Set<string>();
            for (const field of view.template.fields) {
                if (field.lead_field_mapping && mappedValues[field.field_name]) {
                    mapped.add(field.field_name);
                }
            }
            setAutoMappedFields(mapped);

            // If editing an existing submission, merge saved values on top
            if (view.submissionId) {
                const existingSub = submissions.find((s) => s.id === view.submissionId);
                if (existingSub) {
                    setFieldValues({ ...mappedValues, ...existingSub.field_values });
                }
                // Whether found or not, don't reset — submission was just created or cache
                // hasn't updated yet; preserve whatever the user has entered.
                return;
            }

            // For new submissions, also apply default values from field config
            const defaults: Record<string, string> = {};
            for (const field of view.template.fields) {
                if (field.default_value) {
                    defaults[field.field_name] = field.default_value;
                }
            }

            setFieldValues({ ...defaults, ...mappedValues });
        }
    }, [view, lead, submissions]);

    const handleSelectTemplate = useCallback((template: PdfTemplate) => {
        axios.get(`/api/leads/${leadId}/pdf-templates/${template.id}`).then((res) => {
            const fullTemplate = res.data.data as PdfTemplate;
            setView({ mode: 'fill', template: fullTemplate, submissionId: null });
            setValidationErrors(new Set());
        });
    }, [leadId]);

    const handleEditSubmission = useCallback((submission: LeadPdfSubmission) => {
        axios.get(`/api/leads/${leadId}/pdf-templates/${submission.template.id}`).then((res) => {
            const fullTemplate = res.data.data as PdfTemplate;
            setView({ mode: 'fill', template: fullTemplate, submissionId: submission.id });
            setValidationErrors(new Set());
        });
    }, [leadId]);

    const validateRequiredFields = useCallback((): boolean => {
        if (view.mode !== 'fill') return true;

        const errors = new Set<string>();
        for (const field of deduplicatedFields) {
            if (field.is_required && !fieldValues[field.field_name]?.trim()) {
                errors.add(field.field_name);
            }
        }
        setValidationErrors(errors);

        if (errors.size > 0) {
            toast.error(`Please fill in all required fields (${errors.size} missing)`);
            return false;
        }
        return true;
    }, [view.mode, deduplicatedFields, fieldValues]);

    const handleSaveDraft = useCallback(() => {
        if (view.mode !== 'fill') {
            return;
        }

        if (view.submissionId) {
            updateSubmission.mutate({ submissionId: view.submissionId, field_values: fieldValues, status: 'draft' });
        } else {
            createSubmission.mutate(
                { pdf_template_id: view.template.id, field_values: fieldValues, status: 'draft' },
                {
                    onSuccess: (data) => {
                        setView({ ...view, submissionId: data.data.id });
                    },
                },
            );
        }
    }, [view, fieldValues, createSubmission, updateSubmission]);

    const handleGeneratePdf = useCallback(async () => {
        if (view.mode !== 'fill' || !view.template.file_url) {
            return;
        }

        if (!validateRequiredFields()) return;

        setGenerating(true);
        try {
            // Save as completed first
            if (view.submissionId) {
                await updateSubmission.mutateAsync({ submissionId: view.submissionId, field_values: fieldValues, status: 'completed' });
            } else {
                const result = await createSubmission.mutateAsync({
                    pdf_template_id: view.template.id,
                    field_values: fieldValues,
                    status: 'completed',
                });
                setView({ ...view, submissionId: result.data.id });
            }

            // Fetch the template PDF
            const response = await fetch(view.template.file_url);
            const templateBytes = await response.arrayBuffer();

            // Build repeat group meta for overflow page generation
            const repeatGroupsMeta = buildRepeatGroupsMeta(view.template.fields ?? [], fieldValues, repeatGroupDefs);

            // Fill the PDF fields
            const filledPdfBytes = await fillPdfFields(templateBytes, fieldValues, repeatGroupsMeta);

            // Trigger download
            const blob = new Blob([filledPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${view.template.name} - ${lead.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF. Please try again.');
        } finally {
            setGenerating(false);
        }
    }, [view, fieldValues, lead.name, createSubmission, updateSubmission, validateRequiredFields, repeatGroupDefs]);

    const handleConfirmDeleteSubmission = useCallback(() => {
        if (!deleteTarget) return;
        deleteSubmission.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
        });
    }, [deleteTarget, deleteSubmission]);

    // Group deduplicated fields by section, sorted by page_number then section name
    const groupedFields = useMemo(() => {
        const sectionMap = new Map<string, { page: number; fields: PdfTemplateField[] }>();
        const sectionOrder: string[] = [];

        for (const field of deduplicatedFields) {
            const section = field.section || (field.page_number ? `Page ${field.page_number}` : 'General');
            if (!sectionMap.has(section)) {
                sectionMap.set(section, { page: field.page_number ?? 0, fields: [] });
                sectionOrder.push(section);
            }
            sectionMap.get(section)!.fields.push(field);
        }

        // Sort sections by page number, then name
        sectionOrder.sort((a, b) => {
            const pageA = sectionMap.get(a)!.page;
            const pageB = sectionMap.get(b)!.page;
            if (pageA !== pageB) return pageA - pageB;
            return a.localeCompare(b);
        });

        const result: Record<string, PdfTemplateField[]> = {};
        for (const section of sectionOrder) {
            result[section] = sectionMap.get(section)!.fields;
        }
        return result;
    }, [deduplicatedFields]);

    // Determine which sections have repeat groups (for rendering RepeatGroupTable)
    const repeatGroupSections = useMemo(() => {
        if (view.mode !== 'fill' || !view.template.fields) return new Map<string, string>();
        const sectionGroupMap = new Map<string, string>();
        for (const field of view.template.fields) {
            if (field.repeat_group) {
                const section = field.section || (field.page_number ? `Page ${field.page_number}` : 'General');
                sectionGroupMap.set(section, field.repeat_group);
            }
        }
        return sectionGroupMap;
    }, [view]);

    if (view.mode === 'fill') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setView({ mode: 'list' })}>
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div>
                            <h3 className="text-sm font-medium">{view.template.name}</h3>
                            <p className="text-xs text-muted-foreground">{view.submissionId ? 'Editing submission' : 'New submission'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveDraft}
                            disabled={createSubmission.isPending || updateSubmission.isPending}
                        >
                            <Save className="mr-1 size-3.5" />
                            Save Draft
                        </Button>
                        <Button size="sm" onClick={handleGeneratePdf} disabled={generating}>
                            {generating ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Download className="mr-1 size-3.5" />}
                            Generate PDF
                        </Button>
                    </div>
                </div>

                {Object.entries(groupedFields).map(([sectionLabel, fields]) => (
                    <div key={sectionLabel} className="space-y-3">
                        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{sectionLabel}</h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {fields.map((field) => {
                                const siblings = siblingMap.get(field.field_name) ?? [field.field_name];
                                return (
                                    <FieldInput
                                        key={field.field_name}
                                        field={field}
                                        value={fieldValues[field.field_name] ?? ''}
                                        onChange={(val) => {
                                            setFieldValues((prev) => {
                                                const next = { ...prev };
                                                for (const name of siblings) {
                                                    next[name] = val;
                                                }
                                                return next;
                                            });
                                            setValidationErrors((prev) => {
                                                const next = new Set(prev);
                                                for (const name of siblings) {
                                                    next.delete(name);
                                                }
                                                return next;
                                            });
                                        }}
                                        hasError={validationErrors.has(field.field_name)}
                                        isAutoMapped={autoMappedFields.has(field.field_name)}
                                        repeatCount={siblings.length > 1 ? siblings.length : undefined}
                                    />
                                );
                            })}
                        </div>
                        {repeatGroupSections.has(sectionLabel) && repeatGroupDefs.has(repeatGroupSections.get(sectionLabel)!) && (
                            <RepeatGroupTable
                                groupName={repeatGroupSections.get(sectionLabel)!}
                                columns={repeatGroupDefs.get(repeatGroupSections.get(sectionLabel)!)!}
                                fieldValues={fieldValues}
                                onFieldValuesChange={setFieldValues}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-6">
            {/* Available Templates */}
            <div>
                <h3 className="mb-3 text-sm font-medium">Available Templates</h3>
                {loadingTemplates ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <TemplateCardSkeleton key={i} />
                        ))}
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <FileText className="mb-2 size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No PDF templates available for this lead's program.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                            >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <FileText className="size-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{template.name}</p>
                                    <p className="text-xs text-muted-foreground">{template.fields_count} fields</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Saved Submissions */}
            {loadingSubmissions ? (
                <div>
                    <h3 className="mb-3 text-sm font-medium">Saved Submissions</h3>
                    <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <SubmissionRowSkeleton key={i} />
                        ))}
                    </div>
                </div>
            ) : submissions.length > 0 ? (
                <div>
                    <h3 className="mb-3 text-sm font-medium">Saved Submissions</h3>
                    <div className="space-y-2">
                        {submissions.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="size-4 text-muted-foreground" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">{sub.template.name}</p>
                                            <Badge variant={sub.status === 'completed' ? 'success' : 'warning'} appearance="light" size="sm">
                                                {sub.status === 'draft' ? 'Draft' : 'Completed'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(sub.updated_at).toLocaleDateString()}
                                            {sub.submitted_by && ` by ${sub.submitted_by.name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEditSubmission(sub)}>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:text-destructive"
                                        onClick={() => setDeleteTarget(sub)}
                                    >
                                        <Trash2 className="size-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Delete Submission AlertDialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this submission for "{deleteTarget?.template.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleConfirmDeleteSubmission} disabled={deleteSubmission.isPending}>
                            {deleteSubmission.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function RepeatGroupTable({
    groupName,
    columns,
    fieldValues,
    onFieldValuesChange,
}: {
    groupName: string;
    columns: RepeatGroupColumnDef[];
    fieldValues: Record<string, string>;
    onFieldValuesChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
    // Max slots = number of suffixed names for the first column
    const maxSlots = columns[0]?.suffixedNames.length ?? 0;

    // Count active rows (rows that have any value filled)
    const activeRows = useMemo(() => {
        let count = 0;
        for (let row = 0; row < maxSlots; row++) {
            const hasValue = columns.some((col) => {
                const fieldName = col.suffixedNames[row];
                return fieldName && fieldValues[fieldName]?.trim();
            });
            if (hasValue) count = row + 1;
        }
        // Also check overflow rows
        const overflowPrefix = `__overflow__${groupName}_`;
        for (const key of Object.keys(fieldValues)) {
            if (key.startsWith(overflowPrefix) && fieldValues[key]?.trim()) {
                const rest = key.slice(overflowPrefix.length);
                const lastUnderscore = rest.lastIndexOf('_');
                const rowIndex = parseInt(rest.slice(lastUnderscore + 1));
                count = Math.max(count, rowIndex + 1);
            }
        }
        return Math.max(count, 1); // At least 1 row
    }, [columns, fieldValues, maxSlots, groupName]);

    const [rowCount, setRowCount] = useState(activeRows);

    useEffect(() => {
        if (activeRows > rowCount) setRowCount(activeRows);
    }, [activeRows, rowCount]);

    const handleAddRow = useCallback(() => {
        setRowCount((prev) => prev + 1);
    }, []);

    const handleRemoveRow = useCallback(
        (rowIndex: number) => {
            onFieldValuesChange((prev) => {
                const next = { ...prev };
                for (const col of columns) {
                    if (rowIndex < maxSlots) {
                        const fieldName = col.suffixedNames[rowIndex];
                        if (fieldName) delete next[fieldName];
                    } else {
                        const key = `__overflow__${groupName}_${col.baseName}_${rowIndex}`;
                        delete next[key];
                    }
                }
                return next;
            });
            setRowCount((prev) => Math.max(prev - 1, 1));
        },
        [columns, maxSlots, groupName, onFieldValuesChange],
    );

    const handleCellChange = useCallback(
        (rowIndex: number, col: RepeatGroupColumnDef, value: string) => {
            onFieldValuesChange((prev) => {
                const next = { ...prev };
                if (rowIndex < maxSlots) {
                    const fieldName = col.suffixedNames[rowIndex];
                    if (fieldName) next[fieldName] = value;
                } else {
                    const key = `__overflow__${groupName}_${col.baseName}_${rowIndex}`;
                    next[key] = value;
                }
                return next;
            });
        },
        [maxSlots, groupName, onFieldValuesChange],
    );

    const getCellValue = useCallback(
        (rowIndex: number, col: RepeatGroupColumnDef): string => {
            if (rowIndex < maxSlots) {
                const fieldName = col.suffixedNames[rowIndex];
                return fieldName ? fieldValues[fieldName] ?? '' : '';
            }
            const key = `__overflow__${groupName}_${col.baseName}_${rowIndex}`;
            return fieldValues[key] ?? '';
        },
        [fieldValues, maxSlots, groupName],
    );

    const formatGroupLabel = (name: string) =>
        name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <h5 className="text-sm font-medium">{formatGroupLabel(groupName)}</h5>
                    <Badge variant="secondary" size="sm">
                        {rowCount} / {maxSlots} slots
                    </Badge>
                    {rowCount > maxSlots && (
                        <Badge variant="warning" appearance="light" size="sm">
                            +{rowCount - maxSlots} overflow
                        </Badge>
                    )}
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddRow}>
                    <Plus className="mr-1 size-3" />
                    Add Row
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className="w-10 px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                            {columns.map((col) => (
                                <th key={col.baseName} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                    {col.fieldLabel}
                                    {col.isRequired && <span className="ml-0.5 text-destructive">*</span>}
                                </th>
                            ))}
                            <th className="w-10 px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rowCount }).map((_, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`border-b last:border-b-0 ${rowIndex >= maxSlots ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                            >
                                <td className="px-3 py-1.5 text-xs text-muted-foreground">{rowIndex + 1}</td>
                                {columns.map((col) => (
                                    <td key={col.baseName} className="px-3 py-1.5">
                                        <Input
                                            type={col.fieldType === 'date' ? 'date' : 'text'}
                                            value={getCellValue(rowIndex, col)}
                                            onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </td>
                                ))}
                                <td className="px-2 py-1.5">
                                    {rowCount > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveRow(rowIndex)}
                                        >
                                            <X className="size-3.5" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rowCount > maxSlots && (
                <div className="border-t bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                    Rows beyond {maxSlots} will generate overflow pages in the PDF.
                </div>
            )}
        </div>
    );
}

function FieldInput({
    field,
    value,
    onChange,
    hasError,
    isAutoMapped,
    repeatCount,
}: {
    field: PdfTemplateField;
    value: string;
    onChange: (val: string) => void;
    hasError?: boolean;
    isAutoMapped?: boolean;
    repeatCount?: number;
}) {
    const labelContent = (
        <span className="flex items-center gap-1">
            {field.field_label}
            {field.is_required && <span className="text-destructive">*</span>}
            {repeatCount && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" size="sm" className="ml-0.5 text-[10px] px-1 py-0 h-4 cursor-default">
                            x{repeatCount}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        Fills {repeatCount} identical fields in the PDF
                    </TooltipContent>
                </Tooltip>
            )}
            {isAutoMapped && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Zap className="size-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                        Auto-filled from lead data ({field.lead_field_mapping})
                    </TooltipContent>
                </Tooltip>
            )}
        </span>
    );

    if (field.field_type === 'checkbox') {
        return (
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={value === 'true' || value === '1' || value === 'yes'}
                    onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
                />
                <Label className="text-sm">{labelContent}</Label>
            </div>
        );
    }

    if (field.field_type === 'dropdown' && field.field_options) {
        return (
            <div>
                <Label className="text-xs">{labelContent}</Label>
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {field.field_options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                                {opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {hasError && <p className="mt-1 text-xs text-destructive">This field is required</p>}
            </div>
        );
    }

    if (field.field_type === 'radio' && field.field_options) {
        return (
            <div>
                <Label className="text-xs">{labelContent}</Label>
                <div className={`mt-1 flex flex-wrap gap-3 ${hasError ? 'rounded-md ring-1 ring-destructive p-2' : ''}`}>
                    {field.field_options.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                                type="radio"
                                name={field.field_name}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => onChange(e.target.value)}
                                className="accent-primary"
                            />
                            {opt}
                        </label>
                    ))}
                </div>
                {hasError && <p className="mt-1 text-xs text-destructive">This field is required</p>}
            </div>
        );
    }

    return (
        <div>
            <Label className="text-xs">{labelContent}</Label>
            <Input
                type={field.field_type === 'date' ? 'date' : 'text'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`h-9 ${hasError ? 'border-destructive' : ''}`}
            />
            {hasError && <p className="mt-1 text-xs text-destructive">This field is required</p>}
        </div>
    );
}
