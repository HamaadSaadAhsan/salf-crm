import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FileText, Plus } from 'lucide-react';

interface ApplicationItem {
    id: number;
    application_code: string;
    main_applicant_name: string | null;
    main_applicant_passport: string | null;
    status: string;
    created_at: string;
    program: { id: number; name: string; code: string } | null;
    created_by: { id: number; name: string } | null;
}

interface PaginatedApplications {
    data: ApplicationItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Management', href: '/settings/management' },
    { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
    { title: 'Applications', href: '/settings/management/forms/applications' },
];

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    submitted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    archived: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    archived: 'Archived',
};

export default function ApplicationsIndex({ applications }: { applications: PaginatedApplications }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Applications — Forms Automation" />

            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <FileText className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Applications</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {applications.total} total · form packs for CBI applicants
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/settings/management/pdf-templates">
                            Programs & Templates
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/settings/management/forms/applications/create">
                            <Plus className="size-4 mr-1.5" />
                            New Application
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="p-4">
                {applications.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">No applications yet.</p>
                            <Button asChild>
                                <Link href="/settings/management/forms/applications/create">
                                    <Plus className="size-4 mr-1.5" />
                                    Create First Application
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Code</th>
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Applicant</th>
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Program</th>
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Created By</th>
                                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                                        <th className="text-right px-4 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.data.map((app) => (
                                        <tr key={app.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <span className="font-mono font-medium">{app.application_code}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium">{app.main_applicant_name ?? <span className="text-muted-foreground">—</span>}</p>
                                                {app.main_applicant_passport && (
                                                    <p className="text-xs text-muted-foreground">{app.main_applicant_passport}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {app.program ? (
                                                    <span className="text-sm">{app.program.name}</span>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[app.status] ?? ''}`}>
                                                    {STATUS_LABELS[app.status] ?? app.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                                {app.created_by?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                                {new Date(app.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <Button size="sm" variant="ghost" asChild>
                                                    <Link href={`/settings/management/forms/applications/${app.id}`}>
                                                        View
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {applications.last_page > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <p className="text-sm text-muted-foreground">
                                    {applications.from}–{applications.to} of {applications.total}
                                </p>
                                <div className="flex gap-2">
                                    {applications.current_page > 1 && (
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`?page=${applications.current_page - 1}`}>Previous</Link>
                                        </Button>
                                    )}
                                    {applications.current_page < applications.last_page && (
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`?page=${applications.current_page + 1}`}>Next</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
