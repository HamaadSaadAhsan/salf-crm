import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import ProvinceList from './province-list';
import { ProvinceSheet } from './province-sheet';
import { Content } from '@/crm/layout/components/content';

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
        <PageHeader onNewProvince={handleNewProvince} />
        <Content className="px-0">
          <div className="py-4">
            <ProvinceList
              provinces={provincesList}
              onEditProvince={handleEditProvince}
            />
          </div>
        </Content>
      </AppLayout>

      <ProvinceSheet
        open={showProvinceSheet}
        onOpenChange={handleCloseSheet}
        province={selectedProvince}
      />
    </>
  );
}
