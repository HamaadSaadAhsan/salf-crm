import { useState } from 'react';
import { router } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Trash2, Loader2, AlertTriangle, UserX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface UserData {
  id: number;
  name: string;
  email: string;
  leads_count?: number;
}

interface Props {
  user: UserData;
}

export function UserActionsSection({ user }: Props) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deleteSchema = z.object({
    confirmEmail: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .refine((val) => val === user.email, {
        message: 'Email does not match',
      }),
  });

  type DeleteFormValues = z.infer<typeof deleteSchema>;

  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      confirmEmail: '',
    },
  });

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
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
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      router.visit('/users');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLeads = (user.leads_count || 0) > 0;

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for this user account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasLeads && (
            <Alert variant="destructive">
              <UserX className="size-4" />
              <AlertTitle>Cannot Delete</AlertTitle>
              <AlertDescription>
                This user has {user.leads_count} lead(s) assigned. Please reassign the leads
                before deleting this user.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Delete User Account</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete this user and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={hasLeads}
            >
              <Trash2 className="size-4 mr-2" />
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All user data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              You are about to delete <strong>{user.name}</strong> ({user.email}).
            </AlertDescription>
          </Alert>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleDelete)} className="space-y-4">
              <FormField
                control={form.control}
                name="confirmEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <strong>{user.email}</strong> to confirm
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter email to confirm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setIsDeleteDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting || !form.formState.isValid}
                >
                  {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Delete User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}