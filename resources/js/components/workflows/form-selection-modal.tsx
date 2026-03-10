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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Loader2, RefreshCw, CheckCircle2, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface FormQuestion {
    key: string;
    label: string;
    type: string;
}

interface LeadForm {
    id: string;
    name: string;
    status: string;
    questions?: FormQuestion[];
}

interface FormSelectionModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (formId: string, formName: string, questions?: FormQuestion[]) => void;
    selectedFormId?: string;
    pageId: string;
    workflowId: number;
}

export default function FormSelectionModal({
    open,
    onClose,
    onSelect,
    selectedFormId,
    pageId,
    workflowId,
}: FormSelectionModalProps) {
    const [search, setSearch] = useState('');
    const [forms, setForms] = useState<LeadForm[]>([]);
    const [loading, setLoading] = useState(false);
    const [tempSelected, setTempSelected] = useState<string | null>(null);

    const filtered = forms.filter(
        (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.id.includes(search),
    );

    useEffect(() => {
        if (open && pageId) {
            setTempSelected(selectedFormId || null);
            setSearch('');
            fetchForms();
        }
    }, [open, pageId]);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/workflows/${workflowId}/lead-forms?page_id=${pageId}`);
            setForms(res.forms || []);
        } catch {
            setForms([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!tempSelected) return;
        const form = forms.find((f) => f.id === tempSelected);
        if (form) {
            onSelect(form.id, form.name, form.questions);
        }
        onClose();
    };

    const selectedForm = forms.find((f) => f.id === tempSelected);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        Select Lead Form
                    </DialogTitle>
                    <DialogDescription>
                        Choose the lead form to capture submissions from.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Search */}
                    {forms.length > 3 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search forms..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    )}

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Loading forms...</p>
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="divide-y divide-border">
                                {filtered.map((form) => {
                                    const isSelected = tempSelected === form.id;
                                    return (
                                        <button
                                            key={form.id}
                                            type="button"
                                            onClick={() => setTempSelected(form.id)}
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
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {form.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    ID: {form.id}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge
                                                    variant={form.status === 'ACTIVE' ? 'primary' : 'secondary'}
                                                    size="sm"
                                                >
                                                    {form.status}
                                                </Badge>
                                                {isSelected && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10">
                                <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {search ? `No forms matching "${search}"` : 'No lead forms found for this page'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{forms.length} form{forms.length !== 1 ? 's' : ''} available</span>
                        <button
                            type="button"
                            onClick={fetchForms}
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
                        {selectedForm ? `Select ${selectedForm.name}` : 'Select Form'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}