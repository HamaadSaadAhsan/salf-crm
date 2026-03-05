import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { LeadSourceList } from './lead-source-list';
import { LeadSourceSheet } from './lead-source-sheet';
import { Content } from '@/crm/layout/components/content';
import axios from '@/lib/axios';
import { router } from '@inertiajs/react';
import { Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LeadSource {
  id: number;
  name: string;
  slug?: string;
  identifier?: string;
  status: string;
  source_score?: number;
  is_active: boolean;
  leads_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface LeadSourcesPageProps {
  leadSources: LeadSource[];
}

export default function LeadSourcesPage({ leadSources }: LeadSourcesPageProps) {
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [selectedSource, setSelectedSource] = useState<LeadSource | null>(null);

  const handleNewSource = () => {
    setSelectedSource(null);
    setShowSourceSheet(true);
  };

  const handleEditSource = (source: LeadSource) => {
    setSelectedSource(source);
    setShowSourceSheet(true);
  };

  const handleCloseSheet = () => {
    setShowSourceSheet(false);
    setSelectedSource(null);
  };

  const handleDeleteSource = async (source: LeadSource) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/sources/${source.id}`);
      router.reload({ only: ['leadSources'] });
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to delete lead source.';
      alert(errorMessage);
    }
  };

  const sourcesList = Array.isArray(leadSources) ? leadSources : [];

  return (
      <>
          <AppLayout>
              <Head title="Lead Sources Management" />
              {/*
        <PageHeader onNewSource={handleNewSource} />
*/}
              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                          <Share2 className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Lead Sources Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage and organize lead sources</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewSource} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Source
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <LeadSourceList leadSources={sourcesList} onEditSource={handleEditSource} onDeleteSource={handleDeleteSource} />
                  </div>
              </Content>
          </AppLayout>

          <LeadSourceSheet open={showSourceSheet} onOpenChange={handleCloseSheet} source={selectedSource} />
      </>
  );
}
