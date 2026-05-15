import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { StatusList } from './status-list';
import { StatusSheet } from './status-sheet';
import { Content } from '@/crm/layout/components/content';
import axios from '@/lib/http';
import { router } from '@inertiajs/react';
import { ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function LeadStatusesPage({ statuses, leadStatusOptions: _leadStatusOptions }: LeadStatusesPageProps) {
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
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to delete status.';
      alert(errorMessage);
    }
  };

  const statusesList = Array.isArray(statuses) ? statuses : [];

  return (
      <>
          <AppLayout>
              <Head title="Lead Statuses Management" />
              {/*
        <PageHeader onNewStatus={handleNewStatus} />
*/}

              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                          <ListChecks className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Lead Statuses Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Configure lead lifecycle statuses and colors</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewStatus} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Status
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <StatusList statuses={statusesList} onEditStatus={handleEditStatus} onDeleteStatus={handleDeleteStatus} />
                  </div>
              </Content>
          </AppLayout>

          <StatusSheet open={showStatusSheet} onOpenChange={handleCloseSheet} status={selectedStatus} />
      </>
  );
}
