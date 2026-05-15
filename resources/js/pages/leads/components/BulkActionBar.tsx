import { memo, useCallback, useState } from 'react';
import { Check, ChevronDown, Loader2, Trash2, UserCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import { router } from '@inertiajs/react';

import { api } from '@/lib/api';
import { useUsers } from '@/hooks/useUsers';
import { useStatuses } from '@/lib/useStatus';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkActionBarProps {
    selectedIds: string[];
    selectedCount: number;
    onClearSelection: () => void;
    isSuperAdmin: boolean;
    canEdit: boolean;
}

const AssignPopover = memo(function AssignPopover({
    selectedIds,
    onDone,
}: {
    selectedIds: string[];
    onDone: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const { data } = useUsers({ per_page: 50, search: search || undefined });
    const users = data?.data || [];

    const handleAssign = useCallback(
        async (userId: number, userName: string) => {
            setLoading(true);
            try {
                await api.post('/leads/bulk/assign', {
                    lead_ids: selectedIds,
                    assigned_to_id: userId,
                });
                setOpen(false);
                router.reload({ only: ['leads', 'meta'] });
                onDone();
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        },
        [selectedIds, onDone],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={loading}>
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                    Assign
                    <ChevronDown className="size-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search users..."
                        className="h-9"
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList className="max-h-[220px] overflow-y-auto">
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                            {users.map((user: { id: number; name: string }) => (
                                <CommandItem
                                    key={user.id}
                                    value={String(user.id)}
                                    onSelect={() => handleAssign(user.id, user.name)}
                                    className="cursor-pointer"
                                >
                                    {user.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

const StatusPopover = memo(function StatusPopover({
    selectedIds,
    onDone,
}: {
    selectedIds: string[];
    onDone: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { statuses } = useStatuses();

    const handleStatus = useCallback(
        async (status: string) => {
            setLoading(true);
            try {
                await api.post('/leads/bulk/status', {
                    lead_ids: selectedIds,
                    inquiry_status: status,
                });
                setOpen(false);
                router.reload({ only: ['leads', 'meta'] });
                onDone();
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        },
        [selectedIds, onDone],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={loading}>
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Status
                    <ChevronDown className="size-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search statuses..." className="h-9" />
                    <CommandList className="max-h-[220px] overflow-y-auto">
                        <CommandEmpty>No statuses found.</CommandEmpty>
                        <CommandGroup>
                            {statuses.map((s) => (
                                <CommandItem
                                    key={s.id}
                                    value={s.name}
                                    onSelect={() => handleStatus(s.name)}
                                    className="cursor-pointer capitalize"
                                >
                                    {s.name.replace(/_/g, ' ')}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

const DeleteConfirm = memo(function DeleteConfirm({
    selectedIds,
    selectedCount,
    onDone,
}: {
    selectedIds: string[];
    selectedCount: number;
    onDone: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleDelete = useCallback(async () => {
        setLoading(true);
        try {
            await api.post('/leads/bulk/delete', { lead_ids: selectedIds });
            router.reload({ only: ['leads', 'meta'] });
            onDone();
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [selectedIds, onDone]);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" disabled={loading}>
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedCount} lead{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. All selected leads and their associated data will be permanently deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Delete {selectedCount} lead{selectedCount !== 1 ? 's' : ''}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
});

export const BulkActionBar = memo(function BulkActionBar({
    selectedIds,
    selectedCount,
    onClearSelection,
    isSuperAdmin,
    canEdit,
}: BulkActionBarProps) {
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden border-b bg-primary/5"
        >
            <div className="flex items-center gap-2 px-4 py-2">
                <Badge variant="primary" appearance="light" size="sm" className="shrink-0 font-semibold">
                    {selectedCount} selected
                </Badge>

                <div className="h-4 w-px shrink-0 bg-border" />

                {canEdit && (
                    <>
                        <AssignPopover selectedIds={selectedIds} onDone={onClearSelection} />
                        <StatusPopover selectedIds={selectedIds} onDone={onClearSelection} />
                    </>
                )}

                {isSuperAdmin && (
                    <DeleteConfirm
                        selectedIds={selectedIds}
                        selectedCount={selectedCount}
                        onDone={onClearSelection}
                    />
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 gap-1 text-xs text-muted-foreground"
                    onClick={onClearSelection}
                >
                    <X className="size-3.5" />
                    Clear
                </Button>
            </div>
        </motion.div>
    );
});
