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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Service } from './index';
import axios from 'axios';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface ServiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

interface ParentService {
  id: number;
  name: string;
  parent_name?: string;
}

export function ServiceSheet({ open, onOpenChange, service }: ServiceSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    detail: '',
    country_code: '',
    country_name: '',
    parent_id: '',
    sort_order: 0,
    status: 'active' as 'draft' | 'active' | 'inactive' | 'archived',
  });
  const [parentServices, setParentServices] = useState<ParentService[]>([]);

  // Fetch parent services on mount
  useEffect(() => {
    if (open) {
      fetchParentServices();
    }
  }, [open]);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        detail: service.detail || '',
        country_code: service.country_code || '',
        country_name: service.country_name || '',
        parent_id: service.parent_id?.toString() || '',
        sort_order: service.sort_order || 0,
        status: service.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        detail: '',
        country_code: '',
        country_name: '',
        parent_id: '',
        sort_order: 0,
        status: 'active',
      });
    }
    setError(null);
    setSuccess(null);
  }, [service, open]);

  const fetchParentServices = async () => {
    try {
      const response = await axios.get('/api/services');
      const services = response.data.data || [];
      setParentServices(services.map((s: any) => ({
        id: s.id,
        name: s.name,
        parent_name: s.parent?.name,
      })));
    } catch (error) {
      console.error('Error fetching parent services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = service ? `/services/${service.id}` : '/services';
    const method = service ? 'patch' : 'post';

    const submitData = {
      ...formData,
      parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
    };

    router[method](url, submitData, {
      onSuccess: () => {
        const message = service
          ? 'Service updated successfully!'
          : 'Service created successfully!';
        setSuccess(message);

        if (!service) {
          setFormData({
            name: '',
            detail: '',
            country_code: '',
            country_name: '',
            parent_id: '',
            sort_order: 0,
            status: 'active',
          });
        }

        setTimeout(() => {
          onOpenChange(false);
          setSuccess(null);
          router.reload({ only: ['services'] });
        }, 1500);
      },
      onError: (errors: any) => {
        console.error('Service save error:', errors);
        const errorMessage =
          errors?.message ||
          errors?.name?.[0] ||
          errors?.parent_id?.[0] ||
          'Failed to save service. Please try again.';
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
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Filter out current service from parent options to prevent circular reference
  const availableParentServices = service
    ? parentServices.filter((p) => p.id !== service.id)
    : parentServices;

  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="overflow-y-auto sm:max-w-[600px]">
              <SheetHeader>
                  <SheetTitle>{service ? 'Edit Service' : 'Create New Service'}</SheetTitle>
                  <SheetDescription>
                      {service ? 'Update the service details below.' : 'Add a new service/program. Fill in the details below.'}
                  </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleSubmit} className="mt-6 mb-6 space-y-4">
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

                  <div className="space-y-2">
                      <Label htmlFor="name">
                          Service Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                          id="name"
                          name="name"
                          placeholder="Enter service name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                      />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="detail">Description</Label>
                      <Textarea
                          id="detail"
                          name="detail"
                          placeholder="Enter service description"
                          value={formData.detail}
                          onChange={handleChange}
                          disabled={isLoading}
                          rows={3}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="parent_id">Parent Service</Label>
                          <Select
                              value={formData.parent_id}
                              onValueChange={(value) => handleSelectChange('parent_id', value)}
                              disabled={isLoading}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="Select parent service" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">None (Top Level)</SelectItem>
                                  {availableParentServices.map((parentService) => (
                                      <SelectItem key={parentService.id} value={parentService.id.toString()}>
                                          {parentService.name}
                                          {parentService.parent_name && (
                                              <span className="text-xs text-muted-foreground"> (Parent: {parentService.parent_name})</span>
                                          )}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="sort_order">Sort Order</Label>
                          <Input
                              id="sort_order"
                              name="sort_order"
                              type="number"
                              min="0"
                              value={formData.sort_order}
                              onChange={handleChange}
                              disabled={isLoading}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="country_code">Country Code</Label>
                          <Input
                              id="country_code"
                              name="country_code"
                              placeholder="e.g., US, CA, UK"
                              maxLength={2}
                              value={formData.country_code}
                              onChange={handleChange}
                              disabled={isLoading}
                          />
                          <p className="text-xs text-muted-foreground">2-letter ISO code</p>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="country_name">Country Name</Label>
                          <Input
                              id="country_name"
                              name="country_name"
                              placeholder="e.g., United States"
                              value={formData.country_name}
                              onChange={handleChange}
                              disabled={isLoading}
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="status">
                          Status <span className="text-destructive">*</span>
                      </Label>
                      <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} disabled={isLoading}>
                          <SelectTrigger>
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  <SheetFooter className="gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                          Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
                      </Button>
                  </SheetFooter>
              </form>
          </SheetContent>
      </Sheet>
  );
}
