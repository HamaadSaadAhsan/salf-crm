import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Loader2, RefreshCw, CheckCircle2, Facebook } from 'lucide-react';
import { api } from '@/lib/api';

interface FacebookPage {
    id: string;
    name: string;
    category?: string;
}

interface PageSelectionModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (pageId: string, pageName: string) => void;
    selectedPageId?: string;
    workflowId: number;
}

export default function PageSelectionModal({
    open,
    onClose,
    onSelect,
    selectedPageId,
    workflowId,
}: PageSelectionModalProps) {
    const [search, setSearch] = useState('');
    const [pages, setPages] = useState<FacebookPage[]>([]);
    const [loading, setLoading] = useState(false);
    const [tempSelected, setTempSelected] = useState<string | null>(null);

    const filtered = pages.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.id.includes(search),
    );

    useEffect(() => {
        if (open) {
            setTempSelected(selectedPageId || null);
            setSearch('');
            fetchPages();
        }
    }, [open]);

    const fetchPages = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/workflows/${workflowId}/pages`);
            setPages(res.pages || []);
        } catch {
            setPages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!tempSelected) return;
        const page = pages.find((p) => p.id === tempSelected);
        if (page) {
            onSelect(page.id, page.name);
        }
        onClose();
    };

    const selectedPage = pages.find((p) => p.id === tempSelected);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Facebook className="w-5 h-5 text-[#1877F2]" />
                        Select Facebook Page
                    </DialogTitle>
                    <DialogDescription>
                        Choose the page you want to receive leads from.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search pages..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Loading pages...</p>
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="divide-y divide-border">
                                {filtered.map((page) => {
                                    const isSelected = tempSelected === page.id;
                                    return (
                                        <button
                                            key={page.id}
                                            type="button"
                                            onClick={() => setTempSelected(page.id)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                                                isSelected
                                                    ? 'bg-primary/5'
                                                    : 'hover:bg-muted/50',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                                    isSelected
                                                        ? 'bg-[#1877F2] text-white'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                <Facebook className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {page.name}
                                                </p>
                                                {page.category && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {page.category}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Facebook className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {search ? `No pages matching "${search}"` : 'No pages found'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{pages.length} page{pages.length !== 1 ? 's' : ''} available</span>
                        <button
                            type="button"
                            onClick={fetchPages}
                            disabled={loading}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
                            Refresh
                        </button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!tempSelected}>
                        {selectedPage ? `Select ${selectedPage.name}` : 'Select Page'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
