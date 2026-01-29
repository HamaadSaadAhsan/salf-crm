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
            <CardTitle className="text-base">Assigned Programs</CardTitle>
            <CardDescription>
              Programs and services this user can handle
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="size-4 mr-2" />
            Edit Programs
          </Button>
        </CardHeader>
        <CardContent>
          {user.active_services && user.active_services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.active_services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{service.name}</p>
                    {service.parent && (
                      <p className="text-xs text-muted-foreground truncate">
                        {service.parent.name}
                      </p>
                    )}
                    {service.country_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <Globe className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {service.country_name}
                        </span>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building className="size-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No programs assigned</p>
              <p className="text-sm text-muted-foreground">
                Click "Edit Programs" to assign programs to this user
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Services Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Programs</DialogTitle>
            <DialogDescription>
              Select the programs this user should have access to
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-4">
              {availableServices.map((parentService) => (
                <div key={parentService.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`service-${parentService.id}`}
                      checked={selectedServices.includes(parentService.id)}
                      onCheckedChange={() => handleToggleService(parentService.id)}
                    />
                    <label
                      htmlFor={`service-${parentService.id}`}
                      className="font-medium text-sm cursor-pointer"
                    >
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
                          <label
                            htmlFor={`service-${childService.id}`}
                            className="text-sm cursor-pointer"
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
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedServices.length} program(s) selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedServices([])}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedServices(allServices.map((s) => s.id))}
              >
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
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
