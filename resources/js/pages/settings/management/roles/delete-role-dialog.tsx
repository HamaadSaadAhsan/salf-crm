import { router } from '@inertiajs/react';
import axios from '@/lib/http';
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
import { type Role } from './index';

interface DeleteRoleDialogProps {
  role: Role | null;
  onOpenChange: () => void;
}

export function DeleteRoleDialog({ role, onOpenChange }: DeleteRoleDialogProps) {
  const handleDelete = async () => {
    if (!role) return;

    try {
      await axios.delete(`/api/roles/${role.id}`);
      onOpenChange();
      router.reload();
    } catch (err: unknown) {
      console.error('Delete error:', (err as { response?: { data?: unknown } })?.response?.data);
    }
  };

  return (
    <AlertDialog open={!!role} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{role?.name}&quot;? This action cannot be
            undone.
            {(role?.users_count ?? 0) > 0 && (
              <span className="block mt-2 font-medium text-destructive">
                This role has {role?.users_count} assigned users and cannot be deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={(role?.users_count ?? 0) > 0}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
