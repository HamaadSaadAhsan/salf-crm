import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type FieldMappingRow, useGetMappings, useSaveMappings, useSyncInventory } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, FileText, Loader2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    fields: Array<{
        id: number;
        field_name: string;
        field_type: string;
        page: number | null;
        export_values: string[] | null;
        mapping: {
            id: number;
            canonical_path: string;
            value_for_truthy: string | null;
            transform: string | null;
            notes: string | null;
        } | null;
    }>;
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

export default function FieldMappingsPage({ program, template, fields, existingPaths }: Props) {
    const { data: freshData, isLoading } = useGetMappings(template.id);
    const saveMappings = useSaveMappings();
    const syncInventory = useSyncInventory();

    const [rows, setRows] = useState<FieldMappingRow[]>([]);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (freshData?.data) {
            setRows(freshData.data);
            setDirty(false);
        }
    }, [freshData]);

    // Seed from server-rendered fields when query hasn't loaded yet
    useEffect(() => {
        if (rows.length === 0 && fields.length > 0) {
            setRows(
                fields.map((f) => ({
                    field_name: f.field_name,
                    field_type: f.field_type,
                    page: f.page,
                    export_values: f.export_values,
                    canonical_path: f.mapping?.canonical_path ?? '',
                    value_for_truthy: f.mapping?.value_for_truthy ?? '',
                    transform: f.mapping?.transform ?? '',
                    notes: f.mapping?.notes ?? '',
                })),
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const update = (index: number, key: keyof FieldMappingRow, value: string) => {
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
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

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: program.name, href: `/settings/management/forms/programs/${program.id}` },
        { title: template.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Map Fields — ${template.name}`} />

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
                            {template.page_count} pages · {rows.length} fields · {rows.filter((r) => r.canonical_path).length} mapped
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
                    <Button
                        size="sm"
                        disabled={!dirty || saveMappings.isPending}
                        onClick={handleSave}
                    >
                        {saveMappings.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
                        Save Mappings
                    </Button>
                </div>
            </div>

            {/* Datalist for autocomplete */}
            <datalist id="canonical-paths">
                {existingPaths.map((p) => <option key={p} value={p} />)}
            </datalist>

            <div className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : rows.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-sm text-muted-foreground mb-3">No fields found. Click "Sync Fields" to inspect this PDF template.</p>
                            <Button
                                variant="outline"
                                disabled={syncInventory.isPending}
                                onClick={() => syncInventory.mutate(template.id)}
                            >
                                {syncInventory.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                                Sync Fields
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="px-4 py-3 border-b">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                <div className="col-span-3">PDF Field</div>
                                <div className="col-span-1">Type</div>
                                <div className="col-span-1">Page</div>
                                <div className="col-span-4">Canonical Path</div>
                                <div className="col-span-1">Truthy Value</div>
                                <div className="col-span-1">Transform</div>
                                <div className="col-span-1"></div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {rows.map((row, i) => (
                                <div
                                    key={row.field_name}
                                    className="grid grid-cols-12 gap-2 items-center px-4 py-2 border-b last:border-b-0 hover:bg-muted/20"
                                >
                                    <div className="col-span-3">
                                        <p className="text-sm font-mono truncate" title={row.field_name}>{row.field_name}</p>
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
                                    <div className="col-span-4">
                                        <Input
                                            value={row.canonical_path}
                                            onChange={(e) => update(i, 'canonical_path', e.target.value)}
                                            placeholder="e.g. main_applicant.surname"
                                            className="h-7 text-sm font-mono"
                                            list="canonical-paths"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            value={row.value_for_truthy}
                                            onChange={(e) => update(i, 'value_for_truthy', e.target.value)}
                                            placeholder="Yes"
                                            className="h-7 text-sm"
                                            disabled={row.field_type === 'text'}
                                        />
                                    </div>
                                    <div className="col-span-1">
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
                            ))}
                        </CardContent>
                    </Card>
                )}

                {dirty && (
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saveMappings.isPending}>
                            {saveMappings.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                            Save All Mappings
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
