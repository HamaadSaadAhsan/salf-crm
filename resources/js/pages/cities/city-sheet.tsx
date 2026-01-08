import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ChevronsUpDown, Check } from 'lucide-react';
import { City } from './index';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface CitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city?: City | null;
}

interface Country {
  id: number;
  name: string;
  code: string;
  iso2: string;
}

interface Province {
  id: number;
  name: string;
  code: string;
  country_id: number;
}

export function CitySheet({ open, onOpenChange, city }: CitySheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    province_id: '',
    latitude: '',
    longitude: '',
    is_active: true,
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountryId) {
      fetchProvinces(selectedCountryId);
    } else {
      setProvinces([]);
    }
  }, [selectedCountryId]);

  useEffect(() => {
    if (city) {
      setFormData({
        name: city.name || '',
        code: city.code || '',
        province_id: city.province_id?.toString() || '',
        latitude: city.latitude || '',
        longitude: city.longitude || '',
        is_active: city.is_active ?? true,
      });

      if (city.province?.country?.id) {
        setSelectedCountryId(city.province.country.id);
      }
    } else {
      setFormData({
        name: '',
        code: '',
        province_id: '',
        latitude: '',
        longitude: '',
        is_active: true,
      });
      setSelectedCountryId(null);
    }
    setError(null);
    setSuccess(null);
  }, [city, open]);

  const fetchCountries = async () => {
    try {
      const response = await axios.get('/api/countries');
      setCountries(response.data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchProvinces = async (countryId: number) => {
    setIsLoadingProvinces(true);
    try {
      const response = await axios.get(`/api/provinces?country_id=${countryId}`);
      setProvinces(response.data.provinces || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvinces([]);
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const handleCountryChange = (value: string) => {
    const countryId = parseInt(value);
    setSelectedCountryId(countryId);
    setFormData({ ...formData, province_id: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = city ? `/cities/${city.id}` : '/cities';
    const method = city ? 'put' : 'post';

    router[method](
      url,
      formData,
      {
        onSuccess: () => {
          setSuccess(
            city
              ? 'City updated successfully!'
              : 'City created successfully!',
          );
          setTimeout(() => {
            onOpenChange(false);
          }, 1500);
        },
        onError: (errors) => {
          setError(
            errors?.message ||
              Object.values(errors).flat().join(', ') ||
              'Failed to save city',
          );
        },
        onFinish: () => {
          setIsLoading(false);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>
              {city ? 'Edit City' : 'Create City'}
            </SheetTitle>
            <SheetDescription>
              {city
                ? 'Update the city information below.'
                : 'Fill in the details to create a new city.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert
                variant="default"
                className="border-green-200 bg-green-50 text-green-900"
              >
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">City Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Los Angeles"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">City Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="LA"
                  maxLength={10}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedCountryId
                          ? countries.find(
                              (country) => country.id === selectedCountryId,
                            )?.name
                          : 'Select country'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-[150]" align="start">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.id}
                                value={country.name}
                                onSelect={() => {
                                  handleCountryChange(country.id.toString());
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedCountryId === country.id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {country.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province_id">Province/State *</Label>
                  <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={provinceOpen}
                        disabled={!selectedCountryId || isLoadingProvinces}
                        className="w-full justify-between font-normal"
                      >
                        {formData.province_id
                          ? provinces.find(
                              (province) =>
                                province.id.toString() === formData.province_id,
                            )?.name
                          : isLoadingProvinces
                            ? 'Loading...'
                            : 'Select province'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-[150]" align="start">
                      <Command>
                        <CommandInput placeholder="Search province..." />
                        <CommandList>
                          <CommandEmpty>No province found.</CommandEmpty>
                          <CommandGroup>
                            {provinces.map((province) => (
                              <CommandItem
                                key={province.id}
                                value={province.name}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    province_id: province.id.toString(),
                                  });
                                  setProvinceOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.province_id === province.id.toString()
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {province.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    placeholder="34.0522"
                    type="text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    placeholder="-118.2437"
                    type="text"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable or disable this city
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : city
                  ? 'Update City'
                  : 'Create City'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
