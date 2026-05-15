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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Share2, X } from 'lucide-react';
import { type LeadSource } from './index';

interface LeadSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: LeadSource | null;
}

export function LeadSourceSheet({ open, onOpenChange, source }: LeadSourceSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    identifier: '',
    status: 'active' as 'active' | 'inactive',
    source_score: 0,
  });

  const editMode = !!source;

  useEffect(() => {
    if (source && open) {
      setFormData({
        name: source.name || '',
        slug: source.slug || '',
        identifier: source.identifier || '',
        status: (source.status as 'active' | 'inactive') || 'active',
        source_score: source.source_score ?? 0,
      });
    } else if (!source && open) {
      setFormData({
        name: '',
        slug: '',
        identifier: '',
        status: 'active',
        source_score: 0,
      });
    }
    setError(null);
    setSuccess(null);
  }, [source, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const url = source ? `/sources/${source.id}` : '/sources';
    const method = source ? 'put' : 'post';

    try {
      await axios[method](url, formData);

      const message = source ? 'Lead source updated successfully!' : 'Lead source created successfully!';
      setSuccess(message);

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['leadSources'] });
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const errors = axiosErr.response?.data?.errors;
      const errorMessage = errors?.name?.[0] || errors?.slug?.[0] || axiosErr.response?.data?.message || 'Failed to save lead source.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug and identifier from name if creating new source
    if (name === 'name' && !editMode) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const identifier = value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug,
        identifier,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent close={false} className="h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <SheetTitle className="flex items-center gap-2.5">
                <Share2 className="size-4 text-primary" />
                {source ? 'Edit Lead Source' : 'New Lead Source'}
              </SheetTitle>
              <SheetDescription>
                {source
                  ? 'Update the lead source details.'
                  : 'Create a new lead source to track where leads come from.'}
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
          <form id="source-form" onSubmit={handleSubmit} className="space-y-5 px-5 py-4">
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
              <Label htmlFor="source-name">
                Source Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="source-name"
                name="name"
                placeholder="e.g., Website, Facebook, Google Ads"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-slug">Slug</Label>
              <Input
                id="source-slug"
                name="slug"
                placeholder="e.g., website, facebook"
                value={formData.slug}
                onChange={handleChange}
                disabled={isLoading || !editMode}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (auto-generated if creating new)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-identifier">Identifier</Label>
              <Input
                id="source-identifier"
                name="identifier"
                placeholder="e.g., WEBSITE, FACEBOOK"
                value={formData.identifier}
                onChange={handleChange}
                disabled={isLoading || !editMode}
              />
              <p className="text-xs text-muted-foreground">
                Uppercase identifier for API use (auto-generated if creating new)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-score">
                  Source Score
                </Label>
                <Input
                  id="source-score"
                  name="source_score"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0-10"
                  value={formData.source_score}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      source_score: Math.min(10, Math.max(0, value)),
                    }));
                  }}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Score added to leads from this source (0-10)
                </p>
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
            <Button type="submit" form="source-form" disabled={isLoading}>
              {isLoading ? 'Saving...' : source ? 'Save Changes' : 'Create Source'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
