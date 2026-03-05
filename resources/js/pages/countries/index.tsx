import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CountryList from './country-list';
import { CountrySheet } from './country-sheet';
import { Content } from '@/crm/layout/components/content';
import { Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
              {/*
        <PageHeader onNewCountry={handleNewCountry} />
*/}
              <div className="flex w-full items-center justify-between border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                          <Globe className="size-5 text-primary" />
                          <h1 className="text-lg font-semibold">Countries Management</h1>
                      </div>
                      <p className="text-sm text-muted-foreground">Manage countries and regional settings</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={handleNewCountry} className="flex items-center gap-2">
                          <Plus className="size-4" />
                          New Country
                      </Button>
                  </div>
              </div>
              <Content className="px-0">
                  <div>
                      <CountryList countries={countriesList} onEditCountry={handleEditCountry} />
                  </div>
              </Content>
          </AppLayout>

          <CountrySheet open={showCountrySheet} onOpenChange={handleCloseSheet} country={selectedCountry} />
      </>
  );
}
