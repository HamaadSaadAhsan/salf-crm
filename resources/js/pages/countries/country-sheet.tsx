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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Country } from './index';

interface CountrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: Country | null;
}

export function CountrySheet({
  open,
  onOpenChange,
  country,
}: CountrySheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    iso2: '',
    phone_code: '',
    currency: '',
    currency_symbol: '',
    is_active: true,
  });

  useEffect(() => {
    if (country) {
      setFormData({
        name: country.name || '',
        code: country.code || '',
        iso2: country.iso2 || '',
        phone_code: country.phone_code || '',
        currency: country.currency || '',
        currency_symbol: country.currency_symbol || '',
        is_active: country.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        iso2: '',
        phone_code: '',
        currency: '',
        currency_symbol: '',
        is_active: true,
      });
    }
    setError(null);
    setSuccess(null);
  }, [country, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = country ? `/countries/${country.id}` : '/countries';
    const method = country ? 'put' : 'post';

    router[method](
      url,
      formData,
      {
        onSuccess: () => {
          setSuccess(
            country
              ? 'Country updated successfully!'
              : 'Country created successfully!',
          );
          setTimeout(() => {
            onOpenChange(false);
          }, 1500);
        },
        onError: (errors) => {
          setError(
            errors?.message ||
              Object.values(errors).flat().join(', ') ||
              'Failed to save country',
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
              {country ? 'Edit Country' : 'Create Country'}
            </SheetTitle>
            <SheetDescription>
              {country
                ? 'Update the country information below.'
                : 'Fill in the details to create a new country.'}
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
                <Label htmlFor="name">Country Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="United States"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">ISO3 Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="USA"
                    maxLength={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iso2">ISO2 Code *</Label>
                  <Input
                    id="iso2"
                    value={formData.iso2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iso2: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="US"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_code">Phone Code</Label>
                <Input
                  id="phone_code"
                  value={formData.phone_code}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_code: e.target.value })
                  }
                  placeholder="+1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="USD"
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency_symbol">Currency Symbol</Label>
                  <Input
                    id="currency_symbol"
                    value={formData.currency_symbol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency_symbol: e.target.value,
                      })
                    }
                    placeholder="$"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable or disable this country
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
                : country
                  ? 'Update Country'
                  : 'Create Country'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
