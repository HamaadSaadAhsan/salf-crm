import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PermissionMatrix } from './permission-matrix';
import { CreatePermissionSheet } from './create-permission-sheet';
import { Content } from '@/crm/layout/components/content';
import { Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
              <div className="flex w-full items-center justify-between px-4 py-3 border-b">
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                          <Lock className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Permissions Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage the permission matrix across all roles</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={() => setShowCreateSheet(true)} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Permission
                      </Button>
                  </div>
              </div>
              <Content className="w-full">
                  <div className="w-full">
                      <PermissionMatrix roles={roles} permissions={permissions} />
                  </div>
              </Content>
          </AppLayout>

          <CreatePermissionSheet open={showCreateSheet} onOpenChange={setShowCreateSheet} />
      </>
  );
}
