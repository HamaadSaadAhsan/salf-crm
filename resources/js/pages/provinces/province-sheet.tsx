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
import { Province } from './index';
import axios from '@/lib/http';
import { cn } from '@/lib/utils';

interface ProvinceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  province?: Province | null;
}

interface Country {
  id: number;
  name: string;
  code: string;
  iso2: string;
}

export function ProvinceSheet({
  open,
  onOpenChange,
  province,
}: ProvinceSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    country_id: '',
    is_active: true,
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (province) {
      setFormData({
        name: province.name || '',
        code: province.code || '',
        country_id: province.country_id?.toString() || '',
        is_active: province.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        country_id: '',
        is_active: true,
      });
    }
    setError(null);
    setSuccess(null);
  }, [province, open]);

  const fetchCountries = async () => {
    try {
      const response = await axios.get('/api/countries');
      setCountries(response.data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = province ? `/provinces/${province.id}` : '/provinces';
    const method = province ? 'put' : 'post';

    router[method](
      url,
      formData,
      {
        onSuccess: () => {
          setSuccess(
            province
              ? 'Province updated successfully!'
              : 'Province created successfully!',
          );
          setTimeout(() => {
            onOpenChange(false);
          }, 1500);
        },
        onError: (errors) => {
          setError(
            errors?.message ||
              Object.values(errors).flat().join(', ') ||
              'Failed to save province',
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
              {province ? 'Edit Province' : 'Create Province'}
            </SheetTitle>
            <SheetDescription>
              {province
                ? 'Update the province information below.'
                : 'Fill in the details to create a new province.'}
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
                <Label htmlFor="name">Province Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="California"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Province Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="CA"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country_id">Country *</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between font-normal"
                      >
                        {formData.country_id
                          ? countries.find(
                              (country) =>
                                country.id.toString() === formData.country_id,
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
                                  setFormData({
                                    ...formData,
                                    country_id: country.id.toString(),
                                  });
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.country_id === country.id.toString()
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
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable or disable this province
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
                : province
                  ? 'Update Province'
                  : 'Create Province'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
