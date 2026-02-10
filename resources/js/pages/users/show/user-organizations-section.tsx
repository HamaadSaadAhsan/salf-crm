import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Edit, Loader2, Landmark } from 'lucide-react';
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
import { api } from '@/lib/api';

interface UserOrganization {
  id: number;
  name: string;
  slug: string;
  role: string;
  is_default: boolean;
}

interface AvailableOrganization {
  id: number;
  name: string;
  slug: string;
}

interface UserData {
  id: number;
  name: string;
  organizations?: UserOrganization[];
}

interface Props {
  user: UserData;
  allOrganizations: AvailableOrganization[];
}

export function UserOrganizationsSection({ user, allOrganizations }: Props) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>(
    user.organizations?.map((o) => o.id) || [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleOrg = (orgId: number) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId],
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await api.patch(`/api/users/${user.id}/organizations`, {
        organization_ids: selectedOrgs,
      });

      toast.success('Organizations updated successfully');
      setIsEditDialogOpen(false);
      router.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update organizations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Organizations</CardTitle>
            <CardDescription>Organizations this user belongs to</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="size-4 mr-2" />
            Edit Organizations
          </Button>
        </CardHeader>
        <CardContent>
          {user.organizations && user.organizations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Landmark className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="capitalize">{org.role}</Badge>
                    {org.is_default && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Landmark className="size-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No organizations assigned</p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Edit Organizations&quot; to assign organizations to this user
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Organizations</DialogTitle>
            <DialogDescription>
              Select the organizations this user should belong to
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-2">
              {allOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    id={`org-${org.id}`}
                    checked={selectedOrgs.includes(org.id)}
                    onCheckedChange={() => handleToggleOrg(org.id)}
                  />
                  <label
                    htmlFor={`org-${org.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-medium text-sm">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </label>
                </div>
              ))}
              {allOrganizations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active organizations available
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedOrgs.length} organization(s) selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrgs([])}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrgs(allOrganizations.map((o) => o.id))}
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
                setSelectedOrgs(user.organizations?.map((o) => o.id) || []);
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
