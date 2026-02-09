import { useState } from 'react';
import { router } from '@inertiajs/react';
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
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface CreatePermissionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePermissionSheet({ open, onOpenChange }: CreatePermissionSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    router.post(
      '/permissions',
      { name },
      {
        onSuccess: () => {
          setSuccess('Permission created successfully!');

          if (createMore) {
            setName('');
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
          const errorMessage = errors?.message || errors?.name || 'Failed to create permission.';
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setError(null);
      setSuccess(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[480px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle className="flex items-center gap-2.5">
            <Lock className="size-4 text-primary" />
            New Permission
          </SheetTitle>
          <SheetDescription>
            Create a new permission. Use the format &quot;action_resource&quot; (e.g.,
            create_users, view_reports).
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="me-1 h-[calc(100dvh-11.75rem)] pe-2 ps-3">
            <form id="permission-form" onSubmit={handleSubmit} className="space-y-5 px-2 py-4">
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
                <Label htmlFor="permission-name">Permission Name</Label>
                <Input
                  id="permission-name"
                  placeholder="e.g., create_users"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Use snake_case format. The prefix before the first underscore determines the
                  action, and the rest determines the resource category.
                </p>
              </div>
            </form>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center justify-between border-t border-border px-5 py-3.5">
          <div className="flex items-center space-x-2">
            <Switch
              id="create-more-perm"
              size="sm"
              checked={createMore}
              onCheckedChange={setCreateMore}
            />
            <Label htmlFor="create-more-perm" className="text-xs text-secondary-foreground">
              Create more
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" form="permission-form" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Permission'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
