import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
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
import { AlertCircle, CheckCircle2, MapPin, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  office_id?: number;
  office?: {
    id: number;
    name: string;
    code?: string;
    zone?: {
      id: number;
      name: string;
    };
  };
}

interface Office {
  id: number;
  name: string;
  code?: string;
  zone?: {
    id: number;
    name: string;
  };
}

interface EditOfficeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  offices: Office[];
}

export function EditOfficeSheet({
  open,
  onOpenChange,
  user,
  offices,
}: EditOfficeSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('none');
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedOfficeId(user.office_id?.toString() || 'none');
    } else {
      setSelectedOfficeId('none');
    }
    setError(null);
    setSuccess(null);
  }, [user, open]);

  const selectedOffice = offices.find(o => o.id.toString() === selectedOfficeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const officeId = selectedOfficeId === 'none' ? null : selectedOfficeId;

    try {
      await axios.patch(`/api/users/${user.id}/office`, {
        office_id: officeId,
      });

      setSuccess('Office updated successfully!');
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['users'] });
      }, 1500);
    } catch (err: any) {
      console.error('Office update error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.office_id?.[0] ||
        'Failed to update office. Please try again.';
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
                      <MapPin className="size-4 text-primary" />
                      Edit Office
                  </SheetTitle>
              </SheetHeader>

              <SheetBody className="p-0">
                  <ScrollArea className="me-1 h-[calc(90dvh-11.75rem)] ps-3 pe-2">
                      <form id="office-form" onSubmit={handleSubmit} className="space-y-6">
                          {success && (
                              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
                              </Alert>
                          )}

                          {error && (
                              <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{error}</AlertDescription>
                              </Alert>
                          )}

                          <div className="space-y-4">
                              <div className="rounded-lg border bg-muted/50 p-4">
                                  <div className="space-y-2">
                                      <p className="text-sm font-medium">Current Office</p>
                                      <p className="text-sm text-muted-foreground">
                                          {user.office ? (
                                              <>
                                                  {user.office.name}
                                                  {user.office.code && <span className="ml-2 text-xs">({user.office.code})</span>}
                                                  {user.office.zone && <span className="mt-1 block text-xs">Zone: {user.office.zone.name}</span>}
                                              </>
                                          ) : (
                                              'No office assigned'
                                          )}
                                      </p>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <Label>Select New Office</Label>
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
                                                  {selectedOfficeId === 'none' ? (
                                                      'Select an office...'
                                                  ) : selectedOffice ? (
                                                      <>
                                                          {selectedOffice.name}
                                                          {selectedOffice.code && (
                                                              <span className="ml-2 text-xs text-muted-foreground">
                                                                  ({selectedOffice.code})
                                                              </span>
                                                          )}
                                                      </>
                                                  ) : (
                                                      'Select an office...'
                                                  )}
                                              </span>
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[400px] p-0 z-[102]" align="start">
                                          <Command>
                                              <CommandInput placeholder="Search offices..." />
                                              <CommandList>
                                                  <CommandEmpty>No office found.</CommandEmpty>
                                                  <CommandGroup>
                                                      <CommandItem
                                                          value="none"
                                                          onSelect={() => {
                                                              setSelectedOfficeId('none');
                                                              setPopoverOpen(false);
                                                          }}
                                                      >
                                                          <Check
                                                              className={cn(
                                                                  'mr-2 h-4 w-4',
                                                                  selectedOfficeId === 'none' ? 'opacity-100' : 'opacity-0'
                                                              )}
                                                          />
                                                          <span className="text-muted-foreground">No Office</span>
                                                      </CommandItem>
                                                      {offices.map((office) => (
                                                          <CommandItem
                                                              key={office.id}
                                                              value={`${office.name} ${office.code || ''} ${office.zone?.name || ''}`}
                                                              onSelect={() => {
                                                                  setSelectedOfficeId(office.id.toString());
                                                                  setPopoverOpen(false);
                                                              }}
                                                          >
                                                              <Check
                                                                  className={cn(
                                                                      'mr-2 h-4 w-4',
                                                                      selectedOfficeId === office.id.toString() ? 'opacity-100' : 'opacity-0'
                                                                  )}
                                                              />
                                                              <div className="flex flex-col">
                                                                  <span>
                                                                      {office.name}
                                                                      {office.code && (
                                                                          <span className="ml-2 text-xs text-muted-foreground">
                                                                              ({office.code})
                                                                          </span>
                                                                      )}
                                                                  </span>
                                                                  {office.zone && (
                                                                      <span className="text-xs text-muted-foreground">
                                                                          Zone: {office.zone.name}
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
                                  <p className="text-xs text-muted-foreground">{offices.length} offices available</p>
                              </div>
                          </div>
                      </form>
                  </ScrollArea>
              </SheetBody>

              <SheetFooter className="flex items-center border-t border-border px-5 py-3.5 not-only-of-type:justify-between">
                  <div className="ms-auto flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                          Cancel
                      </Button>
                      <Button type="submit" form="office-form" disabled={isLoading}>
                          {isLoading ? 'Updating...' : 'Update Office'}
                      </Button>
                  </div>
              </SheetFooter>
          </SheetContent>
      </Sheet>
  );
}
