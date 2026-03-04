import { useCallback, useState } from 'react';
import { ChevronRight, FileText, Folder, Home, Search } from 'lucide-react';

import GoogleDriveIcon from '@/components/icons/google-drive-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type GoogleDriveFile, type StorageAccount, useGoogleDriveFiles } from '@/hooks/useGoogleDrive';

interface BreadcrumbEntry {
    id: string | null;
    name: string;
}

interface GoogleDriveFilePickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: StorageAccount[];
    onSelect: (file: GoogleDriveFile, accountId: number) => void;
}

function formatFileSize(bytes: string | undefined): string {
    if (!bytes) return '';
    const num = parseInt(bytes, 10);
    if (isNaN(num) || num === 0) return '';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${parseFloat((num / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

function isFolder(file: GoogleDriveFile): boolean {
    return file.mimeType === 'application/vnd.google-apps.folder';
}

export function GoogleDriveFilePicker({ open, onOpenChange, accounts, onSelect }: GoogleDriveFilePickerProps) {
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(accounts.length === 1 ? accounts[0].id : null);
    const [folderId, setFolderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: 'My Drive' }]);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const { data, isLoading } = useGoogleDriveFiles(
        selectedAccountId,
        debouncedQuery ? null : folderId,
        debouncedQuery || null,
    );

    const files = data?.files ?? [];

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchQuery(value);
            if (searchTimeout) clearTimeout(searchTimeout);
            const timeout = setTimeout(() => {
                setDebouncedQuery(value);
            }, 400);
            setSearchTimeout(timeout);
        },
        [searchTimeout],
    );

    const handleFolderClick = useCallback(
        (file: GoogleDriveFile) => {
            setFolderId(file.id);
            setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
            setSearchQuery('');
            setDebouncedQuery('');
        },
        [],
    );

    const handleBreadcrumbClick = useCallback(
        (entry: BreadcrumbEntry, index: number) => {
            setFolderId(entry.id);
            setBreadcrumbs((prev) => prev.slice(0, index + 1));
            setSearchQuery('');
            setDebouncedQuery('');
        },
        [],
    );

    const handleFileSelect = useCallback(
        (file: GoogleDriveFile) => {
            if (isFolder(file)) {
                handleFolderClick(file);
                return;
            }
            if (selectedAccountId) {
                onSelect(file, selectedAccountId);
                onOpenChange(false);
            }
        },
        [selectedAccountId, onSelect, onOpenChange, handleFolderClick],
    );

    const handleAccountSelect = useCallback((accountId: number) => {
        setSelectedAccountId(accountId);
        setFolderId(null);
        setBreadcrumbs([{ id: null, name: 'My Drive' }]);
        setSearchQuery('');
        setDebouncedQuery('');
    }, []);

    const handleClose = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) {
                setFolderId(null);
                setBreadcrumbs([{ id: null, name: 'My Drive' }]);
                setSearchQuery('');
                setDebouncedQuery('');
                if (accounts.length !== 1) {
                    setSelectedAccountId(null);
                }
            }
            onOpenChange(nextOpen);
        },
        [accounts.length, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg p-0">
                <DialogHeader className="px-5 pt-5 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <GoogleDriveIcon className="size-4" />
                        Google Drive
                    </DialogTitle>
                    <DialogDescription>Browse and select a file to attach</DialogDescription>
                </DialogHeader>

                <DialogBody className="px-5 pb-5">
                    {/* Account selector (multi accounts) */}
                    {!selectedAccountId && accounts.length > 1 && (
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Select an account</span>
                            {accounts.map((account) => (
                                <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleAccountSelect(account.id)}
                                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    <GoogleDriveIcon className="size-4 shrink-0" />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="truncate text-sm font-medium text-foreground">
                                            {account.provider_account_email}
                                        </span>
                                        {account.provider_account_name && (
                                            <span className="truncate text-xs text-muted-foreground">
                                                {account.provider_account_name}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* File browser */}
                    {selectedAccountId && (
                        <div className="space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Breadcrumbs */}
                            {!debouncedQuery && (
                                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                                    {breadcrumbs.map((entry, index) => (
                                        <div key={entry.id ?? 'root'} className="flex shrink-0 items-center gap-1">
                                            {index > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
                                            <button
                                                type="button"
                                                onClick={() => handleBreadcrumbClick(entry, index)}
                                                className={`rounded px-1 py-0.5 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                                    index === breadcrumbs.length - 1
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {index === 0 ? <Home className="size-3" /> : entry.name}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* File list */}
                            <ScrollArea className="h-[320px] rounded-lg border border-border">
                                {isLoading ? (
                                    <div className="space-y-1 p-2">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg px-3 py-2">
                                                <div className="size-4 rounded bg-muted" />
                                                <div className="h-4 flex-1 rounded bg-muted" />
                                            </div>
                                        ))}
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                                        <span className="text-sm font-medium text-foreground">
                                            {debouncedQuery ? 'No results found' : 'This folder is empty'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {debouncedQuery
                                                ? 'Try a different search term'
                                                : 'Navigate to a folder with files'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {files.map((file) => (
                                            <button
                                                key={file.id}
                                                type="button"
                                                onClick={() => handleFileSelect(file)}
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            >
                                                <div className="flex size-4 shrink-0 items-center justify-center">
                                                    {isFolder(file) ? (
                                                        <Folder className="size-3.5 text-blue-500" />
                                                    ) : file.iconLink ? (
                                                        <img
                                                            src={file.iconLink}
                                                            alt=""
                                                            className="size-4"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                    ) : (
                                                        <FileText className="size-3.5 text-muted-foreground" />
                                                    )}
                                                    <FileText className="hidden size-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span className="truncate text-sm font-medium text-foreground">
                                                        {file.name}
                                                    </span>
                                                    {!isFolder(file) && file.size && (
                                                        <span className="shrink-0 text-xs text-muted-foreground">
                                                            {formatFileSize(file.size)}
                                                        </span>
                                                    )}
                                                </div>
                                                {isFolder(file) && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Back to accounts */}
                            {accounts.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedAccountId(null);
                                        setFolderId(null);
                                        setBreadcrumbs([{ id: null, name: 'My Drive' }]);
                                    }}
                                >
                                    Switch account
                                </Button>
                            )}
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
