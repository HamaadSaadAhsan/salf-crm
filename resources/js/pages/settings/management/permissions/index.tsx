import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { PermissionMatrix } from './permission-matrix';
import { CreatePermissionSheet } from './create-permission-sheet';
import { Content } from '@/crm/layout/components/content';

export interface Permission {
  id: number;
  name: string;
}

export interface MatrixRole {
  id: number;
  name: string;
  permissions: number[];
}

interface PermissionsPageProps {
  roles: MatrixRole[];
  permissions: Permission[];
}

export default function PermissionsPage({ roles, permissions }: PermissionsPageProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  return (
    <>
      <AppLayout>
        <Head title="Permissions Management" />
        <PageHeader onNewPermission={() => setShowCreateSheet(true)} />
        <Content className="w-full">
          <div className="w-full py-4">
            <PermissionMatrix roles={roles} permissions={permissions} />
          </div>
        </Content>
      </AppLayout>

      <CreatePermissionSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
      />
    </>
  );
}
