import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { StatusList } from './status-list';
import { StatusSheet } from './status-sheet';
import { Content } from '@/crm/layout/components/content';
import axios from '@/lib/axios';
import { router } from '@inertiajs/react';

export interface Status {
  id: number;
  name: string;
  color: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

interface LeadStatusesPageProps {
  statuses: Status[];
  leadStatusOptions?: Record<string, string>;
}

export default function LeadStatusesPage({ statuses, leadStatusOptions }: LeadStatusesPageProps) {
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);

  const handleNewStatus = () => {
    setSelectedStatus(null);
    setShowStatusSheet(true);
  };

  const handleEditStatus = (status: Status) => {
    setSelectedStatus(status);
    setShowStatusSheet(true);
  };

  const handleCloseSheet = () => {
    setShowStatusSheet(false);
    setSelectedStatus(null);
  };

  const handleDeleteStatus = async (status: Status) => {
    if (!confirm(`Are you sure you want to delete "${status.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/statuses/${status.id}`);
      router.reload({ only: ['statuses'] });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete status.';
      alert(errorMessage);
    }
  };

  const statusesList = Array.isArray(statuses) ? statuses : [];

  return (
    <>
      <AppLayout>
        <Head title="Lead Statuses Management" />
        <PageHeader onNewStatus={handleNewStatus} />
        <Content className="px-0">
          <div className="py-4">
            <StatusList
              statuses={statusesList}
              onEditStatus={handleEditStatus}
              onDeleteStatus={handleDeleteStatus}
            />
          </div>
        </Content>
      </AppLayout>

      <StatusSheet
        open={showStatusSheet}
        onOpenChange={setShowStatusSheet}
        status={selectedStatus}
      />
    </>
  );
}
