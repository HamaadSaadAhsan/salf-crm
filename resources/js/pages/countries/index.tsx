import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import CountryList from './country-list';
import { CountrySheet } from './country-sheet';
import { Content } from '@/crm/layout/components/content';

export interface Country {
  id: number;
  name: string;
  code: string;
  iso2: string;
  phone_code?: string;
  currency?: string;
  currency_symbol?: string;
  is_active: boolean;
  provinces_count: number;
  created_at: string;
  updated_at: string;
}

interface CountriesPageProps {
  countries: Country[];
}

export default function CountriesPage({ countries }: CountriesPageProps) {
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const handleNewCountry = () => {
    setSelectedCountry(null);
    setShowCountrySheet(true);
  };

  const handleEditCountry = (country: Country) => {
    setSelectedCountry(country);
    setShowCountrySheet(true);
  };

  const handleCloseSheet = () => {
    setShowCountrySheet(false);
    setSelectedCountry(null);
  };

  const countriesList = Array.isArray(countries) ? countries : [];

  return (
    <>
      <AppLayout>
        <Head title="Countries Management" />
        <PageHeader onNewCountry={handleNewCountry} />
        <Content className="px-0">
          <div className="py-4">
            <CountryList
              countries={countriesList}
              onEditCountry={handleEditCountry}
            />
          </div>
        </Content>
      </AppLayout>

      <CountrySheet
        open={showCountrySheet}
        onOpenChange={handleCloseSheet}
        country={selectedCountry}
      />
    </>
  );
}
