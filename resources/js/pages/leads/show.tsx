import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import type { Lead } from '@/types/lead';
import { Head } from '@inertiajs/react';
import { LeadPage as LeadComponent } from './show/lead';
import { PageHeader } from './show/page-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leads', href: '/leads' },
    { title: 'Lead Details', href: '#' },
];

type Props = {
    lead: Lead;
    users?: User[];
};

export default function LeadShow({ lead, users = [] }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lead - ${lead.name}`} />

            <div className="flex flex-col h-full">
                <PageHeader lead={lead} />
                <div className="flex-1 overflow-hidden">
                    <LeadComponent lead={lead} users={users} />
                </div>
            </div>
        </AppLayout>
    );
}
