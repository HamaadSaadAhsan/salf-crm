import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CityList from './city-list';
import { CitySheet } from './city-sheet';
import { Content } from '@/crm/layout/components/content';
import { MapPinned, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface City {
  id: number;
  name: string;
  code: string;
  province_id: number;
  province?: {
    id: number;
    name: string;
    code: string;
    country?: {
      id: number;
      name: string;
      code: string;
      iso2: string;
    };
  };
  latitude?: string;
  longitude?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CitiesPageProps {
  cities: City[];
}

export default function CitiesPage({ cities }: CitiesPageProps) {
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const handleNewCity = () => {
    setSelectedCity(null);
    setShowCitySheet(true);
  };

  const handleEditCity = (city: City) => {
    setSelectedCity(city);
    setShowCitySheet(true);
  };

  const handleCloseSheet = () => {
    setShowCitySheet(false);
    setSelectedCity(null);
  };

  const citiesList = Array.isArray(cities) ? cities : [];

  return (
      <>
          <AppLayout>
              <Head title="Cities Management" />
              {/*
        <PageHeader onNewCity={handleNewCity} />
*/}

              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <MapPinned className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Cities Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage cities and municipalities</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewCity} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New City
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <CityList cities={citiesList} onEditCity={handleEditCity} />
                  </div>
              </Content>
          </AppLayout>

          <CitySheet open={showCitySheet} onOpenChange={handleCloseSheet} city={selectedCity} />
      </>
  );
}
