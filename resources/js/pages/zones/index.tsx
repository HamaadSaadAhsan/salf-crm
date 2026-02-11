import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import ZoneList from './zone-list';
import { ZoneSheet } from './zone-sheet';
import { Content } from '@/crm/layout/components/content';

export interface Zone {
  id: number;
  name: string;
  code?: string;
  description?: string;
  country_code?: string;
  is_active: boolean;
  users_count: number;
  leads_count: number;
  offices_count: number;
  cities_count: number;
  city_ids: number[];
  province_id?: number;
  province_ids?: number[];
  country_id?: number;
  created_at: string;
  updated_at: string;
}

interface ZonesPageProps {
  zones: Zone[];
}

export default function ZonesPage({ zones }: ZonesPageProps) {
  const [showZoneSheet, setShowZoneSheet] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const handleNewZone = () => {
    setSelectedZone(null);
    setShowZoneSheet(true);
  };

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setShowZoneSheet(true);
  };

  const handleCloseSheet = () => {
    setShowZoneSheet(false);
    setSelectedZone(null);
  };

  const zonesList = Array.isArray(zones) ? zones : [];

  return (
    <>
      <AppLayout>
        <Head title="Zones Management" />
        <PageHeader onNewZone={handleNewZone} />
        <Content className="px-0">
          <div className="py-4">
            <ZoneList zones={zonesList} onEditZone={handleEditZone} />
          </div>
        </Content>
      </AppLayout>

      <ZoneSheet
        open={showZoneSheet}
        onOpenChange={handleCloseSheet}
        zone={selectedZone}
      />
    </>
  );
}
