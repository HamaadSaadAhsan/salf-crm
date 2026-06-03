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
import {
    useCreateLeadApplication,
    useDeleteLeadApplication,
    useGenerateLeadApplicationForms,
    useLeadApplicationGenerations,
    useLeadApplications,
    useLeadProgramSchema,
    useLeadPrograms,
    useUpdateLeadApplication,
    type Generation,
    type LeadApplication,
    type LeadProgram,
    type ProgramSchema,
} from '@/hooks/useFormsAutomation';
import {
    Stepper,
    StepperContent,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, Download, FileText, Loader2, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import axios from '@/lib/http';

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
    const [formsView, setFormsView] = useState<null | { mode: 'new' } | { mode: 'edit'; application: LeadApplication }>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [generating, setGenerating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<LeadPdfSubmission | null>(null);
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
    const [autoMappedFields, setAutoMappedFields] = useState<Set<string>>(new Set());

    const templates = useMemo(() => (templatesData as { data: PdfTemplate[] } | undefined)?.data ?? [], [templatesData]);
    const submissions = useMemo(() => (submissionsData as { data: LeadPdfSubmission[] } | undefined)?.data ?? [], [submissionsData]);

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
        axios.get<{ data: PdfTemplate }>(`/api/leads/${leadId}/pdf-templates/${template.id}`).then((res) => {
            setView({ mode: 'fill', template: res.data.data, submissionId: null });
            setValidationErrors(new Set());
        });
    }, [leadId]);

    const handleEditSubmission = useCallback((submission: LeadPdfSubmission) => {
        axios.get<{ data: PdfTemplate }>(`/api/leads/${leadId}/pdf-templates/${submission.template.id}`).then((res) => {
            setView({ mode: 'fill', template: res.data.data, submissionId: submission.id });
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
                    onSuccess: (data: unknown) => {
                        setView({ ...view, submissionId: (data as { data: { id: number } }).data.id });
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
                setView({ ...view, submissionId: (result as { data: { id: number } }).data.id });
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

    if (formsView !== null) {
        return (
            <LeadFormsFillView
                lead={lead}
                viewMode={formsView}
                onBack={() => setFormsView(null)}
            />
        );
    }

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

            {/* Forms Automation */}
            <div>
                <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Forms Automation</span>
                    <div className="h-px flex-1 bg-border" />
                </div>
                <LeadFormsListSection
                    lead={lead}
                    onNew={() => setFormsView({ mode: 'new' })}
                    onEdit={(application) => setFormsView({ mode: 'edit', application })}
                />
            </div>

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

// ─────────────────────────────────────────────────────────────────────────────
// Forms Automation — list section
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
    approved: 'success',
    submitted: 'info',
    in_progress: 'warning',
    rejected: 'destructive',
    draft: 'secondary',
    archived: 'secondary',
};

function LeadFormsListSection({
    lead,
    onNew,
    onEdit,
}: {
    lead: Lead;
    onNew: () => void;
    onEdit: (application: LeadApplication) => void;
}) {
    const leadId = String(lead.id);
    const { data: applicationsResult, isLoading } = useLeadApplications(leadId);
    const deleteApp = useDeleteLeadApplication(leadId);
    const [deleteTarget, setDeleteTarget] = useState<LeadApplication | null>(null);

    const applications = (applicationsResult as { data: LeadApplication[] } | undefined)?.data ?? [];

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Applications</h3>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onNew}>
                    <Plus className="mr-1 size-3" />
                    New Application
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <SubmissionRowSkeleton key={i} />
                    ))}
                </div>
            ) : applications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <FileText className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No applications yet.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={onNew}>
                        <Plus className="mr-1 size-3.5" />
                        Start Application
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{app.program.name}</p>
                                        <Badge
                                            variant={STATUS_VARIANT[app.status] ?? 'secondary'}
                                            appearance="light"
                                            size="sm"
                                        >
                                            {app.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {app.application_code}
                                        {app.main_applicant_name && ` · ${app.main_applicant_name}`}
                                        {app.generations_count > 0 &&
                                            ` · ${app.generations_count} generation${app.generations_count > 1 ? 's' : ''}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onEdit(app)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTarget(app)}
                                >
                                    <Trash2 className="size-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Application</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete "{deleteTarget?.application_code}"? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (deleteTarget) {
                                    deleteApp.mutate(deleteTarget.id, {
                                        onSuccess: () => setDeleteTarget(null),
                                    });
                                }
                            }}
                            disabled={deleteApp.isPending}
                        >
                            {deleteApp.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forms Automation — fill view (program selection + field entry)
// ─────────────────────────────────────────────────────────────────────────────

interface LeadInfoField {
    path: string;
    label: string;
    type?: string;
    section?: string;
    options?: string[];
}

const LEAD_INFO_FIELDS: LeadInfoField[] = [
    // ── Personal Information ──────────────────────────────────────────────
    { section: 'Personal Information', path: 'main_applicant.given_name', label: 'First / Given Name' },
    { path: 'main_applicant.surname', label: 'Surname / Family Name' },
    { path: 'main_applicant.middle_name', label: 'Middle Name' },
    { path: 'main_applicant.other_names', label: 'Other Names' },
    { path: 'main_applicant.mothers_maiden_name', label: "Mother's Maiden Name" },
    { path: 'main_applicant.name_local_script', label: 'Name in Local Script' },
    { path: 'main_applicant.dob', label: 'Date of Birth', type: 'date' },
    { path: 'main_applicant.place_of_birth', label: 'Place of Birth' },
    { path: 'main_applicant.country_of_birth', label: 'Country of Birth' },
    { path: 'main_applicant.nationality', label: 'Nationality' },
    { path: 'main_applicant.gender', label: 'Gender', options: ['Male', 'Female'] },
    { path: 'main_applicant.marital_status', label: 'Marital Status' },
    { path: 'main_applicant.is_sponsored', label: 'Is Sponsored' },

    // ── Contact Information ───────────────────────────────────────────────
    { section: 'Contact Information', path: 'main_applicant.email', label: 'Email Address', type: 'email' },
    { path: 'main_applicant.phone_mobile', label: 'Mobile Phone', type: 'tel' },
    { path: 'main_applicant.phone_home', label: 'Home Phone', type: 'tel' },
    { path: 'main_applicant.phone_work', label: 'Work Phone', type: 'tel' },
    { path: 'main_applicant.fax', label: 'Fax', type: 'tel' },

    // ── Employment ────────────────────────────────────────────────────────
    { section: 'Employment', path: 'main_applicant.occupation_by_training', label: 'Occupation by Training' },
    { path: 'main_applicant.current_occupation', label: 'Current Occupation' },
    { path: 'main_applicant.employer_name', label: 'Employer Name' },
    { path: 'main_applicant.employer_address', label: 'Employer Address' },

    // ── Financial ─────────────────────────────────────────────────────────
    { section: 'Financial', path: 'main_applicant.annual_income', label: 'Annual Income' },
    { path: 'main_applicant.net_worth', label: 'Net Worth' },
    { path: 'main_applicant.source_of_funds', label: 'Source of Funds' },

    // ── Identity Documents ────────────────────────────────────────────────
    { section: 'Identity Documents', path: 'main_applicant.has_other_citizenship', label: 'Has Other Citizenship (Yes/No)' },
    { path: 'main_applicant.national_id_number', label: 'National ID Number' },
    { path: 'main_applicant.national_id_country', label: 'National ID Country' },
    { path: 'main_applicant.national_id_number_2', label: 'National ID Number 2' },
    { path: 'main_applicant.national_id_country_2', label: 'National ID Country 2' },
    { path: 'main_applicant.drivers_licence_number', label: "Driver's Licence Number" },
    { path: 'main_applicant.drivers_licence_country', label: "Driver's Licence Country" },

    // ── Primary Passport (number captured in step 1) ──────────────────────
    { section: 'Primary Passport', path: 'main_applicant.passport_1.country_of_issue', label: 'Country of Issue' },
    { path: 'main_applicant.passport_1.date_of_issue', label: 'Date of Issue', type: 'date' },
    { path: 'main_applicant.passport_1.date_of_expiry', label: 'Date of Expiry', type: 'date' },

    // ── Second Passport ───────────────────────────────────────────────────
    { section: 'Second Passport', path: 'main_applicant.passport_2.number', label: 'Passport Number' },
    { path: 'main_applicant.passport_2.country_of_issue', label: 'Country of Issue' },
    { path: 'main_applicant.passport_2.date_of_issue', label: 'Date of Issue', type: 'date' },
    { path: 'main_applicant.passport_2.date_of_expiry', label: 'Date of Expiry', type: 'date' },

    // ── Residential Address ───────────────────────────────────────────────
    { section: 'Residential Address', path: 'main_applicant.address_residential.full_address', label: 'Full Address' },
    { path: 'main_applicant.address_residential.city', label: 'City' },
    { path: 'main_applicant.address_residential.state_province', label: 'State / Province' },
    { path: 'main_applicant.address_residential.country', label: 'Country' },
    { path: 'main_applicant.address_residential.postal_code', label: 'Postal Code' },
    { path: 'main_applicant.address_residential.date_since_month', label: 'Date Since (Month MM)' },
    { path: 'main_applicant.address_residential.date_since_year', label: 'Date Since (Year YYYY)' },

    // ── Permanent Residential Address ─────────────────────────────────────
    { section: 'Permanent Residential Address', path: 'main_applicant.address_permanent.full_address', label: 'Full Address' },
    { path: 'main_applicant.address_permanent.city', label: 'City' },
    { path: 'main_applicant.address_permanent.state_province', label: 'State / Province' },
    { path: 'main_applicant.address_permanent.country', label: 'Country' },
    { path: 'main_applicant.address_permanent.postal_code', label: 'Postal Code' },
    { path: 'main_applicant.address_permanent.date_since_month', label: 'Date Since (Month MM)' },
    { path: 'main_applicant.address_permanent.date_since_year', label: 'Date Since (Year YYYY)' },

];

const LEAD_INFO_SECTIONS: { label: string; fields: LeadInfoField[] }[] = (() => {
    const sections: { label: string; fields: LeadInfoField[] }[] = [];
    for (const field of LEAD_INFO_FIELDS) {
        if (field.section) {
            sections.push({ label: field.section, fields: [field] });
        } else {
            sections[sections.length - 1]?.fields.push(field);
        }
    }
    return sections;
})();

const EMPLOYMENT_HISTORY_FIELDS: { path: string; label: string; placeholder?: string }[] = [
    { path: 'period_start', label: 'From', placeholder: 'MM/YYYY' },
    { path: 'period_end', label: 'To', placeholder: 'MM/YYYY or Present' },
    { path: 'employer_name', label: 'Employer Name' },
    { path: 'position', label: 'Position / Title' },
    { path: 'address', label: 'Address' },
    { path: 'business_type', label: 'Type of Business' },
    { path: 'reason_leaving', label: 'Reason for Leaving' },
];

const ADDRESS_HISTORY_FIELDS: { path: string; label: string; placeholder?: string }[] = [
    { path: 'from', label: 'Date From (MM/YYYY)', placeholder: 'e.g. 01/2015' },
    { path: 'to', label: 'Date To (MM/YYYY)', placeholder: 'e.g. 12/2020 or Present' },
    { path: 'address', label: 'Full Address (street, town, postal code, country)', placeholder: 'e.g. 73-A Ahmed Block, Garden Town, Lahore, Pakistan' },
];

const CHILD_FIELDS: { path: string; label: string; type?: string; options?: string[] }[] = [
    { path: 'given_names', label: 'Given Names' },
    { path: 'surname', label: 'Surname' },
    { path: 'dob', label: 'Date of Birth', type: 'date' },
    { path: 'gender', label: 'Gender', options: ['Male', 'Female'] },
    { path: 'nationality', label: 'Nationality' },
    { path: 'place_of_birth', label: 'Place of Birth' },
];

function childAge(dob: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function countFilledHistoryEntries(data: Record<string, unknown>, prefix: string, max: number): number {
    for (let i = max; i >= 1; i--) {
        const keyPrefix = `${prefix}${i}.`;
        if (Object.keys(data).some((k) => k.startsWith(keyPrefix) && data[k] !== '' && data[k] !== undefined)) {
            return i;
        }
    }
    return 1;
}

function LeadFormsFillView({
    lead,
    viewMode,
    onBack,
}: {
    lead: Lead;
    viewMode: { mode: 'new' } | { mode: 'edit'; application: LeadApplication };
    onBack: () => void;
}) {
    const leadId = String(lead.id);
    const initialApp = viewMode.mode === 'edit' ? viewMode.application : null;

    const [currentApplicationId, setCurrentApplicationId] = useState<number | null>(initialApp?.id ?? null);
    const [applicationCode, setApplicationCode] = useState<string | null>(initialApp?.application_code ?? null);
    const [programId, setProgramId] = useState<number | null>(initialApp?.program.id ?? null);
    const [applicantName, setApplicantName] = useState(initialApp?.main_applicant_name ?? lead.name ?? '');
    const [passport, setPassport] = useState(initialApp?.main_applicant_passport ?? '');
    const [formData, setFormData] = useState<Record<string, unknown>>(initialApp?.data ?? {});
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [currentStep, setCurrentStep] = useState(1);
    const [isSavingStep, setIsSavingStep] = useState(false);
    const [employmentCount, setEmploymentCount] = useState(() =>
        countFilledHistoryEntries(initialApp?.data ?? {}, 'main_applicant.employment_history_', 6),
    );
    const [addrHistCount, setAddrHistCount] = useState(() =>
        countFilledHistoryEntries(initialApp?.data ?? {}, 'main_applicant.residence_history_', 7),
    );
    const [hasSpouse, setHasSpouse] = useState(() => {
        const d = initialApp?.data ?? {};
        return !!(d['main_applicant.spouse.given_names'] || d['main_applicant.spouse.surname']);
    });
    const [hasChildren, setHasChildren] = useState(() => !!initialApp?.data?.['main_applicant.child_1.given_names']);
    const [childCount, setChildCount] = useState(() => {
        const d = initialApp?.data ?? {};
        if (!d['main_applicant.child_1.given_names']) return 1;
        return countFilledHistoryEntries(d as Record<string, unknown>, 'main_applicant.child_', 6);
    });

    const { data: programsRaw, isLoading: loadingPrograms } = useLeadPrograms(leadId);
    const { data: schemaRaw, isLoading: loadingSchema } = useLeadProgramSchema(leadId, programId);
    const { data: generationsRaw } = useLeadApplicationGenerations(leadId, currentApplicationId);

    const createApp = useCreateLeadApplication(leadId);
    const updateApp = useUpdateLeadApplication(leadId);
    const generateApp = useGenerateLeadApplicationForms(leadId);

    const programs = (programsRaw as { data: LeadProgram[] } | undefined)?.data ?? [];
    const generations = (generationsRaw as { data: Generation[] } | undefined)?.data ?? [];
    const schemaData = schemaRaw as ProgramSchema | undefined;

    const displayProgramName =
        initialApp?.program.name ?? programs.find((p: LeadProgram) => p.id === programId)?.name ?? '';

    // Open first section when schema loads
    useEffect(() => {
        if (schemaData?.sections?.length && expandedSections.size === 0) {
            setExpandedSections(new Set([schemaData.sections[0].key]));
        }
    }, [schemaData, expandedSections.size]);

    const toggleSection = useCallback((key: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const allSteps = useMemo(() => {
        const steps: { key: string; label: string }[] = [
            { key: 'applicant_info', label: 'Applicant Info' },
            { key: 'main_applicant', label: 'Main Applicant' },
            { key: 'dependents', label: 'Dependents' },
        ];
        if (schemaData?.sections) {
            // Skip 'main_applicant' section — covered by the fixed 'Main Applicant' step
            for (const section of schemaData.sections) {
                if (section.key !== 'main_applicant') {
                    steps.push({ key: section.key, label: section.label });
                }
            }
        }
        return steps;
    }, [schemaData]);

    const totalSteps = allSteps.length;
    const isLastStep = currentStep === totalSteps;

    const handleSaveAndNext = useCallback(async () => {
        if (!programId) return;
        setIsSavingStep(true);
        try {
            const payload = {
                main_applicant_name: applicantName || undefined,
                main_applicant_passport: passport || undefined,
                data: formData as Record<string, unknown>,
            };
            if (currentApplicationId) {
                await updateApp.mutateAsync({ applicationId: currentApplicationId, ...payload });
            } else {
                const res = await createApp.mutateAsync({ program_id: programId, ...payload });
                const created = res as { data: { id: number; application_code: string } };
                setCurrentApplicationId(created.data.id);
                setApplicationCode(created.data.application_code);
            }
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
        } finally {
            setIsSavingStep(false);
        }
    }, [programId, applicantName, passport, formData, currentApplicationId, createApp, updateApp, totalSteps]);

    const handleSave = useCallback(() => {
        const payload = {
            main_applicant_name: applicantName || undefined,
            main_applicant_passport: passport || undefined,
            data: formData as Record<string, unknown>,
        };

        if (currentApplicationId) {
            updateApp.mutate({ applicationId: currentApplicationId, ...payload });
        } else if (programId) {
            createApp.mutate(
                { program_id: programId, ...payload },
                {
                    onSuccess: (res) => {
                        const created = res as { data: { id: number; application_code: string } };
                        setCurrentApplicationId(created.data.id);
                        setApplicationCode(created.data.application_code);
                    },
                },
            );
        }
    }, [currentApplicationId, programId, applicantName, passport, formData, createApp, updateApp]);

    const handleGenerate = useCallback(() => {
        if (currentApplicationId) {
            generateApp.mutate(currentApplicationId);
        }
    }, [currentApplicationId, generateApp]);

    const isSaving = createApp.isPending || updateApp.isPending;

    // Program selection screen (new mode only, before program is chosen)
    if (!programId) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <h3 className="text-sm font-medium">Select Program</h3>
                </div>
                {loadingPrograms ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <TemplateCardSkeleton key={i} />
                        ))}
                    </div>
                ) : programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active programs available.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {programs.map((p: LeadProgram) => (
                            <button
                                key={p.id}
                                onClick={() => setProgramId(p.id)}
                                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                            >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <FileText className="size-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className="text-xs uppercase text-muted-foreground">{p.code}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h3 className="text-sm font-medium">{displayProgramName || 'Application'}</h3>
                        {applicationCode && (
                            <p className="text-xs text-muted-foreground">{applicationCode}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {currentApplicationId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={generateApp.isPending}
                        >
                            {generateApp.isPending ? (
                                <Loader2 className="mr-1 size-3.5 animate-spin" />
                            ) : (
                                <Zap className="mr-1 size-3.5" />
                            )}
                            Generate
                        </Button>
                    )}
                    <Button size="sm" onClick={handleSave} disabled={isSaving || !programId}>
                        {isSaving ? (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                        ) : (
                            <Save className="mr-1 size-3.5" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            {/* Stepper */}
            <Stepper
                value={currentStep}
                onValueChange={setCurrentStep}
                indicators={{ completed: <Check className="size-3" /> }}
            >
                <StepperNav className="mb-6">
                    {allSteps.map((step, idx) => (
                        <StepperItem key={step.key} step={idx + 1}>
                            <StepperTrigger className="flex-col items-center gap-1.5 sm:flex-row">
                                <StepperIndicator>{idx + 1}</StepperIndicator>
                                <StepperTitle className="hidden text-xs sm:block">{step.label}</StepperTitle>
                            </StepperTrigger>
                            {idx < allSteps.length - 1 && <StepperSeparator />}
                        </StepperItem>
                    ))}
                </StepperNav>

                {/* Step 1: Applicant Info */}
                <StepperContent value={1}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <Label className="text-xs">Main Applicant Name</Label>
                            <Input
                                value={applicantName}
                                onChange={(e) => setApplicantName(e.target.value)}
                                className="h-9"
                                placeholder={lead.name}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Passport Number</Label>
                            <Input
                                value={passport}
                                onChange={(e) => setPassport(e.target.value)}
                                className="h-9"
                                placeholder="e.g. AB1234567"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Country of Issue</Label>
                            <Input
                                value={(formData['main_applicant.passport_1.country_of_issue'] as string) ?? ''}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, 'main_applicant.passport_1.country_of_issue': e.target.value }))
                                }
                                className="h-9"
                                placeholder="e.g. Pakistan"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Date of Birth</Label>
                            <Input
                                type="date"
                                value={(formData['main_applicant.dob'] as string) ?? ''}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, 'main_applicant.dob': e.target.value }))
                                }
                                className="h-9"
                            />
                        </div>
                    </div>
                </StepperContent>

                {/* Step 2: Main Applicant */}
                <StepperContent value={2}>
                    <div className="space-y-5">
                        {/* Static sections */}
                        {LEAD_INFO_SECTIONS.map((sec) => (
                            <div key={sec.label}>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {sec.label}
                                </h4>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {sec.fields.map((field) => (
                                        <div key={field.path}>
                                            <Label className="text-xs">{field.label}</Label>
                                            {field.options ? (
                                                <select
                                                    value={(formData[field.path] as string) ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, [field.path]: e.target.value }))
                                                    }
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="">Select…</option>
                                                    {field.options.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Input
                                                    type={field.type ?? 'text'}
                                                    value={(formData[field.path] as string) ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, [field.path]: e.target.value }))
                                                    }
                                                    className="h-9"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Employment History repeater (max 6) */}
                        <div>
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Employment History
                            </h4>
                            <p className="mb-3 text-xs text-muted-foreground">List previous employment — most recent first.</p>
                            <div className="space-y-3">
                                {Array.from({ length: employmentCount }, (_, i) => i + 1).map((n) => (
                                    <div key={n} className="rounded-md border border-border bg-muted/20 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Position {n}
                                            </span>
                                            {n === employmentCount && employmentCount > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-destructive"
                                                    onClick={() => {
                                                        const keyPrefix = `main_applicant.employment_history_${n}.`;
                                                        setFormData((prev) => {
                                                            const next = { ...prev };
                                                            for (const key of Object.keys(next)) {
                                                                if (key.startsWith(keyPrefix)) delete next[key];
                                                            }
                                                            return next;
                                                        });
                                                        setEmploymentCount((prev) => prev - 1);
                                                    }}
                                                >
                                                    <Trash2 className="mr-1 size-3" /> Remove
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {EMPLOYMENT_HISTORY_FIELDS.map((field) => {
                                                const fullPath = `main_applicant.employment_history_${n}.${field.path}`;
                                                return (
                                                    <div key={fullPath}>
                                                        <Label className="text-xs">{field.label}</Label>
                                                        <Input
                                                            value={(formData[fullPath] as string) ?? ''}
                                                            placeholder={field.placeholder}
                                                            onChange={(e) =>
                                                                setFormData((prev) => ({ ...prev, [fullPath]: e.target.value }))
                                                            }
                                                            className="h-9"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {employmentCount < 6 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => setEmploymentCount((prev) => prev + 1)}
                                >
                                    <Plus className="mr-1 size-3" />
                                    Add Employment Entry
                                </Button>
                            )}
                        </div>

                        {/* Address History repeater (max 7) */}
                        <div>
                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Address History
                            </h4>
                            <p className="mb-3 text-xs text-muted-foreground">List all addresses for the last 10 years — no gaps in history.</p>
                            <div className="space-y-3">
                                {Array.from({ length: addrHistCount }, (_, i) => i + 1).map((n) => (
                                    <div key={n} className="rounded-md border border-border bg-muted/20 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Address {n}
                                            </span>
                                            {n === addrHistCount && addrHistCount > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-destructive"
                                                    onClick={() => {
                                                        const keyPrefix = `main_applicant.residence_history_${n}.`;
                                                        setFormData((prev) => {
                                                            const next = { ...prev };
                                                            for (const key of Object.keys(next)) {
                                                                if (key.startsWith(keyPrefix)) delete next[key];
                                                            }
                                                            return next;
                                                        });
                                                        setAddrHistCount((prev) => prev - 1);
                                                    }}
                                                >
                                                    <Trash2 className="mr-1 size-3" /> Remove
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {ADDRESS_HISTORY_FIELDS.map((field) => {
                                                const fullPath = `main_applicant.residence_history_${n}.${field.path}`;
                                                const isFullAddress = field.path === 'address';
                                                return (
                                                    <div key={fullPath} className={isFullAddress ? 'md:col-span-2' : ''}>
                                                        <Label className="text-xs">{field.label}</Label>
                                                        <Input
                                                            value={(formData[fullPath] as string) ?? ''}
                                                            placeholder={field.placeholder}
                                                            onChange={(e) =>
                                                                setFormData((prev) => ({ ...prev, [fullPath]: e.target.value }))
                                                            }
                                                            className="h-9"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {addrHistCount < 7 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => setAddrHistCount((prev) => prev + 1)}
                                >
                                    <Plus className="mr-1 size-3" />
                                    Add Address
                                </Button>
                            )}
                        </div>
                    </div>
                </StepperContent>

                {/* Step 3: Dependents */}
                <StepperContent value={3}>
                    <div className="space-y-6">
                        {/* Spouse */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spouse</h4>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-spouse"
                                    checked={hasSpouse}
                                    onCheckedChange={(v) => {
                                        setHasSpouse(Boolean(v));
                                        if (!v) {
                                            setFormData((prev) => {
                                                const next = { ...prev };
                                                for (const key of Object.keys(next)) {
                                                    if (key.startsWith('main_applicant.spouse.')) delete next[key];
                                                }
                                                return next;
                                            });
                                        }
                                    }}
                                />
                                <Label htmlFor="has-spouse" className="cursor-pointer text-sm font-medium">
                                    Has Spouse (will require a separate D1 form)
                                </Label>
                            </div>

                            {hasSpouse && (
                                <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {[
                                            { path: 'main_applicant.spouse.given_names', label: 'Given Names' },
                                            { path: 'main_applicant.spouse.surname', label: 'Surname' },
                                            { path: 'main_applicant.spouse.dob', label: 'Date of Birth', type: 'date' },
                                        ].map((f) => (
                                            <div key={f.path}>
                                                <Label className="text-xs">{f.label}</Label>
                                                <Input
                                                    type={f.type ?? 'text'}
                                                    value={(formData[f.path] as string) ?? ''}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [f.path]: e.target.value }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {[
                                            { path: 'main_applicant.spouse.nationality', label: 'Nationality' },
                                            { path: 'main_applicant.spouse.occupation', label: 'Occupation' },
                                            { path: 'main_applicant.spouse.employer', label: 'Employer' },
                                        ].map((f) => (
                                            <div key={f.path}>
                                                <Label className="text-xs">{f.label}</Label>
                                                <Input
                                                    value={(formData[f.path] as string) ?? ''}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [f.path]: e.target.value }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                        {[
                                            { path: 'main_applicant.spouse.address', label: 'Address' },
                                            { path: 'main_applicant.spouse.city', label: 'City' },
                                            { path: 'main_applicant.spouse.country', label: 'Country' },
                                            { path: 'main_applicant.spouse.phone_mobile', label: 'Mobile Phone' },
                                        ].map((f) => (
                                            <div key={f.path}>
                                                <Label className="text-xs">{f.label}</Label>
                                                <Input
                                                    value={(formData[f.path] as string) ?? ''}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [f.path]: e.target.value }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Children */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Children</h4>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-children"
                                    checked={hasChildren}
                                    onCheckedChange={(v) => {
                                        setHasChildren(Boolean(v));
                                        if (!v) {
                                            setFormData((prev) => {
                                                const next = { ...prev };
                                                for (const key of Object.keys(next)) {
                                                    if (key.startsWith('main_applicant.child_')) delete next[key];
                                                }
                                                return next;
                                            });
                                            setChildCount(1);
                                        }
                                    }}
                                />
                                <Label htmlFor="has-children" className="cursor-pointer text-sm font-medium">
                                    Has Children
                                </Label>
                            </div>

                            {hasChildren && (
                                <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                                    {Array.from({ length: childCount }, (_, i) => i + 1).map((n) => {
                                        const dobPath = `main_applicant.child_${n}.dob`;
                                        const age = childAge((formData[dobPath] as string) ?? '');
                                        const needsOwnD1 = age !== null && age >= 16;
                                        return (
                                            <div key={n} className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium">Child {n}</span>
                                                        {age !== null && (
                                                            <Badge variant="secondary" className="text-xs">{age} yrs</Badge>
                                                        )}
                                                        {needsOwnD1 && (
                                                            <div className="flex items-center gap-1 text-xs text-amber-600">
                                                                <AlertTriangle className="size-3" />
                                                                Requires own D1
                                                            </div>
                                                        )}
                                                    </div>
                                                    {n === childCount && childCount > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-xs text-destructive"
                                                            onClick={() => {
                                                                const keyPrefix = `main_applicant.child_${n}.`;
                                                                setFormData((prev) => {
                                                                    const next = { ...prev };
                                                                    for (const key of Object.keys(next)) {
                                                                        if (key.startsWith(keyPrefix)) delete next[key];
                                                                    }
                                                                    return next;
                                                                });
                                                                setChildCount((prev) => prev - 1);
                                                            }}
                                                        >
                                                            <Trash2 className="mr-1 size-3" /> Remove
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                    {CHILD_FIELDS.map((field) => {
                                                        const fullPath = `main_applicant.child_${n}.${field.path}`;
                                                        return (
                                                            <div key={fullPath}>
                                                                <Label className="text-xs">{field.label}</Label>
                                                                {field.options ? (
                                                                    <select
                                                                        value={(formData[fullPath] as string) ?? ''}
                                                                        onChange={(e) =>
                                                                            setFormData((prev) => ({ ...prev, [fullPath]: e.target.value }))
                                                                        }
                                                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                                    >
                                                                        <option value="">Select…</option>
                                                                        {field.options.map((opt) => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <Input
                                                                        type={field.type ?? 'text'}
                                                                        value={(formData[fullPath] as string) ?? ''}
                                                                        onChange={(e) =>
                                                                            setFormData((prev) => ({ ...prev, [fullPath]: e.target.value }))
                                                                        }
                                                                        className="h-9"
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {childCount < 6 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setChildCount((prev) => prev + 1)}
                                        >
                                            <Plus className="mr-1 size-3" />
                                            Add Child
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </StepperContent>

                {/* Schema section steps (start from step 4, skip 'main_applicant') */}
                {loadingSchema && currentStep > 3 ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : (
                    schemaData?.sections
                        ?.filter((s) => s.key !== 'main_applicant')
                        .map((section, idx) => {
                        const filledCount = section.fields.filter(
                            (f) => formData[f.path] !== undefined && formData[f.path] !== '',
                        ).length;

                        return (
                            <StepperContent key={section.key} value={idx + 4}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-muted-foreground">{section.label}</h4>
                                        <span className="text-xs text-muted-foreground">
                                            {filledCount} / {section.fields.length} filled
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {section.fields.map((field) => (
                                            <div key={field.path}>
                                                <Label className="text-xs">{field.label}</Label>
                                                <Input
                                                    value={(formData[field.path] as string) ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            [field.path]: e.target.value,
                                                        }))
                                                    }
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </StepperContent>
                        );
                    })
                )}
            </Stepper>

            {/* Step navigation */}
            <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        if (currentStep === 1) {
                            onBack();
                        } else {
                            setCurrentStep((prev) => prev - 1);
                        }
                    }}
                >
                    <ArrowLeft className="mr-1 size-3.5" />
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                </Button>

                {isLastStep ? (
                    <Button size="sm" onClick={handleSave} disabled={isSaving || !programId}>
                        {isSaving ? (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                        ) : (
                            <Save className="mr-1 size-3.5" />
                        )}
                        Save &amp; Finish
                    </Button>
                ) : (
                    <Button size="sm" onClick={handleSaveAndNext} disabled={isSavingStep || loadingSchema || !programId}>
                        {isSavingStep ? (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                        ) : null}
                        Next
                        <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                )}
            </div>

            {/* Generations */}
            {currentApplicationId && <FormsGenerationsPanel leadId={leadId} generations={generations} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forms Automation — generations panel
// ─────────────────────────────────────────────────────────────────────────────

const GENERATION_STATUS_VARIANT: Record<
    string,
    'success' | 'warning' | 'destructive' | 'secondary'
> = {
    completed: 'success',
    running: 'warning',
    pending: 'secondary',
    failed: 'destructive',
};

function FormsGenerationsPanel({
    leadId,
    generations,
}: {
    leadId: string;
    generations: Generation[];
}) {
    return (
        <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Generated Forms
                </h4>
            </div>
            {generations.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                    No generations yet. Click "Generate" to create filled PDF forms.
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {generations.map((gen) => (
                        <div key={gen.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                {(gen.status === 'pending' || gen.status === 'running') && (
                                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">
                                            {new Date(gen.created_at).toLocaleDateString()}{' '}
                                            {new Date(gen.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <Badge
                                            variant={GENERATION_STATUS_VARIANT[gen.status] ?? 'secondary'}
                                            appearance="light"
                                            size="sm"
                                        >
                                            {gen.status}
                                        </Badge>
                                        {gen.file_count > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                {gen.file_count} file{gen.file_count > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {gen.generated_by && (
                                        <p className="text-xs text-muted-foreground">
                                            by {gen.generated_by.name}
                                        </p>
                                    )}
                                    {gen.error_message && (
                                        <p className="text-xs text-destructive">{gen.error_message}</p>
                                    )}
                                </div>
                            </div>
                            {gen.status === 'completed' && gen.output_path && (
                                <a
                                    href={`/api/leads/${leadId}/forms/generations/${gen.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
                                >
                                    <Download className="size-3" />
                                    Download
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
