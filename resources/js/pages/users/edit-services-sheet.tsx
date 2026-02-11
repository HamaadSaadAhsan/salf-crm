import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Building2, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: number;
  name: string;
  email: string;
  active_services?: Array<{
    id: number;
    name: string;
    country_code?: string;
  }>;
}

interface Service {
  id: number;
  name: string;
  detail?: string;
  country_code?: string;
  country_name?: string;
  parent_id?: number;
  children?: Service[];
}

interface EditServicesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  services: Service[];
}

export function EditServicesSheet({
  open,
  onOpenChange,
  user,
  services,
}: EditServicesSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  useEffect(() => {
    if (user && user.active_services) {
      setSelectedServiceIds(user.active_services.map((s) => s.id));
    } else {
      setSelectedServiceIds([]);
    }
    setError(null);
    setSuccess(null);
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.patch(`/api/users/${user.id}/services`, {
        service_ids: selectedServiceIds,
      });

      setSuccess('Services updated successfully!');
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['users'] });
      }, 1500);
    } catch (err: any) {
      console.error('Services update error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.service_ids?.[0] ||
        'Failed to update services. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const toggleParentService = (parentService: Service) => {
    const children = parentService.children || [];
    const isSelected = selectedServiceIds.includes(parentService.id);

    if (isSelected) {
      // Deselect parent only
      setSelectedServiceIds((prev) => prev.filter((id) => id !== parentService.id));
    } else {
      // Select parent and remove any explicitly selected children (parent covers them)
      const childIds = children.map((c) => c.id);
      setSelectedServiceIds((prev) => [...prev.filter((id) => !childIds.includes(id)), parentService.id]);
    }
  };

  const isParentSelected = (parentService: Service): boolean => {
    return selectedServiceIds.includes(parentService.id);
  };

  const isChildEffectivelySelected = (childService: Service, parentService: Service): boolean => {
    return selectedServiceIds.includes(parentService.id) || selectedServiceIds.includes(childService.id);
  };

  const flattenServices = (items: Service[]): Service[] => {
    const result: Service[] = [];
    items.forEach((service) => {
      result.push(service);
      if (service.children && service.children.length > 0) {
        result.push(...flattenServices(service.children));
      }
    });
    return result;
  };

  const allServices = flattenServices(services);
  const parentServices = services.filter((s) => !s.parent_id);

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[640px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Building2 className="size-4 text-primary" />
            Manage Programs
          </SheetTitle>
          <SheetDescription>
            Select the programs <span className="font-medium">{user.name}</span> should have access to
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="me-1 h-[calc(100dvh-11.75rem)] pe-2 ps-3">
            <form id="services-form" onSubmit={handleSubmit} className="space-y-4 px-2 py-4">
              {success && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
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
                {parentServices.map((parentService) => {
                  const children = parentService.children || [];
                  const hasChildren = children.length > 0;

                  return (
                    <div key={parentService.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`parent-${parentService.id}`}
                          checked={isParentSelected(parentService)}
                          onCheckedChange={() => toggleParentService(parentService)}
                          disabled={isLoading}
                        />
                        <label
                          htmlFor={`parent-${parentService.id}`}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {parentService.name}
                        </label>
                        {parentService.country_name && (
                          <Badge variant="outline" className="text-xs">
                            {parentService.country_name}
                          </Badge>
                        )}
                      </div>
                      {hasChildren && (
                        <div className="ml-6 space-y-2 border-l pl-4">
                          {children.map((childService) => (
                            <div key={childService.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`child-${childService.id}`}
                                checked={isChildEffectivelySelected(childService, parentService)}
                                onCheckedChange={() => toggleService(childService.id)}
                                disabled={isLoading || isParentSelected(parentService)}
                              />
                              <label
                                htmlFor={`child-${childService.id}`}
                                className="cursor-pointer text-sm"
                              >
                                {childService.name}
                              </label>
                              {childService.country_name && (
                                <Badge variant="outline" className="text-xs">
                                  {childService.country_name}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <Separator className="my-2" />
                    </div>
                  );
                })}

                {parentServices.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No services available
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedServiceIds.length} program(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedServiceIds([])}
                    disabled={isLoading}
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedServiceIds(parentServices.map((s) => s.id))}
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                </div>
              </div>
            </form>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" form="services-form" disabled={isLoading}>
            {isLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
