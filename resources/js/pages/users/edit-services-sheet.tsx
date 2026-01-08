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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Building2, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
        : [...prev, serviceId]
    );
  };

  const toggleParentService = (service: Service) => {
    if (!service.children || service.children.length === 0) {
      toggleService(service.id);
      return;
    }

    const childIds = service.children.map((c) => c.id);
    const allChildrenSelected = childIds.every((id) =>
      selectedServiceIds.includes(id)
    );

    if (allChildrenSelected) {
      // Deselect all children
      setSelectedServiceIds((prev) =>
        prev.filter((id) => !childIds.includes(id))
      );
    } else {
      // Select all children
      setSelectedServiceIds((prev) => [
        ...prev.filter((id) => !childIds.includes(id)),
        ...childIds,
      ]);
    }
  };

  const isParentPartiallySelected = (service: Service): boolean => {
    if (!service.children || service.children.length === 0) return false;
    const childIds = service.children.map((c) => c.id);
    const selectedChildren = childIds.filter((id) =>
      selectedServiceIds.includes(id)
    );
    return selectedChildren.length > 0 && selectedChildren.length < childIds.length;
  };

  const isParentFullySelected = (service: Service): boolean => {
    if (!service.children || service.children.length === 0) {
      return selectedServiceIds.includes(service.id);
    }
    const childIds = service.children.map((c) => c.id);
    return childIds.length > 0 && childIds.every((id) => selectedServiceIds.includes(id));
  };

  // Organize services into parent/child structure
  const parentServices = services.filter((s) => !s.parent_id);
  const childServicesMap = new Map<number, Service[]>();
  services.forEach((s) => {
    if (s.parent_id) {
      if (!childServicesMap.has(s.parent_id)) {
        childServicesMap.set(s.parent_id, []);
      }
      childServicesMap.get(s.parent_id)!.push(s);
    }
  });

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[640px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Building2 className="size-4 text-primary" />
            Edit Programs
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100dvh-11.75rem)] ps-5 pe-4 me-1">
            <form id="services-form" onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex items-center justify-between">
              <Label>Select Programs/Services</Label>
              <Badge variant="outline">
                {selectedServiceIds.length} selected
              </Badge>
            </div>

            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                {parentServices.map((parentService) => {
                  const children = childServicesMap.get(parentService.id) || [];
                  const hasChildren = children.length > 0;
                  const isPartiallySelected = isParentPartiallySelected({
                    ...parentService,
                    children,
                  });
                  const isFullySelected = isParentFullySelected({
                    ...parentService,
                    children,
                  });

                  return (
                    <div key={parentService.id} className="space-y-2">
                      {/* Parent Service */}
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={`parent-${parentService.id}`}
                          checked={isFullySelected || (isPartiallySelected ? 'indeterminate' : false)}
                          onCheckedChange={() =>
                            toggleParentService({ ...parentService, children })
                          }
                          disabled={isLoading}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`parent-${parentService.id}`}
                            className="font-semibold cursor-pointer flex items-center gap-2"
                          >
                            {parentService.name}
                            {hasChildren && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Label>
                          {parentService.detail && (
                            <p className="text-xs text-muted-foreground">
                              {parentService.detail}
                            </p>
                          )}
                          {hasChildren && (
                            <p className="text-xs text-muted-foreground">
                              {children.length} sub-programs
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Child Services */}
                      {hasChildren && (
                        <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
                          {children.map((childService) => (
                            <div
                              key={childService.id}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`child-${childService.id}`}
                                checked={selectedServiceIds.includes(childService.id)}
                                onCheckedChange={() => toggleService(childService.id)}
                                disabled={isLoading}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-1">
                                <Label
                                  htmlFor={`child-${childService.id}`}
                                  className="cursor-pointer text-sm"
                                >
                                  {childService.name}
                                  {childService.country_code && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({childService.country_code})
                                    </span>
                                  )}
                                </Label>
                                {childService.detail && (
                                  <p className="text-xs text-muted-foreground">
                                    {childService.detail}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {parentServices.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No services available
                  </div>
                )}
              </div>
            </ScrollArea>
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
              {isLoading ? 'Updating...' : 'Update Programs'}
            </Button>
          </SheetFooter>
        </form>
          </ScrollArea>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
