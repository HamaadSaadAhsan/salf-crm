import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from '@/lib/http';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AlertCircle, CheckCircle2, ListChecks, X } from 'lucide-react';
import { type Status } from './index';

interface StatusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: Status | null;
}

export function StatusSheet({ open, onOpenChange, status }: StatusSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    order: 0,
  });

  const _editMode = !!status;

  useEffect(() => {
    if (status && open) {
      setFormData({
        name: status.name || '',
        color: status.color || '#3b82f6',
        order: status.order || 0,
      });
    } else if (!status && open) {
      setFormData({
        name: '',
        color: '#3b82f6',
        order: 0,
      });
    }
    setError(null);
    setSuccess(null);
  }, [status, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = status ? `/statuses/${status.id}` : '/statuses';
    const method = status ? 'put' : 'post';

    try {
      await axios[method](url, formData);

      const message = status ? 'Status updated successfully!' : 'Status created successfully!';
      setSuccess(message);

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['statuses'] });
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const errors = axiosErr.response?.data?.errors;
      const errorMessage = errors?.name?.[0] || errors?.color?.[0] || axiosErr.response?.data?.message || 'Failed to save status.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent close={false} className="h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <SheetTitle className="flex items-center gap-2.5">
                <ListChecks className="size-4 text-primary" />
                {status ? 'Edit Status' : 'New Status'}
              </SheetTitle>
              <SheetDescription>
                {status
                  ? 'Update the status details and color.'
                  : 'Create a new status for lead lifecycle management.'}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </SheetHeader>

        <SheetBody className="p-0">
          <form id="status-form" onSubmit={handleSubmit} className="space-y-5 px-5 py-4">
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
              <Label htmlFor="status-name">
                Status Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status-name"
                name="name"
                placeholder="e.g., new, contacted, qualified"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-color">
                  Color <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="status-color"
                    name="color"
                    type="color"
                    value={formData.color}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <Input
                    name="color-text"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="#3b82f6"
                    disabled={isLoading}
                    className="flex-1 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose a color for this status
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-order">Order</Label>
                <Input
                  id="status-order"
                  name="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Display order (lower = first)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <div
                  className="h-8 w-8 rounded border border-border shrink-0"
                  style={{ backgroundColor: formData.color }}
                />
                <div
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: formData.color,
                    color: getContrastColor(formData.color),
                  }}
                >
                  {formData.name || 'Status Preview'}
                </div>
              </div>
            </div>
          </form>
        </SheetBody>

        <SheetFooter className="flex items-center justify-between border-t border-border px-5 py-3.5">
          <div />

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" form="status-form" disabled={isLoading}>
              {isLoading ? 'Saving...' : status ? 'Save Changes' : 'Create Status'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Helper function to determine contrast color (white or black)
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
