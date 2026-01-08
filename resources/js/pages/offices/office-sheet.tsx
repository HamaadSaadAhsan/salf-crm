import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Office, Zone } from './index';
import { cn } from '@/lib/utils';

interface OfficeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office?: Office | null;
  zones: Zone[];
}

export function OfficeSheet({
  open,
  onOpenChange,
  office,
  zones,
}: OfficeSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    zone_id: 'none',
    name: '',
    code: '',
    address: '',
    city: '',
    country_code: '',
    postal_code: '',
    phone: '',
    email: '',
    is_active: true,
  });
  const [zoneOpen, setZoneOpen] = useState(false);

  useEffect(() => {
    if (office) {
      setFormData({
        zone_id: office.zone_id?.toString() || 'none',
        name: office.name || '',
        code: office.code || '',
        address: office.address || '',
        city: office.city || '',
        country_code: office.country_code || '',
        postal_code: office.postal_code || '',
        phone: office.phone || '',
        email: office.email || '',
        is_active: office.is_active ?? true,
      });
    } else {
      setFormData({
        zone_id: 'none',
        name: '',
        code: '',
        address: '',
        city: '',
        country_code: '',
        postal_code: '',
        phone: '',
        email: '',
        is_active: true,
      });
    }
    setError(null);
    setSuccess(null);
  }, [office, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const submitData = {
      ...formData,
      zone_id: formData.zone_id && formData.zone_id !== 'none' ? formData.zone_id : null,
    };

    const url = office ? `/offices/${office.id}` : '/offices';
    const method = office ? 'patch' : 'post';

    router[method](url, submitData, {
      onSuccess: () => {
        const message = office
          ? 'Office updated successfully!'
          : 'Office created successfully!';
        setSuccess(message);

        if (!office) {
          setFormData({
            zone_id: '',
            name: '',
            code: '',
            address: '',
            city: '',
            country_code: '',
            postal_code: '',
            phone: '',
            email: '',
            is_active: true,
          });
        }

        setTimeout(() => {
          onOpenChange(false);
          setSuccess(null);
          router.reload({ only: ['offices'] });
        }, 1500);
      },
      onError: (errors: any) => {
        console.error('Office save error:', errors);
        const errorMessage =
          errors?.message ||
          errors?.name?.[0] ||
          errors?.code?.[0] ||
          errors?.email?.[0] ||
          'Failed to save office. Please try again.';
        setError(errorMessage);
      },
      onFinish: () => {
        setIsLoading(false);
      },
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {office ? 'Edit Office' : 'Create New Office'}
          </SheetTitle>
          <SheetDescription>
            {office
              ? 'Update the office details below.'
              : 'Add a new office location. Fill in the details below.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6 mb-6">
          {success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">
                Office Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="New York Office"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Office Code</Label>
              <Input
                id="code"
                name="code"
                placeholder="NY-001"
                value={formData.code}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone_id">Zone</Label>
              <Popover open={zoneOpen} onOpenChange={setZoneOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={zoneOpen}
                    disabled={isLoading}
                    className="w-full justify-between font-normal"
                  >
                    {formData.zone_id === 'none'
                      ? 'No Zone'
                      : zones.find(
                          (zone) => zone.id.toString() === formData.zone_id,
                        )?.name || 'Select a zone'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[150]" align="start">
                  <Command>
                    <CommandInput placeholder="Search zone..." />
                    <CommandList>
                      <CommandEmpty>No zone found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            handleSelectChange('zone_id', 'none');
                            setZoneOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              formData.zone_id === 'none'
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          No Zone
                        </CommandItem>
                        {zones.map((zone) => (
                          <CommandItem
                            key={zone.id}
                            value={`${zone.name} ${zone.code || ''}`}
                            onSelect={() => {
                              handleSelectChange('zone_id', zone.id.toString());
                              setZoneOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.zone_id === zone.id.toString()
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            {zone.name} {zone.code ? `(${zone.code})` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="123 Main Street, Suite 400"
                value={formData.address}
                onChange={handleChange}
                disabled={isLoading}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="New York"
                value={formData.city}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                name="country_code"
                placeholder="US"
                value={formData.country_code}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                placeholder="10001"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="office@company.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">
                Active Status
              </Label>
              <div className="text-sm text-muted-foreground">
                Only active offices can be assigned to users
              </div>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={handleSwitchChange}
              disabled={isLoading}
            />
          </div>

          <SheetFooter className="gap-2 pt-4">
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
                : office
                  ? 'Update Office'
                  : 'Create Office'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
