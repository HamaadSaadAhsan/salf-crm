import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Globe, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  zone_id?: number;
  zone?: {
    id: number;
    name: string;
    code?: string;
  };
}

interface Zone {
  id: number;
  name: string;
  code?: string;
  description?: string;
  offices_count?: number;
}

interface EditZoneSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  zones: Zone[];
}

export function EditZoneSheet({
  open,
  onOpenChange,
  user,
  zones,
}: EditZoneSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('none');
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedZoneId(user.zone_id?.toString() || 'none');
    } else {
      setSelectedZoneId('none');
    }
    setError(null);
    setSuccess(null);
  }, [user, open]);

  const selectedZone = zones.find(z => z.id.toString() === selectedZoneId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const zoneId = selectedZoneId === 'none' ? null : selectedZoneId;

    try {
      await axios.patch(`/api/users/${user.id}/zone`, {
        zone_id: zoneId,
      });

      setSuccess('Zone updated successfully!');
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['users'] });
      }, 1500);
    } catch (err: any) {
      console.error('Zone update error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.zone_id?.[0] ||
        'Failed to update zone. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Globe className="size-4 text-primary" />
            Edit Zone
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(90dvh-11.75rem)] ps-3 pe-2 me-1">
            <form id="zone-form" onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Zone</p>
                <p className="text-sm text-muted-foreground">
                  {user.zone ? (
                    <>
                      {user.zone.name}
                      {user.zone.code && (
                        <span className="ml-2 text-xs">({user.zone.code})</span>
                      )}
                    </>
                  ) : (
                    'No zone assigned'
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select New Zone</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full justify-between"
                    disabled={isLoading}
                  >
                    <span className="truncate">
                      {selectedZoneId === 'none' ? (
                        'Select a zone...'
                      ) : selectedZone ? (
                        <>
                          {selectedZone.name}
                          {selectedZone.code && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({selectedZone.code})
                            </span>
                          )}
                        </>
                      ) : (
                        'Select a zone...'
                      )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[102]" align="start">
                  <Command>
                    <CommandInput placeholder="Search zones..." />
                    <CommandList>
                      <CommandEmpty>No zone found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setSelectedZoneId('none');
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedZoneId === 'none' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="text-muted-foreground">No Zone</span>
                        </CommandItem>
                        {zones.map((zone) => (
                          <CommandItem
                            key={zone.id}
                            value={`${zone.name} ${zone.code || ''} ${zone.description || ''}`}
                            onSelect={() => {
                              setSelectedZoneId(zone.id.toString());
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedZoneId === zone.id.toString() ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>
                                {zone.name}
                                {zone.code && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({zone.code})
                                  </span>
                                )}
                              </span>
                              {zone.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {zone.description}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {zones.length} zones available
              </p>
            </div>
          </div>

            </form>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center border-t border-border px-5 py-3.5 not-only-of-type:justify-between">
          <div className="flex items-center gap-2 ms-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" form="zone-form" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Zone'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
