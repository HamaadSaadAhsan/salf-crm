import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LeadFilters } from '@/hooks/useLeadFilters';
import {
    useDeleteSavedFilter,
    useSavedFilters,
    useSaveFilter,
    useUpdateSavedFilter,
    type SavedFilter,
} from '@/hooks/useSavedFilters';
import { Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

const PRESET_COLORS = [
    { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
    { value: 'green', label: 'Green', className: 'bg-green-500' },
    { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
    { value: 'red', label: 'Red', className: 'bg-red-500' },
    { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
    { value: 'gray', label: 'Gray', className: 'bg-gray-500' },
];

interface SavedFiltersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentFilters: LeadFilters;
    onApplyPreset: (filters: LeadFilters) => void;
}

function FilterSummary({ filters }: { filters: Record<string, unknown> }) {
    const keys = Object.keys(filters).filter(
        (k) => !['page', 'per_page'].includes(k) && filters[k] !== undefined && filters[k] !== null && filters[k] !== '',
    );

    if (keys.length === 0) {
        return <span className="text-muted-foreground text-xs">No active filters</span>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {keys.map((key) => (
                <Badge key={key} variant="secondary" size="xs" className="capitalize">
                    {key.replace(/_/g, ' ')}
                </Badge>
            ))}
        </div>
    );
}

function SaveForm({
    currentFilters,
    onSaved,
    editingFilter,
}: {
    currentFilters: LeadFilters;
    onSaved: () => void;
    editingFilter?: SavedFilter;
}) {
    const [name, setName] = useState(editingFilter?.name || '');
    const [color, setColor] = useState(editingFilter?.color || '');
    const [isDefault, setIsDefault] = useState(editingFilter?.is_default || false);
    const saveFilter = useSaveFilter();
    const updateFilter = useUpdateSavedFilter();
    const isPending = saveFilter.isPending || updateFilter.isPending;

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!name.trim()) {
                return;
            }

            const payload = {
                name: name.trim(),
                filters: currentFilters as Record<string, unknown>,
                is_default: isDefault,
                color: color || null,
            };

            if (editingFilter) {
                updateFilter.mutate(
                    { id: editingFilter.id, ...payload },
                    {
                        onSuccess: () => {
                            toast.success('Filter preset updated');
                            onSaved();
                        },
                        onError: (error: unknown) => {
                            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                            toast.error(msg || 'Failed to update preset');
                        },
                    },
                );
            } else {
                saveFilter.mutate(payload, {
                    onSuccess: () => {
                        toast.success('Filter preset saved');
                        setName('');
                        setColor('');
                        setIsDefault(false);
                        onSaved();
                    },
                    onError: (error: unknown) => {
                        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                        toast.error(msg || 'Failed to save preset');
                    },
                });
            }
        },
        [name, color, isDefault, currentFilters, editingFilter, saveFilter, updateFilter, onSaved],
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
            <div className="text-sm font-medium">{editingFilter ? 'Edit Preset' : 'Save Current Filters'}</div>
            <div className="space-y-2">
                <Label htmlFor="filter-name">Name</Label>
                <Input
                    id="filter-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Hot leads this week"
                    maxLength={100}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label>Color (optional)</Label>
                <div className="flex gap-2">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            className={`h-6 w-6 rounded-full border-2 transition-all ${c.className} ${color === c.value ? 'border-foreground ring-2 ring-ring' : 'border-transparent'}`}
                            onClick={() => setColor(color === c.value ? '' : c.value)}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is-default"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is-default" className="text-sm font-normal">
                    Set as default
                </Label>
            </div>
            <div className="flex items-center justify-between">
                <FilterSummary filters={currentFilters as Record<string, unknown>} />
                <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
                    {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {editingFilter ? 'Update' : 'Save'}
                </Button>
            </div>
        </form>
    );
}

export default function SavedFiltersDialog({ open, onOpenChange, currentFilters, onApplyPreset }: SavedFiltersDialogProps) {
    const { data: savedFilters = [], isLoading } = useSavedFilters();
    const deleteFilter = useDeleteSavedFilter();
    const [editingFilter, setEditingFilter] = useState<SavedFilter | undefined>();

    const handleApply = useCallback(
        (filter: SavedFilter) => {
            onApplyPreset(filter.filters as LeadFilters);
            onOpenChange(false);
        },
        [onApplyPreset, onOpenChange],
    );

    const handleDelete = useCallback(
        (id: number) => {
            deleteFilter.mutate(id, {
                onSuccess: () => {
                    toast.success('Preset deleted');
                    if (editingFilter?.id === id) {
                        setEditingFilter(undefined);
                    }
                },
            });
        },
        [deleteFilter, editingFilter],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Filter Presets</DialogTitle>
                    <DialogDescription>Save and manage your lead filter presets.</DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto">
                    <SaveForm
                        currentFilters={currentFilters}
                        editingFilter={editingFilter}
                        onSaved={() => setEditingFilter(undefined)}
                    />

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Saved Presets</div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : savedFilters.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">No saved presets yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {savedFilters.map((filter) => (
                                    <div
                                        key={filter.id}
                                        className="flex items-center gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                                    >
                                        {filter.color && (
                                            <span
                                                className={`h-3 w-3 shrink-0 rounded-full bg-${filter.color}-500`}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="truncate text-sm font-medium">{filter.name}</span>
                                                {filter.is_default && (
                                                    <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
                                                )}
                                            </div>
                                            <FilterSummary filters={filter.filters} />
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button variant="ghost" className="h-7" onClick={() => handleApply(filter)}>
                                                <span className="sr-only">Apply</span>
                                                <span className="text-xs font-medium">Apply</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => setEditingFilter(filter)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(filter.id)}
                                                disabled={deleteFilter.isPending}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" size="sm">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
