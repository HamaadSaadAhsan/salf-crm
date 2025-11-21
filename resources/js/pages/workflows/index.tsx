import WorkflowsList from '@/components/workflows/workflows-list';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Workflow } from '@/types/workflow';
import { BreadcrumbItem } from '@/types';

interface WorkflowsPageProps {
    workflows: Workflow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workflows',
        href: '/workflows',
    },
];

export default function WorkflowsPage({ workflows }: WorkflowsPageProps) {
    const handleEditWorkflow = (workflowId: number) => {
        router.visit(`/workflows/${workflowId}/edit`);
    };

    console.log(workflows);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Workflows" />
            <WorkflowsList workflows={workflows} onEditWorkflowAction={handleEditWorkflow} />
        </AppLayout>
    );
}
