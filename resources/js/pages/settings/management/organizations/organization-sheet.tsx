import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { api } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Landmark } from 'lucide-react';
import { type OrganizationItem, type UserOption } from './index';

interface OrganizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: OrganizationItem | null;
  users: UserOption[];
}

export function OrganizationSheet({ open, onOpenChange, organization, users }: OrganizationSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [logo, setLogo] = useState('');
  const [isActive, setIsActive] = useState(true);

  const editMode = !!organization;

  useEffect(() => {
    if (organization && open) {
      setName(organization.name);
      setSlug(organization.slug);
      setOwnerId(organization.owner?.id?.toString() ?? '');
      setLogo(organization.logo ?? '');
      setIsActive(organization.is_active ?? true);
    } else if (!organization && open) {
      setName('');
      setSlug('');
      setOwnerId('');
      setLogo('');
      setIsActive(true);
    }
    setError(null);
    setSuccess(null);
  }, [organization, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editMode) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const data: Record<string, unknown> = {
      name,
      slug: slug || undefined,
      owner_id: ownerId ? Number(ownerId) : null,
      logo: logo || null,
      is_active: isActive,
    };

    try {
      if (organization) {
        await api.put(`/api/organizations/${organization.id}`, data);
      } else {
        await api.post('/api/organizations', data);
      }

      const message = organization
        ? 'Organization updated successfully!'
        : 'Organization created successfully!';
      setSuccess(message);

      router.reload({ only: ['organizations'] });

      if (!organization && createMore) {
        setName('');
        setSlug('');
        setOwnerId('');
        setLogo('');
        setIsActive(true);
        setSuccess(null);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const errorMessage = errors?.name?.[0] || errors?.slug?.[0] || err?.response?.data?.message || 'Failed to save organization.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto max-h-[calc(100dvh-2.5rem)] rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Landmark className="size-4 text-primary" />
            {organization ? 'Edit Organization' : 'New Organization'}
          </SheetTitle>
          <SheetDescription>
            {organization
              ? 'Update the organization details.'
              : 'Create a new organization for multi-tenancy.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 min-h-0 overflow-hidden p-0">
          <ScrollArea className="me-1 h-full pe-2 ps-3">
            <form id="organization-form" onSubmit={handleSubmit} className="space-y-5 px-2 py-4">
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
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g., Acme Corporation"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  placeholder="e.g., acme-corporation"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from name. Edit only if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-owner">Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId} disabled={isLoading}>
                  <SelectTrigger id="org-owner">
                    <SelectValue placeholder="Select an owner (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-logo">Logo URL</Label>
                <Input
                  id="org-logo"
                  placeholder="https://example.com/logo.png"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="org-active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive organizations cannot be accessed by members.
                  </p>
                </div>
                <Switch
                  id="org-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                />
              </div>
            </form>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3.5">
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
            <Button type="submit" form="organization-form" disabled={isLoading}>
              {isLoading ? 'Saving...' : organization ? 'Save Changes' : 'Create Organization'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
