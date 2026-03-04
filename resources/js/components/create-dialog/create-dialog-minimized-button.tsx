import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { GalleryVerticalEnd, Mail, ListTodo, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODEL_ICONS = {
    note: GalleryVerticalEnd,
    email: Mail,
    task: ListTodo,
} as const;

export function CreateDialogMinimizedButton() {
    const { modelType, expand, close } = useCreateDialog();

    const Icon = modelType ? MODEL_ICONS[modelType] : GalleryVerticalEnd;

    return (
        <div className="fixed bottom-4 right-4 z-[200] group">
            {/* Close button on hover */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    close();
                }}
                className="absolute -top-1 -right-1 size-3.5 rounded-full bg-zinc-500 dark:bg-zinc-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100 hover:bg-zinc-600 dark:hover:bg-zinc-500 z-10"
                aria-label="Close"
            >
                <X className="size-2" />
            </button>

            {/* Main button */}
            <button
                type="button"
                onClick={expand}
                className={cn(
                    'size-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
                    'bg-blue-500 hover:bg-blue-600 text-white',
                    'hover:scale-110',
                )}
                aria-label={`Expand ${modelType || 'dialog'}`}
            >
                <Icon className="size-4" />
            </button>
        </div>
    );
}
