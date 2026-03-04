import { useState } from 'react';
import { router } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Edit, Loader2, Check } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Role {
  id: number;
  name: string;
  guard_name?: string;
}

interface Zone {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

interface Office {
  id: number;
  name: string;
  code?: string;
  zone_id?: number;
  is_active?: boolean;
  zone?: {
    id: number;
    name: string;
  };
}

interface UserData {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  extension?: string | null;
  availability?: boolean;
  availability_date?: string;
  availability_time?: string;
  roles?: Role[];
  zone?: Zone;
  office?: Office;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  user: UserData;
  roles: Role[];
  zones: Zone[];
  offices: Office[];
  isSuperAdmin: boolean;
}

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  roles: z.array(z.string()).optional(),
  extension: z.string().max(20, 'Extension must be at most 20 characters').nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  password_confirmation: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password !== data.password_confirmation) return false;
  return true;
}, {
  message: 'Password confirmation does not match',
  path: ['password_confirmation'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function UserProfileSection({ user, roles, zones, offices, isSuperAdmin }: Props) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      roles: user.roles?.map((r) => r.name) || [],
      extension: user.extension || '',
      password: '',
      password_confirmation: '',
    },
  });

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    const payload: Record<string, unknown> = { ...values };
    if (!payload.password) {
      delete payload.password;
      delete payload.password_confirmation;
    }
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
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
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      toast.success('User profile updated successfully');
      setIsEditDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZoneUpdate = async (zoneId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/zone`, {
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
        body: JSON.stringify({ zone_id: zoneId === 'none' ? null : parseInt(zoneId) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update zone');
      }

      toast.success('Zone updated successfully');
      setIsZoneDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfficeUpdate = async (officeId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/office`, {
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
        body: JSON.stringify({ office_id: officeId === 'none' ? null : parseInt(officeId) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update office');
      }

      toast.success('Office updated successfully');
      setIsOfficeDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update office');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvailabilityUpdate = async (availability: boolean) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/availability`, {
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
        body: JSON.stringify({ availability }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update availability');
      }

      toast.success('Availability updated successfully');
      setIsAvailabilityDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update availability');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-md">Profile Information</CardTitle>
            <CardDescription className="text-xs">User account details and settings</CardDescription>
          </div>
          {isSuperAdmin && (
            <Button className="shadow-(--button-shadow)" variant="primary" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Full Name</dt>
              <dd className="font-medium mt-1">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email Address</dt>
              <dd className="font-medium mt-1 flex items-center gap-2">
                {user.email}
                {user.email_verified_at ? (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <Check className="size-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    Not Verified
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role(s)</dt>
              <dd className="font-medium mt-1 flex flex-wrap gap-1">
                {user.roles?.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                )) || <span className="text-muted-foreground">No roles assigned</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Extension</dt>
              <dd className="font-medium mt-1">
                {user.extension || <span className="text-muted-foreground">No extension</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zone</dt>
              <dd className="font-medium mt-1 flex items-center gap-2">
                {user.zone?.name || <span className="text-muted-foreground">No zone</span>}
                {isSuperAdmin && (
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsZoneDialogOpen(true)}>
                    <Edit className="size-3" />
                  </Button>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Office</dt>
              <dd className="font-medium mt-1 flex items-center gap-2">
                {user.office?.name || <span className="text-muted-foreground">No office</span>}
                {isSuperAdmin && (
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsOfficeDialogOpen(true)}>
                    <Edit className="size-3" />
                  </Button>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="font-medium mt-1 flex items-center gap-2">
                {user.availability ? (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <Check className="size-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    Unavailable
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsAvailabilityDialogOpen(true)}>
                  <Edit className="size-3" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account Created</dt>
              <dd className="font-medium mt-1">{formatDate(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium mt-1">{formatDate(user.updated_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="ring-4 ring-muted">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Update the user's basic information</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                disabled
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Enter email address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="extension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extension (PBX/SIP)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="e.g. 1001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isSuperAdmin && (
                <>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password <span className="text-xs text-muted-foreground font-normal">(leave empty to keep current)</span></FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Enter new password" autoComplete="new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password_confirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Confirm new password" autoComplete="new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roles"
                    render={() => (
                      <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <div className="space-y-2 rounded-md border p-3 max-h-[200px] overflow-y-auto">
                          {roles.map((role) => (
                            <div key={role.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`role-${role.id}`}
                                checked={form.watch('roles')?.includes(role.name) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues('roles') || [];
                                  form.setValue(
                                    'roles',
                                    checked
                                      ? [...current, role.name]
                                      : current.filter((r) => r !== role.name),
                                    { shouldDirty: true }
                                  );
                                }}
                              />
                              <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">
                                {role.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog */}
      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Zone</DialogTitle>
            <DialogDescription>Assign a zone to this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              defaultValue={user.zone?.id?.toString() || 'none'}
              onValueChange={handleZoneUpdate}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px]">
                <SelectItem value="none">No Zone</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.name} {zone.code && `(${zone.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Office Dialog */}
      <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Office</DialogTitle>
            <DialogDescription>Assign an office to this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              defaultValue={user.office?.id?.toString() || 'none'}
              onValueChange={handleOfficeUpdate}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px]">
                <SelectItem value="none">No Office</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id.toString()}>
                    {office.name} {office.code && `(${office.code})`}
                    {office.zone && ` - ${office.zone.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOfficeDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Availability Dialog */}
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Availability</DialogTitle>
            <DialogDescription>Set the user's availability status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="availability" className="text-base">Available for calls</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, this user can receive new lead assignments
                </p>
              </div>
              <Switch
                id="availability"
                checked={user.availability ?? false}
                onCheckedChange={handleAvailabilityUpdate}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAvailabilityDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
