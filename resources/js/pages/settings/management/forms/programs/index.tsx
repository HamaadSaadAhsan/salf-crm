import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useSyncInventory } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Link, Head } from '@inertiajs/react';
import { ChevronDown, ChevronRight, FileText, Loader2, MapPin, RefreshCw, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface FormTemplate {
    id: number;
    code: string;
    name: string;
    file_type: 'pdf' | 'docx';
    mapping_mode: 'name' | 'geometry' | 'docx_jinja';
    is_active: boolean;
    field_count: number | null;
    page_count: number | null;
    sort_order: number;
    template_fields_count: number;
    field_mappings_count: number;
}

interface Program {
    id: number;
    code: string;
    name: string;
    country_code: string;
    is_active: boolean;
    form_templates_count: number;
    applications_count: number;
    form_templates: FormTemplate[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Management', href: '/settings/management' },
    { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
];

function fileTypeBadge(type: string) {
    return type === 'pdf' ? (
        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20">PDF</Badge>
    ) : (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20">DOCX</Badge>
    );
}

function mappingModeBadge(mode: string) {
    const map: Record<string, string> = { name: 'Name', geometry: 'Geometry', docx_jinja: 'Jinja' };
    return <Badge variant="secondary">{map[mode] ?? mode}</Badge>;
}

function TemplateRow({ template, programId }: { template: FormTemplate; programId: number }) {
    const sync = useSyncInventory();
    const syncingThis = sync.isPending && sync.variables === template.id;

    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.code}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
                {fileTypeBadge(template.file_type)}
                {mappingModeBadge(template.mapping_mode)}
                <span className="text-xs text-muted-foreground w-20 text-right">
                    {template.field_mappings_count}/{template.template_fields_count} mapped
                </span>
                {template.file_type === 'pdf' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        disabled={syncingThis}
                        onClick={() => sync.mutate(template.id)}
                    >
                        {syncingThis ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        Sync
                    </Button>
                )}
                {template.file_type === 'pdf' && template.template_fields_count > 0 && (
                    <Button size="sm" variant="outline" asChild>
                        <Link href={`/settings/management/forms/programs/${programId}/templates/${template.id}/mappings`}>
                            <Settings2 className="size-3 mr-1.5" />
                            Map Fields
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}

function ProgramCard({ program }: { program: Program }) {
    const [open, setOpen] = useState(true);

    return (
        <Card>
            <CardHeader className="px-4 py-3 cursor-pointer" onClick={() => setOpen((v) => !v)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{program.name}</span>
                                {!program.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="size-3" /> {program.country_code}
                                </span>
                                <span className="text-xs text-muted-foreground">{program.code}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium">{program.form_templates_count}</p>
                            <p className="text-xs text-muted-foreground">templates</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">{program.applications_count}</p>
                            <p className="text-xs text-muted-foreground">applications</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            {open && (
                <CardContent className="p-0">
                    {program.form_templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-3">No templates.</p>
                    ) : (
                        program.form_templates.map((t) => (
                            <TemplateRow key={t.id} template={t} programId={program.id} />
                        ))
                    )}
                </CardContent>
            )}
        </Card>
    );
}

export default function FormsAutomationIndex({ programs }: { programs: Program[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Forms Automation" />

            {/* Page header */}
            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <FileText className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Forms Automation</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage CBI programs, form templates, and field mappings</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/settings/management/forms/applications">
                            View Applications
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {programs.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No programs found. Run the seeder to add Dominica CBI.</p>
                        </CardContent>
                    </Card>
                ) : (
                    programs.map((p) => <ProgramCard key={p.id} program={p} />)
                )}
            </div>
        </AppLayout>
    );
}
