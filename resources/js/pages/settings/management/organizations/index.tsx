import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { OrganizationList } from './organization-list';
import { OrganizationSheet } from './organization-sheet';
import { DeleteOrganizationDialog } from './delete-organization-dialog';
import { Content } from '@/crm/layout/components/content';

export interface UserOption {
  id: number;
  name: string;
  email: string;
}

export interface OrganizationItem {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  is_active?: boolean;
  users_count?: number;
  owner?: { id: number; name: string; email: string } | null;
  created_at?: string;
}

interface OrganizationsPageProps {
  organizations: OrganizationItem[];
  users: UserOption[];
}

export default function OrganizationsPage({ organizations, users }: OrganizationsPageProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationItem | null>(null);
  const [deleteOrganization, setDeleteOrganization] = useState<OrganizationItem | null>(null);

  const handleNew = () => {
    setSelectedOrganization(null);
    setShowSheet(true);
  };

  const handleEdit = (organization: OrganizationItem) => {
    setSelectedOrganization(organization);
    setShowSheet(true);
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setSelectedOrganization(null);
  };

  return (
    <>
      <AppLayout>
        <Head title="Organizations Management" />
        <PageHeader onNewOrganization={handleNew} />
        <Content className="px-0">
          <div className="py-4">
            <OrganizationList
              organizations={organizations}
              onEditOrganization={handleEdit}
              onDeleteOrganization={setDeleteOrganization}
            />
          </div>
        </Content>
      </AppLayout>

      <OrganizationSheet
        open={showSheet}
        onOpenChange={handleCloseSheet}
        organization={selectedOrganization}
        users={users}
      />

      <DeleteOrganizationDialog
        organization={deleteOrganization}
        onOpenChange={() => setDeleteOrganization(null)}
      />
    </>
  );
}
