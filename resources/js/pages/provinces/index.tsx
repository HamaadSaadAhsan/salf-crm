import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ProvinceList from './province-list';
import { ProvinceSheet } from './province-sheet';
import { Content } from '@/crm/layout/components/content';
import { Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Province {
  id: number;
  name: string;
  code: string;
  country_id: number;
  country?: {
    id: number;
    name: string;
    code: string;
    iso2: string;
  };
  is_active: boolean;
  cities_count: number;
  created_at: string;
  updated_at: string;
}

interface ProvincesPageProps {
  provinces: Province[];
}

export default function ProvincesPage({ provinces }: ProvincesPageProps) {
  const [showProvinceSheet, setShowProvinceSheet] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  const handleNewProvince = () => {
    setSelectedProvince(null);
    setShowProvinceSheet(true);
  };

  const handleEditProvince = (province: Province) => {
    setSelectedProvince(province);
    setShowProvinceSheet(true);
  };

  const handleCloseSheet = () => {
    setShowProvinceSheet(false);
    setSelectedProvince(null);
  };

  const provincesList = Array.isArray(provinces) ? provinces : [];

  return (
      <>
          <AppLayout>
              <Head title="Provinces Management" />
              {/*
        <PageHeader onNewProvince={handleNewProvince} />
*/}
              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <Map className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Provinces Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Configure provinces and states</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewProvince} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Province
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <ProvinceList provinces={provincesList} onEditProvince={handleEditProvince} />
                  </div>
              </Content>
          </AppLayout>

          <ProvinceSheet open={showProvinceSheet} onOpenChange={handleCloseSheet} province={selectedProvince} />
      </>
  );
}
