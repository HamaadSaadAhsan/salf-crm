import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import CityList from './city-list';
import { CitySheet } from './city-sheet';
import { Content } from '@/crm/layout/components/content';

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
        <PageHeader onNewCity={handleNewCity} />
        <Content className="px-0">
          <div className="py-4">
            <CityList
              cities={citiesList}
              onEditCity={handleEditCity}
            />
          </div>
        </Content>
      </AppLayout>

      <CitySheet
        open={showCitySheet}
        onOpenChange={handleCloseSheet}
        city={selectedCity}
      />
    </>
  );
}
