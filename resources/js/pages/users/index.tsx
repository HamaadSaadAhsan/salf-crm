import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import UserList from './user-list';
import { NewUserSheet } from './new-user-sheet';
import { Content } from '@/crm/layout/components/content';

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

export default function UsersPage({ users, zones = [], offices = [], services = [] }: UsersPageProps) {
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);

  const handleNewUser = () => {
    setShowNewUserDialog(true);
  };

  // Ensure users data exists
  const usersData = users?.data || [];

  return (
    <>
      <AppLayout>
        <Head title="Users Management" />
        <PageHeader onNewUser={handleNewUser} />
        <Content className="px-0">
          <div className="py-4">
            <UserList
              users={usersData}
              zones={zones}
              offices={offices}
              services={services}
            />
          </div>
        </Content>
      </AppLayout>

      {/* New User Sheet - Rendered outside AppLayout for proper overlay */}
      <NewUserSheet
        open={showNewUserDialog}
        onOpenChange={setShowNewUserDialog}
      />
    </>
  );
}
