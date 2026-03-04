import { Button } from '@/components/ui/button';
import { Content } from '@/crm/layout/components/content';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import { DeleteRoleDialog } from './delete-role-dialog';
import { RoleList } from './role-list';
import { RoleSheet } from './role-sheet';

export interface Permission {
    id: number;
    name: string;
}

export interface Role {
    id: number;
    name: string;
    guard_name: string;
    users_count: number;
    permissions_count: number;
    permissions: Permission[];
}

interface RolesPageProps {
    roles: Role[];
    permissions: Permission[];
}

export default function RolesPage({ roles, permissions }: RolesPageProps) {
    const [showSheet, setShowSheet] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Management',
            href: '/settings/management',
        },
        {
            title: 'Roles',
            href: '/settings/management/roles',
        },
    ];

    const handleNewRole = () => {
        setSelectedRole(null);
        setShowSheet(true);
    };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setShowSheet(true);
    };

    const handleCloseSheet = () => {
        setShowSheet(false);
        setSelectedRole(null);
    };

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Roles Management" />
                <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Shield className="size-5 text-primary" />
                            <h1 className="text-lg font-semibold">Roles Management</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">Create and manage roles with permission assignments</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleNewRole} className="flex items-center gap-2">
                            <Plus className="size-4" />
                            New Role
                        </Button>
                    </div>
                </div>
                <Content className="px-0">
                    <RoleList roles={roles} onEditRole={handleEditRole} onDeleteRole={setDeleteRole} />
                </Content>
            </AppLayout>

            <RoleSheet open={showSheet} onOpenChange={handleCloseSheet} role={selectedRole} permissions={permissions} />

            <DeleteRoleDialog role={deleteRole} onOpenChange={() => setDeleteRole(null)} />
        </>
    );
}
