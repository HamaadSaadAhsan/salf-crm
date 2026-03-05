import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ZoneList from './zone-list';
import { ZoneSheet } from './zone-sheet';
import { Content } from '@/crm/layout/components/content';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
              {/*
        <PageHeader onNewZone={handleNewZone} />
*/}

              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <MapPin className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Zones Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage geographic zones for territory organization and lead assignment</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewZone} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Zone
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <ZoneList zones={zonesList} onEditZone={handleEditZone} />
                  </div>
              </Content>
          </AppLayout>

          <ZoneSheet open={showZoneSheet} onOpenChange={handleCloseSheet} zone={selectedZone} />
      </>
  );
}
