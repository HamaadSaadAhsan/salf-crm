import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Edit, Loader2, Shield, Info } from 'lucide-react';
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

interface Permission {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  name: string;
  direct_permissions?: Permission[];
}

interface Props {
  user: UserData;
  allPermissions: Permission[];
}

function groupPermissionsByPrefix(permissions: Permission[]): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {};
  for (const permission of permissions) {
    const parts = permission.name.includes('.')
      ? permission.name.split('.')[0]
      : permission.name.split(' ').pop() || 'other';
    const key = parts.charAt(0).toUpperCase() + parts.slice(1);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(permission);
  }
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  );
}

export function UserPermissionsSection({ user, allPermissions }: Props) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>(
    user.direct_permissions?.map((p) => p.id) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupedPermissions = useMemo(() => groupPermissionsByPrefix(allPermissions), [allPermissions]);

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleGroup = (groupPermissions: Permission[]) => {
    const groupIds = groupPermissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...groupIds])]);
    }
  };

  const handleSavePermissions = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`, {
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
        body: JSON.stringify({ permission_ids: selectedPermissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update permissions');
      }

      toast.success('Permissions updated successfully');
      setIsEditDialogOpen(false);
      router.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const directPermissions = user.direct_permissions || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Direct Permissions</CardTitle>
            <CardDescription>
              User-specific permissions assigned directly
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setSelectedPermissions(user.direct_permissions?.map((p) => p.id) || []);
            setIsEditDialogOpen(true);
          }}>
            <Edit className="size-4 mr-2" />
            Edit Permissions
          </Button>
        </CardHeader>
        <CardContent>
          {directPermissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {directPermissions.map((permission) => (
                <Badge key={permission.id} variant="secondary" className="text-xs">
                  <Shield className="size-3 mr-1" />
                  {permission.name}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="size-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No direct permissions assigned</p>
              <p className="text-sm text-muted-foreground">
                Click "Edit Permissions" to assign permissions to this user
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Info className="size-4 mt-0.5 shrink-0" />
            <span>These are in addition to permissions inherited from the user's role(s).</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Direct Permissions</DialogTitle>
            <DialogDescription>
              Select permissions to assign directly to {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-5">
              {Object.entries(groupedPermissions).map(([group, permissions]) => {
                const groupIds = permissions.map((p) => p.id);
                const allSelected = groupIds.every((id) => selectedPermissions.includes(id));
                const someSelected = groupIds.some((id) => selectedPermissions.includes(id));

                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${group}`}
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={() => handleToggleGroup(permissions)}
                      />
                      <label
                        htmlFor={`group-${group}`}
                        className="font-semibold text-sm cursor-pointer select-none"
                      >
                        {group}
                      </label>
                      <Badge variant="outline" className="text-xs">
                        {groupIds.filter((id) => selectedPermissions.includes(id)).length}/{permissions.length}
                      </Badge>
                    </div>
                    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2 border-l pl-4">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`permission-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handleTogglePermission(permission.id)}
                          />
                          <label
                            htmlFor={`permission-${permission.id}`}
                            className="text-sm cursor-pointer select-none"
                          >
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedPermissions.length} permission(s) selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions([])}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions(allPermissions.map((p) => p.id))}
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
                setSelectedPermissions(user.direct_permissions?.map((p) => p.id) || []);
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
