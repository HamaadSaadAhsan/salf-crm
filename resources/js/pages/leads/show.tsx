import type { ActivityItem } from '@/components/activity-list';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Lead as LeadComponent } from './show/lead';
import { PageHeader } from './show/page-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leads', href: '/leads' },
    { title: 'Lead Details', href: '#' },
];

type TagValue = string | { label: string; value: string; color?: string };

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    inquiry_status: string;
    source?: {
        data: {
            id: number;
            name: string;
            slug: string;
        };
    } | null;
    service?: {
        data: {
            id: number;
            name: string;
        };
    } | null;
    tags?: TagValue[];
    owner_id: number | null;
    owner: {
        id: number;
        name: string;
        email: string;
    } | null;
    converted_at: string | null;
    created_at: string;
    updated_at: string;
    activities?: { data: ActivityItem[] };
};

export default function LeadShow({ lead }: { lead: Lead }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lead - ${lead.name}`} />

            <div className="flex flex-col h-full">
                <PageHeader lead={lead} />
                <div className="flex-1 overflow-hidden">
                    <LeadComponent lead={lead} />
                </div>
            </div>
        </AppLayout>
    );
}
