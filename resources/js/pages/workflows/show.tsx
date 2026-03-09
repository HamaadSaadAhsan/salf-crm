import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Workflow } from '@/types/workflow';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Copy, Edit, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface WorkflowShowPageProps {
    workflow: Workflow;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workflows',
        href: '/workflows',
    },
    {
        title: 'View Workflow',
        href: '#',
    },
];

export default function WorkflowShowPage({ workflow }: WorkflowShowPageProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const getStatusBadge = (status: Workflow['status']) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
            case 'paused':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Paused</Badge>;
            case 'draft':
                return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
            case 'inactive':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>;
        }
    };

    const handleStatusChange = (newStatus: 'active' | 'paused') => {
        setActionLoading('status');

        router.patch(
            `/workflows/${workflow.id}`,
            {
                status: newStatus,
            },
            {
                onSuccess: () => {
                    setActionLoading(null);
                },
                onError: () => {
                    setActionLoading(null);
                },
                preserveScroll: true,
            },
        );
    };

    const handleDuplicate = () => {
        setActionLoading('duplicate');

        router.post(
            `/workflows/${workflow.id}/duplicate`,
            {},
            {
                onSuccess: () => {
                    setActionLoading(null);
                },
                onError: () => {
                    setActionLoading(null);
                },
            },
        );
    };

    const handleDelete = () => {
        if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
            return;
        }

        setActionLoading('delete');

        router.delete(`/workflows/${workflow.id}`, {
            onSuccess: () => {
                router.visit('/workflows');
            },
            onError: () => {
                setActionLoading(null);
            },
        });
    };

    const getTriggerStep = () => {
        return workflow.steps.find((step) => step.step_type === 'trigger');
    };

    const getActionSteps = () => {
        return workflow.steps.filter((step) => step.step_type === 'action');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Workflow: ${workflow.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-2">
                    <div className="flex items-center gap-4">
                        <Link href="/workflows">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Workflows
                            </Button>
                        </Link>
                        <div className="">
                            <h1 className="mb-0 pb-0 text-2xl font-semibold">{workflow.name}</h1>
                            {workflow.description && <p className="text-gray-600">{workflow.description}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">{getStatusBadge(workflow.status)}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 px-5">
                    <Link href={`/workflows/${workflow.id}/edit`}>
                        <Button>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Workflow
                        </Button>
                    </Link>

                    <Button
                        variant="outline"
                        onClick={() => handleStatusChange(workflow.status === 'active' ? 'paused' : 'active')}
                        disabled={actionLoading === 'status'}
                    >
                        {actionLoading === 'status' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : workflow.status === 'active' ? (
                            <Pause className="mr-2 h-4 w-4" />
                        ) : (
                            <Play className="mr-2 h-4 w-4" />
                        )}
                        {workflow.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>

                    <Button variant="outline" onClick={handleDuplicate} disabled={actionLoading === 'duplicate'}>
                        {actionLoading === 'duplicate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Duplicate
                    </Button>

                    <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === 'delete'}>
                        {actionLoading === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>

                {/* Workflow Details */}
                <div className="grid grid-cols-1 gap-6 px-5 md:grid-cols-2">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Workflow Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Status</label>
                                <div className="mt-1">{getStatusBadge(workflow.status)}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Created</label>
                                <p className="mt-1">{formatDate(workflow.created_at)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                                <p className="mt-1">{formatDate(workflow.updated_at)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Total Executions</label>
                                <p className="mt-1">{workflow.executions_count || 0}</p>
                            </div>
                            {workflow.last_execution && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Last Execution</label>
                                    <p className="mt-1">{formatDate(workflow.last_execution)}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Trigger Step */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Trigger</CardTitle>
                            <CardDescription>How this workflow is initiated</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {getTriggerStep() ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                                            <div className="h-4 w-4 rounded bg-blue-600"></div>
                                        </div>
                                        <div>
                                            <p className="font-medium">{getTriggerStep()?.service}</p>
                                            <p className="text-sm text-gray-500">{getTriggerStep()?.operation}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>No trigger configured. Edit the workflow to add a trigger.</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 px-5">
                    {/* Action Steps */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                            <CardDescription>What happens when this workflow runs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {getActionSteps().length > 0 ? (
                                <div className="space-y-4">
                                    {getActionSteps().map((step, index) => (
                                        <div key={step.id} className="flex items-center gap-4 rounded-lg border p-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                                                <span className="text-sm font-medium text-green-600">{index + 1}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{step.service}</p>
                                                <p className="text-sm text-gray-500">{step.operation}</p>
                                                {step.enabled === false && (
                                                    <Badge variant="secondary" className="mt-1">
                                                        Disabled
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>No actions configured. Edit the workflow to add actions.</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
