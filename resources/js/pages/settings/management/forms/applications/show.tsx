import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useApplicationGenerations, useDeleteApplication, useGenerateApplicationForms } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Loader2,
    Pencil,
    PlayCircle,
    RotateCcw,
    Trash2,
    XCircle,
} from 'lucide-react';

interface Generation {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    file_count: number;
    output_path: string | null;
    generation_log: Array<{ template_code: string; status: string; filled_field_count?: number; error?: string }> | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    generated_by: { id: number; name: string } | null;
}

interface ApplicationDetail {
    id: number;
    application_code: string;
    main_applicant_name: string | null;
    main_applicant_passport: string | null;
    status: string;
    data: Record<string, unknown> | null;
    submitted_at: string | null;
    created_at: string;
    program: { id: number; name: string; code: string } | null;
    created_by: { id: number; name: string } | null;
    assigned_to: { id: number; name: string } | null;
    generations: Generation[];
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    submitted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    archived: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', in_progress: 'In Progress', submitted: 'Submitted',
    approved: 'Approved', rejected: 'Rejected', archived: 'Archived',
};

function GenerationStatusIcon({ status }: { status: string }) {
    if (status === 'completed') return <CheckCircle2 className="size-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="size-4 text-red-500" />;
    if (status === 'running') return <Loader2 className="size-4 text-blue-500 animate-spin" />;
    return <Clock className="size-4 text-muted-foreground" />;
}

function GenerationStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        completed: 'bg-green-50 text-green-700 border-green-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
        running: 'bg-blue-50 text-blue-700 border-blue-200',
        pending: 'bg-muted text-muted-foreground',
    };
    return <Badge variant="outline" className={`text-xs capitalize ${colors[status] ?? ''}`}>{status}</Badge>;
}

export default function ApplicationShowPage({ application }: { application: ApplicationDetail }) {
    const generate = useGenerateApplicationForms();
    const deleteApp = useDeleteApplication();

    const { data: genData } = useApplicationGenerations(application.id, true);
    const generations: Generation[] = genData?.data ?? application.generations;

    const hasRunning = generations.some((g) => g.status === 'pending' || g.status === 'running');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: 'Applications', href: '/settings/management/forms/applications' },
        { title: application.application_code, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={application.application_code} />

            {/* Header */}
            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-3">
                    <FileText className="size-5 text-primary" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold font-mono">{application.application_code}</h1>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[application.status] ?? ''}`}>
                                {STATUS_LABELS[application.status] ?? application.status}
                            </Badge>
                        </div>
                        {application.main_applicant_name && (
                            <p className="text-sm text-muted-foreground">{application.main_applicant_name}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/settings/management/forms/applications/${application.id}/edit`}>
                            <Pencil className="size-3.5 mr-1.5" />
                            Edit
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        disabled={generate.isPending || hasRunning}
                        onClick={() => generate.mutate(application.id)}
                    >
                        {generate.isPending || hasRunning
                            ? <Loader2 className="size-3.5 animate-spin mr-1.5" />
                            : <PlayCircle className="size-3.5 mr-1.5" />}
                        {hasRunning ? 'Generating…' : 'Generate Forms'}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                <Trash2 className="size-3.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will delete {application.application_code} and all its generations. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteApp.mutate(application.id)}
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    {/* Application info */}
                    <div className="col-span-1 space-y-4">
                        <Card>
                            <CardHeader className="px-4 py-3 border-b">
                                <h2 className="font-semibold text-sm">Details</h2>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Program</p>
                                    <p className="font-medium">{application.program?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Main Applicant</p>
                                    <p className="font-medium">{application.main_applicant_name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Passport</p>
                                    <p className="font-mono">{application.main_applicant_passport ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Created By</p>
                                    <p>{application.created_by?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Created At</p>
                                    <p>{new Date(application.created_at).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Data preview */}
                    <div className="col-span-2">
                        <Card className="h-full">
                            <CardHeader className="px-4 py-3 border-b">
                                <h2 className="font-semibold text-sm">Applicant Data</h2>
                            </CardHeader>
                            <CardContent className="p-4">
                                <pre className="text-xs font-mono bg-muted/30 rounded-md p-3 overflow-auto max-h-72 whitespace-pre-wrap break-all">
                                    {JSON.stringify(application.data, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Generations */}
                <Card>
                    <CardHeader className="px-4 py-3 border-b flex-row items-center justify-between">
                        <h2 className="font-semibold text-sm">Generation History</h2>
                        {hasRunning && (
                            <span className="flex items-center gap-1.5 text-xs text-blue-600">
                                <Loader2 className="size-3.5 animate-spin" />
                                Refreshing automatically…
                            </span>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {generations.length === 0 ? (
                            <div className="py-8 text-center">
                                <RotateCcw className="size-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No generations yet. Click "Generate Forms" to create a form pack.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated By</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</th>
                                        <th className="text-right px-4 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generations.map((gen) => (
                                        <tr key={gen.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                            <td className="px-4 py-2.5 text-muted-foreground">#{gen.id}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <GenerationStatusIcon status={gen.status} />
                                                    <GenerationStatusBadge status={gen.status} />
                                                </div>
                                                {gen.error_message && (
                                                    <p className="text-xs text-red-600 mt-0.5 max-w-xs truncate" title={gen.error_message}>
                                                        {gen.error_message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">{gen.file_count}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{gen.generated_by?.name ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                {gen.completed_at ? new Date(gen.completed_at).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                {gen.status === 'completed' && gen.output_path && (
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={`/api/forms/generations/${gen.id}/download`} download>
                                                            <Download className="size-3.5 mr-1.5" />
                                                            Download ZIP
                                                        </a>
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                {/* Generation log detail (last generation) */}
                {generations[0]?.generation_log && generations[0].generation_log.length > 0 && (
                    <Card>
                        <CardHeader className="px-4 py-3 border-b">
                            <h2 className="font-semibold text-sm">Latest Generation Log</h2>
                        </CardHeader>
                        <CardContent className="p-0">
                            {generations[0].generation_log.map((entry, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 text-sm">
                                    <div className="flex items-center gap-2">
                                        {entry.status === 'ok'
                                            ? <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                                            : <XCircle className="size-3.5 text-red-500 shrink-0" />}
                                        <span className="font-mono">{entry.template_code}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {entry.filled_field_count !== undefined && (
                                            <span>{entry.filled_field_count} fields filled</span>
                                        )}
                                        {entry.error && (
                                            <span className="text-red-600 truncate max-w-xs" title={entry.error}>{entry.error}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
