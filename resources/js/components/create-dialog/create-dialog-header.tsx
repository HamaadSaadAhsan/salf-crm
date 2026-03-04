import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { Link } from '@inertiajs/react';
import { Minus, Pin, User2, X } from 'lucide-react';

export function CreateDialogHeader() {
    const { association, viewState, close, minimize, pin, expand } = useCreateDialog();

    return (
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 shadow-[inset_0_-1px_0_0_var(--color-border)] px-2">
            {/* Left: Lead lozenge */}
            <div className="flex items-center gap-1.5 min-w-0">
                {association?.name && (
                    <Link
                        href={association.url || '#'}
                        className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-xs font-medium tracking-[-0.01em] leading-4 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors truncate min-w-0"
                    >
                        <User2 className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{association.name}</span>
                    </Link>
                )}
            </div>

            {/* Right: Window actions */}
            <div className="flex items-center gap-0.5 shrink-0">
                {/* Minimize */}
                <button
                    type="button"
                    onClick={minimize}
                    className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    aria-label="Minimize"
                >
                    <Minus className="size-3.5" />
                </button>

                {/* Pin / Expand */}
                {viewState === 'full' ? (
                    <button
                        type="button"
                        onClick={pin}
                        className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                        aria-label="Pin to corner"
                    >
                        <Pin className="size-3.5" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={expand}
                        className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                        aria-label="Expand"
                    >
                        <Pin className="size-3.5 rotate-45" />
                    </button>
                )}

                {/* Close */}
                <button
                    type="button"
                    onClick={close}
                    className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    aria-label="Close"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        </div>
    );
}
