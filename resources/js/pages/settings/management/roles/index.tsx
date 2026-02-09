import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { RoleList } from './role-list';
import { RoleSheet } from './role-sheet';
import { DeleteRoleDialog } from './delete-role-dialog';
import { Content } from '@/crm/layout/components/content';

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
      <AppLayout>
        <Head title="Roles Management" />
        <PageHeader onNewRole={handleNewRole} />
        <Content className="px-0">
          <div className="py-4">
            <RoleList
              roles={roles}
              onEditRole={handleEditRole}
              onDeleteRole={setDeleteRole}
            />
          </div>
        </Content>
      </AppLayout>

      <RoleSheet
        open={showSheet}
        onOpenChange={handleCloseSheet}
        role={selectedRole}
        permissions={permissions}
      />

      <DeleteRoleDialog
        role={deleteRole}
        onOpenChange={() => setDeleteRole(null)}
      />
    </>
  );
}
