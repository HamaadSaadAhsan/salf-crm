import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type SchemaSection, useCreateApplication, useProgramSchema, useUpdateApplication } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, FileText, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Program {
    id: number;
    name: string;
    code: string;
    country_code: string;
}

interface ExistingApplication {
    id: number;
    application_code: string;
    main_applicant_name: string | null;
    main_applicant_passport: string | null;
    status: string;
    data: Record<string, unknown> | null;
    program_id: number;
}

interface Props {
    programs: Program[];
    application?: ExistingApplication;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: string): Record<string, unknown> {
    const parts = path.split('.');
    const result = { ...obj };
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        current[part] = typeof current[part] === 'object' && current[part] !== null
            ? { ...(current[part] as Record<string, unknown>) }
            : {};
        current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    return result;
}

function getNestedValue(obj: Record<string, unknown> | null | undefined, path: string): string {
    if (!obj) { return ''; }
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (typeof current !== 'object' || current === null) { return ''; }
        current = (current as Record<string, unknown>)[part];
    }
    return current === null || current === undefined ? '' : String(current);
}

// ─── section card ─────────────────────────────────────────────────────────

function SectionCard({
    section,
    data,
    onChange,
}: {
    section: SchemaSection;
    data: Record<string, unknown>;
    onChange: (path: string, value: string) => void;
}) {
    const [open, setOpen] = useState(true);

    const filledCount = section.fields.filter((f) => getNestedValue(data, f.path) !== '').length;

    return (
        <Card>
            <CardHeader
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        <span className="font-semibold text-sm">{section.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {filledCount}/{section.fields.length} filled
                    </Badge>
                </div>
            </CardHeader>
            {open && (
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {section.fields.map((field) => (
                            <div key={field.path} className="space-y-1">
                                <Label htmlFor={field.path} className="text-xs">
                                    {field.label}
                                    <span className="text-muted-foreground ml-1.5 font-normal font-mono">({field.path})</span>
                                </Label>
                                <Input
                                    id={field.path}
                                    value={getNestedValue(data, field.path)}
                                    onChange={(e) => onChange(field.path, e.target.value)}
                                    placeholder={`Enter ${field.label.toLowerCase()}…`}
                                    className="h-8 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

// ─── page ─────────────────────────────────────────────────────────────────

export default function ApplicationCreatePage({ programs, application }: Props) {
    const isEditing = Boolean(application);

    const [programId, setProgramId] = useState<string>(application?.program_id?.toString() ?? '');
    const [name, setName] = useState(application?.main_applicant_name ?? '');
    const [passport, setPassport] = useState(application?.main_applicant_passport ?? '');
    const [data, setData] = useState<Record<string, unknown>>(application?.data ?? {});
    const [showRawJson, setShowRawJson] = useState(false);
    const [rawJson, setRawJson] = useState('');
    const [jsonError, setJsonError] = useState('');

    const programIdNum = programId ? parseInt(programId) : null;
    const { data: schema, isLoading: schemaLoading } = useProgramSchema(programIdNum);

    // When switching to raw JSON mode, populate textarea from current data
    useEffect(() => {
        if (showRawJson) {
            setRawJson(JSON.stringify(data, null, 2));
        }
    }, [showRawJson]); // eslint-disable-line react-hooks/exhaustive-deps

    const createApp = useCreateApplication();
    const updateApp = useUpdateApplication();
    const isPending = createApp.isPending || updateApp.isPending;

    const handleFieldChange = (path: string, value: string) => {
        setData((prev) => setNestedValue(prev, path, value));
    };

    const handleSubmit = () => {
        let finalData = data;

        if (showRawJson) {
            try {
                finalData = JSON.parse(rawJson) as Record<string, unknown>;
                setJsonError('');
            } catch (e) {
                setJsonError((e as Error).message);
                return;
            }
        }

        if (isEditing && application) {
            updateApp.mutate({
                applicationId: application.id,
                main_applicant_name: name,
                main_applicant_passport: passport,
                data: finalData,
            });
        } else {
            createApp.mutate({
                program_id: parseInt(programId),
                main_applicant_name: name,
                main_applicant_passport: passport,
                data: finalData,
            });
        }
    };

    const hasSections = schema?.has_mappings && (schema?.sections?.length ?? 0) > 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: 'Applications', href: '/settings/management/forms/applications' },
        { title: isEditing ? `Edit ${application?.application_code}` : 'New Application', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `Edit ${application?.application_code}` : 'New Application'} />

            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <h1 className="text-lg font-semibold">
                        {isEditing ? `Edit ${application?.application_code}` : 'New Application'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href="/settings/management/forms/applications">Cancel</Link>
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || !programId}>
                        {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                        {isEditing ? 'Save Changes' : 'Create Application'}
                    </Button>
                </div>
            </div>

            <div className="p-4 max-w-4xl space-y-4">

                {/* Basic details */}
                <Card>
                    <CardHeader className="px-4 py-3 border-b">
                        <h2 className="font-semibold text-sm">Application Details</h2>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="program">Program *</Label>
                                <select
                                    id="program"
                                    value={programId}
                                    onChange={(e) => {
                                        setProgramId(e.target.value);
                                        setData({});
                                    }}
                                    disabled={isEditing}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                                >
                                    <option value="">Select program…</option>
                                    {programs.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Main Applicant Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. John Smith"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="passport">Passport Number</Label>
                                <Input
                                    id="passport"
                                    value={passport}
                                    onChange={(e) => setPassport(e.target.value)}
                                    placeholder="e.g. A12345678"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Applicant data */}
                {programId && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-sm">Applicant Information</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => setShowRawJson((v) => !v)}
                            >
                                {showRawJson ? 'Switch to form view' : 'Edit raw JSON'}
                            </Button>
                        </div>

                        {schemaLoading ? (
                            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Loading required fields…
                            </div>
                        ) : showRawJson ? (
                            <Card>
                                <CardContent className="p-4">
                                    <textarea
                                        value={rawJson}
                                        onChange={(e) => {
                                            setRawJson(e.target.value);
                                            if (jsonError) {
                                                try { JSON.parse(e.target.value); setJsonError(''); } catch { /* ignore */ }
                                            }
                                        }}
                                        rows={20}
                                        className="w-full font-mono text-xs rounded-md border border-input bg-background p-3 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                        spellCheck={false}
                                    />
                                    {jsonError && <p className="mt-1 text-xs text-red-600 font-mono">{jsonError}</p>}
                                </CardContent>
                            </Card>
                        ) : hasSections ? (
                            <>
                                {schema!.sections.map((section) => (
                                    <SectionCard
                                        key={section.key}
                                        section={section}
                                        data={data}
                                        onChange={handleFieldChange}
                                    />
                                ))}
                            </>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        No field mappings configured for this program yet.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        An admin needs to sync and map the PDF template fields first.
                                        Until then you can{' '}
                                        <button
                                            className="underline"
                                            onClick={() => {
                                                setShowRawJson(true);
                                                setRawJson(JSON.stringify(data, null, 2) || '{}');
                                            }}
                                        >
                                            enter the data as raw JSON
                                        </button>.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
