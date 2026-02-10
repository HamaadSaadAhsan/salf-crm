import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { type Permission, type Role } from './index';

interface RoleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  permissions: Permission[];
}

export function RoleSheet({ open, onOpenChange, role, permissions }: RoleSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const editMode = !!role;

  useEffect(() => {
    if (role && open) {
      setName(role.name);
      setSelectedPermissions(role.permissions.map((p) => p.id));
    } else if (!role && open) {
      setName('');
      setSelectedPermissions([]);
    }
    setError(null);
    setSuccess(null);
  }, [role, open]);

  /** Group permissions by category (part before the dot, or "general") */
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      const dotIndex = p.name.indexOf('_');
      const category = dotIndex > 0 ? p.name.slice(dotIndex + 1) : 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const handleTogglePermission = (id: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const handleToggleCategory = (categoryPermissions: Permission[]) => {
    const categoryIds = categoryPermissions.map((p) => p.id);
    const allSelected = categoryIds.every((id) => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !categoryIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => [...prev.filter((id) => !categoryIds.includes(id)), ...categoryIds]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = role ? `/api/roles/${role.id}` : '/api/roles';
    const method = role ? 'put' : 'post';

    router[method](
      url,
      { name, permissions: selectedPermissions },
      {
        onSuccess: () => {
          const message = role ? 'Role updated successfully!' : 'Role created successfully!';
          setSuccess(message);

          if (!role && createMore) {
            setName('');
            setSelectedPermissions([]);
            setSuccess(null);
            setIsLoading(false);
          } else {
            setTimeout(() => {
              onOpenChange(false);
              setSuccess(null);
            }, 1500);
          }
        },
        onError: (errors: Record<string, string>) => {
          const errorMessage = errors?.message || errors?.name || 'Failed to save role.';
          setError(errorMessage);
        },
        onFinish: () => {
          if (!createMore) {
            setIsLoading(false);
          }
        },
      },
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Shield className="size-4 text-primary" />
            {role ? 'Edit Role' : 'New Role'}
          </SheetTitle>
          <SheetDescription>
            {role
              ? 'Update the role name and permission assignments.'
              : 'Create a new role and assign permissions.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="me-1 h-[calc(100dvh-11.75rem)] pe-2 ps-3">
            <form id="role-form" onSubmit={handleSubmit} className="space-y-5 px-2 py-4">
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

              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  placeholder="e.g., sales-manager"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-4">
                  {groupedPermissions.map(([category, perms]) => {
                    const categoryIds = perms.map((p) => p.id);
                    const allSelected = categoryIds.every((id) => selectedPermissions.includes(id));
                    const someSelected = categoryIds.some((id) => selectedPermissions.includes(id));

                    return (
                      <div key={category} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={allSelected || (someSelected && 'indeterminate')}
                            onCheckedChange={() => handleToggleCategory(perms)}
                            disabled={isLoading}
                          />
                          <span className="text-sm font-medium capitalize">
                            {category.replace(/[_-]/g, ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-6">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`perm-${permission.id}`}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => handleTogglePermission(permission.id)}
                                disabled={isLoading}
                              />
                              <label
                                htmlFor={`perm-${permission.id}`}
                                className="cursor-pointer text-sm leading-none"
                              >
                                {permission.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center justify-between border-t border-border px-5 py-3.5">
          {!editMode && (
            <div className="flex items-center space-x-2">
              <Switch
                id="create-more"
                size="sm"
                checked={createMore}
                onCheckedChange={setCreateMore}
              />
              <Label htmlFor="create-more" className="text-xs text-secondary-foreground">
                Create more
              </Label>
            </div>
          )}
          {editMode && <div />}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" form="role-form" disabled={isLoading}>
              {isLoading ? 'Saving...' : role ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
