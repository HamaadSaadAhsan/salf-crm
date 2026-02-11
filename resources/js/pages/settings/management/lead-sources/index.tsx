import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { LeadSourceList } from './lead-source-list';
import { LeadSourceSheet } from './lead-source-sheet';
import { Content } from '@/crm/layout/components/content';
import axios from '@/lib/axios';
import { router } from '@inertiajs/react';

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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete lead source.';
      alert(errorMessage);
    }
  };

  const sourcesList = Array.isArray(leadSources) ? leadSources : [];

  return (
    <>
      <AppLayout>
        <Head title="Lead Sources Management" />
        <PageHeader onNewSource={handleNewSource} />
        <Content className="px-0">
          <div className="py-4">
            <LeadSourceList
              leadSources={sourcesList}
              onEditSource={handleEditSource}
              onDeleteSource={handleDeleteSource}
            />
          </div>
        </Content>
      </AppLayout>

      <LeadSourceSheet
        open={showSourceSheet}
        onOpenChange={setShowSourceSheet}
        source={selectedSource}
      />
    </>
  );
}
