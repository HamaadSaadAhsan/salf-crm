import { Content } from '@/crm/layout/components/content';
import {
    useCreatePdfTemplate,
    useDeletePdfTemplate,
    usePdfTemplate,
    usePdfTemplates,
    useSavePdfTemplateFields,
    useScanPdfTemplate,
    useUpdatePdfTemplate,
} from '@/hooks/usePdfTemplates';
import AppLayout from '@/layouts/app-layout';
import { mergeSimilarRepeatGroupColumns, stripNumericSuffix, LEAD_FIELD_MAPPINGS } from '@/lib/pdf-utils';
import type { ScannedPdfFieldResponse } from '@/types/pdf-template';
import type { BreadcrumbItem, SharedData } from '@/types';
import type { PdfTemplate, PdfTemplateField } from '@/types/pdf-template';
import { Head, usePage } from '@inertiajs/react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChevronDown,
    ChevronRight,
    EllipsisVertical,
    FileText,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Repeat,
    Search,
    Settings2,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Management Settings', href: '/settings/management' },
    { title: 'PDF Templates', href: '/settings/management/pdf-templates' },
];

/**
 * Convert Python scanner response into flat EditableField array.
 * Each raw field becomes one entry — deduplication happens later.
 */
function scanResponseToFields(scan: ScannedPdfFieldResponse): EditableField[] {
    return scan.fields.map((f, i) => {
        const label = f.base_name.replace(/[_.-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return {
            field_name: f.raw_name,
            field_label: label,
            field_type: f.type as EditableField['field_type'],
            field_options: f.field_options ?? null,
            lead_field_mapping: '',
            default_value: f.value ?? '',
            sort_order: i,
            page_number: f.page_number,
            section: f.section,
            repeat_group: f.repeat_group,
            is_required: false,
        };
    });
}

/**
 * Merge scan results with existing field configs, preserving user overrides
 * (labels, mappings, default values, required flags).
 */
function mergeScanWithExisting(scan: ScannedPdfFieldResponse, existing: EditableField[]): EditableField[] {
    // Index existing fields by raw name and base name for lookup
    const existingByName = new Map<string, EditableField>();
    for (const f of existing) {
        existingByName.set(f.field_name, f);
    }
    const existingByBase = new Map<string, EditableField>();
    for (const f of existing) {
        const base = stripNumericSuffix(f.field_name);
        if (!existingByBase.has(base)) {
            existingByBase.set(base, f);
        }
    }

    return scan.fields.map((f, i) => {
        const match = existingByName.get(f.raw_name) ?? existingByBase.get(f.base_name);
        const label = match?.field_label ?? f.base_name.replace(/[_.-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return {
            field_name: f.raw_name,
            field_label: label,
            field_type: (match?.field_type ?? f.type) as EditableField['field_type'],
            field_options: f.field_options ?? match?.field_options ?? null,
            lead_field_mapping: match?.lead_field_mapping ?? '',
            default_value: match?.default_value ?? f.value ?? '',
            sort_order: i,
            page_number: f.page_number,
            section: f.section,
            repeat_group: f.repeat_group,
            is_required: match?.is_required ?? false,
        };
    });
}

function TemplateCardSkeleton() {
    return (
        <div className="flex flex-col rounded-lg border border-border bg-card">
            <div className="flex items-start gap-3 p-4 pb-0">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="mt-3 px-4">
                <Skeleton className="h-3 w-full" />
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2.5 mt-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-7 w-16 rounded-md" />
            </div>
        </div>
    );
}

export default function PdfTemplatesPage() {
    const { services } = usePage<SharedData>().props;
    const { data: templatesData, isLoading } = usePdfTemplates();
    const createTemplate = useCreatePdfTemplate();
    const updateTemplate = useUpdatePdfTemplate();
    const deleteTemplate = useDeletePdfTemplate();
    const saveFields = useSavePdfTemplateFields();
    const scanTemplate = useScanPdfTemplate();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showFieldsDialog, setShowFieldsDialog] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [editingFields, setEditingFields] = useState<EditableField[]>([]);
    const [rescanning, setRescanning] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PdfTemplate | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [fieldsSearchQuery, setFieldsSearchQuery] = useState('');
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Create form state
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        service_id: '',
        file: null as File | null,
    });

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        service_id: '',
        is_active: true,
    });

    // Drag-drop state
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const templates = useMemo(() => templatesData?.data ?? [], [templatesData]);
    const { data: selectedTemplateData } = usePdfTemplate(selectedTemplateId);
    const selectedTemplate = selectedTemplateData?.data;

    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return templates;
        const q = searchQuery.toLowerCase();
        return templates.filter((t) => t.name.toLowerCase().includes(q));
    }, [templates, searchQuery]);

    // Defer fields so dialog shell renders instantly
    const deferredEditingFields = useDeferredValue(editingFields);
    const isFieldsStale = deferredEditingFields !== editingFields;

    // Fields filtered by search — preserves original index for updateField
    const filteredEditingFields = useMemo(() => {
        if (!fieldsSearchQuery.trim()) return deferredEditingFields.map((f, i) => ({ field: f, index: i }));
        const q = fieldsSearchQuery.toLowerCase();
        return deferredEditingFields
            .map((f, i) => ({ field: f, index: i }))
            .filter(({ field }) => field.field_name.toLowerCase().includes(q) || field.field_label.toLowerCase().includes(q));
    }, [deferredEditingFields, fieldsSearchQuery]);

    // Group filtered fields by section for rendering
    const sectionGroupedFields = useMemo(() => {
        const groups: { section: string; fields: { field: EditableField; index: number }[] }[] = [];
        const sectionMap = new Map<string, { field: EditableField; index: number }[]>();
        const sectionOrder: string[] = [];

        for (const entry of filteredEditingFields) {
            const section = entry.field.section || 'Unsorted';
            if (!sectionMap.has(section)) {
                sectionMap.set(section, []);
                sectionOrder.push(section);
            }
            sectionMap.get(section)!.push(entry);
        }

        for (const section of sectionOrder) {
            groups.push({ section, fields: sectionMap.get(section)! });
        }

        return groups;
    }, [filteredEditingFields]);

    // Populate edit form when editingTemplate changes
    useEffect(() => {
        if (editingTemplate) {
            setEditForm({
                name: editingTemplate.name,
                description: editingTemplate.description ?? '',
                service_id: editingTemplate.service ? String(editingTemplate.service.id) : '',
                is_active: editingTemplate.is_active,
            });
        }
    }, [editingTemplate]);

    // When selected template loads, populate fields (deduplicated)
    useEffect(() => {
        if (selectedTemplate?.fields && selectedTemplate.fields.length > 0) {
            const rawFields: EditableField[] = selectedTemplate.fields.map((f) => ({
                field_name: f.field_name,
                field_label: f.field_label,
                field_type: f.field_type,
                field_options: f.field_options,
                lead_field_mapping: f.lead_field_mapping ?? '',
                default_value: f.default_value ?? '',
                sort_order: f.sort_order,
                page_number: f.page_number,
                section: f.section,
                repeat_group: f.repeat_group,
                is_required: f.is_required,
            }));
            setEditingFields(deduplicateFields(rawFields));
        }
    }, [selectedTemplate]);

    const handleCreate = useCallback(async () => {
        if (!createForm.file || !createForm.name) {
            return;
        }

        const formData = new FormData();
        formData.append('name', createForm.name);
        formData.append('file', createForm.file);
        if (createForm.description) {
            formData.append('description', createForm.description);
        }
        if (createForm.service_id) {
            formData.append('service_id', createForm.service_id);
        }

        createTemplate.mutate(formData, {
            onSuccess: async (response) => {
                const templateId = response.data.id;
                setShowCreateDialog(false);
                setCreateForm({ name: '', description: '', service_id: '', file: null });

                // Scan PDF fields via server-side Python scanner
                try {
                    const scan = await scanTemplate.mutateAsync(templateId);
                    if (scan.fields.length > 0) {
                        const fields = scanResponseToFields(scan);
                        saveFields.mutate({ templateId, fields });
                    }
                } catch {
                    // PDF might not have AcroForm fields
                }
            },
        });
    }, [createForm, createTemplate, saveFields, scanTemplate]);

    const handleConfirmDelete = useCallback(() => {
        if (!deleteTarget) return;
        deleteTemplate.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
        });
    }, [deleteTarget, deleteTemplate]);

    const handleEditSave = useCallback(() => {
        if (!editingTemplate) return;
        updateTemplate.mutate(
            {
                id: editingTemplate.id,
                name: editForm.name,
                description: editForm.description || undefined,
                service_id: editForm.service_id ? Number(editForm.service_id) : null,
                is_active: editForm.is_active,
            },
            { onSuccess: () => setEditingTemplate(null) },
        );
    }, [editingTemplate, editForm, updateTemplate]);

    const handleToggleActive = useCallback(
        (template: PdfTemplate, checked: boolean) => {
            updateTemplate.mutate({ id: template.id, is_active: checked });
        },
        [updateTemplate],
    );

    const handleOpenFields = useCallback((templateId: number) => {
        setSelectedTemplateId(templateId);
        setShowFieldsDialog(true);
    }, []);

    const handleSaveFields = useCallback(() => {
        if (!selectedTemplateId) {
            return;
        }

        // Expand deduplicated fields back to individual fields for saving
        const fields: EditableField[] = [];
        let sortIndex = 0;
        for (const f of editingFields) {
            const siblings = f.siblingFieldNames ?? [f.field_name];
            for (const name of siblings) {
                fields.push({
                    ...f,
                    field_name: name,
                    sort_order: sortIndex++,
                    lead_field_mapping: f.lead_field_mapping || '',
                    default_value: f.default_value || '',
                });
            }
        }

        const payload = fields.map(({ siblingFieldNames: _, ...f }) => ({
            ...f,
            lead_field_mapping: f.lead_field_mapping || null,
            default_value: f.default_value || null,
            section: f.section || null,
            repeat_group: f.repeat_group || null,
        }));

        saveFields.mutate(
            { templateId: selectedTemplateId, fields: payload },
            {
                onSuccess: () => {
                    setShowFieldsDialog(false);
                    setSelectedTemplateId(null);
                    setEditingFields([]);
                },
            },
        );
    }, [selectedTemplateId, editingFields, saveFields]);

    const handleRescan = useCallback(async () => {
        if (!selectedTemplateId) {
            return;
        }

        setRescanning(true);
        try {
            const scan = await scanTemplate.mutateAsync(selectedTemplateId);
            const mergedFields = mergeScanWithExisting(scan, editingFields);
            setEditingFields(deduplicateFields(mergedFields));
        } catch {
            toast.error('Failed to re-scan PDF fields');
        } finally {
            setRescanning(false);
        }
    }, [selectedTemplateId, editingFields, scanTemplate]);

    const updateField = useCallback((index: number, updates: Partial<EditableField>) => {
        setEditingFields((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updates };
            return updated;
        });
    }, []);

    const handleRenameSection = useCallback((oldName: string, newName: string) => {
        setEditingFields((prev) =>
            prev.map((f) => (f.section === oldName ? { ...f, section: newName } : f)),
        );
    }, []);

    const toggleSection = useCallback((section: string) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    // Drag-drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setCreateForm((prev) => ({ ...prev, file }));
        } else {
            toast.error('Please drop a PDF file');
        }
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PDF Templates" />
            <Content className="border-b px-5 pt-3 pb-3">
                <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            <h1 className="text-lg font-semibold">PDF Templates</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">Manage PDF form templates for lead document generation</p>
                    </div>
                    <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-1 size-4" />
                        Add Template
                    </Button>
                </div>
            </Content>
            <Content className="flex flex-1 flex-col px-0">
                {isLoading ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <TemplateCardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                ) : templates.length === 0 ? (
                    <Empty className="flex-1 border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FileText />
                            </EmptyMedia>
                            <EmptyTitle>No templates yet</EmptyTitle>
                            <EmptyDescription>Upload a fillable PDF to get started with document generation.</EmptyDescription>
                        </EmptyHeader>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-1 size-4" />
                            Add Template
                        </Button>
                    </Empty>
                ) : (
                    <div className="p-6">
                        {templates.length > 3 && (
                            <div className="mb-4 relative max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search templates..."
                                    className="pl-8 h-9"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="group relative flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-border/80 hover:shadow-sm"
                                >
                                    <div className="flex items-start gap-3 p-4 pb-0">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <FileText className="size-5 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="truncate text-sm font-medium">{template.name}</h3>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="size-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <EllipsisVertical className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                                                            <Pencil className="mr-2 size-4" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleOpenFields(template.id)}>
                                                            <Settings2 className="mr-2 size-4" />
                                                            Configure Fields
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteTarget(template)}
                                                        >
                                                            <Trash2 className="mr-2 size-4" />
                                                            Delete Template
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            {template.service && (
                                                <p className="text-xs text-muted-foreground">{template.service.name}</p>
                                            )}
                                        </div>
                                    </div>
                                    {template.description && (
                                        <p className="mt-1 px-4 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between border-t px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" size="sm">
                                                {template.fields_count} fields
                                            </Badge>
                                            <Switch
                                                size="sm"
                                                checked={template.is_active}
                                                onCheckedChange={(checked) => handleToggleActive(template, !!checked)}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => handleOpenFields(template.id)}
                                        >
                                            <Settings2 className="mr-1 size-3" />
                                            Fields
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredTemplates.length === 0 && searchQuery && (
                            <p className="mt-4 text-center text-sm text-muted-foreground">No templates match "{searchQuery}"</p>
                        )}
                    </div>
                )}
            </Content>

            {/* Delete Confirmation AlertDialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone and will remove all associated field configurations.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteTemplate.isPending}
                        >
                            {deleteTemplate.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Template Dialog */}
            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Template</DialogTitle>
                        <DialogDescription>Update template details and settings.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name">Template Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Program/Service</Label>
                            <Select
                                value={editForm.service_id}
                                onValueChange={(value) => setEditForm({ ...editForm, service_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Programs" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Optional description..."
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-active">Active</Label>
                            <Switch
                                id="edit-active"
                                checked={editForm.is_active}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: !!checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave} disabled={!editForm.name || updateTemplate.isPending}>
                            {updateTemplate.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Template Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add PDF Template</DialogTitle>
                        <DialogDescription>Upload a fillable PDF and configure its fields.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Template Name</Label>
                            <Input
                                id="name"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                placeholder="e.g., Dominica Application Form"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Program/Service</Label>
                            <Select
                                value={createForm.service_id}
                                onValueChange={(value) => setCreateForm({ ...createForm, service_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Programs" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                placeholder="Optional description..."
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>PDF File</Label>
                            {createForm.file ? (
                                <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                                    <FileText className="size-5 text-green-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{createForm.file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(createForm.file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="size-7 p-0"
                                        onClick={() => setCreateForm({ ...createForm, file: null })}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                                        isDragging
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Upload className="mb-2 size-8 text-muted-foreground" />
                                    <p className="text-sm font-medium">
                                        {isDragging ? 'Drop PDF here' : 'Click or drag to upload'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">PDF files only. Form fields will be auto-detected.</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => setCreateForm({ ...createForm, file: e.target.files?.[0] ?? null })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={!createForm.name || !createForm.file || createTemplate.isPending}>
                            {createTemplate.isPending ? (
                                <Loader2 className="mr-1 size-4 animate-spin" />
                            ) : (
                                <Upload className="mr-1 size-4" />
                            )}
                            Create Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fields Configuration Dialog */}
            <Dialog
                open={showFieldsDialog}
                onOpenChange={(open) => {
                    setShowFieldsDialog(open);
                    if (!open) {
                        setSelectedTemplateId(null);
                        setEditingFields([]);
                        setFieldsSearchQuery('');
                    }
                }}
            >
                <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Configure Fields</DialogTitle>
                        <DialogDescription>
                            {selectedTemplate?.name} &middot; {editingFields.length} unique fields
                            {selectedTemplate?.fields && selectedTemplate.fields.length > editingFields.length && (
                                <span className="text-muted-foreground"> ({selectedTemplate.fields.length} total in PDF)</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {editingFields.length === 0 && !isFieldsStale ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                            <FileText className="mb-3 size-10 text-muted-foreground/50" />
                            <p className="text-sm font-medium text-muted-foreground">No fields detected</p>
                            <p className="mt-1 text-xs text-muted-foreground">Try re-scanning the PDF or upload a fillable PDF form.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRescan}
                                disabled={rescanning}
                                className="mt-4"
                            >
                                <RefreshCw className={`mr-1 size-3 ${rescanning ? 'animate-spin' : ''}`} />
                                Re-scan PDF
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar: rescan + search */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRescan}
                                    disabled={rescanning}
                                    className="shrink-0"
                                >
                                    <RefreshCw className={`mr-1 size-3 ${rescanning ? 'animate-spin' : ''}`} />
                                    Re-scan PDF
                                </Button>
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={fieldsSearchQuery}
                                        onChange={(e) => setFieldsSearchQuery(e.target.value)}
                                        placeholder={`Search ${editingFields.length} fields...`}
                                        className="pl-8 h-8 text-xs"
                                    />
                                </div>
                                <p className="ml-auto text-xs text-muted-foreground shrink-0">
                                    {fieldsSearchQuery ? `${filteredEditingFields.length} of ${editingFields.length}` : `${editingFields.length}`} fields
                                </p>
                            </div>
                            {/* Single table with sticky header in scrollable container */}
                            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                                {isFieldsStale && deferredEditingFields.length === 0 ? (
                                    <div className="space-y-2 py-2">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Skeleton className="h-8 w-[140px] rounded" />
                                                <Skeleton className="h-8 flex-1 rounded" />
                                                <Skeleton className="h-8 w-[110px] rounded" />
                                                <Skeleton className="h-8 w-40 rounded" />
                                                <Skeleton className="h-8 w-[120px] rounded" />
                                                <Skeleton className="h-8 w-[70px] rounded" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--color-border)]">
                                            <TableRow>
                                                <TableHead className="w-[140px]">PDF Field</TableHead>
                                                <TableHead className="w-[180px]">Label</TableHead>
                                                <TableHead className="w-[110px]">Type</TableHead>
                                                <TableHead className="w-40">Auto-fill from Lead</TableHead>
                                                <TableHead className="w-[120px]">Default Value</TableHead>
                                                <TableHead className="w-[100px]">Repeat Group</TableHead>
                                                <TableHead className="w-[70px] text-center">Required</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sectionGroupedFields.map(({ section, fields }) => (
                                                <SectionGroup
                                                    key={section}
                                                    section={section}
                                                    fields={fields}
                                                    isCollapsed={collapsedSections.has(section)}
                                                    onToggle={() => toggleSection(section)}
                                                    onRenameSection={handleRenameSection}
                                                    onUpdateField={updateField}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </>
                    )}
                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setShowFieldsDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveFields} disabled={saveFields.isPending}>
                            {saveFields.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                            Save Fields
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

interface EditableField {
    field_name: string;
    field_label: string;
    field_type: string;
    field_options: string[] | null;
    lead_field_mapping: string;
    default_value: string;
    sort_order: number;
    page_number: number | null;
    section: string | null;
    repeat_group: string | null;
    is_required: boolean;
    /** All raw PDF field names that map to this deduplicated row */
    siblingFieldNames?: string[];
}

/**
 * Group fields by their base name (stripping numeric suffixes).
 * Returns one EditableField per unique base name, with siblingFieldNames
 * tracking all raw PDF field names that share the same base.
 *
 * Fields with a repeat_group bypass normal deduplication: within a repeat group,
 * only one row per unique base column name is shown (e.g., one "Full Name" row
 * representing 7 slots), not 7 individual rows.
 */
function deduplicateFields(fields: EditableField[]): EditableField[] {
    const regularFields: EditableField[] = [];
    const repeatGroupFields: EditableField[] = [];

    for (const field of fields) {
        if (field.repeat_group) {
            repeatGroupFields.push(field);
        } else {
            regularFields.push(field);
        }
    }

    // Deduplicate regular fields — section-aware to avoid merging fields across pages
    // e.g. main applicant "Date of Birth" (Page 4) stays separate from dependent "Date of Birth_10" (Page 3)
    const seen = new Map<string, { primary: EditableField; siblings: string[] }>();
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

    const result = Array.from(seen.values()).map(({ primary, siblings }, i) => ({
        ...primary,
        sort_order: i,
        siblingFieldNames: siblings,
    }));

    // For repeat group fields: one row per base column name per group
    // First pass: group by repeat_group, then by base name
    const rgGroupMaps = new Map<string, Map<string, string[]>>();
    const rgFieldMap = new Map<string, EditableField>(); // field_name → field
    for (const field of repeatGroupFields) {
        const group = field.repeat_group!;
        if (!rgGroupMaps.has(group)) rgGroupMaps.set(group, new Map());
        const colMap = rgGroupMaps.get(group)!;
        const baseName = stripNumericSuffix(field.field_name);
        if (!colMap.has(baseName)) colMap.set(baseName, []);
        colMap.get(baseName)!.push(field.field_name);
        rgFieldMap.set(field.field_name, field);
    }

    // Second pass: merge similar column names (e.g. "Fulla Name" → "Full Name")
    const repeatGroupSeen = new Map<string, { primary: EditableField; siblings: string[] }>();
    for (const [group, colMap] of rgGroupMaps) {
        const mergedColMap = mergeSimilarRepeatGroupColumns(colMap);
        for (const [baseName, fieldNames] of mergedColMap) {
            const groupKey = `${group}::${baseName}`;
            const primaryField = rgFieldMap.get(fieldNames[0])!;
            repeatGroupSeen.set(groupKey, { primary: primaryField, siblings: fieldNames });
        }
    }

    let sortOffset = result.length;
    for (const { primary, siblings } of repeatGroupSeen.values()) {
        result.push({
            ...primary,
            sort_order: sortOffset++,
            siblingFieldNames: siblings,
        });
    }

    return result;
}

const SectionGroup = memo(function SectionGroup({
    section,
    fields,
    isCollapsed,
    onToggle,
    onRenameSection,
    onUpdateField,
}: {
    section: string;
    fields: { field: EditableField; index: number }[];
    isCollapsed: boolean;
    onToggle: () => void;
    onRenameSection: (oldName: string, newName: string) => void;
    onUpdateField: (index: number, updates: Partial<EditableField>) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(section);

    const handleBlur = useCallback(() => {
        setEditing(false);
        if (name.trim() && name !== section) {
            onRenameSection(section, name.trim());
        } else {
            setName(section);
        }
    }, [name, section, onRenameSection]);

    return (
        <>
            <TableRow className="bg-muted/40 hover:bg-muted/60">
                <TableCell colSpan={7} className="py-1.5">
                    <div className="flex items-center gap-2">
                        <button onClick={onToggle} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                        {editing ? (
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleBlur();
                                    if (e.key === 'Escape') {
                                        setName(section);
                                        setEditing(false);
                                    }
                                }}
                                className="h-6 w-40 text-xs font-semibold"
                                autoFocus
                            />
                        ) : (
                            <button onClick={() => setEditing(true)} className="text-xs font-semibold tracking-wider uppercase hover:underline">
                                {section}
                            </button>
                        )}
                        <Badge variant="secondary" size="sm" className="text-[10px]">
                            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                        </Badge>
                    </div>
                </TableCell>
            </TableRow>
            {!isCollapsed &&
                fields.map(({ field, index }) => (
                    <FieldRow key={field.field_name} field={field} index={index} onUpdate={onUpdateField} />
                ))}
        </>
    );
});

const FieldRow = memo(function FieldRow({
    field,
    index,
    onUpdate,
}: {
    field: EditableField;
    index: number;
    onUpdate: (index: number, updates: Partial<EditableField>) => void;
}) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-1.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {field.field_name}
                    </code>
                    {(field.siblingFieldNames?.length ?? 0) > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            x{field.siblingFieldNames!.length}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Input
                    value={field.field_label}
                    onChange={(e) => onUpdate(index, { field_label: e.target.value })}
                    className="h-8 text-xs"
                />
            </TableCell>
            <TableCell>
                <Select
                    value={field.field_type}
                    onValueChange={(value) => onUpdate(index, { field_type: value as PdfTemplateField['field_type'] })}
                >
                    <SelectTrigger size="sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>
                <Select
                    value={field.lead_field_mapping || '__none__'}
                    onValueChange={(value) => onUpdate(index, { lead_field_mapping: value === '__none__' ? '' : value })}
                >
                    <SelectTrigger size="sm">
                        <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {LEAD_FIELD_MAPPINGS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                                {m.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>
                <Input
                    value={field.default_value}
                    onChange={(e) => onUpdate(index, { default_value: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="—"
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1">
                    <Input
                        value={field.repeat_group ?? ''}
                        onChange={(e) => onUpdate(index, { repeat_group: e.target.value || null })}
                        className="h-8 text-xs"
                        placeholder="—"
                    />
                    {field.repeat_group && <Repeat className="size-3 shrink-0 text-primary" />}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <Switch
                    size="sm"
                    checked={field.is_required}
                    onCheckedChange={(checked) => onUpdate(index, { is_required: !!checked })}
                />
            </TableCell>
        </TableRow>
    );
});
