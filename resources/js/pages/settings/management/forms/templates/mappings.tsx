import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type FieldMappingRow, useGetMappings, useSaveMappings, useSyncInventory, useTemplatePage } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, FileText, Loader2, Maximize2, RefreshCw, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TemplateField {
    id: number;
    field_name: string;
    field_type: string;
    page: number | null;
    export_values: string[] | null;
    rect_pdf: number[] | null;
    page_size_pdf: number[] | null;
    suggested_path: string | null;
    mapping: {
        id: number;
        canonical_path: string;
        value_for_truthy: string | null;
        transform: string | null;
        notes: string | null;
    } | null;
}

interface Props {
    program: { id: number; name: string; code: string };
    template: {
        id: number;
        code: string;
        name: string;
        file_type: string;
        mapping_mode: string;
        field_count: number | null;
        page_count: number | null;
    };
    fields: TemplateField[];
    existingPaths: string[];
}

function fieldTypeBadge(type: string) {
    const colors: Record<string, string> = {
        text: 'bg-sky-50 text-sky-700 border-sky-200',
        checkbox: 'bg-amber-50 text-amber-700 border-amber-200',
        radio: 'bg-purple-50 text-purple-700 border-purple-200',
        signature: 'bg-green-50 text-green-700 border-green-200',
        unknown: 'bg-muted text-muted-foreground',
    };
    return <Badge variant="outline" className={`text-xs ${colors[type] ?? colors.unknown}`}>{type}</Badge>;
}

const TRANSFORMS = ['', 'uppercase', 'lowercase', 'date:d/m/Y', 'date:Y-m-d', 'date:m/d/Y'];

// ─── Shared field-overlay SVG ─────────────────────────────────────────────

interface FieldBox {
    fieldName: string;
    rect: number[];
    pageSize: number[];
    active: boolean;
}

function FieldOverlaySvg({ fields, imgSize, activeFieldName }: { fields: FieldBox[]; imgSize: { w: number; h: number }; activeFieldName: string | null }) {
    if (imgSize.w === 0 || fields.length === 0) { return null; }

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            preserveAspectRatio="none"
        >
            {fields.map((f) => {
                if (!f.rect || !f.pageSize) { return null; }
                const [x1, , x2, y2] = f.rect;
                const [, ph] = f.pageSize;
                const scale = imgSize.h / ph;
                const sx = x1 * scale;
                const sy = (ph - y2) * scale; // flip Y: PDF bottom-left → image top-left
                const sw = (x2 - x1) * scale;
                const sh = (f.rect[3] - f.rect[1]) * scale;
                const isActive = f.fieldName === activeFieldName;

                return (
                    <rect
                        key={f.fieldName}
                        x={sx}
                        y={sy}
                        width={sw}
                        height={sh}
                        fill={isActive ? 'rgba(59,130,246,0.25)' : 'rgba(251,191,36,0.15)'}
                        stroke={isActive ? '#3b82f6' : '#f59e0b'}
                        strokeWidth={isActive ? 2 : 1}
                        rx={1}
                    />
                );
            })}
        </svg>
    );
}

// ─── Page preview thumbnail ───────────────────────────────────────────────

function PagePreview({
    templateId,
    page,
    fields,
    activeFieldName,
    onExpand,
}: {
    templateId: number;
    page: number;
    fields: FieldBox[];
    activeFieldName: string | null;
    onExpand: () => void;
}) {
    const { data: imageUrl, isLoading, isError } = useTemplatePage(templateId, page);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        if (!imageUrl) { return; }
        const img = new Image();
        img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = imageUrl;
    }, [imageUrl]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-xs">Loading page {page}…</p>
            </div>
        );
    }

    if (isError || !imageUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <p className="text-xs">Could not load preview</p>
            </div>
        );
    }

    return (
        <div className="group relative inline-block w-full cursor-zoom-in" onClick={onExpand}>
            <img
                src={imageUrl}
                alt={`Page ${page}`}
                className="w-full h-auto rounded border"
                style={{ display: 'block' }}
            />
            <FieldOverlaySvg fields={fields} imgSize={imgSize} activeFieldName={activeFieldName} />
            {/* Expand hint */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 backdrop-blur-sm border rounded p-1">
                    <Maximize2 className="size-3.5 text-foreground" />
                </div>
            </div>
        </div>
    );
}

// ─── Full-screen image viewer dialog ─────────────────────────────────────

function ImageViewerDialog({
    open,
    onClose,
    templateId,
    page,
    pageCount,
    fields,
    activeFieldName,
    onPageChange,
}: {
    open: boolean;
    onClose: () => void;
    templateId: number;
    page: number;
    pageCount: number | null;
    fields: FieldBox[];
    activeFieldName: string | null;
    onPageChange: (p: number) => void;
}) {
    const { data: imageUrl, isLoading, isError } = useTemplatePage(templateId, page);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        if (!imageUrl) { return; }
        const img = new Image();
        img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = imageUrl;
    }, [imageUrl]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) { return; }
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && page > 1) { onPageChange(page - 1); }
            if (e.key === 'ArrowRight' && pageCount && page < pageCount) { onPageChange(page + 1); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, page, pageCount, onPageChange]);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); } }}>
            <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden">
                <DialogTitle className="sr-only">Page {page} preview</DialogTitle>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Page {page}</span>
                        {pageCount && (
                            <span className="text-xs text-muted-foreground">of {pageCount}</span>
                        )}
                        {activeFieldName && (
                            <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {activeFieldName}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={page <= 1}
                            onClick={() => onPageChange(page - 1)}
                            title="Previous page (←)"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        {/* Page number pills */}
                        {pageCount && pageCount > 1 && (
                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        className={`min-w-6 h-6 rounded text-xs font-medium transition-colors px-1.5 ${
                                            p === page
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={!pageCount || page >= pageCount}
                            onClick={() => onPageChange(page + 1)}
                            title="Next page (→)"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Image area */}
                <div className="overflow-auto bg-muted/30 max-h-[80vh] p-4">
                    {isLoading && (
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="size-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {isError && (
                        <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
                            Could not load page
                        </div>
                    )}
                    {imageUrl && !isLoading && (
                        <div className="relative inline-block mx-auto">
                            <img
                                src={imageUrl}
                                alt={`Page ${page}`}
                                className="max-w-full h-auto rounded border shadow-sm"
                                style={{ display: 'block' }}
                            />
                            <FieldOverlaySvg fields={fields} imgSize={imgSize} activeFieldName={activeFieldName} />
                        </div>
                    )}
                </div>

                {/* Footer legend */}
                <div className="flex items-center gap-4 px-4 py-2 border-t bg-background text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-amber-300/60 border border-amber-400" />
                        All fields
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-blue-400/40 border border-blue-500" />
                        Selected field
                    </span>
                    <span className="ml-auto">Use ← → arrow keys to navigate pages</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function FieldMappingsPage({ program, template, fields, existingPaths }: Props) {
    const { data: freshData, isLoading } = useGetMappings(template.id);
    const saveMappings = useSaveMappings();
    const syncInventory = useSyncInventory();

    const [rows, setRows] = useState<FieldMappingRow[]>([]);
    const [dirty, setDirty] = useState(false);
    const [activeField, setActiveField] = useState<TemplateField | null>(null);
    const [previewPage, setPreviewPage] = useState<number | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);

    // Seed rows from Inertia props on first load
    useEffect(() => {
        if (rows.length === 0 && fields.length > 0) {
            const seeded = fields.map((f) => {
                const hasSaved = !!f.mapping?.canonical_path;
                return {
                    field_name: f.field_name,
                    field_type: f.field_type,
                    page: f.page,
                    export_values: f.export_values,
                    canonical_path: f.mapping?.canonical_path ?? f.suggested_path ?? '',
                    value_for_truthy: f.mapping?.value_for_truthy ?? '',
                    transform: f.mapping?.transform ?? '',
                    notes: f.mapping?.notes ?? '',
                    is_suggested: !hasSaved && !!f.suggested_path,
                };
            });
            setRows(seeded);
            if (seeded.some((r) => r.is_suggested)) { setDirty(true); }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When fresh data arrives from API (after sync), replace rows — re-apply suggestions for unmapped fields
    useEffect(() => {
        if (freshData?.data) {
            const merged = freshData.data.map((row) => {
                if (row.canonical_path) { return row; }
                const field = fields.find((f) => f.field_name === row.field_name);
                const suggestedPath = field?.suggested_path ?? null;
                return { ...row, canonical_path: suggestedPath ?? '', is_suggested: !!suggestedPath };
            });
            setRows(merged);
            setDirty(merged.some((r) => r.is_suggested));
        }
    }, [freshData]);

    const update = (index: number, key: keyof FieldMappingRow, value: string) => {
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value, is_suggested: false };
            return next;
        });
        setDirty(true);
    };

    const handleSave = () => {
        saveMappings.mutate(
            { templateId: template.id, mappings: rows },
            { onSuccess: () => setDirty(false) },
        );
    };

    const handleRowClick = (row: FieldMappingRow) => {
        const originalField = fields.find((f) => f.field_name === row.field_name);
        setActiveField(originalField ?? null);
        if (originalField?.page) {
            setPreviewPage(originalField.page);
        }
    };

    // Build field boxes for the current preview page
    const pageFieldBoxes: FieldBox[] = fields
        .filter((f) => f.page === previewPage && f.rect_pdf && f.page_size_pdf)
        .map((f) => ({
            fieldName: f.field_name,
            rect: f.rect_pdf!,
            pageSize: f.page_size_pdf!,
            active: f.field_name === activeField?.field_name,
        }));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: program.name, href: `/settings/management/forms/programs/${program.id}` },
        { title: template.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Map Fields — ${template.name}`} />

            <datalist id="canonical-paths">
                {existingPaths.map((p) => <option key={p} value={p} />)}
            </datalist>

            {/* Image viewer dialog */}
            {previewPage !== null && (
                <ImageViewerDialog
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    templateId={template.id}
                    page={previewPage}
                    pageCount={template.page_count}
                    fields={pageFieldBoxes}
                    activeFieldName={activeField?.field_name ?? null}
                    onPageChange={(p) => setPreviewPage(p)}
                />
            )}

            {/* Header */}
            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/settings/management/forms/programs/${program.id}`}>
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            <h1 className="text-lg font-semibold">{template.name}</h1>
                            <Badge variant="outline" className="text-xs">{template.code}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {template.page_count} pages · {rows.length} fields · {rows.filter((r) => r.canonical_path && !r.is_suggested).length} mapped
                            {rows.some((r) => r.is_suggested) && (
                                <span className="ml-2 text-amber-600 dark:text-amber-400">
                                    · {rows.filter((r) => r.is_suggested).length} suggested
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={syncInventory.isPending}
                        onClick={() => syncInventory.mutate(template.id)}
                    >
                        {syncInventory.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <RefreshCw className="size-3.5 mr-1.5" />}
                        Sync Fields
                    </Button>
                    <Button size="sm" disabled={!dirty || saveMappings.isPending} onClick={handleSave}>
                        {saveMappings.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
                        Save Mappings
                    </Button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex h-[calc(100vh-8rem)] overflow-hidden">

                {/* Left: field table */}
                <div className="flex-1 overflow-y-auto p-4 min-w-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : rows.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-sm text-muted-foreground mb-3">No fields yet. Click "Sync Fields" to inspect this PDF.</p>
                                <Button variant="outline" disabled={syncInventory.isPending} onClick={() => syncInventory.mutate(template.id)}>
                                    {syncInventory.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                                    Sync Fields
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader className="px-4 py-2.5 border-b">
                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    <div className="col-span-3">PDF Field Name</div>
                                    <div className="col-span-1">Type</div>
                                    <div className="col-span-1">Pg</div>
                                    <div className="col-span-4">Canonical Path</div>
                                    <div className="col-span-1">Truthy</div>
                                    <div className="col-span-1">Transform</div>
                                    <div className="col-span-1"></div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {rows.map((row, i) => {
                                    const isActive = activeField?.field_name === row.field_name;
                                    return (
                                        <div
                                            key={row.field_name}
                                            onClick={() => handleRowClick(row)}
                                            className={`grid grid-cols-12 gap-2 items-center px-4 py-2 border-b last:border-b-0 cursor-pointer transition-colors ${
                                                isActive
                                                    ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500'
                                                    : row.is_suggested
                                                      ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60'
                                                      : 'hover:bg-muted/20'
                                            }`}
                                        >
                                            <div className="col-span-3">
                                                <p className="text-sm font-mono font-medium truncate" title={row.field_name}>
                                                    {row.field_name}
                                                </p>
                                                {row.export_values && row.export_values.length > 0 && (
                                                    <p className="text-xs text-muted-foreground">{row.export_values.join(' / ')}</p>
                                                )}
                                            </div>
                                            <div className="col-span-1">
                                                {fieldTypeBadge(row.field_type)}
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-sm text-muted-foreground">{row.page ?? '—'}</span>
                                            </div>
                                            <div className="col-span-4" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    value={row.canonical_path}
                                                    onChange={(e) => update(i, 'canonical_path', e.target.value)}
                                                    placeholder="e.g. main_applicant.surname"
                                                    className={`h-7 text-sm font-mono ${row.is_suggested ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 focus:border-primary' : ''}`}
                                                    list="canonical-paths"
                                                    title={row.is_suggested ? 'Auto-suggested — review and save to confirm' : undefined}
                                                />
                                            </div>
                                            <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    value={row.value_for_truthy}
                                                    onChange={(e) => update(i, 'value_for_truthy', e.target.value)}
                                                    placeholder="Yes"
                                                    className="h-7 text-sm"
                                                    disabled={row.field_type === 'text'}
                                                />
                                            </div>
                                            <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={row.transform}
                                                    onChange={(e) => update(i, 'transform', e.target.value)}
                                                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
                                                >
                                                    {TRANSFORMS.map((t) => (
                                                        <option key={t} value={t}>{t || '—'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {row.canonical_path && (
                                                    <CheckCircle2 className="size-4 text-green-500" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: page preview panel */}
                <div className="w-80 shrink-0 border-l overflow-y-auto bg-muted/20">
                    {previewPage === null ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <FileText className="size-10 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">Click any field row to preview that page and see where the field is located.</p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {/* Page selector */}
                            {template.page_count && template.page_count > 1 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    {Array.from({ length: template.page_count }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPreviewPage(p)}
                                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                                p === previewPage
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Active field info */}
                            {activeField && (
                                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Selected field</p>
                                    <p className="text-sm font-mono font-bold">{activeField.field_name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {activeField.field_type} · page {activeField.page}
                                    </p>
                                    {activeField.export_values && activeField.export_values.length > 0 && (
                                        <p className="text-xs text-muted-foreground">Values: {activeField.export_values.join(', ')}</p>
                                    )}
                                </div>
                            )}

                            {/* Page image */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-medium">Page {previewPage}</span>
                                <button
                                    onClick={() => setViewerOpen(true)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Maximize2 className="size-3" />
                                    Expand
                                </button>
                            </div>
                            <PagePreview
                                templateId={template.id}
                                page={previewPage}
                                fields={pageFieldBoxes}
                                activeFieldName={activeField?.field_name ?? null}
                                onExpand={() => setViewerOpen(true)}
                            />

                            <p className="text-xs text-muted-foreground">
                                Yellow = all fields · Blue = selected
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
