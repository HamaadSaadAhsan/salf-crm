import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { CreateDialogHeader } from './create-dialog-header';
import { CreateDialogMinimizedButton } from './create-dialog-minimized-button';
import { CreateDialogTitleBar } from './create-dialog-title-bar';

const NoteDialogContent = lazy(() => import('./note-dialog-content').then((m) => ({ default: m.NoteDialogContent })));

export function CreateDialogShell() {
    const { viewState, modelType } = useCreateDialog();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    const handleScroll = useCallback(() => {
        if (scrollRef.current) {
            setIsScrolled(scrollRef.current.scrollTop > 8);
        }
    }, []);

    if (viewState === 'closed') return null;

    if (viewState === 'minimized') {
        return <CreateDialogMinimizedButton />;
    }

    const isFull = viewState === 'full';

    return (
        <>
            {/* Overlay — full state only, no color */}
            {isFull && <div className="fixed inset-0 z-[9998]" />}

            {/* Dialog positioning */}
            <div
                className={cn(
                    'fixed z-[9999] transition-transform duration-200',
                    isFull ? 'inset-0 flex items-center justify-center' : 'right-4 bottom-4',
                )}
            >
                {/* Outer glass wrapper — Attio .eExWul */}
                <div
                    className={cn(
                        'flex origin-center flex-col overflow-hidden transition-[width,height] duration-200 will-change-[transform,box-shadow]',
                        'rounded-2xl p-[3px] backdrop-blur-[15px]',
                        'bg-[rgba(228,228,231,0.6)] dark:bg-[rgba(30,34,39,0.6)]',
                        'shadow-[0_8px_28px_-6px_rgba(0,0,0,0.48),0_18px_88px_-4px_rgba(0,0,0,0.64)]',
                        isFull ? 'h-[clamp(480px,65vh,720px)] w-[clamp(560px,75vw,960px)]' : 'h-[556px] w-[min(456px,calc(100vw-2rem))]',
                    )}
                >
                    {/* Inner container — Attio .dxUETn */}
                    <div
                        className={cn(
                            'flex min-h-0 flex-1 flex-col overflow-hidden',
                            'rounded-xl bg-[var(--create-dialog-inner-bg)]',
                            'shadow-[inset_0_0_0_1px_var(--create-dialog-inner-ring)]',
                        )}
                    >
                        {/* Header wrapper — Attio .hrvFRI: z-1, backdrop-blur, covers scroll content */}
                        <div className="relative z-[2] bg-[var(--create-dialog-header-bg)] backdrop-blur-[15px]">
                            <CreateDialogHeader />
                            <CreateDialogTitleBar isScrolled={isScrolled} />
                        </div>

                        {/* Scrollable content — Attio .dESDeZ: margin-top -84px overlaps behind header */}
                        <ScrollArea
                            className={cn('min-h-0 flex-1 overflow-hidden transition-[margin] duration-200', isFull && '-mt-[84px]')}
                            viewportRef={scrollRef}
                            viewportClassName="[&>div]:!block [&>div]:h-full"
                            onScrollCapture={handleScroll}
                        >
                            {modelType === 'note' && (
                                <Suspense fallback={<div className="h-full" />}>
                                    <NoteDialogContent />
                                </Suspense>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </>
    );
}
