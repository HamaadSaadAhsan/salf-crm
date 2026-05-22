import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
    ChevronDown,
    ChevronRight,
    Download,
    EllipsisVerticalIcon,
    ExternalLink,
    FileImage,
    FileText,
    Folder,
    FolderInput,
    FolderPlus,
    MoreVerticalIcon,
    Pencil,
    Trash2,
    Upload,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
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
import { CreateButton } from '@/components/ui/create-button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    type LeadFile,
    type LeadFolder,
    useCreateLeadFolder,
    useDeleteLeadFile,
    useDeleteLeadFolder,
    useLeadFiles,
    useLeadFolders,
    useMoveFileToFolder,
    useRenameLeadFile,
    useRenameLeadFolder,
    useUploadLeadFiles,
} from '@/hooks/useLead';
import { type SharedData } from '@/types';
import GoogleDriveIcon from '@/components/icons/google-drive-icon';
import { GoogleDriveFilePicker } from '@/components/google-drive-file-picker';
import {
    type GoogleDriveFile,
    type LinkedGoogleDriveFile,
    type StorageAccount,
    useAttachGoogleDriveFile,
    useDetachGoogleDriveFile,
    useLeadGoogleDriveFiles,
    useStorageAccounts,
} from '@/hooks/useGoogleDrive';

type LeadRecordsFilesProps = {
    leadId: number | string;
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
    try {
        return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}

export function LeadRecordsFiles({ leadId }: LeadRecordsFilesProps) {
    const { auth } = usePage<SharedData>().props;
    const canUploadFiles = auth.permissions.includes('view files');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<LeadFile | null>(null);
    const [renameTarget, setRenameTarget] = useState<LeadFile | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [drivePickerOpen, setDrivePickerOpen] = useState(false);
    const [driveDeleteTarget, setDriveDeleteTarget] = useState<LinkedGoogleDriveFile | null>(null);

    // Folder state
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createFolderName, setCreateFolderName] = useState('');
    const [renameFolderTarget, setRenameFolderTarget] = useState<LeadFolder | null>(null);
    const [renameFolderValue, setRenameFolderValue] = useState('');
    const [deleteFolderTarget, setDeleteFolderTarget] = useState<LeadFolder | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    const leadIdStr = String(leadId);
    const { data, isLoading, error } = useLeadFiles(leadIdStr);
    const { data: foldersData } = useLeadFolders(leadIdStr);
    const uploadMutation = useUploadLeadFiles(leadIdStr);
    const renameMutation = useRenameLeadFile(leadIdStr);
    const deleteMutation = useDeleteLeadFile(leadIdStr);
    const createFolderMutation = useCreateLeadFolder(leadIdStr);
    const renameFolderMutation = useRenameLeadFolder(leadIdStr);
    const deleteFolderMutation = useDeleteLeadFolder(leadIdStr);
    const moveFileMutation = useMoveFileToFolder(leadIdStr);

    // Google Drive
    const { data: storageAccountsData } = useStorageAccounts();
    const { data: driveFilesData } = useLeadGoogleDriveFiles(leadIdStr);
    const attachMutation = useAttachGoogleDriveFile(leadIdStr);
    const detachMutation = useDetachGoogleDriveFile(leadIdStr);

    const storageAccounts = (storageAccountsData as { data: StorageAccount[] } | undefined)?.data?.filter((a) => a.provider === 'google_drive') ?? [];
    const linkedDriveFiles: LinkedGoogleDriveFile[] = (driveFilesData as { data: LinkedGoogleDriveFile[] } | undefined)?.data ?? [];
    const hasConnectedDrive = storageAccounts.length > 0;
    const files = useMemo<LeadFile[]>(() => (data as { data: LeadFile[] } | undefined)?.data || [], [data]);
    const folders: LeadFolder[] = (foldersData as { data: LeadFolder[] } | undefined)?.data || [];

    // Group files by folder
    const { rootFiles, folderFilesMap } = useMemo(() => {
        const rootFiles: LeadFile[] = [];
        const folderFilesMap = new Map<number, LeadFile[]>();

        for (const file of files) {
            const folderId = file.folder_id;
            if (folderId) {
                const existing = folderFilesMap.get(folderId) || [];
                existing.push(file);
                folderFilesMap.set(folderId, existing);
            } else {
                rootFiles.push(file);
            }
        }

        return { rootFiles, folderFilesMap };
    }, [files]);

    const toggleFolder = useCallback((folderId: number) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    const handleFileSelect = useCallback(
        (selectedFiles: FileList | null) => {
            if (!selectedFiles || selectedFiles.length === 0) return;
            uploadMutation.mutate({ files: Array.from(selectedFiles) });
        },
        [uploadMutation],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            uploadMutation.mutate({ files: Array.from(e.dataTransfer.files) });
        },
        [uploadMutation],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleStartRename = useCallback((file: LeadFile) => {
        setRenameValue(file.file_name.replace(/\.[^.]+$/, ''));
        setRenameTarget(file);
    }, []);

    const handleRename = useCallback(() => {
        if (!renameTarget) return;
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== renameTarget.file_name.replace(/\.[^.]+$/, '')) {
            renameMutation.mutate({ mediaId: renameTarget.id, name: trimmed });
        }
        setRenameTarget(null);
    }, [renameTarget, renameValue, renameMutation]);

    const handleDelete = useCallback(() => {
        if (!deleteTarget) return;
        deleteMutation.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
        });
    }, [deleteTarget, deleteMutation]);

    const handleCreateFolder = useCallback(() => {
        const trimmed = createFolderName.trim();
        if (!trimmed) return;
        createFolderMutation.mutate(trimmed, {
            onSuccess: () => {
                setCreateFolderOpen(false);
                setCreateFolderName('');
            },
        });
    }, [createFolderName, createFolderMutation]);

    const handleStartRenameFolder = useCallback((folder: LeadFolder) => {
        setRenameFolderValue(folder.name);
        setRenameFolderTarget(folder);
    }, []);

    const handleRenameFolder = useCallback(() => {
        if (!renameFolderTarget) return;
        const trimmed = renameFolderValue.trim();
        if (trimmed && trimmed !== renameFolderTarget.name) {
            renameFolderMutation.mutate({ folderId: renameFolderTarget.id, name: trimmed });
        }
        setRenameFolderTarget(null);
    }, [renameFolderTarget, renameFolderValue, renameFolderMutation]);

    const handleDeleteFolder = useCallback(() => {
        if (!deleteFolderTarget) return;
        deleteFolderMutation.mutate(deleteFolderTarget.id, {
            onSettled: () => setDeleteFolderTarget(null),
        });
    }, [deleteFolderTarget, deleteFolderMutation]);

    const handleDriveFileSelect = useCallback(
        (file: GoogleDriveFile, accountId: number) => {
            attachMutation.mutate({
                storage_account_id: accountId,
                google_file_id: file.id,
                file_name: file.name,
                mime_type: file.mimeType ?? null,
                file_size: file.size ? parseInt(file.size, 10) : null,
                icon_link: file.iconLink ?? null,
                web_view_link: file.webViewLink ?? null,
                thumbnail_link: file.thumbnailLink ?? null,
            });
        },
        [attachMutation],
    );

    const handleDriveFileDetach = useCallback(() => {
        if (!driveDeleteTarget) return;
        detachMutation.mutate(driveDeleteTarget.id, {
            onSettled: () => setDriveDeleteTarget(null),
        });
    }, [driveDeleteTarget, detachMutation]);

    if (isLoading) {
        return (
            <div className="px-3 pt-1 pb-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl px-2.5 py-2">
                        <div className="size-4 shrink-0 rounded bg-muted" />
                        <div className="flex flex-1 items-center gap-1 overflow-hidden">
                            <div className="h-4 w-28 rounded bg-muted" />
                            <div className="h-3.5 w-14 rounded bg-muted" />
                        </div>
                        <div className="h-3.5 w-20 rounded bg-muted" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-3 pt-1 pb-3">
                <div className="text-destructive py-12 text-center text-sm">Failed to load files. Please try again.</div>
            </div>
        );
    }

    const hasAnyFiles = files.length > 0 || linkedDriveFiles.length > 0 || folders.length > 0;

    return (
        <div className="pb-3">
            {/* Header buttons */}
            <div className="flex items-center-safe justify-between">
                <div className="text-base leading-5 font-semibold tracking-[-0.02em] text-foreground">Files</div>
                {canUploadFiles && (
                    <div className="mb-2 flex items-center gap-2 px-2.5">
                        <CreateButton icon={<FolderPlus />} onClick={() => setCreateFolderOpen(true)}>
                            New folder
                        </CreateButton>
                        <CreateButton icon={<Upload />} onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
                            {uploadMutation.isPending ? 'Uploading...' : 'Upload file'}
                        </CreateButton>
                        {hasConnectedDrive ? (
                            <CreateButton
                                icon={<GoogleDriveIcon className="size-3.5" />}
                                onClick={() => setDrivePickerOpen(true)}
                                disabled={attachMutation.isPending}
                            >
                                {attachMutation.isPending ? 'Attaching...' : 'Google Drive'}
                            </CreateButton>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <CreateButton icon={<MoreVerticalIcon size={28} className="text-muted-foreground" />} />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-w-[221px]" align="end">
                                    <div className="flex flex-col items-center justify-center gap-3 px-2.5 py-[19px]">
                                        <div className="flex flex-col gap-0.5 text-center">
                                            <span className="text-sm leading-5 font-medium tracking-[-0.01em] text-foreground">
                                                No connected accounts
                                            </span>
                                            <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/55">
                                                Connect Google Drive, Microsoft OneDrive, Dropbox, or Box to start linking your files and folders.
                                            </span>
                                        </div>
                                        <a
                                            href="/settings/storage-accounts"
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-sm leading-5 font-medium tracking-[-0.01em] text-zinc-700 shadow-[inset_0_0_0_1px_rgb(212,212,216),0_0_2px_0_rgba(0,0,0,0.04),0_1px_3px_0_rgba(0,0,0,0.06)] transition-[background-color,color,box-shadow] duration-200 hover:bg-zinc-200 active:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-[inset_0_0_0_1px_rgb(47,48,51),0_0_2px_0_rgba(0,0,0,0.5),0_1px_3px_0_rgba(0,0,0,0.08)] dark:hover:bg-zinc-800 dark:active:bg-zinc-800"
                                        >
                                            Setup in settings
                                        </a>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
                    </div>
                )}
            </div>

            {!hasAnyFiles ? (
                <div
                    className={`transition-colors ${isDragging ? 'rounded-xl border-2 border-dashed border-primary bg-primary/5' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="mx-auto flex max-w-[221px] flex-col items-center justify-center gap-3 px-2.5 py-[19px]">
                        <div className="flex flex-col items-center justify-center gap-0">
                            <span className="text-center text-sm leading-5 font-medium tracking-[-0.01em] text-foreground">No files yet</span>
                            <span className="text-center text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/55">
                                {canUploadFiles
                                    ? 'Drag and drop files here, or click Upload to add files.'
                                    : 'Upload files to keep track of documents for this lead.'}
                            </span>
                        </div>
                        {canUploadFiles && (
                            <CreateButton icon={<Upload />} onClick={() => fileInputRef.current?.click()}>
                                Upload file
                            </CreateButton>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    className={`transition-colors ${isDragging ? 'rounded-xl bg-primary/5 ring-2 ring-primary ring-offset-2' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    {/* Folders */}
                    {folders.map((folder) => {
                        const folderFiles = folderFilesMap.get(folder.id) || [];
                        const isExpanded = expandedFolders.has(folder.id);

                        return (
                            <div key={`folder-${folder.id}`}>
                                <FolderRow
                                    folder={folder}
                                    fileCount={folderFiles.length}
                                    isExpanded={isExpanded}
                                    canEdit={canUploadFiles}
                                    onToggle={() => toggleFolder(folder.id)}
                                    onRename={() => handleStartRenameFolder(folder)}
                                    onDelete={() => setDeleteFolderTarget(folder)}
                                />
                                {isExpanded && (
                                    <div className="pl-5">
                                        {folderFiles.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">No files in this folder</div>
                                        ) : (
                                            folderFiles.map((file) => (
                                                <FileItem
                                                    key={`local-${file.id}`}
                                                    file={file}
                                                    leadId={leadIdStr}
                                                    canDelete={canUploadFiles}
                                                    folders={folders}
                                                    onRename={() => handleStartRename(file)}
                                                    onDelete={() => setDeleteTarget(file)}
                                                    onMoveToFolder={(folderId) => moveFileMutation.mutate({ mediaId: file.id, folderId })}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Root local files (no folder) */}
                    {rootFiles.map((file) => (
                        <FileItem
                            key={`local-${file.id}`}
                            file={file}
                            leadId={leadIdStr}
                            canDelete={canUploadFiles}
                            folders={folders}
                            onRename={() => handleStartRename(file)}
                            onDelete={() => setDeleteTarget(file)}
                            onMoveToFolder={(folderId) => moveFileMutation.mutate({ mediaId: file.id, folderId })}
                        />
                    ))}

                    {/* Google Drive files */}
                    {linkedDriveFiles.map((file) => (
                        <DriveFileItem
                            key={`drive-${file.id}`}
                            file={file}
                            canDelete={canUploadFiles}
                            onDelete={() => setDriveDeleteTarget(file)}
                        />
                    ))}
                </div>
            )}

            {/* Google Drive File Picker */}
            {hasConnectedDrive && (
                <GoogleDriveFilePicker
                    open={drivePickerOpen}
                    onOpenChange={setDrivePickerOpen}
                    accounts={storageAccounts}
                    onSelect={handleDriveFileSelect}
                />
            )}

            {/* Create folder dialog */}
            <AlertDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>New folder</AlertDialogTitle>
                        <AlertDialogDescription>Enter a name for the new folder.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <input
                        type="text"
                        value={createFolderName}
                        onChange={(e) => setCreateFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        placeholder="Folder name"
                        autoFocus
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 font-medium tracking-[-0.01em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCreateFolderName('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateFolder} disabled={!createFolderName.trim() || createFolderMutation.isPending}>
                            {createFolderMutation.isPending ? 'Creating...' : 'Create'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename file dialog */}
            <AlertDialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename file</AlertDialogTitle>
                        <AlertDialogDescription>Enter a new name for &quot;{renameTarget?.file_name}&quot;.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        autoFocus
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 font-medium tracking-[-0.01em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRename}>Rename</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename folder dialog */}
            <AlertDialog open={!!renameFolderTarget} onOpenChange={(open) => !open && setRenameFolderTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename folder</AlertDialogTitle>
                        <AlertDialogDescription>Enter a new name for &quot;{renameFolderTarget?.name}&quot;.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <input
                        type="text"
                        value={renameFolderValue}
                        onChange={(e) => setRenameFolderValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                        autoFocus
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 font-medium tracking-[-0.01em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRenameFolder}>Rename</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete file confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete file</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.file_name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete folder confirmation */}
            <AlertDialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete folder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the folder &quot;{deleteFolderTarget?.name}&quot;? Files inside will be moved to the root
                            level.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-white hover:bg-destructive/90">
                            {deleteFolderMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Google Drive linked file confirmation */}
            <AlertDialog open={!!driveDeleteTarget} onOpenChange={(open) => !open && setDriveDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove linked file</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove the link to &quot;{driveDeleteTarget?.file_name}&quot; from this lead? The file will remain in Google Drive.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDriveFileDetach} className="bg-destructive text-white hover:bg-destructive/90">
                            {detachMutation.isPending ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  FolderRow                                                          */
/* ------------------------------------------------------------------ */

function FolderRow({
    folder,
    fileCount,
    isExpanded,
    canEdit,
    onToggle,
    onRename,
    onDelete,
}: {
    folder: LeadFolder;
    fileCount: number;
    isExpanded: boolean;
    canEdit: boolean;
    onToggle: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="cursor-pointer" onClick={onToggle}>
            <div
                tabIndex={0}
                className="group flex min-w-0 flex-auto items-center gap-4 rounded-xl py-2 transition-colors duration-150 hover:bg-zinc-100 focus:shadow-[rgb(78,140,252)_0_0_0_1px_inset] focus:outline-none dark:hover:bg-[rgb(31,33,37)]"
            >
                <div className="flex w-full items-center justify-between gap-4 px-3">
                    <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
                        <div className="flex size-4 shrink-0 items-center justify-center">
                            {isExpanded ? (
                                <ChevronDown className="size-3 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="size-3 text-muted-foreground" />
                            )}
                        </div>

                        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                            <div className="flex size-4 shrink-0 items-center justify-center">
                                <Folder className="size-3.5 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1 rounded-[5px] px-0.5">
                                <div className="flex min-w-0 items-center gap-1 px-0.5">
                                    <span className="truncate text-sm leading-5 font-medium tracking-[-0.01em] text-foreground">{folder.name}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 pt-[3px] pb-px">
                                <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/[0.29]">
                                    ({fileCount} {fileCount === 1 ? 'file' : 'files'})
                                </span>
                            </div>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="flex shrink-0 items-center gap-2">
                            <div onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <CreateButton
                                            variant="ghost"
                                            icon={<EllipsisVerticalIcon className="size-3" />}
                                            aria-label="Folder options"
                                            className="text-muted-foreground transition-opacity duration-100 hover:text-foreground data-[state=open]:opacity-100"
                                        />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={4} className="w-[180px]">
                                        <DropdownMenuItem onSelect={onRename}>
                                            <Pencil className="size-3.5 shrink-0" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem variant="destructive" onClick={onDelete}>
                                            <Trash2 className="size-3.5 shrink-0" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  FileItem — Attio-style row                                        */
/* ------------------------------------------------------------------ */

function FileItem({
    file,
    leadId,
    canDelete,
    folders,
    onRename,
    onDelete,
    onMoveToFolder,
}: {
    file: LeadFile;
    leadId: string;
    canDelete: boolean;
    folders: LeadFolder[];
    onRename: () => void;
    onDelete: () => void;
    onMoveToFolder: (folderId: number | null) => void;
}) {
    return (
        <div className="cursor-pointer">
            <div
                tabIndex={0}
                className="group flex min-w-0 flex-auto items-center gap-4 rounded-xl py-2 transition-colors duration-150 hover:bg-zinc-100 focus:shadow-[rgb(78,140,252)_0_0_0_1px_inset] focus:outline-none dark:hover:bg-[rgb(31,33,37)]"
            >
                <div className="flex w-full items-center justify-between gap-4 px-3">
                    {/* Left: icon + name + size */}
                    <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
                        <div className="flex size-4 shrink-0 items-center justify-center">
                            {/\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(file.file_name) ? (
                                <FileImage className="size-3.5 text-blue-500" />
                            ) : (
                                <FileText className="size-3.5 text-muted-foreground" />
                            )}
                        </div>

                        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                            <div className="min-w-0 flex-1 rounded-[5px] px-0.5">
                                <div className="flex min-w-0 items-center gap-1 px-0.5">
                                    <span className="truncate text-sm leading-5 font-medium tracking-[-0.01em] text-foreground">
                                        {file.file_name}
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 pt-[3px] pb-px">
                                <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/[0.29]">
                                    ({formatFileSize(file.size)})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: date + menu */}
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/[0.29]">
                            {formatDate(file.created_at)}
                        </span>
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <CreateButton
                                        variant="ghost"
                                        icon={<EllipsisVerticalIcon className="size-3" />}
                                        aria-label="File options"
                                        className="text-muted-foreground transition-opacity duration-100 hover:text-foreground data-[state=open]:opacity-100"
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={4} className="w-[180px]">
                                    <DropdownMenuItem onSelect={onRename}>
                                        <Pencil className="size-3.5 shrink-0" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <a href={`/api/leads/${leadId}/files/${file.id}/download`} download>
                                            <Download className="size-3.5 shrink-0" />
                                            <span className="truncate">Download ({formatFileSize(file.size)})</span>
                                        </a>
                                    </DropdownMenuItem>
                                    {folders.length > 0 && (
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <FolderInput className="size-3.5 shrink-0" />
                                                Move to folder
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent className="w-[180px]">
                                                {file.folder_id && (
                                                    <DropdownMenuItem onSelect={() => onMoveToFolder(null)}>
                                                        <span className="text-muted-foreground">Root (no folder)</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {folders
                                                    .filter((f) => f.id !== file.folder_id)
                                                    .map((f) => (
                                                        <DropdownMenuItem key={f.id} onSelect={() => onMoveToFolder(f.id)}>
                                                            <Folder className="size-3.5 shrink-0 text-amber-500" />
                                                            <span className="truncate">{f.name}</span>
                                                        </DropdownMenuItem>
                                                    ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    )}
                                    {canDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onClick={onDelete}>
                                                <Trash2 className="size-3.5 shrink-0" />
                                                Delete
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  DriveFileItem — Google Drive linked file row                       */
/* ------------------------------------------------------------------ */

function DriveFileItem({
    file,
    canDelete,
    onDelete,
}: {
    file: LinkedGoogleDriveFile;
    canDelete: boolean;
    onDelete: () => void;
}) {
    return (
        <div className="cursor-pointer">
            <div
                tabIndex={0}
                className="group flex min-w-0 flex-auto items-center gap-4 rounded-xl py-2 transition-colors duration-150 hover:bg-zinc-100 focus:shadow-[rgb(78,140,252)_0_0_0_1px_inset] focus:outline-none dark:hover:bg-[rgb(31,33,37)]"
                onClick={() => file.web_view_link && window.open(file.web_view_link, '_blank')}
            >
                <div className="flex w-full items-center justify-between gap-4 px-3">
                    {/* Left: icon + name + size + badge */}
                    <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
                        <div className="flex size-4 shrink-0 items-center justify-center">
                            {file.icon_link ? <img src={file.icon_link} alt="" className="size-4" /> : <GoogleDriveIcon className="size-3.5" />}
                        </div>

                        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                            <div className="min-w-0 flex-1 rounded-[5px] px-0.5">
                                <div className="flex min-w-0 items-center gap-1 px-0.5">
                                    <span className="truncate text-sm leading-5 font-medium tracking-[-0.01em] text-foreground">
                                        {file.file_name}
                                    </span>
                                    <GoogleDriveIcon className="size-2.5 shrink-0" />
                                </div>
                            </div>
                            {file.file_size && (
                                <div className="flex shrink-0 items-center gap-1 pt-[3px] pb-px">
                                    <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/[0.29]">
                                        ({formatFileSize(file.file_size)})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: date + menu */}
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs leading-4 font-medium tracking-[-0.01em] text-foreground/[0.29]">
                            {formatDate(file.created_at)}
                        </span>
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <CreateButton
                                        variant="ghost"
                                        icon={<EllipsisVerticalIcon className="size-3" />}
                                        aria-label="File options"
                                        className="text-muted-foreground transition-opacity duration-100 hover:text-foreground data-[state=open]:opacity-100"
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={4} className="w-[180px]">
                                    {file.web_view_link && (
                                        <DropdownMenuItem className="text-ellipsis text-nowrap" asChild>
                                            <a href={file.web_view_link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="size-3.5 shrink-0" />
                                                Open in Google Drive
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete();
                                                }}
                                            >
                                                <Trash2 className="size-3.5 shrink-0" />
                                                Remove link
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
