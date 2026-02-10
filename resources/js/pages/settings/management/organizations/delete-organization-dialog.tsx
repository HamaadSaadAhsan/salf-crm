import { useState } from 'react';
import { router } from '@inertiajs/react';
import { api } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type OrganizationItem } from './index';

interface DeleteOrganizationDialogProps {
  organization: OrganizationItem | null;
  onOpenChange: () => void;
}

export function DeleteOrganizationDialog({ organization, onOpenChange }: DeleteOrganizationDialogProps) {
  const hasMembers = (organization?.users_count ?? 0) > 0;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!organization) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/organizations/${organization.id}`);
      router.reload({ only: ['organizations'] });
      onOpenChange();
    } catch (err: any) {
      console.error('Delete error:', err?.response?.data?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!organization} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{organization?.name}&quot;? This action cannot be
            undone.
            {hasMembers && (
              <span className="block mt-2 font-medium text-destructive">
                This organization has {organization?.users_count} members and cannot be deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={hasMembers || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
