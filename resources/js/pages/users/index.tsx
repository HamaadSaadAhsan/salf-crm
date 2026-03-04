import { Content } from '@/crm/layout/components/content';
import AppLayout from '@/layouts/app-layout';
import { management } from '@/routes/settings';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { NewUserSheet } from './new-user-sheet';
import { PageHeader } from './page-header';
import UserList from './user-list';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    active_services_count?: number;
    leads_count?: number;
    active_leads_count?: number;
    active_services?: Array<{
        id: number;
        name: string;
        country_code?: string;
        country_name?: string;
    }>;
    roles?: Array<{
        id: number;
        name: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface Zone {
    id: number;
    name: string;
    code?: string;
    description?: string;
    is_active: boolean;
}

interface Office {
    id: number;
    name: string;
    code?: string;
    zone_id?: number;
    zone?: {
        id: number;
        name: string;
        code?: string;
    };
    is_active: boolean;
}

interface Service {
    id: number;
    name: string;
    detail?: string;
    country_code?: string;
    country_name?: string;
    parent_id?: number;
    children?: Service[];
}

interface UsersPageProps {
    users: {
        data: User[];
        meta: {
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
        };
    };
    zones?: Zone[];
    offices?: Office[];
    services?: Service[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Management',
        href: management().url,
    },
    {
        title: 'Users',
        href: '/users',
    },
];

export default function UsersPage({ users, zones = [], offices = [], services = [] }: UsersPageProps) {
    const [showNewUserDialog, setShowNewUserDialog] = useState(false);
    const initialSearch = new URLSearchParams(window.location.search).get('search') ?? '';

    const handleNewUser = () => {
        setShowNewUserDialog(true);
    };

    // Ensure users data exists
    const usersData = users?.data || [];

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Users Management" />
                <PageHeader onNewUser={handleNewUser} />
                <Content className="px-0 pt-0">
                    <UserList users={usersData} zones={zones} offices={offices} services={services} initialSearch={initialSearch} />
                </Content>
            </AppLayout>

            {/* New User Sheet - Rendered outside AppLayout for proper overlay */}
            <NewUserSheet open={showNewUserDialog} onOpenChange={setShowNewUserDialog} />
        </>
    );
}
