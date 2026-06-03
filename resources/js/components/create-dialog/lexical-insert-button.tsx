import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { Heading1, Heading2, Heading3, ImageIcon, List, ListOrdered, Loader2, Plus, Type } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { INSERT_IMAGE_COMMAND } from './lexical-image-plugin';
import { useCreateDialog } from '@/providers/CreateDialogProvider';
import axios from '@/lib/http';
import { toast } from 'sonner';

const BLOCK_OPTIONS = [
    { type: 'paragraph', label: 'Body', icon: Type },
    { type: 'h1', label: 'Heading 1', icon: Heading1 },
    { type: 'h2', label: 'Heading 2', icon: Heading2 },
    { type: 'h3', label: 'Heading 3', icon: Heading3 },
    { type: 'ul', label: 'Bulleted list', icon: List },
    { type: 'ol', label: 'Numbered list', icon: ListOrdered },
] as const;

export function InsertButton() {
    const [editor] = useLexicalComposerContext();
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { association } = useCreateDialog();

    const handleInsert = useCallback((type: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            switch (type) {
                case 'paragraph':
                    $setBlocksType(selection, () => $createParagraphNode());
                    break;
                case 'h1':
                case 'h2':
                case 'h3':
                    $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
                    break;
                case 'ul':
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                    break;
                case 'ol':
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                    break;
            }
        });
        setOpen(false);
        editor.focus();
    }, [editor]);

    const handleImageSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const leadId = association?.id;
        if (!leadId) {
            toast.error('No lead associated — cannot upload image');
            return;
        }

        setUploading(true);
        setOpen(false);

        try {
            const formData = new FormData();
            for (const file of Array.from(files)) {
                formData.append('files[]', file);
            }

            const response = await axios.post<{ data?: { url: string; name?: string; file_name?: string }[] }>(`/api/leads/${leadId}/files`, formData);

            const uploaded = response.data.data || [];
            for (const file of uploaded) {
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                    src: file.url,
                    altText: file.name || file.file_name as string || 'Uploaded Image',
                });
            }
        } catch {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [editor, association?.id]);

    const handleImageClick = useCallback(() => {
        setOpen(false);
        fileInputRef.current?.click();
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="absolute bottom-3 left-3 z-10">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageSelect(e.target.files)}
            />
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(!open)}
                disabled={uploading}
                aria-label="Insert"
                aria-haspopup="dialog"
                aria-expanded={open}
                data-state={open ? 'open' : 'closed'}
                className={cn(
                    'flex items-center justify-center size-7 rounded-lg transition-[background-color,color,box-shadow] duration-200',
                    'bg-white dark:bg-[#1A1D21]',
                    'shadow-[inset_0_0_0_1px_var(--color-border),0_0_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)]',
                    'dark:shadow-[inset_0_0_0_1px_#2F3033,0_0_2px_rgb(0,0,0),0_1px_3px_rgba(0,0,0,0.08)]',
                    'hover:bg-zinc-50 dark:hover:bg-[#27282B]',
                    'text-foreground',
                    uploading && 'opacity-60 pointer-events-none',
                )}
            >
                {uploading ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            </button>

            {/* Popover */}
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute bottom-full left-0 mb-1.5 z-10"
                >
                    <div className="flex flex-col gap-px p-1 rounded-xl min-w-[180px] bg-white dark:bg-[rgb(31,33,37)] border border-zinc-200 dark:border-transparent shadow-[rgba(28,40,64,0.08)_0_4px_12px_-4px,rgba(28,40,64,0.06)_0_2px_4px] dark:shadow-[rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px]">
                        {BLOCK_OPTIONS.map(({ type, label, icon: Icon }) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleInsert(type)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-normal tracking-[-0.02em] leading-5 text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-[160ms]"
                            >
                                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                                {label}
                            </button>
                        ))}

                        {/* Separator */}
                        <div className="h-px bg-border mx-1 my-0.5" />

                        {/* Image option */}
                        <button
                            type="button"
                            onClick={handleImageClick}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-normal tracking-[-0.02em] leading-5 text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-[160ms]"
                        >
                            <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            Image
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
