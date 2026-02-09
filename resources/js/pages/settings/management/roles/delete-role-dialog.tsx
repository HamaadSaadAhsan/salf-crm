import { router } from '@inertiajs/react';
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
  const handleDelete = () => {
    if (!role) return;

    router.delete(`/roles/${role.id}`, {
      onSuccess: () => {
        onOpenChange();
      },
      onError: (errors) => {
        console.error('Delete error:', errors);
      },
    });
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
