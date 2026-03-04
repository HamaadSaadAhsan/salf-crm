import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Edit, Loader2, Globe, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

interface Service {
  id: number;
  name: string;
  country_code?: string;
  country_name?: string;
  parent?: {
    id: number;
    name: string;
  };
}

interface AvailableService {
  id: number;
  name: string;
  detail?: string;
  country_code?: string;
  country_name?: string;
  parent_id?: number;
  children?: AvailableService[];
}

interface UserData {
  id: number;
  name: string;
  active_services?: Service[];
  active_services_count?: number;
}

interface Props {
  user: UserData;
  availableServices: AvailableService[];
}

export function UserServicesSection({ user, availableServices }: Props) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>(
    user.active_services?.map((s) => s.id) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleService = (serviceId: number) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveServices = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/services`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('XSRF-TOKEN='))
              ?.split('=')[1] || ''
          ),
        },
        credentials: 'include',
        body: JSON.stringify({ service_ids: selectedServices }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update services');
      }

      toast.success('Services updated successfully');
      setIsEditDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update services');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Flatten services for selection
  const flattenServices = (services: AvailableService[]): AvailableService[] => {
    const result: AvailableService[] = [];
    services.forEach((service) => {
      result.push(service);
      if (service.children && service.children.length > 0) {
        result.push(...flattenServices(service.children));
      }
    });
    return result;
  };

  const allServices = flattenServices(availableServices);

  return (
      <>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle className="text-md">Assigned Programs</CardTitle>
                      <CardDescription className="text-xs">Programs and services this user can handle</CardDescription>
                  </div>
                  <Button className="shadow-(--button-shadow)" variant="primary" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="size-4" />
                  </Button>
              </CardHeader>
              <CardContent>
                  {user.active_services && user.active_services.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {user.active_services.map((service) => (
                              <div key={service.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                                  <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">{service.name}</p>
                                      {service.parent && <p className="truncate text-xs text-muted-foreground">{service.parent.name}</p>}
                                      {service.country_name && (
                                          <div className="mt-1 flex items-center gap-1">
                                              <Globe className="size-3 text-muted-foreground" />
                                              <span className="text-xs text-muted-foreground">{service.country_name}</span>
                                          </div>
                                      )}
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">
                                      {service.country_code || 'Global'}
                                  </Badge>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <Empty>
                          <EmptyHeader>
                              <EmptyMedia>
                                  <Building className="mb-3 size-12 text-muted-foreground/50" />
                              </EmptyMedia>

                              <EmptyTitle>No direct permissions assigned</EmptyTitle>
                              <EmptyDescription>Click "Edit Programs" to assign programs to this user</EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                              <Button className="shadow-(--button-shadow)" variant="primary" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                                  <Edit className="mr-2 size-4" />
                                  Edit Programs
                              </Button>
                          </EmptyContent>
                      </Empty>
                  )}
              </CardContent>
          </Card>

          {/* Edit Services Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Manage Programs</DialogTitle>
                      <DialogDescription>Select the programs this user should have access to</DialogDescription>
                  </DialogHeader>
                  <div className="-mr-2 max-h-[400px] overflow-y-auto pr-2">
                      <div className="space-y-4">
                          {availableServices.map((parentService) => (
                              <div key={parentService.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                      <Checkbox
                                          id={`service-${parentService.id}`}
                                          checked={selectedServices.includes(parentService.id)}
                                          onCheckedChange={() => handleToggleService(parentService.id)}
                                      />
                                      <label htmlFor={`service-${parentService.id}`} className="cursor-pointer text-sm font-medium">
                                          {parentService.name}
                                      </label>
                                      {parentService.country_name && (
                                          <Badge variant="outline" className="text-xs">
                                              {parentService.country_name}
                                          </Badge>
                                      )}
                                  </div>
                                  {parentService.children && parentService.children.length > 0 && (
                                      <div className="ml-6 space-y-2 border-l pl-4">
                                          {parentService.children.map((childService) => (
                                              <div key={childService.id} className="flex items-center gap-2">
                                                  <Checkbox
                                                      id={`service-${childService.id}`}
                                                      checked={selectedServices.includes(childService.id)}
                                                      onCheckedChange={() => handleToggleService(childService.id)}
                                                  />
                                                  <label htmlFor={`service-${childService.id}`} className="cursor-pointer text-sm">
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
                          ))}
                      </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">{selectedServices.length} program(s) selected</p>
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedServices([])}>
                              Clear All
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedServices(allServices.map((s) => s.id))}>
                              Select All
                          </Button>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                              setSelectedServices(user.active_services?.map((s) => s.id) || []);
                              setIsEditDialogOpen(false);
                          }}
                      >
                          Cancel
                      </Button>
                      <Button onClick={handleSaveServices} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                          Save Changes
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </>
  );
}
