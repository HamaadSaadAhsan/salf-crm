import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import OfficeList from './office-list';
import { OfficeSheet } from './office-sheet';
import { Content } from '@/crm/layout/components/content';
import { Building, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Office {
  id: number;
  zone_id?: number;
  zone?: {
    id: number;
    name: string;
    code?: string;
  };
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  users_count: number;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: number;
  name: string;
  code?: string;
}

interface OfficesPageProps {
  offices: Office[];
  zones: Zone[];
}

export default function OfficesPage({ offices, zones }: OfficesPageProps) {
  const [showOfficeSheet, setShowOfficeSheet] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);

  const handleNewOffice = () => {
    setSelectedOffice(null);
    setShowOfficeSheet(true);
  };

  const handleEditOffice = (office: Office) => {
    setSelectedOffice(office);
    setShowOfficeSheet(true);
  };

  const handleCloseSheet = () => {
    setShowOfficeSheet(false);
    setSelectedOffice(null);
  };

  const officesList = Array.isArray(offices) ? offices : [];
  const zonesList = Array.isArray(zones) ? zones : [];

  return (
      <>
          <AppLayout>
              <Head title="Offices Management" />
              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <Building className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Offices Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage office locations and assign them to zones</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewOffice} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Office
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <OfficeList offices={officesList} onEditOffice={handleEditOffice} />
              </Content>
          </AppLayout>

          <OfficeSheet open={showOfficeSheet} onOpenChange={handleCloseSheet} office={selectedOffice} zones={zonesList} />
      </>
  );
}
